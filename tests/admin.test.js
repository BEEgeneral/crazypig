import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { createAdminMiddleware, validateSignal } from '../server/admin.mjs';

const password = 'a'.repeat(64), webhookKey = 'b'.repeat(64);
const signal = (overrides = {}) => ({ version: 1, id: 'MNQ:1', symbol: 'CME_MINI:MNQU2026', time: Date.now(), stage: 'long', direction: 1, maxContracts: 2, price: 20010, rangeHigh: 20020, rangeLow: 19980, entry: 20000, stop: 19980, target: 20020, ...overrides });
const servers = [];
afterEach(async () => { for (const server of servers.splice(0)) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } });
async function start() {
  const middleware = createAdminMiddleware({ password, webhookKey });
  const server = createServer((req, res) => middleware(req, res, () => { res.statusCode = 404; res.end(); }));
  servers.push(server);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const post = (path, data, cookie, headers = {}) => fetch(origin + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers }, body: JSON.stringify(data) });
  return { origin, post };
}
describe('private administrator and Horus reception', () => {
  it('does not deliver the chart, setup or source before authentication; logout revokes access', async () => {
    const { origin, post } = await start();
    const login = await (await fetch(origin + '/admin')).text();
    expect(login).toContain('Clave de administrador');
    expect(login).not.toContain('embed-widget');
    expect((await fetch(origin + '/api/admin/setup')).status).toBe(401);
    expect((await fetch(origin + '/server/admin.html?raw')).status).toBe(404);
    expect((await post('/api/admin/session', { password: 'wrong' })).status).toBe(401);
    expect((await post('/api/admin/session', { password }, null, { Origin: 'https://elsewhere.example' })).status).toBe(403);
    const response = await post('/api/admin/session', { password });
    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie');
    expect(cookie).toContain('HttpOnly'); expect(cookie).toContain('SameSite=Strict');
    const headers = { Cookie: cookie.split(';')[0] };
    expect(await (await fetch(origin + '/admin', { headers })).text()).toContain('embed-widget-advanced-chart');
    expect((await fetch(origin + '/api/admin/status', { headers })).status).toBe(200);
    expect((await post('/api/admin/logout', {}, headers.Cookie)).status).toBe(200);
    expect((await fetch(origin + '/api/admin/status', { headers })).status).toBe(401);
  });
  it('authenticates and deduplicates webhooks, rejects stale/reversed levels, keeps secrets out of state', async () => {
    const { origin, post } = await start();
    const data = signal();
    expect((await post('/api/horus/webhook', data)).status).toBe(401);
    expect((await post('/api/horus/webhook', { ...data, key: webhookKey, price: null })).status).toBe(400);
    expect((await post('/api/horus/webhook', { ...data, key: webhookKey, time: Date.now() - 180000 })).status).toBe(400);
    expect((await post('/api/horus/webhook', { ...data, key: webhookKey, stop: 20030 })).status).toBe(400);
    expect((await post('/api/horus/webhook', { ...data, key: webhookKey })).status).toBe(202);
    expect(await (await post('/api/horus/webhook', { ...data, key: webhookKey })).json()).toEqual({ accepted: false, duplicate: true });
    expect((await post('/api/horus/webhook', { ...data, key: webhookKey, id: 'older', time: data.time - 1000 })).status).toBe(409);
    const response = await post('/api/admin/session', { password });
    const state = await (await fetch(origin + '/api/admin/status', { headers: { Cookie: response.headers.get('set-cookie').split(';')[0] } })).json();
    expect(state.history).toHaveLength(1); expect(state.latest.price).toBe(20010);
    expect(JSON.stringify(state)).not.toContain(webhookKey);
    expect(state.gameConnected).toBe(false); expect(state.brokerConnected).toBe(false);
  });
  it('validates short direction, MNQ instrument and incomplete snapshots', () => {
    expect(() => validateSignal(signal({ symbol: 'NASDAQ:AAPL' }))).toThrow();
    expect(() => validateSignal(signal({ rangeLow: 20030 }))).toThrow();
    expect(() => validateSignal(signal({ maxContracts: 4 }))).toThrow();
    expect(() => validateSignal(signal({ stage: 'short' }))).toThrow();
    expect(() => validateSignal(signal({ stop: undefined }))).toThrow();
    expect(validateSignal(signal({ stage: 'short', direction: -1, stop: 20020, target: 19980 })).direction).toBe(-1);
    expect(validateSignal(signal({ stage: 'range', direction: 0, maxContracts: 0, entry: null, stop: null, target: null, rangeHigh: null, rangeLow: null })).stage).toBe('range');
  });

  it('exposes a sanitized /api/horus/latest snapshot without admin auth or secrets', async () => {
    const { origin, post } = await start();
    const empty = await (await fetch(origin + '/api/horus/latest')).json();
    expect(empty.latest).toBeNull();
    const data = signal({ id: 'MNQ:latest-1' });
    expect((await post('/api/horus/webhook', { ...data, key: webhookKey })).status).toBe(202);
    const snap = await (await fetch(origin + '/api/horus/latest')).json();
    expect(snap.latest.stage).toBe('long');
    expect(snap.latest.price).toBe(20010);
    expect(snap.latest.entry).toBe(20000);
    expect(JSON.stringify(snap)).not.toContain(webhookKey);
    expect(JSON.stringify(snap)).not.toContain('key');
  });
});
