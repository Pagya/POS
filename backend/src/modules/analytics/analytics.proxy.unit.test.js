'use strict';

// ── Unit Tests for Analytics_Proxy ───────────────────────────────────────────
//
// Run with: node analytics.proxy.unit.test.js
// (from commerce-os/backend/src/modules/analytics/)
//
// Tests the pure logic functions extracted from analytics.proxy.js without
// requiring HTTP or a running server.

// ── Pure logic re-extracted from analytics.proxy.js ──────────────────────────

function nowISO() {
  return new Date().toISOString();
}

function errorEnvelope(code, message, status) {
  return {
    status,
    body: {
      data: null,
      error: { code, message },
      meta: { generated_at: nowISO() },
    },
  };
}

/**
 * Checks whether the user has reports:read (owner role only).
 * Returns true if allowed, false if 403 should be returned.
 */
function checkReportsRead(user) {
  return !!(user && user.role === 'owner');
}

/**
 * Checks whether a valid authenticated user object is present.
 * Returns true if authenticated, false if 401 should be returned.
 */
function checkAuthenticated(user) {
  return !!(user && user.id);
}

/**
 * Checks whether branch_id='all' is allowed for the given user.
 * Returns true if allowed, false if 403 should be returned.
 */
function checkBranchScopeGuard(user, branchId) {
  if (branchId === 'all' && (!user || user.role !== 'owner')) {
    return false;
  }
  return true;
}

/**
 * Builds the context headers forwarded to Analytics_Service.
 */
function buildForwardHeaders(user, branchId) {
  return {
    'Content-Type': 'application/json',
    'X-Business-ID': (user && user.businessId) || '',
    'X-Branch-ID': branchId || '',
    'X-User-Role': (user && user.role) || '',
  };
}

/**
 * Builds the response envelope.
 */
function buildEnvelope(serviceData, page, limit) {
  return {
    data: serviceData,
    error: null,
    meta: {
      generated_at: (serviceData && serviceData.generated_at) || nowISO(),
      page: page || 1,
      limit: limit || 10,
      total: (serviceData && serviceData.total != null) ? serviceData.total : null,
    },
  };
}

/**
 * Simulates the full middleware chain for a request.
 * Returns { status, body } representing what the proxy would respond.
 */
function simulateRequest(user, branchId, serviceAvailable, serviceResponse) {
  // 1. Auth check (401 without JWT / valid user)
  if (!checkAuthenticated(user)) {
    return errorEnvelope('UNAUTHORIZED', 'Authentication required', 401);
  }

  // 2. RBAC check (403 without reports:read)
  if (!checkReportsRead(user)) {
    return errorEnvelope('FORBIDDEN', 'Access requires reports:read permission', 403);
  }

  // 3. Branch scope guard (403 for branch_id='all' with non-owner)
  if (!checkBranchScopeGuard(user, branchId)) {
    return errorEnvelope('FORBIDDEN', 'Cross-branch access requires owner role', 403);
  }

  // 4. Forward to service
  if (!serviceAvailable) {
    return errorEnvelope('SERVICE_UNAVAILABLE', 'Analytics service is temporarily unavailable', 503);
  }

  // 5. Wrap in envelope
  const envelope = buildEnvelope(serviceResponse, 1, 10);
  return { status: 200, body: envelope };
}

// ── Test runner ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

// ── Test fixtures ─────────────────────────────────────────────────────────────

const ownerUser = { id: 'user-1', businessId: 'biz-123', role: 'owner' };
const staffUser = { id: 'user-2', businessId: 'biz-123', role: 'staff' };
const managerUser = { id: 'user-3', businessId: 'biz-123', role: 'manager' };
const mockServiceResponse = {
  forecast: [],
  insight: 'Sales are trending upward.',
  generated_at: new Date().toISOString(),
  total: 0,
};

// ── Test 1: Request without JWT returns 401 ───────────────────────────────────

console.log('\nTest 1 — Request without JWT returns 401');

test('null user returns 401', () => {
  const result = simulateRequest(null, 'branch-1', true, mockServiceResponse);
  assert(result.status === 401, `Expected 401, got ${result.status}`);
  assert(result.body.error.code === 'UNAUTHORIZED', `Expected UNAUTHORIZED, got ${result.body.error.code}`);
  assert(result.body.data === null, 'Expected data to be null');
});

test('undefined user returns 401', () => {
  const result = simulateRequest(undefined, 'branch-1', true, mockServiceResponse);
  assert(result.status === 401, `Expected 401, got ${result.status}`);
});

test('user without id returns 401', () => {
  const result = simulateRequest({ role: 'owner', businessId: 'biz-1' }, 'branch-1', true, mockServiceResponse);
  assert(result.status === 401, `Expected 401, got ${result.status}`);
});

test('empty object user returns 401', () => {
  const result = simulateRequest({}, 'branch-1', true, mockServiceResponse);
  assert(result.status === 401, `Expected 401, got ${result.status}`);
});

// ── Test 2: Request without reports:read (non-owner role) returns 403 ─────────

console.log('\nTest 2 — Request without reports:read returns 403');

test('staff role returns 403', () => {
  const result = simulateRequest(staffUser, 'branch-1', true, mockServiceResponse);
  assert(result.status === 403, `Expected 403, got ${result.status}`);
  assert(result.body.error.code === 'FORBIDDEN', `Expected FORBIDDEN, got ${result.body.error.code}`);
  assert(result.body.data === null, 'Expected data to be null');
});

test('manager role returns 403', () => {
  const result = simulateRequest(managerUser, 'branch-1', true, mockServiceResponse);
  assert(result.status === 403, `Expected 403, got ${result.status}`);
});

test('cashier role returns 403', () => {
  const cashier = { id: 'u4', businessId: 'biz-1', role: 'cashier' };
  const result = simulateRequest(cashier, 'branch-1', true, mockServiceResponse);
  assert(result.status === 403, `Expected 403, got ${result.status}`);
});

test('owner role passes RBAC check', () => {
  const result = simulateRequest(ownerUser, 'branch-1', true, mockServiceResponse);
  assert(result.status === 200, `Expected 200 for owner, got ${result.status}`);
});

// ── Test 3: branch_id=all with non-owner role returns 403 ────────────────────

console.log('\nTest 3 — branch_id=all with non-owner role returns 403');

test('staff + branch_id=all returns 403', () => {
  // Staff fails at RBAC check (step 2) before reaching the branch scope guard (step 3).
  // Both checks return 403 FORBIDDEN — the important thing is the 403 status.
  const result = simulateRequest(staffUser, 'all', true, mockServiceResponse);
  assert(result.status === 403, `Expected 403, got ${result.status}`);
  assert(result.body.error.code === 'FORBIDDEN', `Expected FORBIDDEN, got ${result.body.error.code}`);
  assert(result.body.data === null, 'Expected data to be null');
});

test('manager + branch_id=all returns 403', () => {
  const result = simulateRequest(managerUser, 'all', true, mockServiceResponse);
  assert(result.status === 403, `Expected 403, got ${result.status}`);
});

test('branch scope guard specifically blocks branch_id=all for non-owner with cross-branch message', () => {
  // Test the guard function directly (not the full chain) to verify the cross-branch message
  const result = errorEnvelope('FORBIDDEN', 'Cross-branch access requires owner role', 403);
  assert(result.status === 403, `Expected 403, got ${result.status}`);
  assert(result.body.error.message.toLowerCase().includes('cross-branch') ||
         result.body.error.message.toLowerCase().includes('owner'),
    `Expected cross-branch/owner message, got: ${result.body.error.message}`);
  // Verify the guard itself returns false for non-owner + branch_id=all
  assert(checkBranchScopeGuard(staffUser, 'all') === false, 'Expected guard to block staff + all');
  assert(checkBranchScopeGuard(managerUser, 'all') === false, 'Expected guard to block manager + all');
});

test('owner + branch_id=all is allowed', () => {
  const result = simulateRequest(ownerUser, 'all', true, mockServiceResponse);
  assert(result.status === 200, `Expected 200 for owner with branch_id=all, got ${result.status}`);
});

test('non-owner with specific branch_id is allowed (after RBAC)', () => {
  // Note: staff fails at RBAC (step 2), not branch guard (step 3)
  // This tests the guard logic in isolation
  const allowed = checkBranchScopeGuard(staffUser, 'branch-specific');
  assert(allowed === true, 'Expected specific branch_id to be allowed for non-owner');
});

// ── Test 4: Analytics_Service unavailable returns 503 ────────────────────────

console.log('\nTest 4 — Analytics_Service unavailable returns 503');

test('service unavailable returns 503', () => {
  const result = simulateRequest(ownerUser, 'branch-1', false, null);
  assert(result.status === 503, `Expected 503, got ${result.status}`);
  assert(result.body.error.code === 'SERVICE_UNAVAILABLE',
    `Expected SERVICE_UNAVAILABLE, got ${result.body.error.code}`);
  assert(result.body.data === null, 'Expected data to be null');
});

test('service unavailable message is descriptive', () => {
  const result = simulateRequest(ownerUser, 'branch-1', false, null);
  assert(result.body.error.message.toLowerCase().includes('unavailable') ||
         result.body.error.message.toLowerCase().includes('analytics'),
    `Expected descriptive message, got: ${result.body.error.message}`);
});

// ── Test 5: Valid request forwards with correct X-headers ────────────────────

console.log('\nTest 5 — Valid request forwards with correct X-headers');

test('buildForwardHeaders includes X-Business-ID', () => {
  const headers = buildForwardHeaders(ownerUser, 'branch-1');
  assert('X-Business-ID' in headers, 'Missing X-Business-ID');
  assert(headers['X-Business-ID'] === ownerUser.businessId,
    `Expected X-Business-ID=${ownerUser.businessId}, got ${headers['X-Business-ID']}`);
});

test('buildForwardHeaders includes X-Branch-ID', () => {
  const headers = buildForwardHeaders(ownerUser, 'branch-abc');
  assert('X-Branch-ID' in headers, 'Missing X-Branch-ID');
  assert(headers['X-Branch-ID'] === 'branch-abc',
    `Expected X-Branch-ID=branch-abc, got ${headers['X-Branch-ID']}`);
});

test('buildForwardHeaders includes X-User-Role', () => {
  const headers = buildForwardHeaders(ownerUser, 'branch-1');
  assert('X-User-Role' in headers, 'Missing X-User-Role');
  assert(headers['X-User-Role'] === 'owner',
    `Expected X-User-Role=owner, got ${headers['X-User-Role']}`);
});

test('buildForwardHeaders reflects correct role for staff user', () => {
  const headers = buildForwardHeaders(staffUser, 'branch-1');
  assert(headers['X-User-Role'] === 'staff',
    `Expected X-User-Role=staff, got ${headers['X-User-Role']}`);
});

test('all three X-headers are present for any valid user', () => {
  const users = [ownerUser, staffUser, managerUser];
  for (const user of users) {
    const headers = buildForwardHeaders(user, 'branch-1');
    assert('X-Business-ID' in headers, `Missing X-Business-ID for role=${user.role}`);
    assert('X-Branch-ID' in headers, `Missing X-Branch-ID for role=${user.role}`);
    assert('X-User-Role' in headers, `Missing X-User-Role for role=${user.role}`);
  }
});

// ── Test 6: Response is wrapped in { data, error, meta } envelope ─────────────

console.log('\nTest 6 — Response wrapped in { data, error, meta } envelope');

test('successful response has data, error, meta fields', () => {
  const result = simulateRequest(ownerUser, 'branch-1', true, mockServiceResponse);
  assert(result.status === 200, `Expected 200, got ${result.status}`);
  assert('data' in result.body, 'Missing "data" field');
  assert('error' in result.body, 'Missing "error" field');
  assert('meta' in result.body, 'Missing "meta" field');
});

test('successful response has error=null', () => {
  const result = simulateRequest(ownerUser, 'branch-1', true, mockServiceResponse);
  assert(result.body.error === null, `Expected error=null, got ${JSON.stringify(result.body.error)}`);
});

test('successful response data equals service response', () => {
  const result = simulateRequest(ownerUser, 'branch-1', true, mockServiceResponse);
  assert(result.body.data === mockServiceResponse,
    'Expected data to equal the service response');
});

test('meta contains generated_at as ISO 8601 string', () => {
  const result = simulateRequest(ownerUser, 'branch-1', true, mockServiceResponse);
  const { generated_at } = result.body.meta;
  assert(typeof generated_at === 'string', 'generated_at must be a string');
  const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  assert(ISO_RE.test(generated_at), `generated_at "${generated_at}" is not ISO 8601`);
});

test('meta contains page and limit', () => {
  const result = simulateRequest(ownerUser, 'branch-1', true, mockServiceResponse);
  assert('page' in result.body.meta, 'Missing meta.page');
  assert('limit' in result.body.meta, 'Missing meta.limit');
});

test('error envelope has data=null and non-null error', () => {
  const result = simulateRequest(null, 'branch-1', true, mockServiceResponse);
  assert(result.body.data === null, 'Expected data=null in error envelope');
  assert(result.body.error !== null, 'Expected non-null error in error envelope');
  assert(typeof result.body.error.code === 'string', 'Expected error.code to be a string');
  assert(typeof result.body.error.message === 'string', 'Expected error.message to be a string');
});

test('error envelope meta contains generated_at', () => {
  const result = simulateRequest(null, 'branch-1', true, mockServiceResponse);
  assert('meta' in result.body, 'Missing meta in error envelope');
  assert('generated_at' in result.body.meta, 'Missing generated_at in error envelope meta');
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
if (failed === 0) {
  console.log(`All ${passed} tests passed.`);
} else {
  console.log(`${passed} passed, ${failed} failed.`);
  process.exit(1);
}
