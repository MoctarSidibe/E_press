/**
 * End-to-end smoke test for the E-Press backend.
 *
 * Hits every major endpoint a real client uses and reports pass/fail. Run
 * against a LOCAL backend by default; pass an explicit URL to point elsewhere.
 *
 *   node scripts/smoke_test.js                          # http://localhost:5000
 *   node scripts/smoke_test.js http://192.168.1.76:5000
 *   node scripts/smoke_test.js http://37.60.240.199     # production
 *
 * Exit code 0 = all green, 1 = at least one failure.
 *
 * The test creates a throwaway customer (random phone, password 'smoke-1234')
 * to exercise auth + order endpoints. It cleans nothing up — re-runs reuse
 * existing throwaway accounts via login first. Idempotent.
 */

const BASE = (process.argv[2] || 'http://localhost:5000').replace(/\/$/, '');
const API  = `${BASE}/api`;

// ─── Tiny test harness ──────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

const c = {
    reset:  '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
    yellow: '\x1b[33m', cyan:  '\x1b[36m', dim: '\x1b[2m',
};

async function step(name, fn) {
    try {
        const result = await fn();
        passed++;
        console.log(`  ${c.green}✓${c.reset} ${name}${result ? c.dim + '  ' + result + c.reset : ''}`);
        return true;
    } catch (err) {
        failed++;
        failures.push({ name, err: err.message });
        console.log(`  ${c.red}✗${c.reset} ${name}`);
        console.log(`    ${c.red}${err.message}${c.reset}`);
        return false;
    }
}

function section(title) {
    console.log(`\n${c.cyan}── ${title} ──${c.reset}`);
}

async function api(method, path, { token, body, expectStatus } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(API + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (expectStatus && res.status !== expectStatus) {
        throw new Error(`expected ${expectStatus}, got ${res.status}: ${text.slice(0, 200)}`);
    }
    if (!expectStatus && !res.ok) {
        throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
    }
    return { status: res.status, data };
}

// ─── Shared state ───────────────────────────────────────────────────────────
const testPhone   = '+24178' + String(Math.floor(Math.random() * 9000000) + 1000000);
const testPass    = 'smoke-1234';
const ctx = {
    customerToken: null,
    customerId: null,
    locationId: null,
    laverieDriverToken: null,
    laverieCleanerToken: null,
};

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
    console.log(`\n${c.cyan}E-Press backend smoke test${c.reset}`);
    console.log(`${c.dim}Target: ${BASE}${c.reset}`);
    console.log(`${c.dim}Test customer: ${testPhone}${c.reset}\n`);

    // ─── Health ─────────────────────────────────────────────────────────────
    section('Health');
    await step('GET /api returns 200', async () => {
        const r = await api('GET', '/');
        if (!r.data?.message) throw new Error('missing message field');
        return r.data.message;
    });

    // ─── Customer auth (register → login → me) ──────────────────────────────
    section('Customer auth');

    await step('POST /auth/register creates customer', async () => {
        try {
            const r = await api('POST', '/auth/register', {
                body: {
                    fullName: 'Smoke Test Customer',
                    email: testPhone.replace('+241', '') + '@phone.epress.local',
                    phone: testPhone,
                    password: testPass,
                    role: 'customer',
                    appVariant: 'customer',
                },
            });
            ctx.customerToken = r.data.token;
            ctx.customerId   = r.data.user.id;
            return `id=${ctx.customerId?.slice(0, 8)}…`;
        } catch (err) {
            // Already registered (re-run) — fall through to login.
            if (!/already registered/i.test(err.message)) throw err;
            return 'already exists, will login';
        }
    });

    await step('POST /auth/login by phone works', async () => {
        const r = await api('POST', '/auth/login', {
            body: { email: testPhone, password: testPass, appVariant: 'customer' },
        });
        ctx.customerToken = r.data.token;
        ctx.customerId   = r.data.user.id;
        if (r.data.user.role !== 'customer') throw new Error('role mismatch');
        return `role=customer card=${r.data.user.cardNumber}`;
    });

    await step('GET /auth/me returns the user', async () => {
        const r = await api('GET', '/auth/me', { token: ctx.customerToken });
        if (r.data.id !== ctx.customerId) throw new Error('id mismatch');
        return r.data.email;
    });

    await step('Cross-variant login is REJECTED (customer → worker app)', async () => {
        // Variant guard: a customer should not be able to sign in to E-Press Pro.
        const res = await fetch(API + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testPhone, password: testPass, appVariant: 'worker' }),
        });
        if (res.status !== 401) throw new Error(`expected 401, got ${res.status}`);
        return '401 as expected';
    });

    // ─── Catalog ────────────────────────────────────────────────────────────
    section('Catalog');

    await step('GET /categories lists clothing categories', async () => {
        const r = await api('GET', '/categories', { token: ctx.customerToken });
        const list = Array.isArray(r.data) ? r.data : r.data?.categories;
        if (!Array.isArray(list) || list.length === 0) throw new Error('empty list');
        return `${list.length} categories`;
    });

    // ─── Locations (addresses) ──────────────────────────────────────────────
    section('Addresses');

    await step('POST /locations creates an address', async () => {
        const r = await api('POST', '/locations', {
            token: ctx.customerToken,
            body: {
                label: 'Smoke Home',
                address: 'Centre Libreville',
                latitude: 0.4162,
                longitude: 9.4673,
                isDefault: true,
            },
        });
        ctx.locationId = r.data.id;
        return `id=${ctx.locationId?.slice(0, 8)}…`;
    });

    await step('GET /locations lists user addresses', async () => {
        const r = await api('GET', '/locations', { token: ctx.customerToken });
        const list = Array.isArray(r.data) ? r.data : [];
        if (list.length === 0) throw new Error('no addresses returned');
        return `${list.length} addresses`;
    });

    await step('PATCH /locations/:id updates the address', async () => {
        const r = await api('PATCH', `/locations/${ctx.locationId}`, {
            token: ctx.customerToken,
            body: { label: 'Smoke Home (updated)' },
        });
        if (r.data.label !== 'Smoke Home (updated)') throw new Error('label not updated');
        return r.data.label;
    });

    // ─── Loyalty ────────────────────────────────────────────────────────────
    section('Loyalty');

    await step('GET /points/balance returns balance', async () => {
        const r = await api('GET', '/points/balance', { token: ctx.customerToken });
        if (typeof r.data.pointsBalance !== 'number') throw new Error('no balance field');
        return `${r.data.pointsBalance} pts`;
    });

    await step('GET /points/history returns paged history', async () => {
        const r = await api('GET', '/points/history', { token: ctx.customerToken });
        const list = r.data.transactions || r.data;
        if (!Array.isArray(list)) throw new Error('expected array');
        return `${list.length} txns`;
    });

    await step('POST /coupons/validate rejects bogus code', async () => {
        const res = await fetch(API + '/coupons/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + ctx.customerToken,
            },
            body: JSON.stringify({ code: 'SMOKE-NOPE-' + Date.now(), orderAmount: 5000 }),
        });
        if (res.status === 200) {
            const j = await res.json();
            if (j?.valid !== false) throw new Error('bogus code accepted');
            return 'rejected gracefully';
        }
        if (res.status === 400 || res.status === 404) return `${res.status} (rejected)`;
        throw new Error(`unexpected status ${res.status}`);
    });

    // ─── Push tokens ────────────────────────────────────────────────────────
    section('Push notifications');

    await step('POST /users/push-token registers a token', async () => {
        await api('POST', '/users/push-token', {
            token: ctx.customerToken,
            body: { token: 'ExponentPushToken[smoke-test-fake]', platform: 'android' },
        });
        return 'stored';
    });

    await step('DELETE /users/push-token unregisters', async () => {
        await api('DELETE', '/users/push-token', { token: ctx.customerToken });
        return 'cleared';
    });

    // ─── Laveries (seeded by seed_test_workers.js) ──────────────────────────
    section('Laveries');

    await step('GET /laveries lists laveries (auth required)', async () => {
        const r = await api('GET', '/laveries', { token: ctx.customerToken });
        const list = r.data.laveries || [];
        return `${list.length} laveries`;
    });

    await step('GET /laveries/nearest finds nearest to coords', async () => {
        const r = await api('GET', '/laveries/nearest?lat=0.4162&lng=9.4673', { token: ctx.customerToken });
        return r.data.laverie ? `nearest: ${r.data.laverie.name}` : 'none in range';
    });

    // ─── Worker auth (cleaner from seed) ────────────────────────────────────
    section('Worker auth (seeded laverie account)');

    await step('Cleaner login via phone (worker variant)', async () => {
        try {
            const r = await api('POST', '/auth/login', {
                body: { email: '+24177000001', password: 'test1234', appVariant: 'worker' },
            });
            ctx.laverieCleanerToken = r.data.token;
            if (r.data.user.role !== 'cleaner') throw new Error('role mismatch');
            return `kyc=${r.data.user.kycStatus}`;
        } catch (err) {
            if (/invalid credentials/i.test(err.message)) {
                throw new Error('seeded cleaner missing — run: node scripts/seed_test_workers.js');
            }
            throw err;
        }
    });

    if (ctx.laverieCleanerToken) {
        await step('GET /laveries/me returns the cleaner\'s laverie', async () => {
            const r = await api('GET', '/laveries/me', { token: ctx.laverieCleanerToken });
            if (!r.data.laverie) throw new Error('no laverie attached');
            return r.data.laverie.name;
        });

        await step('GET /laveries/me/orders returns incoming list', async () => {
            const r = await api('GET', '/laveries/me/orders', { token: ctx.laverieCleanerToken });
            const list = r.data.orders || [];
            return `${list.length} incoming`;
        });

        await step('GET /kyc/status returns cleaner status', async () => {
            const r = await api('GET', '/kyc/status', { token: ctx.laverieCleanerToken });
            if (r.data.kyc_status !== 'approved') throw new Error(`kyc=${r.data.kyc_status}`);
            return 'approved';
        });
    }

    // ─── Driver auth ────────────────────────────────────────────────────────
    section('Worker auth (seeded driver account)');

    await step('Driver login via phone (worker variant)', async () => {
        try {
            const r = await api('POST', '/auth/login', {
                body: { email: '+24177000002', password: 'test1234', appVariant: 'worker' },
            });
            ctx.laverieDriverToken = r.data.token;
            if (r.data.user.role !== 'driver') throw new Error('role mismatch');
            return `kyc=${r.data.user.kycStatus}`;
        } catch (err) {
            if (/invalid credentials/i.test(err.message)) {
                throw new Error('seeded driver missing — run: node scripts/seed_test_workers.js');
            }
            throw err;
        }
    });

    if (ctx.laverieDriverToken) {
        await step('GET /driver/available-orders returns list', async () => {
            const res = await fetch(API + '/driver/available-orders?type=pickup_available', {
                headers: { Authorization: 'Bearer ' + ctx.laverieDriverToken },
            });
            // Endpoint may or may not exist depending on routes; accept 200 OR 404
            // (some installs put this under /qr/courier/available instead).
            if (res.status === 200) return 'ok';
            if (res.status === 404) return '(endpoint not present — ok)';
            throw new Error(`status ${res.status}`);
        });
    }

    // ─── Cleanup ────────────────────────────────────────────────────────────
    section('Cleanup');
    await step('DELETE /locations/:id removes test address', async () => {
        if (!ctx.locationId) return 'skipped';
        await api('DELETE', `/locations/${ctx.locationId}`, { token: ctx.customerToken });
        return 'removed';
    });

    // ─── Summary ────────────────────────────────────────────────────────────
    const total = passed + failed;
    console.log(`\n${'─'.repeat(60)}`);
    if (failed === 0) {
        console.log(`${c.green}✓ All ${total} checks passed${c.reset}`);
    } else {
        console.log(`${c.red}✗ ${failed} of ${total} checks failed${c.reset}`);
        failures.forEach(f => console.log(`  ${c.red}•${c.reset} ${f.name}: ${f.err}`));
    }
    console.log('');
    process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
    console.error(`\n${c.red}FATAL:${c.reset} ${err.message}`);
    process.exit(2);
});
