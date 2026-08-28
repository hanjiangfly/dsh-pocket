import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EventEmitter } from 'node:events';
import { createGuestAccessManager } from '../lib/guest-access.mjs';

test('临时访客授权：范围、过期、禁用登录、踢下线与作废', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-pocket-guest-'));
  let clock = 1_000_000;
  const manager = createGuestAccessManager({ path: join(dir, 'guest.json'), now: () => clock, isPublicHost: (h) => h.includes('public') });
  try {
    const made = manager.create({ label: '同事', durationMinutes: 15, scope: 'public' });
    assert.match(made.pin, /^\d{8}$/);
    assert.equal(manager.verifyPin(made.pin, 'lan.local'), null, '范围不符不能登录');
    const login = manager.verifyPin(made.pin, 'public.example');
    assert.ok(login?.sessionId);
    assert.ok(manager.authenticate(login.sessionId, 'public.example'));
    const invite1 = manager.createInvite(made.grant.id);
    assert.ok(manager.verifyInvite(invite1.secret, 'public.example'), '安全邀请链接可换取会话');
    const invite2 = manager.createInvite(made.grant.id);
    assert.equal(manager.verifyInvite(invite1.secret, 'public.example'), null, '重新生成后旧邀请链接失效');
    assert.ok(manager.verifyInvite(invite2.secret, 'public.example'));

    const socket = new EventEmitter(); socket.destroyed = false; socket.destroy = () => { socket.destroyed = true; socket.emit('close'); };
    manager.attachSocket(login.sessionId, socket);
    assert.equal(manager.status().grants[0].online, 1);
    manager.setLoginEnabled(made.grant.id, false);
    assert.equal(manager.verifyPin(made.pin, 'public.example'), null, '禁用后禁止新登录');
    assert.ok(manager.authenticate(login.sessionId, 'public.example'), '禁用新登录不影响现有会话');
    manager.kick(made.grant.id);
    assert.equal(socket.destroyed, true);
    assert.equal(manager.authenticate(login.sessionId, 'public.example'), null);

    manager.setLoginEnabled(made.grant.id, true);
    const second = manager.verifyPin(made.pin, 'public.example');
    manager.revoke(made.grant.id);
    assert.equal(manager.authenticate(second.sessionId, 'public.example'), null, '作废立即终止会话');
  } finally { manager.dispose(); rmSync(dir, { recursive: true, force: true }); }
});

test('访客 PIN 授权跨重启保留，但登录会话不保留且按时到期', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-pocket-guest-'));
  const path = join(dir, 'guest.json');
  let clock = 2_000_000;
  try {
    const first = createGuestAccessManager({ path, now: () => clock, isPublicHost: () => true });
    const made = first.create({ durationMinutes: 1 });
    const oldSession = first.verifyPin(made.pin, 'public');
    first.dispose();
    const second = createGuestAccessManager({ path, now: () => clock, isPublicHost: () => true });
    assert.equal(second.authenticate(oldSession.sessionId, 'public'), null, '重启后旧会话失效');
    assert.ok(second.verifyPin(made.pin, 'public'), '未到期 PIN 可重新登录');
    clock += 60_001;
    assert.equal(second.verifyPin(made.pin, 'public'), null, '到期后 PIN 失效');
    second.dispose();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
