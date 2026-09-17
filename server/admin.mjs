import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const secret = () => randomBytes(32).toString('hex');
const same = (a, b) => typeof a === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const page = readFileSync(new URL('./admin.html', import.meta.url), 'utf8');
const login = readFileSync(new URL('./login.html', import.meta.url), 'utf8');

function credentials() {
  // Outside the web root and Dropbox; never bundled or served by Vite.
  const folder = join(homedir(), '.config', 'crazypig');
  mkdirSync(folder, { recursive: true, mode: 0o700 });
  const path = join(folder, 'admin.json');
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) {
    if (e.code !== 'ENOENT') throw e;
    const value = { password: secret(), webhookKey: secret() };
    writeFileSync(path, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' });
    return value;
  }
}

export function validateSignal(input, now = Date.now()) {
  const stages = ['range', 'sweep', 'structure', 'retest', 'long', 'short', 'closed', 'flat'];
  if (!input || typeof input !== 'object' || input.version !== 1 || !stages.includes(input.stage)) throw Error('Formato de señal no válido');
  if (typeof input.id !== 'string' || !/^[\w:!.\-]{1,160}$/.test(input.id)) throw Error('Identificador no válido');
  if (typeof input.symbol !== 'string' || !/^(?:CME_MINI:)?MNQ(?:[HMUZ]\d{1,4}|[12]!)?$/.test(input.symbol)) throw Error('Se requiere un símbolo MNQ');
  if (!Number.isSafeInteger(input.time) || input.time > now + 10000 || now - input.time > 120000) throw Error('Señal caducada o fecha no válida');
  if (![0, -1, 1].includes(input.direction) || !Number.isInteger(input.maxContracts) || input.maxContracts < 0 || input.maxContracts > 3) throw Error('Dirección o contratos no válidos');
  const result = { version: 1, id: input.id, symbol: input.symbol, time: input.time, stage: input.stage, direction: input.direction, maxContracts: input.maxContracts };
  for (const key of ['price', 'rangeHigh', 'rangeLow', 'entry', 'stop', 'target']) {
    const value = input[key];
    if (value !== null && (!Number.isFinite(value) || value <= 0 || value > 1000000)) throw Error('Precio o nivel no válido');
    result[key] = value;
  }
  if (result.price === null) throw Error('Falta el precio');
  if ((result.rangeHigh === null) !== (result.rangeLow === null) || (result.rangeHigh !== null && result.rangeHigh < result.rangeLow)) throw Error('Rango invertido');
  if (['long', 'short', 'retest'].includes(result.stage)) {
    if (!result.direction || result.maxContracts < 1 || [result.entry, result.stop, result.target].includes(null)) throw Error('Faltan niveles de la operación');
    if (result.direction * (result.target - result.entry) <= 0 || result.direction * (result.entry - result.stop) <= 0) throw Error('SL/TP incompatibles con la dirección');
    if (result.stage === 'long' && result.direction !== 1 || result.stage === 'short' && result.direction !== -1) throw Error('Señal contradictoria');
  }
  // Explicit allowlist: never retain webhook credentials or arbitrary payload fields.
  return result;
}

export function createAdminMiddleware({ password, webhookKey, clock = Date.now }) {
  if (!/^[a-f0-9]{64}$/.test(password) || !/^[a-f0-9]{64}$/.test(webhookKey)) throw Error('Credenciales locales no válidas');
  const sessions = new Map(), attempts = new Map(), seen = new Map();
  let latest = null, history = [];
  const send = (res, code, data, html = false) => {
    res.statusCode = code;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Type', html ? 'text/html; charset=utf-8' : 'application/json');
    res.end(html ? data : JSON.stringify(data));
  };
  const body = async req => {
    let text = '';
    for await (const chunk of req) { text += chunk; if (Buffer.byteLength(text) > 16384) throw Error('Mensaje demasiado grande'); }
    return text;
  };
  return async (req, res, next) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (path.startsWith('/server/') || path.startsWith('/@fs/') && path.includes('/server/')) return send(res, 404, { error: 'No disponible' });
    if (!(path === '/admin' || path.startsWith('/admin/') || path.startsWith('/api/admin/') || path === '/api/horus/webhook' || path === '/api/horus/latest')) return next();
    try {
      const now = clock();
      for (const [id, expires] of sessions) if (expires <= now) sessions.delete(id);
      for (const [id, expires] of seen) if (expires <= now) seen.delete(id);
      for (const [ip, value] of attempts) if (value.until <= now) attempts.delete(ip);
      if (path === '/api/horus/webhook') {
        if (req.method !== 'POST') return send(res, 405, { error: 'Usa POST' });
        const input = JSON.parse(await body(req));
        if (!same(input.key, webhookKey)) return send(res, 401, { error: 'No autorizado' });
        const signal = validateSignal(input, now);
        if (seen.has(signal.id)) return send(res, 200, { accepted: false, duplicate: true });
        if (latest && signal.time <= latest.time) return send(res, 409, { error: 'Evento anterior al último recibido' });
        seen.set(signal.id, now + 180000);
        latest = { ...signal, receivedAt: now };
        history = [latest, ...history].slice(0, 30);
        return send(res, 202, { accepted: true });
      }
      // Presentation snapshot for the local game client (no orders, no secrets).
      if (path === '/api/horus/latest') {
        if (req.method !== 'GET') return send(res, 405, { error: 'Usa GET' });
        if (!latest) return send(res, 200, { latest: null, stale: true });
        const { id, symbol, time, stage, direction, maxContracts, price, rangeHigh, rangeLow, entry, stop, target, receivedAt } = latest;
        const stageOut = stage === 'closed' ? 'flat' : stage;
        return send(res, 200, {
          latest: { id, symbol, time, stage: stageOut, direction, maxContracts, price, rangeHigh, rangeLow, entry, stop, target, receivedAt },
          stale: now - receivedAt > 360000,
        });
      }
      // Administration is local to this Mac. Do not trust forwarded headers.
      const host = new URL(`http://${req.headers.host || 'invalid'}`).hostname;
      if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) || !['localhost', '127.0.0.1', '[::1]'].includes(host)) return send(res, 403, { error: 'Administración disponible solo en este ordenador' });
      if (req.method === 'POST' && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return send(res, 403, { error: 'Origen no permitido' });
      if (path === '/api/admin/session' && req.method === 'POST') {
        const ip = req.socket.remoteAddress, limit = attempts.get(ip) || { count: 0, until: now + 60000 };
        if (limit.count >= 5) return send(res, 429, { error: 'Espera un minuto antes de intentarlo de nuevo' });
        const input = JSON.parse(await body(req));
        if (!same(input.password, password)) { limit.count++; attempts.set(ip, limit); return send(res, 401, { error: 'Clave incorrecta' }); }
        attempts.delete(ip);
        const token = secret(); sessions.set(token, now + 8 * 3600000);
        res.setHeader('Set-Cookie', `cp_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${req.socket.encrypted ? '; Secure' : ''}`);
        return send(res, 200, { ok: true });
      }
      const token = req.headers.cookie?.match(/(?:^|;\s*)cp_admin=([a-f0-9]{64})(?:;|$)/)?.[1];
      const authenticated = token && sessions.has(token);
      if (path === '/admin' || path === '/admin/') {
        if (req.method !== 'GET') return send(res, 405, { error: 'Usa GET' });
        return send(res, 200, authenticated ? page : login, true);
      }
      if (!authenticated) return send(res, 401, { error: 'Acceso de administrador requerido' });
      if (path === '/api/admin/logout' && req.method === 'POST') {
        sessions.delete(token); res.setHeader('Set-Cookie', 'cp_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
        return send(res, 200, { ok: true });
      }
      if (path === '/api/admin/status' && req.method === 'GET') return send(res, 200, { latest, history, stale: !latest || now - latest.receivedAt > 360000, gameConnected: false, brokerConnected: false });
      if (path === '/api/admin/setup' && req.method === 'GET') return send(res, 200, { webhookKey, endpoint: '/api/horus/webhook' });
      if (path === '/api/admin/indicator' && req.method === 'GET') {
        res.setHeader('Content-Disposition', 'attachment; filename="Horus-CrazyPig.pine"');
        return send(res, 200, readFileSync(new URL('./Horus-CrazyPig.pine', import.meta.url), 'utf8'), true);
      }
      return send(res, 404, { error: 'No encontrado' });
    } catch { return send(res, 400, { error: 'Solicitud no válida; comprueba formato, fecha y niveles' }); }
  };
}

export function adminPlugin() {
  let middleware;
  const mount = server => { middleware ||= createAdminMiddleware(credentials()); server.middlewares.use(middleware); };
  return { name: 'crazypig-private-admin', configureServer: mount, configurePreviewServer: mount };
}
