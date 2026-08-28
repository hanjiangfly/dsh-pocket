// dsh-pocket 服务：在 dsh web 进程内跑改头代理 + 公网隧道
//
// - 代理：监听 0.0.0.0:<port>（默认 3081），把入站 Host/Origin 改写成
//   127.0.0.1:<dshPort>（dsh web 实际端口），HTTP + WebSocket 全透传。
//   这样 DSH 的 /api 浏览器信任栅栏永远看到 loopback，局域网/公网都能进，
//   且不需要改 dsh 的任何配置（0.0.0.0 绑定被 dsh 官方禁用）。
// - 隧道：cloudflared 快速隧道（可选），公网 https URL，供人在外面访问。

import { networkInterfaces } from 'node:os';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { request as httpsRequest } from 'node:https';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createPocketProxy } from './proxy.mjs';
import { startQuickTunnel, startNamedTunnel, startLogin, certExists, openBrowser, resolveCloudflared } from './tunnel.mjs';
import { isValidIpv4 } from './ip.mjs';

const require = createRequire(import.meta.url);

/** 无 cookie 的边缘探测：仅接受 Cloudflare Access 登录跳转，不接受源站/PIN 页面。 */
export function probeCloudflareAccess(hostname, { timeoutMs = 12_000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = httpsRequest({ hostname, port: 443, path: '/', method: 'GET', headers: { 'User-Agent': 'dsh-pocket-access-probe/1' } }, (res) => {
      res.resume();
      const location = String(res.headers.location ?? '');
      resolve(res.statusCode >= 300 && res.statusCode < 400 && /cloudflareaccess\.com|\/cdn-cgi\/access\//i.test(location));
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('连接超时')));
    req.once('error', reject);
    req.end();
  });
}

/** URL → 二维码 data URL（浏览器 <img> 直接显示，全本地不依赖第三方）。 */
export async function qrDataUrl(text, { width = 220, margin = 1 } = {}) {
  const QRCode = require('qrcode');
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin, width, type: 'image/png' });
}

/** RFC1918 私网地址：手机与电脑连同一局域网时通常可直连。 */
const PRIVATE_IPV4_RE = /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/;

/** 名称像真实物理网卡的接口（WLAN / Wi-Fi / Ethernet / 以太网 / 有线 / 无线 / en / eth）。 */
const PHYSICAL_IFACE_RE = /^(?:wlan|wi-?fi|wireless|ethernet|eth\d|en\d|wlp\d|以太网|有线|无线|本地连接)/i;

/** 常见的 VPN / 虚拟网卡名称：手机通常无法通过它们直连电脑。 */
const VPN_IFACE_RE = /(?:radmin|tailscale|zerotier|easytier|et_|tun|tap|vpn|vethernet|virtual|vmware|virtualbox|wsl|docker|teredo|hamachi|bluetooth|bridge)/i;

/**
 * 可直接用于远程手机访问的已连接虚拟局域网网卡。
 * 这里刻意只识别首发承诺的两种服务；其它 VPN 不会被误标成可用的虚拟局域网。
 */
export function detectVirtualNetworks(interfaces) {
  const found = [];
  for (const [interfaceName, addrs] of Object.entries(interfaces ?? {})) {
    const kind = /tailscale/i.test(interfaceName) ? 'tailscale'
      : /zerotier/i.test(interfaceName) ? 'zerotier' : null;
    if (!kind) continue;
    for (const addr of addrs ?? []) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      const ip = addr.address;
      if (!ip || ip.startsWith('127.') || ip.startsWith('169.254.')) continue;
      found.push({ kind, label: kind === 'tailscale' ? 'Tailscale' : 'ZeroTier', ip, interfaceName });
    }
  }
  return found;
}

/**
 * 从 networkInterfaces() 返回的接口表里选出手机最可能可达的 IPv4。
 *
 * `os.networkInterfaces()` 的枚举顺序不可靠：Windows 上 Radmin VPN / Tailscale /
 * vEthernet 等虚拟网卡常排在 WLAN 前面，旧实现直接取第一张非回环网卡，会生成
 * 手机打不开的二维码。这里按以下规则打分排序：
 *   - RFC1918 私网地址优先（10/8、172.16/12、192.168/16）；
 *   - 名称像物理网卡再加分；
 *   - 名称像 VPN/虚拟网卡减分；
 *   - 同分保持原枚举顺序。
 * 没有任何私网地址时回退到最高分地址（例如纯 VPN 环境仍可用）。
 *
 * @param {ReturnType<typeof networkInterfaces>} interfaces
 * @returns {string|null}
 */
export function selectLanIPv4(interfaces) {
  const candidates = [];
  for (const [name, addrs] of Object.entries(interfaces ?? {})) {
    for (const addr of addrs ?? []) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      const ip = addr.address;
      // 排除 loopback 与 link-local；其余地址即使不是私网（如 Radmin 的 26.x）也保留兜底
      if (!ip || ip.startsWith('127.') || ip.startsWith('169.254.')) continue;

      let score = 0;
      if (PRIVATE_IPV4_RE.test(ip)) score += 100;
      if (PHYSICAL_IFACE_RE.test(name)) score += 20;
      else if (VPN_IFACE_RE.test(name)) score -= 50;

      candidates.push({ ip, score, order: candidates.length });
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.order - b.order);
  return candidates[0]?.ip ?? null;
}

// ---------- WSL 局域网 IP（issue #39） ----------
// WSL2 是 NAT 模式：WSL 内部 os.networkInterfaces() 只能看到自己的虚拟网卡
// （172.x.x.x），看不到 Windows 宿主机的物理网卡 IP（192.168.x.x）——手机在
// 同一 WiFi 下访问的是 Windows 宿主机，拿 WSL 的 IP 生成的二维码必然打不开。
// 解法：检测到 WSL 时，通过 WSL interop 直接执行 Windows 的 ipconfig.exe，
// 解析出 Windows 侧非虚拟网卡的 IPv4 作为局域网地址；失败回退本机探测。

/** WSL 检测：/proc/version 含 microsoft/wsl，或 WSL 专属环境变量存在。 */
export function detectWsl() {
  try {
    const v = readFileSync('/proc/version', 'utf8').toLowerCase();
    if (v.includes('microsoft') || v.includes('wsl')) return true;
  } catch { /* 非 Linux：无 /proc/version */ }
  // 注意：**不能**用 WSLENV 判据——Windows Terminal 在原生 Windows 上也会设置
  // WSLENV（如 WT_SESSION:WT_PROFILE_ID:），会误判成 WSL。只认 WSL 内部才有的变量。
  return Boolean(process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP);
}

/**
 * 解析 ipconfig.exe 输出，默认取非虚拟网卡块的 IPv4 地址（保持输出顺序）。
 * 支持中文（`IPv4 地址 . . . :`）与英文（`IPv4 Address. . . :`）两种格式。
 * @param {string} text ipconfig.exe 的完整输出
 * @param {{ includeVpn?: boolean }} [opts] 传 includeVpn 时保留 Tailscale/VPN 等候选
 * @returns {string[]} 候选 IPv4 列表
 */
export function parseIpconfig(text, { includeVpn = false } = {}) {
  const out = [];
  // 网卡块：块标题行顶格（行首无缩进），其后内容行带缩进
  const blocks = String(text).split(/\r?\n(?=\S)/);
  const ipRe = /IPv4[^0-9]{0,40}((?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)/;
  for (const block of blocks) {
    const title = String(block.split(/\r?\n/)[0] ?? '');
    // 跳过虚拟网卡块（vEthernet (WSL)、Docker、VirtualBox、VPN 等）
    if (!includeVpn && VPN_IFACE_RE.test(title)) continue;
    const m = block.match(ipRe);
    if (m) out.push(m[0].replace(/^IPv4[^0-9]*/i, ''));
  }
  return out;
}

function runIpconfig() {
  // WSL 内 PATH 可能不含 Windows System32；用绝对路径兜底
  const candidates = ['ipconfig.exe', '/mnt/c/Windows/System32/ipconfig.exe'];
  return new Promise((resolve) => {
    const tryNext = (i) => {
      if (i >= candidates.length) return resolve(null);
      execFile(candidates[i], [], { timeout: 5000, windowsHide: true }, (err, stdout) => {
        if (err || !stdout) return tryNext(i + 1);
        resolve(String(stdout));
      });
    };
    tryNext(0);
  });
}

async function lanIPv4() {
  // WSL：优先 Windows 物理网卡 IP（手机可达）；超时/失败回退本机探测
  if (detectWsl()) {
    try {
      const out = await runIpconfig();
      const candidates = parseIpconfig(out ?? '');
      const ip = candidates.find((c) => PRIVATE_IPV4_RE.test(c)) ?? candidates[0];
      if (ip) return ip;
    } catch { /* 回退 */ }
  }
  return selectLanIPv4(networkInterfaces());
}

/** 收集所有可手动选择的局域网/Tailnet 候选 IP（WSL 下以 Windows ipconfig 为准）。 */
async function listLanCandidates() {
  if (detectWsl()) {
    try {
      const out = await runIpconfig();
      const ips = parseIpconfig(out ?? '', { includeVpn: true });
      if (ips.length) return [...new Set(ips)];
    } catch { /* 回退 */ }
  }
  const ips = [];
  for (const [name, addrs] of Object.entries(networkInterfaces())) {
    for (const addr of addrs ?? []) {
      if (addr.family !== 'IPv4' || addr.internal) continue;
      const ip = addr.address;
      if (!ip || ip.startsWith('127.') || ip.startsWith('169.254.')) continue;
      if (!ips.includes(ip)) ips.push(ip);
    }
  }
  return ips;
}

/**
 * 创建 Pocket 服务。
 * @param {object} opts
 * @param {number} opts.dshPort   dsh web 实际端口（从 ctx.webServer.port 取）
 * @param {number} [opts.port]    代理端口（默认 3081）
 * @param {object} [opts.internals] 测试注入：createProxy / startTunnel / lanIPv4
 * @returns {PocketService}
 */
export function createPocketService({
  dshPort,
  port = 3081,
  /** true 时 port 是用户明确指定的端口，被占用即报错，不自动换号。 */
  strictPort = false,
  home,
  internals = {},
  /** 局域网地址手动覆盖：返回 IPv4 字符串；空值表示自动选择 */
  getLanIpOverride,
  /** 局域网访问总开关：返回 boolean；默认开启。关闭后代理拒绝局域网 Host 请求 */
  getLanEnabled = () => true,
  /** 代理注入 HTML 的内容（桌面端补丁等由 lib/index.js 传入；默认 randomUUID polyfill） */
  injectHtml,
  /** 访问令牌认证配置（issue #13）：{ getToken, isProtected }，传给代理 */
  auth,
  /** 隧道就绪回调（lib/index.js 用它轮换公网密码） */
  onTunnelReady,
  /** 固定域名（命名隧道）配置 getter（lib/index.js 从 settings.mjs 传入） */
  getFixedHostname,
  getFixedTunnelId,
  getFixedRouted,
  getFixedAccessEnabled,
  getFixedPinAlways,
  setFixedAccessVerified,
  /** 是否已由用户明确授权重启后恢复公网；未传入时保持旧服务测试的兼容行为。 */
  getPublicAutoRestore = () => true,
  /** 「公网 Host」判定（lib/index.js 传入）：快速隧道 + 固定域名都算公网 */
  isPublicHost,
} = {}) {
  const createProxy = internals.createProxy ?? createPocketProxy;
  const startTunnelFn = internals.startTunnel ?? startQuickTunnel;
  const startNamedFn = internals.startNamedTunnel ?? startNamedTunnel;
  const loginFn = internals.startLogin ?? startLogin;
  const probeAccess = internals.probeCloudflareAccess ?? probeCloudflareAccess;
  const certCheck = internals.certExists ?? certExists;
  const resolveBin = internals.resolveCloudflared ?? resolveCloudflared;
  const getLanOverride = () => {
    const value = String(getLanIpOverride?.() ?? '').trim();
    return isValidIpv4(value) ? value : '';
  };
  const getLan = async () => getLanOverride() || (internals.lanIPv4 ? internals.lanIPv4() : lanIPv4());
  let lanCandidateCache = null;
  const getLanCandidates = async () => {
    if (internals.lanCandidates) return internals.lanCandidates();
    const now = Date.now();
    if (!lanCandidateCache || now - lanCandidateCache.at > 15000) {
      lanCandidateCache = { at: now, ips: await listLanCandidates() };
    }
    return lanCandidateCache.ips;
  };
  const getVirtualNetworks = async () => {
    if (internals.virtualNetworks) return internals.virtualNetworks();
    const now = Date.now();
    if (!virtualNetworkCache || now - virtualNetworkCache.at > 15_000) {
      virtualNetworkCache = { at: now, networks: detectVirtualNetworks(networkInterfaces()) };
    }
    return virtualNetworkCache.networks;
  };
  let virtualNetworkCache = null;
  const defaultProxyPort = port;
  let preferredProxyPort = port;
  let proxyPortIsCustom = strictPort === true;

  let proxy = null;
  let tunnel = null;
  let tunnelAbort = null;
  /** 当前隧道模式：'quick' | 'fixed' | null（没跑隧道时 null） */
  let tunnelMode = null;
  /** in-flight 隧道启动（单飞）：并发调用复用同一次，避免 spawn 多个 cloudflared 孤儿进程 */
  let tunnelPromise = null;
  /** 隧道进度：{ phase: idle|downloading|starting|registering|ready|error, detail, startedAt } */
  const tunnelState = { phase: 'idle', detail: '', startedAt: null };
  /** 固定域名登录进程（cloudflared tunnel login）：{ running, url, startedAt, kill } */
  const fixedLogin = { running: false, url: '', startedAt: 0, kill: null };
  const fixedAccessCheck = { state: 'not-requested', detail: '', checkedAt: null };
  let fixedAccessProbeTimer = null;
  const setAccessGate = (verified) => { try { setFixedAccessVerified?.(verified === true); } catch { /* ignore */ } };
  async function verifyFixedAccess() {
    const hostname = String(getFixedHostname?.() ?? '').trim();
    if (!getFixedAccessEnabled?.() || !hostname || tunnelMode !== 'fixed' || !tunnel) {
      fixedAccessCheck.state = 'not-requested'; fixedAccessCheck.detail = ''; fixedAccessCheck.checkedAt = Date.now(); setAccessGate(false);
      return false;
    }
    fixedAccessCheck.state = 'checking'; fixedAccessCheck.detail = '正在验证 Cloudflare Access 网关…'; fixedAccessCheck.checkedAt = Date.now(); setAccessGate(false);
    try {
      const ok = await probeAccess(hostname);
      fixedAccessCheck.state = ok ? 'verified' : 'failed';
      fixedAccessCheck.detail = ok ? 'Cloudflare Access 登录墙已验证' : '未检测到 Cloudflare Access 登录墙，PIN 已强制开启';
      fixedAccessCheck.checkedAt = Date.now(); setAccessGate(ok); return ok;
    } catch (err) {
      fixedAccessCheck.state = 'failed'; fixedAccessCheck.detail = `Access 验证失败，PIN 已强制开启：${err?.message ?? err}`;
      fixedAccessCheck.checkedAt = Date.now(); setAccessGate(false); return false;
    }
  }
  function scheduleFixedAccessVerification() {
    if (fixedAccessProbeTimer) clearInterval(fixedAccessProbeTimer);
    fixedAccessProbeTimer = setInterval(() => { void verifyFixedAccess(); }, 5 * 60_000);
    fixedAccessProbeTimer.unref?.(); // 不因安全复验定时器阻止宿主退出
  }
  function clearFixedAccessVerification() {
    if (fixedAccessProbeTimer) clearInterval(fixedAccessProbeTimer);
    fixedAccessProbeTimer = null;
  }
  /** 二维码缓存：URL → data URL promise。status() 每 3 秒轮询一次，不能每次都重新生成（CPU 密集）。 */
  const qrCache = new Map();
  const encodeQr = internals.encodeQr ?? qrDataUrl;
  async function qrCached(text) {
    if (!text) return null;
    if (!qrCache.has(text)) {
      if (qrCache.size >= 8) {
        // 只淘汰最旧一条（隧道 URL 每次重启换新），别殃及稳定的 LAN 二维码
        const oldest = qrCache.keys().next().value;
        qrCache.delete(oldest);
      }
      qrCache.set(text, encodeQr(text).catch(() => null));
    }
    return qrCache.get(text);
  }

  // 公网隧道自动恢复（issue #11）：DSH 重启后 cloudflared 子进程被杀、隧道消失，
  // 插件无从知晓。启动时检查持久化的「隧道开启中」标记，自动重新拉起。
  // 固定域名模式把 mode 写进标记：恢复时按模式拉起（快速隧道 vs 命名隧道）。
  const autoStatePath = home ? join(home, 'dsh-pocket', 'tunnel-auto.json') : null;
  async function persistAutoTunnel(mode = 'quick', hostname = '') {
    if (!autoStatePath) return;
    try {
      await mkdir(dirname(autoStatePath), { recursive: true });
      await writeFile(autoStatePath, JSON.stringify({ at: Date.now(), mode, hostname }), 'utf8');
    } catch { /* 忽略 */ }
  }
  async function clearAutoTunnel() {
    if (!autoStatePath) return;
    try { await rm(autoStatePath, { force: true }); } catch { /* 忽略 */ }
  }

  return {
    dshPort,
    /** 启动局域网代理。自动模式端口被占时尝试后续端口；自定义端口则明确报错。 */
    async startProxy() {
      if (proxy) return proxy;
      let lastErr = null;
      const startPort = preferredProxyPort;
      const endPort = proxyPortIsCustom ? startPort + 1 : startPort + 10;
      for (let p = startPort; p < endPort; p++) {
        try {
          proxy = await createProxy({
            port: p,
            host: '0.0.0.0',
            upstream: { host: '127.0.0.1', port: dshPort },
            ...(injectHtml ? { injectHtml } : {}),
            ...(auth ? { auth } : {}),
            // 每次请求实时读开关：设置页切换后立即生效，无需重启代理
            lanAccessEnabled: () => getLanEnabled(),
            ...(isPublicHost ? { isPublicHost } : {}),
          });
          if (p !== startPort) {
            console.log(`dsh-pocket: port ${startPort} busy, proxy on ${p} | 端口 ${startPort} 被占用，代理改用 ${p}`);
          }
          break;
        } catch (err) {
          if (err?.code !== 'EADDRINUSE') throw err; // 非端口冲突直接失败
          lastErr = err;
        }
      }
      if (!proxy) throw lastErr ?? new Error('proxy start failed | 代理启动失败');
      return proxy;
    },

    /**
     * 运行中切换 Pocket 代理端口（3080 的 DSH 本体不动）。
     * 若公网隧道在跑，安全地重建它，使 cloudflared 指向新端口；固定域名 URL 不变。
     */
    async restartProxyOnPort(value) {
      const raw = String(value ?? '').trim();
      const custom = raw !== '';
      if (custom && (!/^[0-9]+$/.test(raw) || Number(raw) < 1024 || Number(raw) > 65535)) {
        throw new Error('代理端口必须是 1024–65535 | proxy port must be 1024–65535');
      }
      const nextPort = custom ? Number(raw) : defaultProxyPort;
      const previous = { preferredProxyPort, proxyPortIsCustom };
      const restartTunnelMode = tunnel ? tunnelMode : null;

      if (restartTunnelMode) {
        this.stopTunnel();
        // 等旧标记删除完成，再让重建隧道写入新标记，避免异步 rm 覆盖新状态。
        await clearAutoTunnel();
      }
      if (proxy) {
        const oldProxy = proxy;
        proxy = null;
        await oldProxy.close();
      }
      preferredProxyPort = nextPort;
      proxyPortIsCustom = custom;
      try {
        await this.startProxy();
      } catch (err) {
        // 自定义端口被占时恢复旧代理，避免手机访问永久中断。
        preferredProxyPort = previous.preferredProxyPort;
        proxyPortIsCustom = previous.proxyPortIsCustom;
        try { await this.startProxy(); } catch { /* 原端口也失效时保留原错误 */ }
        if (restartTunnelMode && proxy) { try { await this.startTunnel({ mode: restartTunnelMode }); } catch { /* 只保留端口错误 */ } }
        throw err;
      }
      if (restartTunnelMode) await this.startTunnel({ mode: restartTunnelMode });
      return { port: proxy.port, custom };
    },

    /**
     * 启动公网隧道（幂等；返回公网 URL）。进度写进 tunnelState。并发调用单飞。
     * @param {object} [opts]
     * @param {'quick'|'fixed'} [opts.mode] 快速隧道（随机 trycloudflare，默认）| 固定域名（命名隧道）
     *   两种模式同一时刻只跑一条：切换模式会先停掉另一条。
     */
    async startTunnel({ mode = 'quick' } = {}) {
      await this.startProxy();
      if (tunnel) {
        if (tunnelMode === mode) return tunnel.url; // 同模式已在跑
        this.stopTunnel(); // 切换模式：先停旧的（快速 ⇄ 固定）
      }
      if (tunnelPromise) return tunnelPromise; // 复用 in-flight，防孤儿 cloudflared
      // 前置校验（同步、快失败）：不建 in-flight、不留脏状态。
      // 必须在创建隧道 promise 之前做——async IIFE 的同步段（throw）会同步执行到
      // finally，若此时引用尚未声明的 p 会 TDZ（"Cannot access 'p' before initialization"）。
      // cert 校验是异步的，留在 IIFE 内（首个 await 之后），保证单飞不被拆开。
      if (mode === 'fixed') {
        const hostname = getFixedHostname?.() ?? '';
        const id = getFixedTunnelId?.() ?? '';
        if (!hostname) {
          tunnelState.phase = 'idle';
          return Promise.reject(new Error('未配置固定域名：先在「固定域名」区块填写域名并完成初始化 | no fixed hostname configured'));
        }
        if (!id) {
          tunnelState.phase = 'idle';
          return Promise.reject(new Error('固定域名隧道未初始化：先点「初始化隧道与 DNS」| fixed-domain tunnel not initialized — run the setup wizard first'));
        }
      }
      const controller = new AbortController();
      tunnelAbort = controller;
      tunnelState.startedAt = Date.now();
      const onPhase = (phase) => {
        tunnelState.phase = phase;
        if (phase === 'downloading') tunnelState.detail = '首次下载 cloudflared（约 20MB）| first run downloads cloudflared (~20MB)';
        else if (phase === 'starting') tunnelState.detail = '启动隧道进程… | starting tunnel…';
        else if (phase === 'registering') tunnelState.detail = '连接 Cloudflare 边缘（通常 5-30 秒）| connecting to Cloudflare edge (usually 5-30s)';
        else if (phase === 'ready') tunnelState.detail = '隧道就绪 | ready';
      };
      tunnelPromise = (async () => {
        try {
          let result;
          if (mode === 'fixed') {
            const hostname = getFixedHostname?.() ?? '';
            const id = getFixedTunnelId?.() ?? '';
            // cert 校验在首个 await 之后：异步失败由 catch/finally 正常清理（单飞不破）
            if (!(await certCheck())) throw new Error('尚未登录 Cloudflare：先完成第 1 步授权（cloudflared tunnel login）| not logged in to Cloudflare yet — finish step 1 first');
            result = await startNamedFn({
              port: proxy.port, id, hostname, home, signal: controller.signal, onPhase,
            });
          } else {
            result = await startTunnelFn({ port: proxy.port, home, signal: controller.signal, onPhase });
          }
          // 归一化：隧道契约返回 {url, kill}（字符串也兼容）
          tunnel = typeof result === 'string' ? { url: result, kill: () => {} } : result;
          tunnelMode = mode;
          tunnelState.phase = 'ready';
          // M1：隧道进程运行中死亡（崩溃/被杀）→ 状态打回，别让 UI 永远显示"可用"
          tunnel.onExit?.((code) => {
            if (controller.signal.aborted) return; // 主动停止（stopTunnel）不算故障
            tunnelState.phase = 'error';
            tunnelState.detail = `隧道进程退出（code=${code}）| tunnel process exited`;
          });
          // 记录「隧道开启中」，供重启后自动恢复（issue #11）；固定域名记下 mode 与 hostname
          // 必须等标记落盘再返回：否则自动恢复后立刻 stopTunnel() 时，晚到的写入会
          // 覆盖删除，导致用户明明关闭了公网却在下次重启又被自动恢复。
          if (getPublicAutoRestore()) {
            await persistAutoTunnel(mode, mode === 'fixed' ? (getFixedHostname?.() ?? '') : '');
          }
          // 公网隧道就绪 → 轮换访问密码（issue #13：每次开启变新，旧链接作废）
          try { onTunnelReady?.(); } catch { /* 忽略 */ }
          // 探测期间与失败时均保持 PIN；不阻塞隧道本身的启动。
          if (mode === 'fixed') { void verifyFixedAccess(); scheduleFixedAccessVerification(); }
          return tunnel.url;
        } catch (err) {
          // stopTunnel 触发的 abort 不算错误：保持 idle，别把状态刷成 error
          if (!controller.signal.aborted) {
            tunnelState.phase = 'error';
            tunnelState.detail = err?.message ?? String(err);
          }
          tunnelState.startedAt = null; // 失败后清掉计时，避免 UI 误显"启动中"
          throw err;
        } finally {
          // 只清自己的引用：stopTunnel 后立即 startTunnel 可能已建了新的 in-flight
          // （tunnelPromise=B），A 的 finally 不能把 B 清掉，否则第三次调用会并发 spawn
          if (tunnelPromise === p) tunnelPromise = null;
        }
      })();
      const p = tunnelPromise;
      return tunnelPromise;
    },

    /** 停止公网隧道（代理保持）。 */
    stopTunnel() {
      clearFixedAccessVerification();
      tunnelAbort?.abort();
      tunnelAbort = null;
      tunnelPromise = null; // 丢弃已 abort 的 in-flight（其 finally 会再清一次，无害）
      if (tunnel) tunnel.kill();
      tunnel = null;
      tunnelMode = null;
      tunnelState.phase = 'idle';
      tunnelState.detail = '';
      tunnelState.startedAt = null;
      fixedAccessCheck.state = 'not-requested';
      fixedAccessCheck.detail = '';
      fixedAccessCheck.checkedAt = Date.now();
      setAccessGate(false);
      // 当前隧道关闭不等于撤销“重启后自动恢复”的明确授权；开关单独控制。
    },

    async verifyFixedAccess() { return verifyFixedAccess(); },
    resetFixedAccessVerification() {
      fixedAccessCheck.state = 'not-requested'; fixedAccessCheck.detail = ''; fixedAccessCheck.checkedAt = Date.now(); setAccessGate(false);
      if (getFixedAccessEnabled?.() && tunnelMode === 'fixed' && tunnel) void verifyFixedAccess();
    },

    /** 启动时自动恢复上次开启的公网隧道（DSH 重启后 cloudflared 子进程被杀，issue #11）。 */
    async restoreTunnelIfNeeded() {
      if (!getPublicAutoRestore() || !autoStatePath || tunnel || tunnelPromise) return;
      let parsed = null;
      try {
        const raw = await readFile(autoStatePath, 'utf8');
        parsed = JSON.parse(raw);
      } catch { return; } // 无标记/坏文件 → 不恢复
      if (!parsed || !('at' in parsed)) return;
      try {
        // 按上次的模式恢复（固定域名 URL 不变，恢复即回到同一地址；issue #11）
        const mode = parsed?.mode === 'fixed' ? 'fixed' : 'quick';
        await this.startTunnel({ mode });
        console.log('dsh-pocket: public tunnel auto-restored (%s) | 已自动恢复公网隧道', mode);
      } catch (err) {
        // 恢复失败保留标记（下次启动再试）；网络问题见 README 排障
        console.warn('dsh-pocket: tunnel auto-restore failed | 自动恢复隧道失败: %s', err?.message ?? err);
      }
    },

    /** 同步自动恢复开关：关闭立即删除恢复目标；开启且当前隧道在跑时记住该模式。 */
    async setAutoRestoreEnabled(on) {
      if (!on) { await clearAutoTunnel(); return false; }
      if (tunnel && tunnelMode) await persistAutoTunnel(tunnelMode, tunnelMode === 'fixed' ? (getFixedHostname?.() ?? '') : '');
      return true;
    },

    /**
     * 启动 `cloudflared tunnel login`（浏览器授权，生成 cert.pem）——固定域名第 1 步。
     * 幂等：登录进程已在跑时复用。授权 URL 自动打开浏览器，同时返回给设置页显示。
     * 是否完成以 cert.pem 出现为准（status().fixed.setup.cert，客户端轮询）。
     */
    async startFixedLogin() {
      if (fixedLogin.running) return { url: fixedLogin.url, already: true };
      const bin = await resolveBin({ home, onPhase: () => {}, signal: AbortSignal.timeout(180_000) });
      fixedLogin.running = true;
      fixedLogin.startedAt = Date.now();
      // loginFn 可能是同步返回（{kill, done}）或异步——两种都兼容
      const proc = await loginFn({
        bin,
        onUrl: (url) => {
          fixedLogin.url = url;
          openBrowser(url); // 自动拉起系统默认浏览器
        },
      });
      fixedLogin.kill = proc?.kill ?? null;
      proc.done.then(() => { fixedLogin.running = false; }).catch(() => {});
      // login 进程退出后保留 url 一小段时间（供设置页展示），客户端看到 cert 即进入下一步
      return { url: fixedLogin.url };
    },

    /** 状态快照（RPC 返回，不含敏感信息；二维码 data URL 本地生成 + 缓存）。 */
    async status() {
      const lan = await getLan();
      const proxyPort = proxy?.port ?? null;
      const lanUrl = lan && proxyPort ? `http://${lan}:${proxyPort}` : null;
      const lanIpOverride = getLanOverride();
      const lanCandidates = [...new Set(await getLanCandidates())];
      if (lanIpOverride && !lanCandidates.includes(lanIpOverride)) lanCandidates.push(lanIpOverride);
      const virtualNetworks = (await getVirtualNetworks()).map((network) => {
        const url = network.ip && proxyPort ? `http://${network.ip}:${proxyPort}` : null;
        return { ...network, url, qr: null };
      });
      for (const network of virtualNetworks) network.qr = await qrCached(network.url);
      // 固定域名设置状态（认证层建议 CF Access + MFA，见 README）：
      //   cert：cloudflared 登录授权是否完成（cert.pem 存在）
      //   tunnel：命名隧道是否已创建（ID 已保存）
      //   dns：域名是否已 CNAME 到隧道（route dns 成功）
      const fixedHostname = getFixedHostname?.() ?? '';
      const fixedTunnelId = getFixedTunnelId?.() ?? '';
      const fixedSetup = {
        cert: await certCheck(),
        tunnel: Boolean(fixedTunnelId),
        dns: getFixedRouted?.() === true,
      };
      return {
        proxyRunning: proxy !== null,
        proxyPort,
        proxyPortSetting: proxyPortIsCustom ? preferredProxyPort : null,
        lanUrl,
        lanQr: await qrCached(lanUrl),
        lanCandidates,
        lanIpOverride,
        virtualNetworks,
        tunnelRunning: tunnel !== null,
        tunnelMode,
        tunnelUrl: tunnel?.url ?? null,
        tunnelQr: await qrCached(tunnel?.url ?? null),
        tunnelState: { ...tunnelState },
        dshPort,
        fixed: {
          hostname: fixedHostname,
          accessEnabled: getFixedAccessEnabled?.() ?? false,
          pinAlways: getFixedPinAlways?.() ?? false,
          accessCheck: { ...fixedAccessCheck },
          setup: fixedSetup,
        },
        fixedLogin: fixedLogin.running ? { url: fixedLogin.url, startedAt: fixedLogin.startedAt } : null,
      };
    },

    /** 选中指定虚拟网卡，同时使局域网二维码指向它。 */
    async useVirtualNetwork(ip) {
      const value = String(ip ?? '').trim();
      const networks = await getVirtualNetworks();
      if (!networks.some((network) => network.ip === value)) {
        throw new Error('未检测到该虚拟局域网地址，请先确认 Tailscale / ZeroTier 已连接');
      }
      // 由调用方持久化 override；service 无权直接写 settings。
      return value;
    },

    /** 用户点“重新检测”时立即抛弃候选缓存。 */
    refreshVirtualNetworks() {
      lanCandidateCache = null;
      virtualNetworkCache = null;
    },

    /** 停止一切（插件卸载时）。 */
    async dispose() {
      clearFixedAccessVerification();
      if (fixedLogin.running) {
        try { fixedLogin.kill?.(); } catch { /* 忽略 */ }
        fixedLogin.running = false;
      }
      this.stopTunnel();
      if (proxy) {
        const p = proxy;
        proxy = null;
        try { await p.close(); } catch { /* server 已关闭等边缘情况 */ }
      }
    },
  };
}
