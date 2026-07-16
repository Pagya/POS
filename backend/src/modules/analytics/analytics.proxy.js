const http = require('http');
const { URL } = require('url');
const router = require('express').Router();
const authMiddleware = require('../../middleware/auth');

const ANALYTICS_SERVICE_PORT = process.env.ANALYTICS_SERVICE_PORT || 8001;
const FORWARD_TIMEOUT_MS = 15000;

// ── Helpers ──────────────────────────────────────────────────────────────────

function nowISO() {
  return new Date().toISOString();
}

function errorEnvelope(code, message, status, res) {
  return res.status(status).json({
    data: null,
    error: { code, message },
    meta: { generated_at: nowISO() },
  });
}

// ── Middleware: require reports:read (owner role only) ────────────────────────

function requireReportsRead(req, res, next) {
  if (!req.user || req.user.role !== 'owner') {
    return errorEnvelope('FORBIDDEN', 'Access requires reports:read permission', 403, res);
  }
  next();
}

// ── Middleware: block branch_id='all' for non-owner roles ─────────────────────

function branchScopeGuard(req, res, next) {
  const branchId = req.query.branch_id || (req.body && req.body.branch_id);
  if (branchId === 'all' && req.user.role !== 'owner') {
    return errorEnvelope(
      'FORBIDDEN',
      'Cross-branch access requires owner role',
      403,
      res
    );
  }
  next();
}

// ── Core: forward request to Analytics_Service ───────────────────────────────

function forwardToService(req, res) {
  const branchId = req.query.branch_id || (req.body && req.body.branch_id) || '';

  // Build query string — enforce limit <= 100 and carry page/limit through
  const queryParams = new URLSearchParams(req.query);
  if (queryParams.has('limit')) {
    const limit = parseInt(queryParams.get('limit'), 10);
    if (!isNaN(limit) && limit > 100) {
      queryParams.set('limit', '100');
    }
  }
  const queryString = queryParams.toString();

  // Strip the /api prefix so /api/analytics/forecast/sales → /analytics/forecast/sales
  const upstreamPath = req.path.replace(/^\//, '') // remove leading slash if any
    ? `/analytics${req.path}${queryString ? '?' + queryString : ''}`
    : `/analytics${queryString ? '?' + queryString : ''}`;

  const options = {
    hostname: 'localhost',
    port: ANALYTICS_SERVICE_PORT,
    path: upstreamPath,
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
      'X-Business-ID': req.user.businessId || '',
      'X-Branch-ID': branchId,
      'X-User-Role': req.user.role || '',
    },
    timeout: FORWARD_TIMEOUT_MS,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    let rawBody = '';
    proxyRes.setEncoding('utf8');
    proxyRes.on('data', (chunk) => { rawBody += chunk; });
    proxyRes.on('end', () => {
      let serviceData;
      try {
        serviceData = JSON.parse(rawBody);
      } catch {
        return errorEnvelope('SERVICE_ERROR', 'Invalid response from analytics service', 502, res);
      }

      // Pass through 4xx errors from the service, wrapped in envelope
      if (proxyRes.statusCode >= 400 && proxyRes.statusCode < 500) {
        const message =
          (serviceData && (serviceData.detail || serviceData.message)) ||
          'Request error';
        return res.status(proxyRes.statusCode).json({
          data: null,
          error: { code: 'CLIENT_ERROR', message },
          meta: { generated_at: nowISO() },
        });
      }

      // 5xx from service → 503
      if (proxyRes.statusCode >= 500) {
        return errorEnvelope(
          'SERVICE_UNAVAILABLE',
          'Analytics service is temporarily unavailable',
          503,
          res
        );
      }

      // Build pagination meta from service response if present
      const page  = parseInt(req.query.page, 10)  || serviceData.page  || 1;
      const limit = parseInt(queryParams.get('limit'), 10) || serviceData.limit || 10;
      const total = serviceData.total != null ? serviceData.total : null;

      return res.status(200).json({
        data: serviceData,
        error: null,
        meta: {
          generated_at: serviceData.generated_at || nowISO(),
          page,
          limit,
          total,
        },
      });
    });
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    errorEnvelope(
      'SERVICE_UNAVAILABLE',
      'Analytics service is temporarily unavailable',
      503,
      res
    );
  });

  proxyReq.on('error', (err) => {
    if (!res.headersSent) {
      errorEnvelope(
        'SERVICE_UNAVAILABLE',
        'Analytics service is temporarily unavailable',
        503,
        res
      );
    }
  });

  // Forward request body for POST/PUT
  if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
    proxyReq.write(JSON.stringify(req.body));
  }

  proxyReq.end();
}

// ── Route registration ────────────────────────────────────────────────────────

// Catch-all: auth → RBAC → branch guard → proxy
router.all('*', authMiddleware, requireReportsRead, branchScopeGuard, forwardToService);

module.exports = router;
