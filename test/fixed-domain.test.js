// 固定域名（命名隧道 + Cloudflare Access）测试：
// settings 持久化 / isPublicHost 判定 / service 固定模式生命周期 / RPC / 隧道配置生成

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createPocketService } from '../lib/service.mjs';
import { installPocketRpc } from '../lib/web-rpc.js';
import { POCKET_RPC_CHANNEL, POCKET_ENDPOINTS, redactStatus } from '../client/api.js';
import { namedTunnelConfigYaml } from '../lib/tunnel.mjs';
import { normalizeHostname } from '../lib/settings.mjs';

/** 每个测试独立 DSH_HOME（settings.mjs / index.js 每次调用都读环境变量）。 */
async function withHome(fn) {
  const home = mkdtempSync(join(tmpdir(), 'dshp-fixed-'));
  const prev = process.env.DSH_HOME;
  process.env.DSH_HOME = home;
  try {
    return await fn(home);
  } finally {
    if (prev === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = prev;
    rmSync(home, { recursive: true, force: true });
  }
}

function fakeCtxConnection() {
  let handler = null;
  const handle = (channel, fn, opts) => {
    assert.equal(channel, POCKET_RPC_CHANNEL);
    handler = fn;
    return () => { handler = null; };
  };
  return { rpc: { handle }, get handler() { return handler; } };
}

/** stub 隧道：记录调用，支持固定/快速两种模式。 */
function stubInternals({ fixedUrl = 'https://dsh.example.com' } = {}) {
  const started = [];
  return {
    started,
    lanIPv4: () => '192.168.1.50',
    lanCandidates: async () => ['192.168.1.50'],
    encodeQr: async (text) => `data:qr;${text}`,
    createProxy: async ({ port }) => ({ port, close: async () => {} }),
    startTunnel: async ({ port, mode }) => {
      if (mode === 'fixed') {
        started.push(`fixed:${port}`);
        return { url: fixedUrl, kill: () => {} };
      }
      started.push(`quick:${port}`);
      return 'https://abc-123.trycloudflare.com';
    },
    startNamedTunnel: async ({ port, id, hostname }) => {
      started.push(`named:${id}:${hostname}:${port}`);
      return { url: `https://${hostname}`, kill: () => {} };
    },
    certExists: async () => true,
    resolveCloudflared: async () => 'cloudflared',
    startLogin: async () => ({ kill: () => {}, done: Promise.resolve({ code: 0 }) }),
  };
}

// ---------- settings：固定域名持久化 ----------
test('normalizeHostname：合法域名通过，协议/端口/路径/大写/IP 被处理或拒绝', async () => {
  const { normalizeHostname } = await import('../lib/settings.mjs');
  assert.equal(normalizeHostname('dsh.example.com'), 'dsh.example.com');
  assert.equal(normalizeHostname('  DSH.Example.COM '), 'dsh.example.com', '去空格转小写');
  assert.equal(normalizeHostname('https://dsh.example.com'), 'dsh.example.com', '去掉协议');
  assert.equal(normalizeHostname('https://dsh.example.com/abc'), 'dsh.example.com', '去掉路径');
  assert.equal(normalizeHostname('a.b.co'), 'a.b.co', '短 TLD 也可以');
  assert.equal(normalizeHostname('dsh.example.com:8443'), null, '带端口拒绝');
  assert.equal(normalizeHostname('192.168.1.5'), null, '纯 IP 拒绝');
  assert.equal(normalizeHostname('not a domain'), null, '含空格拒绝');
  assert.equal(normalizeHostname(''), null, '空串拒绝');
  assert.equal(normalizeHostname('localhost'), null, '单段拒绝');
});

test('settings：setFixedHostname 校验并持久化；setFixedTunnelId / setFixedRouted / Access 开关', () => withHome(async () => {
  const { setFixedHostname, fixedHostname, setFixedTunnelId, fixedTunnelId, setFixedRouted, fixedRouted, setFixedAccessEnabled, fixedAccessEnabled, setFixedPinAlways, fixedPinAlways, settingsPath, normalizeHostname } = await import('../lib/settings.mjs');
  assert.equal(fixedHostname(), '', '默认未配置');
  assert.throws(() => setFixedHostname('http://bad'), /合法域名/, '非法域名拒绝');

  assert.equal(setFixedHostname('https://dsh.example.com'), 'dsh.example.com', '规范化后保存');
  assert.equal(fixedHostname(), 'dsh.example.com', '读取生效');
  const raw = JSON.parse(readFileSync(settingsPath(), 'utf8'));
  assert.equal(raw.fixedHostname, 'dsh.example.com', 'settings.json 持久化');
  assert.equal(raw.fixedRouted, false, '改域名后 DNS 绑定标记重置');

  // 改域名 → 旧 routed 标记清掉
  assert.equal(setFixedRouted(true), true, '绑定标记置位');
  assert.equal(fixedRouted(), true, '读取绑定标记');
  setFixedHostname('dsh2.example.com');
  assert.equal(fixedRouted(), false, '换域名后需重新绑定');

  assert.equal(setFixedTunnelId('abc-123-456'), 'abc-123-456', '保存隧道 ID');
  assert.equal(fixedTunnelId(), 'abc-123-456', '读取隧道 ID');

  assert.equal(fixedAccessEnabled(), false, 'Access 默认关');
  assert.equal(setFixedAccessEnabled(true), true, '开启 Access');
  assert.equal(fixedAccessEnabled(), true, '读取 Access');
  assert.equal(fixedPinAlways(), false, '额外 PIN 默认关');
  assert.equal(setFixedPinAlways(true), true, '开启额外 PIN');
  assert.equal(fixedPinAlways(), true, '读取额外 PIN');
  assert.equal(normalizeHostname('a'), null, 'normalizeHostname 可用');
}));

// ---------- isPublicHost（index.js）：固定域名视为公网 ----------
test('isPublicHost：trycloudflare 恒为公网；固定域名匹配（忽略端口）；局域网 IP 不是', () => withHome(async () => {
  const { isPublicHost } = await import('../lib/index.js');
  const { setFixedHostname } = await import('../lib/settings.mjs');
  assert.equal(isPublicHost('abc.trycloudflare.com'), true, '快速隧道');
  assert.equal(isPublicHost('x.trycloudflare.com'), true, '任意子域');
  assert.equal(isPublicHost('192.168.1.50:3081'), false, '未配置固定域名时局域网 IP 不算公网');

  setFixedHostname('dsh.example.com');
  assert.equal(isPublicHost('dsh.example.com'), true, '固定域名精确匹配');
  assert.equal(isPublicHost('DSH.EXAMPLE.COM'), true, '大小写不敏感');
  assert.equal(isPublicHost('dsh.example.com:443'), true, '带端口忽略');
  assert.equal(isPublicHost('other.example.com'), false, '同域其他子域不匹配');
  assert.equal(isPublicHost('192.168.1.50:3081'), false, '局域网 IP 仍不是公网');
}));

// ---------- service：固定域名生命周期 ----------
test('service：fixed 模式启动命名隧道；tunnelMode/URL/二维码/状态齐全；stop 归位', async () => {
  const internals = stubInternals();
  let hostname = 'dsh.example.com';
  let tunnelId = 'tid-1234';
  let cert = true;
  const service = createPocketService({
    dshPort: 3080, port: 3081, internals,
    getFixedHostname: () => hostname,
    getFixedTunnelId: () => tunnelId,
    getFixedRouted: () => true,
    getFixedAccessEnabled: () => true,
    getFixedPinAlways: () => false,
  });
  internals.certExists = async () => cert;
  await service.startProxy();

  const url = await service.startTunnel({ mode: 'fixed' });
  assert.equal(url, 'https://dsh.example.com', '固定 URL');
  assert.deepEqual(internals.started, ['named:tid-1234:dsh.example.com:3081'], '命名隧道指向代理端口');
  const st = await service.status();
  assert.equal(st.tunnelRunning, true);
  assert.equal(st.tunnelMode, 'fixed', '模式固定');
  assert.equal(st.tunnelUrl, 'https://dsh.example.com');
  assert.equal(st.tunnelQr, 'data:qr;https://dsh.example.com');
  assert.equal(st.fixed.hostname, 'dsh.example.com');
  assert.equal(st.fixed.setup.cert, true, 'cert 状态');
  assert.equal(st.fixed.setup.tunnel, true, 'tunnel 状态');
  assert.equal(st.fixed.setup.dns, true, 'dns 状态');

  service.stopTunnel();
  const after = await service.status();
  assert.equal(after.tunnelRunning, false);
  assert.equal(after.tunnelMode, null);
  await service.dispose();
});

test('service：fixed 模式前置校验——未配置域名/未初始化/未登录分别报错', async () => {
  const internals = stubInternals();
  let hostname = '';
  let tunnelId = '';
  let cert = false;
  internals.certExists = async () => cert; // 必须在 createPocketService 之前注入（certCheck 创建时捕获）
  const service = createPocketService({
    dshPort: 3080, port: 3081, internals,
    getFixedHostname: () => hostname,
    getFixedTunnelId: () => tunnelId,
    getFixedRouted: () => true,
    getFixedAccessEnabled: () => true,
    getFixedPinAlways: () => false,
  });
  await service.startProxy();

  await assert.rejects(service.startTunnel({ mode: 'fixed' }), /固定域名/, '未配置域名报错');
  hostname = 'dsh.example.com';
  await assert.rejects(service.startTunnel({ mode: 'fixed' }), /未初始化/, '未建隧道报错');
  tunnelId = 'tid-1';
  await assert.rejects(service.startTunnel({ mode: 'fixed' }), /登录 Cloudflare/, '未登录报错');
  cert = true;
  const url = await service.startTunnel({ mode: 'fixed' });
  assert.equal(url, 'https://dsh.example.com', '前置齐备后成功');
  await service.dispose();
});

test('service：固定 ⇄ 快速切换互斥——开启 fixed 会停掉 quick，反向亦然', async () => {
  const internals = stubInternals();
  const service = createPocketService({
    dshPort: 3080, port: 3081, internals,
    getFixedHostname: () => 'dsh.example.com',
    getFixedTunnelId: () => 'tid-1',
    getFixedRouted: () => true,
    getFixedAccessEnabled: () => true,
    getFixedPinAlways: () => false,
  });
  await service.startProxy();

  await service.startTunnel(); // quick
  assert.equal((await service.status()).tunnelMode, 'quick');
  await service.startTunnel({ mode: 'fixed' }); // 切 fixed → 停 quick
  let st = await service.status();
  assert.equal(st.tunnelMode, 'fixed');
  assert.deepEqual(internals.started, ['quick:3081', 'named:tid-1:dsh.example.com:3081']);
  // 同模式复用不重启
  await service.startTunnel({ mode: 'fixed' });
  assert.deepEqual(internals.started, ['quick:3081', 'named:tid-1:dsh.example.com:3081'], '同模式复用');
  // 切回 quick
  await service.startTunnel();
  st = await service.status();
  assert.equal(st.tunnelMode, 'quick');
  assert.equal(st.tunnelUrl, 'https://abc-123.trycloudflare.com');
  await service.dispose();
});

test('service：自动恢复按模式拉起——fixed 模式恢复命名隧道（issue #11 扩展）', async () => {
  const fsp = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const home = await fsp.mkdtemp(path.join(os.tmpdir(), 'dshp-fixed-auto-'));

  const internals = stubInternals();
  let startCount = 0;
  internals.startNamedTunnel = async ({ port, id, hostname }) => {
    startCount += 1;
    return { url: `https://${hostname}`, kill: () => {} };
  };
  internals.startTunnel = async ({ port, mode }) => {
    if (mode === 'fixed') {
      startCount += 1;
      return { url: 'https://dsh.example.com', kill: () => {} };
    }
    return 'https://q.trycloudflare.com';
  };
  const service = createPocketService({
    dshPort: 3080, port: 3081, home, internals,
    getFixedHostname: () => 'dsh.example.com',
    getFixedTunnelId: () => 'tid-1',
    getFixedRouted: () => true,
    getFixedAccessEnabled: () => true,
    getFixedPinAlways: () => false,
  });
  await service.startProxy();

  await service.startTunnel({ mode: 'fixed' });
  await new Promise((r) => setTimeout(r, 60));
  const statePath = path.join(home, 'dsh-pocket', 'tunnel-auto.json');
  const raw = JSON.parse(await fsp.readFile(statePath, 'utf8'));
  assert.equal(raw.mode, 'fixed', '标记记录模式');
  assert.equal(raw.hostname, 'dsh.example.com', '标记记录域名');

  // 模拟重启：新 service → 按 fixed 模式恢复
  const service2 = createPocketService({
    dshPort: 3080, port: 3081, home, internals,
    getFixedHostname: () => 'dsh.example.com',
    getFixedTunnelId: () => 'tid-1',
    getFixedRouted: () => true,
    getFixedAccessEnabled: () => true,
    getFixedPinAlways: () => false,
  });
  await service2.startProxy();
  await service2.restoreTunnelIfNeeded();
  assert.equal((await service2.status()).tunnelMode, 'fixed', '按 fixed 模式恢复');
  await fsp.rm(home, { recursive: true, force: true });
});

test('service：status.fixedLogin 反映登录进程（URL + running），进程退出后清空', async () => {
  const internals = stubInternals();
  let resolveDone;
  internals.resolveCloudflared = async () => 'cloudflared';
  internals.startLogin = ({ onUrl }) => {
    onUrl('https://dash.cloudflare.com/argotunnel?callback=x');
    return { kill: () => {}, done: new Promise((r) => { resolveDone = r; }) };
  };
  const service = createPocketService({ dshPort: 3080, port: 3081, internals });
  const r = await service.startFixedLogin();
  assert.equal(r.url, 'https://dash.cloudflare.com/argotunnel?callback=x', '返回授权 URL');
  const st = await service.status();
  assert.ok(st.fixedLogin, 'fixedLogin 对象存在（登录进行中）');
  assert.equal(st.fixedLogin.url, 'https://dash.cloudflare.com/argotunnel?callback=x', 'status 带登录 URL');
  assert.equal(st.fixedLogin.startedAt > 0, true, '记录开始时间');
  // 进程退出（无论成功与否）→ 不再标记 running（cert 是否存在由 status.fixed.setup.cert 反映）
  resolveDone({ code: 0 });
  await new Promise((r2) => setTimeout(r2, 20));
  assert.equal((await service.status()).fixedLogin, null, '进程退出后 fixedLogin 清空');
  await service.dispose();
});

// ---------- RPC：fixed.* 端点 ----------
test('RPC：fixed.setHostname 校验/保存，fixed.setAccess / setPinAlways 切换，status 透出', async () => {
  const internals = stubInternals();
  let hostname = '';
  let access = false;
  let pinAlways = false;
  const service = createPocketService({
    dshPort: 3080, port: 3081, internals,
    getFixedHostname: () => hostname,
    getFixedTunnelId: () => 'tid-1',
    getFixedRouted: () => true,
    getFixedAccessEnabled: () => access,
    getFixedPinAlways: () => pinAlways,
  });
  const conn = fakeCtxConnection();
  installPocketRpc({ connection: conn }, {
    service,
    getFixedHostname: () => hostname,
    setFixedHostname: (v) => {
      // 与生产一致（lib/index.js 传的是 settings.setFixedHostname）：非法输入抛错
      const n = normalizeHostname(v);
      if (!n) throw new Error('固定域名必须是合法域名（如 dsh.example.com），不能带协议/端口/路径 | hostname must be a valid domain like dsh.example.com');
      hostname = n;
      return n;
    },
    getFixedAccessEnabled: () => access,
    setFixedAccessEnabled: (on) => { access = on === true; return access; },
    getFixedPinAlways: () => pinAlways,
    setFixedPinAlways: (on) => { pinAlways = on === true; return pinAlways; },
    fixedSetup: async () => ({ id: 'tid-1', hostname }),
    log: { error() {}, warn() {} },
  });
  await service.startProxy();

  // 非法域名 → 拒绝
  const bad = await conn.handler(POCKET_ENDPOINTS.fixedSetHostname, { hostname: 'http://bad' });
  assert.equal(bad.ok, false, '非法域名拒绝');

  const ok = await conn.handler(POCKET_ENDPOINTS.fixedSetHostname, { hostname: 'https://dsh.example.com' });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.fixed.hostname, 'dsh.example.com', 'status 反映保存');

  const acc = await conn.handler(POCKET_ENDPOINTS.fixedSetAccess, { on: true });
  assert.equal(acc.ok, true);
  assert.equal(acc.value.fixed.accessEnabled, true, 'Access 开启');

  const pin = await conn.handler(POCKET_ENDPOINTS.fixedSetPinAlways, { on: true });
  assert.equal(pin.ok, true);
  assert.equal(pin.value.fixed.pinAlways, true, '额外 PIN 开启');

  // tunnel.start 支持 mode
  const t = await conn.handler(POCKET_ENDPOINTS.tunnelStart, { disclaimer: true, mode: 'fixed' });
  assert.equal(t.ok, true);
  assert.equal(t.value.tunnelMode, 'fixed', 'fixed 模式开启');
  assert.equal(t.value.tunnelUrl, 'https://dsh.example.com');

  // fixed.login / fixed.setup 端点可达
  const login = await conn.handler(POCKET_ENDPOINTS.fixedLogin, {});
  assert.equal(login.ok, true, '登录端点可用');
  const setup = await conn.handler(POCKET_ENDPOINTS.fixedSetup, {});
  assert.equal(setup.ok, true, '初始化端点可用');

  await service.dispose();
});

// ---------- tunnel.mjs：命名隧道配置生成 ----------
test('namedTunnelConfigYaml：只匹配目标 hostname，其余 404；凭证路径正确', () => {
  const yaml = namedTunnelConfigYaml({
    id: 'tid-1',
    hostname: 'dsh.example.com',
    port: 3081,
    credentialsFile: 'C:\\Users\\me\\.cloudflared\\tid-1.json',
  });
  assert.ok(yaml.includes('tunnel: tid-1'), '隧道 ID');
  assert.ok(yaml.includes('credentials-file:'), '凭证文件');
  assert.ok(yaml.includes('hostname: dsh.example.com'), '域名');
  assert.ok(yaml.includes('service: http://127.0.0.1:3081'), '指向本机代理');
  assert.ok(yaml.includes('http_status:404'), '兜底 404（不是 catch-all）');
  const ingressSection = yaml.slice(yaml.indexOf('ingress:'));
  assert.ok(ingressSection.indexOf('hostname:') < ingressSection.indexOf('http_status:404'), 'hostname 规则在兜底之前');
});

test('redactStatus：透出固定域名字段且不含敏感信息', () => {
  const s = redactStatus({
    tunnelMode: 'fixed',
    fixed: { hostname: 'dsh.example.com', accessEnabled: true, pinAlways: false, setup: { cert: true, tunnel: true, dns: true } },
    fixedLogin: { url: 'https://dash.cloudflare.com/argotunnel?callback=x', startedAt: 1 },
  });
  assert.equal(s.tunnelMode, 'fixed');
  assert.equal(s.fixed.hostname, 'dsh.example.com');
  assert.equal(s.fixed.accessEnabled, true);
  assert.equal(s.fixed.setup.cert, true);
  assert.equal(s.fixedLogin.url, 'https://dash.cloudflare.com/argotunnel?callback=x');
  // 未提供时给出安全默认
  const empty = redactStatus({});
  assert.deepEqual(empty.fixed.setup, { cert: false, tunnel: false, dns: false });
  assert.equal(empty.fixedLogin, null);
});
