// Demo-account guard: features/keystone/lib/demo-guard.ts. Offline, no DB.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function load(relative) {
  const filename = path.resolve(root, relative);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports, require, process, Symbol }, { filename });
  return module.exports;
}

const guard = load('features/keystone/lib/demo-guard.ts');
const { DEMO_GUARD_MESSAGE, withDemoGuard, DEMO_GUARD_POLICY, rewriteDemoErrors } = guard;
const env = { DEMO_USER_EMAILS: ' Other@example.com , CONSTRUCTION@openship.org ' };

const DEMO = { itemId: 'demo', listKey: 'User', data: { email: 'construction@openship.org' } };
const ADMIN = { itemId: 'admin', listKey: 'User', data: { email: 'owner@openship.org' } };

// Lists shaped like the real ones; Project carries an existing hook to prove it still runs.
let hookRan = 0;
const names = ['User','Role','AccountInvitation','ApiCredential','Company','PublicSiteProfile','PaymentProvider','Payment','PrimeContract','Commitment','ChangeOrder','Estimate','Budget','DirectCost','ProgressClaim','PaymentReversal','TradePartner','ConstructionLead','ConstructionOpportunity','ProcurementRequest','Document','RFI'];
const base = Object.fromEntries(names.map((n) => [n, { fields: {} }]));
base.Project = { fields: {}, hooks: { beforeOperation: { update: () => { hookRan++; } } } };
const lists = withDemoGuard(base, DEMO_GUARD_POLICY, env);

function run(listKey, operation, session, { item, inputData } = {}) {
  const context = { session, sudo: () => context };
  const hook = lists[listKey].hooks?.beforeOperation;
  const fn = typeof hook === 'function' ? hook : hook?.[operation];
  if (!fn) return Promise.resolve();
  return fn({ listKey, operation, context, item, inputData, resolvedData: inputData });
}

async function refused(promise) {
  await assert.rejects(promise, (error) => error.message === DEMO_GUARD_MESSAGE);
}

test('the exact copy', () => {
  assert.equal(DEMO_GUARD_MESSAGE, "Demo accounts can't change this.");
});

const refusedUpdate = (list, field, item) => refused(run(list, 'update', DEMO, { item: { id: 'x', ...item }, inputData: { [field]: 'changed' } }));

test('demo user cannot change passwords, emails, roles or users', async () => {
  await refused(run('User', 'update', DEMO, { item: { id: 'demo' }, inputData: { password: 'x' } }));
  await refused(run('User', 'update', DEMO, { item: { id: 'demo' }, inputData: { email: 'a@b.c' } }));
  await refused(run('User', 'update', DEMO, { item: { id: 'demo' }, inputData: { role: { connect: { id: 'r' } } } }));
  await refused(run('User', 'update', DEMO, { item: { id: 'admin' }, inputData: { name: 'Hacked' } }));
  await refused(run('User', 'create', DEMO, { inputData: { name: 'New' } }));
  await refused(run('User', 'delete', DEMO, { item: { id: 'admin' } }));
  await run('User', 'update', DEMO, { item: { id: 'demo' }, inputData: { onboardingStatus: 'dismissed', phone: '1' } });
});

test('Role, AccountInvitation and ApiCredential are locked', async () => {
  for (const key of ['Role', 'AccountInvitation', 'ApiCredential']) {
    await refused(run(key, 'create', DEMO, { inputData: {} }));
    await refused(run(key, 'update', DEMO, { item: { id: 'x' }, inputData: { name: 'y' } }));
    await refused(run(key, 'delete', DEMO, { item: { id: 'x' } }));
  }
});

test('company slug and site key protected when changed; branding allowed', async () => {
  const item = { id: 'c', name: 'Northstar', slug: 'northstar', brandName: 'Northstar Builders', brandTagline: 'a', brandMark: 'N', brandColor: '#111' };
  await refusedUpdate('Company', 'slug', item);
  await refused(run('Company', 'update', DEMO, { inputData: { slug: 'northstar' } }));
  await refusedUpdate('PublicSiteProfile', 'siteKey', { siteKey: 'k' });
  await run('Company', 'update', DEMO, { item, inputData: { slug: ' northstar ', name: 'Northstar QA', brandName: 'Northstar QA', brandTagline: 'New line', brandMark: 'Q', brandColor: '#000', legalName: 'X LLC', website: 'https://x.test' } });
});

test('payment provider keys protected; name, isInstalled, metadata editable', async () => {
  const item = { id: 'pp', name: 'Card', code: 'pp_card', isInstalled: true };
  for (const field of ['code', 'credentials', 'createPaymentFunction', 'capturePaymentFunction', 'refundPaymentFunction', 'getPaymentStatusFunction', 'generatePaymentLinkFunction', 'handleWebhookFunction']) {
    await refusedUpdate('PaymentProvider', field, item);
  }
  await refused(run('PaymentProvider', 'create', DEMO, { inputData: { code: 'pp_x' } }));
  await refused(run('PaymentProvider', 'delete', DEMO, { item }));
  await run('PaymentProvider', 'update', DEMO, { item, inputData: { name: 'Cards', code: 'pp_card', isInstalled: false, metadata: { a: 1 } } });
});

test('delete of business records refused; create and update still allowed', async () => {
  const keys = ['Project','PrimeContract','Commitment','ChangeOrder','Estimate','Budget','DirectCost','ProgressClaim','Payment','PaymentReversal','TradePartner','ConstructionLead','ConstructionOpportunity','ProcurementRequest','Document'];
  for (const key of keys) {
    await refused(run(key, 'delete', DEMO, { item: { id: 'x' } }));
    await run(key, 'create', DEMO, { inputData: { name: 'New' } });
    await run(key, 'update', DEMO, { item: { id: 'x' }, inputData: { name: 'Edited' } });
  }
  await run('RFI', 'delete', DEMO, { item: { id: 'x' } });
  await run('Project', 'update', DEMO, { item: { id: 'p' }, inputData: { name: 'Edited' } });
  assert.ok(hookRan >= 2);
});

test('a non-demo admin is unaffected', async () => {
  await run('User', 'update', ADMIN, { item: { id: 'demo' }, inputData: { password: 'x', email: 'a@b.c', role: {} } });
  await run('User', 'create', ADMIN, { inputData: { name: 'New' } });
  await run('Role', 'update', ADMIN, { item: { id: 'r' }, inputData: { name: 'Y' } });
  await run('Company', 'update', ADMIN, { item: { id: 'c', slug: 'a' }, inputData: { slug: 'b' } });
  await run('Project', 'delete', ADMIN, { item: { id: 'o' } });
  await run('PaymentProvider', 'update', ADMIN, { item: { id: 'pp' }, inputData: { credentials: { k: 1 } } });
  await run('ApiCredential', 'create', ADMIN, { inputData: {} });
  await run('User', 'update', null, { item: { id: 'x' }, inputData: { password: 'x' } });
});

test('a session without data.email is resolved from the user record', async () => {
  const session = { itemId: 'demo', listKey: 'User' };
  const context = { session, sudo: () => ({ db: { User: { findOne: async () => ({ email: 'Construction@Openship.org' }) } } }) };
  await refused(lists.User.hooks.beforeOperation({ listKey: 'User', operation: 'update', context, item: { id: 'demo' }, inputData: { password: 'x' } }));
});

test('no DEMO_USER_EMAILS means no guard', async () => {
  const open = withDemoGuard({ Role: { fields: {} } }, DEMO_GUARD_POLICY, {});
  await open.Role.hooks.beforeOperation({ listKey: 'Role', operation: 'delete', context: { session: DEMO }, item: { id: 'r' } });
});

test('Keystone\'s hook wrapper is rewritten to the exact copy', () => {
  const wrapped = { message: `An error occurred while running "beforeOperation".\n  - Company.hooks.beforeOperation: ${DEMO_GUARD_MESSAGE}`, path: ['updateCompany'] };
  const other = { message: 'Something else' };
  const result = rewriteDemoErrors({ data: { updateCompany: null }, errors: [wrapped, other] });
  assert.equal(result.errors[0].message, DEMO_GUARD_MESSAGE);
  assert.equal(result.errors[0].extensions.code, 'KS_ACCESS_DENIED');
  assert.equal(result.errors[1], other);
});

test('the guard is wired into the Keystone config and the GraphQL route', () => {
  const config = fs.readFileSync(path.join(root, 'features/keystone/index.ts'), 'utf8');
  assert.match(config, /lists: withDemoGuard\(models\)/);
  const route = fs.readFileSync(path.join(root, 'pages/api/graphql.ts'), 'utf8');
  assert.match(route, /useDemoGuardErrors\(\)/);
});
