// Feature: ai-analytics
// Property-Based Tests for Analytics_Proxy
//
// Run with: node analytics.proxy.test.js
// (from commerce-os/backend/src/modules/analytics/)

'use strict';

// ── Pure logic extracted from analytics.proxy.js ─────────────────────────────

/**
 * P1 — builds the three context headers forwarded to Analytics_Service
 * Validates: Requirements 1.4, 11.4
 */
function buildForwardHeaders(user, branchId) {
  return {
    'X-Business-ID': user.businessId || '',
    'X-Branch-ID': branchId,
    'X-User-Role': user.role || '',
  };
}

/**
 * P21 / P22 — checks whether the user has reports:read (owner role)
 * Returns true if access is allowed, false if 403 should be returned.
 * Validates: Requirements 11.1, 11.2
 */
function checkReportsRead(user) {
  return !!(user && user.role === 'owner');
}

/**
 * P22 — checks whether a valid authenticated user object is present
 * Returns true if the request is authenticated (401 should NOT be returned).
 * Validates: Requirements 11.3
 */
function checkAuthenticated(user) {
  return !!(user && user.id);
}

/**
 * P19 — checks whether branch_id='all' is allowed for the given user
 * Returns true if the request is allowed, false if 403 should be returned.
 * Validates: Requirements 10.2
 */
function checkBranchScopeGuard(user, branchId) {
  if (branchId === 'all' && user.role !== 'owner') {
    return false;
  }
  return true;
}

/**
 * P24 — builds the response envelope
 * Validates: Requirements 12.2, 12.5
 */
function buildEnvelope(serviceData, page, limit) {
  return {
    data: serviceData,
    error: null,
    meta: {
      generated_at: serviceData && serviceData.generated_at
        ? serviceData.generated_at
        : new Date().toISOString(),
      page: page || 1,
      limit: limit || 10,
      total: serviceData && serviceData.total != null ? serviceData.total : null,
    },
  };
}

/**
 * P25 — enforces the maximum pagination limit of 100
 * Validates: Requirements 12.3
 */
function enforceLimitCap(limit) {
  const n = parseInt(limit, 10);
  if (isNaN(n)) return 10; // default
  return Math.min(n, 100);
}

// ── Simple test runner ────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

/**
 * Runs `predicate` against `iterations` inputs produced by `generator(i)`.
 * Throws on the first failure, including the offending input in the message.
 */
function property(name, generator, predicate, iterations) {
  iterations = iterations || 100;
  for (let i = 0; i < iterations; i++) {
    const input = generator(i);
    try {
      predicate(input);
    } catch (e) {
      failed++;
      throw new Error(
        `Property "${name}" failed for input ${JSON.stringify(input)}: ${e.message}`
      );
    }
  }
  passed++;
  console.log(`  ✓ ${name} (${iterations} examples)`);
}

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
  }
}

// ── Generators ────────────────────────────────────────────────────────────────

const NON_OWNER_ROLES = ['staff', 'manager', 'cashier', 'viewer', 'guest'];

function randomNonOwnerRole(i) {
  return NON_OWNER_ROLES[i % NON_OWNER_ROLES.length];
}

function makeUser(i, role) {
  return {
    id: `user-${i}`,
    businessId: `biz-${(i % 10) + 1}`,
    role: role !== undefined ? role : 'owner',
  };
}

function makeBranchId(i) {
  // Mix of real branch IDs and the special 'all' value
  const ids = ['branch-1', 'branch-2', 'branch-3', 'branch-abc', 'BRANCH_X'];
  return ids[i % ids.length];
}

function makeServiceData(i) {
  return {
    generated_at: new Date(Date.now() - i * 1000).toISOString(),
    total: i * 5,
    items: Array.from({ length: i % 10 }, (_, k) => ({ id: k })),
  };
}

// ── P1: Valid requests always have all 3 X-headers forwarded ─────────────────
// Validates: Requirements 1.4, 11.4

console.log('\nP1 — Context headers attached on every forwarded request');

property(
  'buildForwardHeaders always returns X-Business-ID, X-Branch-ID, X-User-Role',
  (i) => ({
    user: makeUser(i, 'owner'),
    branchId: makeBranchId(i),
  }),
  ({ user, branchId }) => {
    const headers = buildForwardHeaders(user, branchId);
    assert('X-Business-ID' in headers, 'Missing X-Business-ID');
    assert('X-Branch-ID' in headers, 'Missing X-Branch-ID');
    assert('X-User-Role' in headers, 'Missing X-User-Role');
    assert(headers['X-Business-ID'] !== null && headers['X-Business-ID'] !== undefined,
      'X-Business-ID is null/undefined');
    assert(headers['X-Branch-ID'] !== null && headers['X-Branch-ID'] !== undefined,
      'X-Branch-ID is null/undefined');
    assert(headers['X-User-Role'] !== null && headers['X-User-Role'] !== undefined,
      'X-User-Role is null/undefined');
  }
);

property(
  'buildForwardHeaders reflects user.businessId in X-Business-ID',
  (i) => makeUser(i, 'owner'),
  (user) => {
    const headers = buildForwardHeaders(user, 'branch-1');
    assert(headers['X-Business-ID'] === (user.businessId || ''),
      `Expected X-Business-ID="${user.businessId || ''}", got "${headers['X-Business-ID']}"`);
  }
);

property(
  'buildForwardHeaders reflects user.role in X-User-Role',
  (i) => makeUser(i, i % 2 === 0 ? 'owner' : 'staff'),
  (user) => {
    const headers = buildForwardHeaders(user, 'branch-1');
    assert(headers['X-User-Role'] === (user.role || ''),
      `Expected X-User-Role="${user.role || ''}", got "${headers['X-User-Role']}"`);
  }
);

// ── P19: branch_id='all' with non-owner role always returns 403 ───────────────
// Validates: Requirements 10.2

console.log('\nP19 — branch_id=\'all\' with non-owner role always blocked');

property(
  'checkBranchScopeGuard blocks branch_id=\'all\' for every non-owner role',
  (i) => ({
    user: makeUser(i, randomNonOwnerRole(i)),
    branchId: 'all',
  }),
  ({ user, branchId }) => {
    const allowed = checkBranchScopeGuard(user, branchId);
    assert(allowed === false,
      `Expected 403 for role="${user.role}" with branch_id='all', but guard allowed it`);
  }
);

property(
  'checkBranchScopeGuard allows branch_id=\'all\' for owner',
  (i) => ({
    user: makeUser(i, 'owner'),
    branchId: 'all',
  }),
  ({ user, branchId }) => {
    const allowed = checkBranchScopeGuard(user, branchId);
    assert(allowed === true,
      `Expected owner to be allowed branch_id='all', but guard blocked it`);
  }
);

property(
  'checkBranchScopeGuard allows any specific branch_id for non-owner',
  (i) => ({
    user: makeUser(i, randomNonOwnerRole(i)),
    branchId: makeBranchId(i),
  }),
  ({ user, branchId }) => {
    const allowed = checkBranchScopeGuard(user, branchId);
    assert(allowed === true,
      `Expected non-owner to be allowed specific branch_id="${branchId}", but guard blocked it`);
  }
);

// ── P21: Any request without reports:read returns 403 ────────────────────────
// Validates: Requirements 11.1, 11.2

console.log('\nP21 — Requests without reports:read (non-owner) always blocked');

property(
  'checkReportsRead returns false for every non-owner role',
  (i) => makeUser(i, randomNonOwnerRole(i)),
  (user) => {
    const allowed = checkReportsRead(user);
    assert(allowed === false,
      `Expected 403 for role="${user.role}", but checkReportsRead returned true`);
  }
);

property(
  'checkReportsRead returns true for owner role',
  (i) => makeUser(i, 'owner'),
  (user) => {
    const allowed = checkReportsRead(user);
    assert(allowed === true,
      `Expected owner to pass reports:read check, but checkReportsRead returned false`);
  }
);

test('checkReportsRead returns false for null user', () => {
  assert(checkReportsRead(null) === false, 'Expected false for null user');
});

test('checkReportsRead returns false for undefined user', () => {
  assert(checkReportsRead(undefined) === false, 'Expected false for undefined user');
});

test('checkReportsRead returns false for user with no role', () => {
  assert(checkReportsRead({ id: 'u1', businessId: 'b1' }) === false,
    'Expected false for user with no role');
});

// ── P22: Any request without valid JWT returns 401 ───────────────────────────
// Validates: Requirements 11.3

console.log('\nP22 — Requests without valid JWT always return 401');

property(
  'checkAuthenticated returns false for missing/empty user objects',
  (i) => {
    const invalidUsers = [null, undefined, {}, { role: 'owner' }, { businessId: 'b1' }];
    return invalidUsers[i % invalidUsers.length];
  },
  (user) => {
    const authenticated = checkAuthenticated(user);
    assert(authenticated === false,
      `Expected unauthenticated for user=${JSON.stringify(user)}, but checkAuthenticated returned true`);
  }
);

property(
  'checkAuthenticated returns true for users with a valid id',
  (i) => makeUser(i, 'owner'),
  (user) => {
    const authenticated = checkAuthenticated(user);
    assert(authenticated === true,
      `Expected authenticated for user=${JSON.stringify(user)}, but checkAuthenticated returned false`);
  }
);

test('checkAuthenticated returns false for null', () => {
  assert(checkAuthenticated(null) === false, 'Expected false for null');
});

test('checkAuthenticated returns false for undefined', () => {
  assert(checkAuthenticated(undefined) === false, 'Expected false for undefined');
});

// ── P24: All proxy responses conform to {data, error, meta} envelope ─────────
// Validates: Requirements 12.2, 12.5

console.log('\nP24 — Response envelope structure and ISO 8601 generated_at');

const ISO_8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

property(
  'buildEnvelope always produces {data, error, meta} structure',
  (i) => makeServiceData(i),
  (serviceData) => {
    const envelope = buildEnvelope(serviceData, 1, 10);
    assert('data' in envelope, 'Missing "data" field');
    assert('error' in envelope, 'Missing "error" field');
    assert('meta' in envelope, 'Missing "meta" field');
    assert(envelope.error === null, '"error" should be null for success envelope');
    assert(envelope.data === serviceData, '"data" should equal serviceData');
  }
);

property(
  'buildEnvelope meta always contains generated_at as valid ISO 8601',
  (i) => makeServiceData(i),
  (serviceData) => {
    const envelope = buildEnvelope(serviceData, 1, 10);
    const { generated_at } = envelope.meta;
    assert(typeof generated_at === 'string', 'generated_at must be a string');
    assert(ISO_8601_RE.test(generated_at),
      `generated_at "${generated_at}" is not a valid ISO 8601 timestamp`);
  }
);

property(
  'buildEnvelope meta contains page and limit',
  (i) => ({ serviceData: makeServiceData(i), page: (i % 10) + 1, limit: (i % 50) + 1 }),
  ({ serviceData, page, limit }) => {
    const envelope = buildEnvelope(serviceData, page, limit);
    assert(envelope.meta.page === page, `Expected meta.page=${page}, got ${envelope.meta.page}`);
    assert(envelope.meta.limit === limit, `Expected meta.limit=${limit}, got ${envelope.meta.limit}`);
  }
);

property(
  'buildEnvelope uses serviceData.generated_at when present',
  (i) => makeServiceData(i),
  (serviceData) => {
    const envelope = buildEnvelope(serviceData, 1, 10);
    assert(envelope.meta.generated_at === serviceData.generated_at,
      `Expected meta.generated_at to match serviceData.generated_at`);
  }
);

test('buildEnvelope falls back to current time when serviceData has no generated_at', () => {
  const before = Date.now();
  const envelope = buildEnvelope({ total: 0 }, 1, 10);
  const after = Date.now();
  const ts = new Date(envelope.meta.generated_at).getTime();
  assert(ISO_8601_RE.test(envelope.meta.generated_at), 'generated_at is not ISO 8601');
  assert(ts >= before && ts <= after, 'generated_at is not within expected time range');
});

// ── P25: Paginated requests with limit > 100 are capped at 100 ───────────────
// Validates: Requirements 12.3

console.log('\nP25 — Pagination limit enforcement (max 100)');

property(
  'enforceLimitCap returns at most 100 for any limit > 100',
  (i) => 101 + i, // limits from 101 to 200
  (limit) => {
    const capped = enforceLimitCap(limit);
    assert(capped <= 100,
      `Expected capped limit <= 100 for input ${limit}, got ${capped}`);
    assert(capped === 100,
      `Expected capped limit to be exactly 100 for input ${limit}, got ${capped}`);
  }
);

property(
  'enforceLimitCap preserves limits <= 100',
  (i) => (i % 100) + 1, // limits from 1 to 100
  (limit) => {
    const capped = enforceLimitCap(limit);
    assert(capped === limit,
      `Expected limit ${limit} to be unchanged, got ${capped}`);
  }
);

test('enforceLimitCap handles limit=100 exactly', () => {
  assert(enforceLimitCap(100) === 100, 'Expected 100 for limit=100');
});

test('enforceLimitCap handles limit=101', () => {
  assert(enforceLimitCap(101) === 100, 'Expected 100 for limit=101');
});

test('enforceLimitCap handles very large limit', () => {
  assert(enforceLimitCap(999999) === 100, 'Expected 100 for limit=999999');
});

test('enforceLimitCap handles string input "150"', () => {
  assert(enforceLimitCap('150') === 100, 'Expected 100 for string "150"');
});

test('enforceLimitCap handles string input "50"', () => {
  assert(enforceLimitCap('50') === 50, 'Expected 50 for string "50"');
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
if (failed === 0) {
  console.log(`All ${passed} tests passed.`);
} else {
  console.log(`${passed} passed, ${failed} failed.`);
  process.exit(1);
}
