// 临时访客访问：授权持久化、进程内会话与在线状态。
// 授权（PIN 哈希）跨重启保留到到期；登录会话只存在于当前进程，重启即失效。

import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const MAX_ACTIVE_GRANTS = 5;
const MAX_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const RECENT_MS = 2 * 60 * 1000;

function defaultPath() {
  return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'dsh-pocket', 'guest-access.json');
}

function hashPin(pin, salt) {
  return createHash('sha256').update(`${salt}:${pin}`).digest('hex');
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

function sourceFor(host, isPublicHost) {
  return isPublicHost?.(host) ? 'public' : 'lan';
}

export function createGuestAccessManager({ path = defaultPath(), now = () => Date.now(), isPublicHost = () => false } = {}) {
  const sessions = new Map(); // opaque id -> { grantId, expiresAt, lastSeenAt, client, sockets }
  let data = load();

  function load() {
    try {
      const raw = JSON.parse(readFileSync(path, 'utf8'));
      return { enabled: raw?.enabled !== false, grants: Array.isArray(raw?.grants) ? raw.grants : [] };
    } catch { return { enabled: true, grants: [] }; }
  }
  function save() {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(data, null, 2), { mode: 0o600 });
  }
  function grantById(id) { return data.grants.find((g) => g.id === id); }
  function usable(g, source = null) {
    return !!g && data.enabled && !g.revokedAt && g.expiresAt > now() && g.loginEnabled !== false
      && (!source || g.scope === 'both' || g.scope === source);
  }
  function sessionUsable(g, source = null) {
    return !!g && data.enabled && !g.revokedAt && g.expiresAt > now()
      && (!source || g.scope === 'both' || g.scope === source);
  }
  function closeSession(id) {
    const s = sessions.get(id);
    if (!s) return;
    for (const socket of s.sockets) { try { socket.destroy(); } catch {} }
    sessions.delete(id);
  }
  function clean() {
    const t = now();
    for (const [id, s] of sessions) {
      const g = grantById(s.grantId);
      if (!sessionUsable(g) || s.expiresAt <= t) closeSession(id);
    }
  }
  function publicGrant(g) {
    const related = [...sessions.values()].filter((s) => s.grantId === g.id);
    const online = related.filter((s) => s.sockets.size > 0).length;
    const recent = related.filter((s) => s.sockets.size === 0 && now() - s.lastSeenAt <= RECENT_MS).length;
    return {
      id: g.id, label: g.label, scope: g.scope, createdAt: g.createdAt, expiresAt: g.expiresAt,
      revokedAt: g.revokedAt ?? null, loginEnabled: g.loginEnabled !== false,
      state: g.revokedAt ? 'revoked' : (g.expiresAt <= now() ? 'expired' : (g.loginEnabled === false ? 'disabled' : 'active')),
      online, recent, sessionCount: related.length, lastUsedAt: g.lastUsedAt ?? null,
      clients: related.map((s) => ({ lastSeenAt: s.lastSeenAt, online: s.sockets.size > 0, ...s.client })),
      hasInvite: !!g.inviteHash,
    };
  }

  return {
    status() { clean(); return { enabled: data.enabled, grants: data.grants.map(publicGrant) }; },
    setEnabled(on) {
      data.enabled = on === true;
      if (!data.enabled) for (const id of [...sessions.keys()]) closeSession(id);
      save();
      return this.status();
    },
    create({ label = '', durationMinutes = 60, scope = 'both' } = {}) {
      clean();
      const active = data.grants.filter((g) => !g.revokedAt && g.expiresAt > now());
      if (active.length >= MAX_ACTIVE_GRANTS) throw new Error(`最多同时保留 ${MAX_ACTIVE_GRANTS} 个有效访客 PIN | at most ${MAX_ACTIVE_GRANTS} active guest PINs`);
      const mins = Number(durationMinutes);
      if (!Number.isFinite(mins) || mins < 1 || mins * 60_000 > MAX_DURATION_MS) throw new Error('有效期必须为 1 分钟到 7 天 | duration must be between 1 minute and 7 days');
      if (!['lan', 'public', 'both'].includes(scope)) throw new Error('未知访问范围 | invalid guest scope');
      const pin = String(Math.floor(Math.random() * 100_000_000)).padStart(8, '0');
      const salt = randomBytes(16).toString('hex');
      const g = { id: randomUUID(), label: String(label).trim().slice(0, 40), scope, salt, pinHash: hashPin(pin, salt), createdAt: now(), expiresAt: now() + mins * 60_000, loginEnabled: true, revokedAt: null, lastUsedAt: null };
      data.grants.push(g); save();
      return { pin, grant: publicGrant(g) }; // 明文只返回这一次
    },
    verifyPin(pin, host, client = {}) {
      clean();
      if (!data.enabled || !/^\d{8}$/.test(String(pin))) return null;
      const source = sourceFor(host, isPublicHost);
      const g = data.grants.find((item) => usable(item, source) && safeEqual(hashPin(pin, item.salt), item.pinHash));
      if (!g) return null;
      const id = randomBytes(32).toString('base64url');
      const expiresAt = Math.min(g.expiresAt, now() + MAX_DURATION_MS);
      sessions.set(id, { grantId: g.id, expiresAt, lastSeenAt: now(), client: { source, ...client }, sockets: new Set() });
      g.lastUsedAt = now(); save();
      return { sessionId: id, expiresAt, grantId: g.id };
    },
    createInvite(id) {
      const g = grantById(id);
      if (!g || g.revokedAt || g.expiresAt <= now()) throw new Error('访客授权不存在或已失效 | guest grant is unavailable');
      const secret = randomBytes(24).toString('base64url');
      const salt = randomBytes(16).toString('hex');
      g.inviteSalt = salt;
      g.inviteHash = hashPin(secret, salt);
      save();
      return { secret, grant: publicGrant(g) }; // 只在生成时返回；再次生成会让旧链接失效
    },
    verifyInvite(secret, host, client = {}) {
      clean();
      if (!data.enabled || !secret) return null;
      const source = sourceFor(host, isPublicHost);
      const g = data.grants.find((item) => usable(item, source) && item.inviteHash && safeEqual(hashPin(secret, item.inviteSalt), item.inviteHash));
      if (!g) return null;
      const id = randomBytes(32).toString('base64url');
      const expiresAt = Math.min(g.expiresAt, now() + MAX_DURATION_MS);
      sessions.set(id, { grantId: g.id, expiresAt, lastSeenAt: now(), client: { source, ...client }, sockets: new Set() });
      g.lastUsedAt = now(); save();
      return { sessionId: id, expiresAt, grantId: g.id };
    },
    authenticate(sessionId, host, client = {}) {
      clean();
      const s = sessions.get(String(sessionId ?? ''));
      const source = sourceFor(host, isPublicHost);
      const g = s && grantById(s.grantId);
      if (!s || !sessionUsable(g, source) || s.expiresAt <= now()) return null;
      s.lastSeenAt = now(); s.client = { ...s.client, ...client, source };
      return { sessionId: String(sessionId), grantId: g.id, expiresAt: Math.min(s.expiresAt, g.expiresAt) };
    },
    attachSocket(sessionId, socket) {
      const s = sessions.get(String(sessionId ?? ''));
      if (!s) return;
      s.sockets.add(socket); s.lastSeenAt = now();
      const remove = () => { s.sockets.delete(socket); s.lastSeenAt = now(); };
      socket.once('close', remove); socket.once('error', remove);
    },
    setLoginEnabled(id, on) { const g = grantById(id); if (!g || g.revokedAt) throw new Error('访客授权不存在 | guest grant not found'); g.loginEnabled = on === true; save(); return this.status(); },
    kick(id) { for (const [sid, s] of sessions) if (s.grantId === id) closeSession(sid); return this.status(); },
    revoke(id) { const g = grantById(id); if (!g) throw new Error('访客授权不存在 | guest grant not found'); g.revokedAt = now(); g.loginEnabled = false; this.kick(id); save(); return this.status(); },
    dispose() { for (const id of [...sessions.keys()]) closeSession(id); },
  };
}
