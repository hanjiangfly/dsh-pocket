// cloudflared 快速隧道：把本机代理暴露成公网 https URL
//
// 手机在任何网络都能访问；URL 由 cloudflared 随机分配（每次重启会变）。
// 无密码模式：URL 即钥匙（dsh web 能执行代码，请勿把二维码/URL 发给别人）。

import { spawn, execSync } from 'node:child_process';
import { mkdir, access, chmod, rm, stat, rename, cp, open } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { createWriteStream } from 'node:fs';

// 快速隧道 URL：https://<随机子域>.trycloudflare.com
// (?!api\.) 负向前瞻排除保留子域 api（issue #32）：某些 cloudflared 版本/网络环境下
// 进程输出会先出现 https://api.trycloudflare.com（Cloudflare API 注册地址），原正则
// [a-z0-9-]+ 会把它误当隧道 URL → 设置页/二维码给出 api 地址 → 扫码打开返回
// {"code":10005,"message":"Method Not Allowed"}。api.trycloudflare.com 访问 GET 实测
// 正是该错误体，与 issue 完全一致。
export const QUICK_TUNNEL_URL_RE = /https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com/i;

function platformBinary() {
  const archMap = { x64: 'amd64', arm64: 'arm64' };
  const a = archMap[process.arch] ?? process.arch;
  const os = process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'windows' : 'linux';
  return { os, a, ext: os === 'windows' ? '.exe' : '' };
}

/**
 * cloudflared 下载源。
 * 优先：清华 TUNA 镜像的 Homebrew bottle（国内 CDN，实测 ~3MB/s）——仅 macOS/Linux
 * 且有对应 bottle 时可用（Windows 无 Homebrew，自动跳过）。
 * 兜底：官方 GitHub + 国内加速源（ghproxy.net / gh.ddlc.top / gh-proxy.com，2026-08
 * 实测可达）。npmmirror（淘宝）没有 cloudflared 镜像（已实测 404）。
 */
const CLOUDFLARED_MIRRORS = [
  (asset) => `https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}`,
  (asset) => `https://ghproxy.net/https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}`,
  (asset) => `https://gh.ddlc.top/https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}`,
  (asset) => `https://gh-proxy.com/https://github.com/cloudflare/cloudflared/releases/latest/download/${asset}`,
];

const TUNA_BOTTLES = 'https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles/';

/** 多线程分块下载的并发段数（Windows 官方源单线程 ~200KB/s，8 并发 ≈ 1.6MB/s）。 */
const PARALLEL_SEGMENTS = 8;
/** 小于该字节数的文件不值得分块（直接用单线程）。 */
const MIN_PARALLEL_SIZE = 8 * 1024 * 1024;
/** 探针大小：单线程先下这么多测速。 */
const PROBE_SIZE = 2 * 1024 * 1024;
/** 探针测速阈值（bytes/ms）：低于它认为慢网络，切多线程。300KB/s = 0.3。 */
const SLOW_SPEED_THRESHOLD = 0.3;

function hostOf(url) {
  try { return new URL(url).host; } catch { return url; }
}

/** 合并多个分段文件为一个目标文件（顺序拼接后统一结束）。 */
async function mergeParts(partFiles, dest) {
  const { createReadStream } = await import('node:fs');
  const out = createWriteStream(dest);
  try {
    for (const f of partFiles) {
      await new Promise((resolve, reject) => {
        const rs = createReadStream(f);
        rs.on('error', reject);
        rs.pipe(out, { end: false });
        rs.on('end', resolve);
      });
    }
  } finally {
    await new Promise((r) => out.end(r));
  }
}

/**
 * 下载文件到 dest（自适应）：
 * 1. 服务器不支持 Range 或文件小 → 单线程；
 * 2. 单线程下载探针（PROBE_SIZE）测速——速度够快 → 继续单线程（多线程在部分网络/
 *    服务器上反而更慢，如 GitHub CDN 并发限速）；
 * 3. 探针速度低于阈值（典型慢网络，如 Windows 用户官方源 ~200KB/s）→ 丢弃探针，
 *    改 8 段并发分块（可把 200KB/s 拉到 1.6MB/s）。
 * 返回实际下载字节数。
 */
export async function downloadFile(url, dest, { signal, segments = PARALLEL_SEGMENTS } = {}) {
  // HEAD 探测：Content-Length + Accept-Ranges
  let head = null;
  try { head = await fetch(url, { method: 'HEAD', signal }); } catch { head = null; }
  const len = head ? Number(head.headers.get('content-length') || 0) : 0;
  const acceptsRanges = head ? String(head.headers.get('accept-ranges') || '').toLowerCase() === 'bytes' : false;

  if (!head || !acceptsRanges || len < MIN_PARALLEL_SIZE) {
    // 单线程
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    return len || 0;
  }

  // 探针测速：单线程下载前 PROBE_SIZE，计时
  const probeBytes = Math.min(PROBE_SIZE, len);
  const probeStart = Date.now();
  try {
    const probeRes = await fetch(url, { signal, headers: { Range: `bytes=0-${probeBytes - 1}` } });
    if (!probeRes.ok) throw new Error(`HTTP ${probeRes.status} (probe)`);
    const probeBody = await probeRes.arrayBuffer();
    const probeMs = Date.now() - probeStart;
    const probeSpeed = probeMs > 0 ? probeBytes / probeMs : Infinity; // bytes/ms
    if (probeMs < 500 || probeSpeed >= SLOW_SPEED_THRESHOLD) {
      // 够快 → 单线程下完剩余部分（探针字节已拿到，写入 dest）
      const { createWriteStream, createReadStream } = await import('node:fs');
      const w = createWriteStream(dest);
      await new Promise((resolve, reject) => {
        w.on('error', reject);
        w.write(Buffer.from(probeBody));
        w.end(resolve);
      });
      const restRes = await fetch(url, { signal, headers: { Range: `bytes=${probeBytes}-${len - 1}` } });
      if (!restRes.ok) throw new Error(`HTTP ${restRes.status} (rest)`);
      await pipeline(Readable.fromWeb(restRes.body), createWriteStream(dest, { flags: 'a' }));
      return len;
    }
    // 慢 → 丢弃探针，转分块并发（从 0 开始全量分块）
    await rm(dest, { force: true }).catch(() => {});
  } catch (err) {
    await rm(dest, { force: true }).catch(() => {});
    if (!/HTTP|fetch/i.test(String(err?.message ?? ''))) throw err; // 探针网络异常 → 抛给上层换源
    // 探针 HTTP 错误（部分服务器 HEAD 与 GET 行为不一致）→ 直接分块
  }

  // 分块并发
  const parts = [];
  const chunk = Math.ceil(len / segments);
  for (let i = 0; i < segments; i++) {
    const start = i * chunk;
    const end = i === segments - 1 ? len - 1 : Math.min(start + chunk - 1, len - 1);
    if (start > end) break;
    parts.push({ start, end, file: `${dest}.part${i}` });
  }
  try {
    await Promise.all(parts.map(async (p) => {
      const res = await fetch(url, { signal, headers: { Range: `bytes=${p.start}-${p.end}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status} (range ${p.start}-${p.end})`);
      await pipeline(Readable.fromWeb(res.body), createWriteStream(p.file));
    }));
    await mergeParts(parts.map((p) => p.file), dest);
  } finally {
    await Promise.all(parts.map((p) => rm(p.file, { force: true }).catch(() => {})));
  }
  return len;
}

/**
 * 清华 TUNA 镜像的 cloudflared Homebrew bottle URL（国内 CDN，实测 ~3MB/s）。
 * **仅 macOS**——Linux 的 Homebrew bottle 其 ELF 解释器是 `@@HOMEBREW_PREFIX@@`
 * 占位符（需 brew install 时 patchelf 替换），没装 Homebrew 的机器直接 spawn 会
 * ENOENT（issue #22）；Linux 走官方 GitHub tgz（解压即用）+ 加速源。
 * 匹配按 CPU 架构取清华目录里版本号最新的 bottle——Homebrew 构建时部署目标
 * 设得较老、向后兼容，所以旧系统（如 Ventura）也能用新一点的 bottle。
 * 抓目录失败/无匹配 → null（调用方回退 GitHub/加速源，不影响可用性）。
 */
async function tsinghuaBottleUrl({ os, a }) {
  if (os !== 'darwin') return null;
  let res;
  try {
    res = await fetch(TUNA_BOTTLES, { signal: AbortSignal.timeout(20_000) });
  } catch { return null; }
  if (!res.ok) return null;
  let html;
  try { html = await res.text(); } catch { return null; }
  // macOS: arm64_<代号> 或 <代号>（Intel 无前缀），代号白名单排除 linux；Linux: arm64_linux / x86_64_linux
  const MACOS_CODES = 'monterey|ventura|sonoma|sequoia|tahoe';
  const pattern = os === 'darwin'
    ? new RegExp(`cloudflared-([0-9.]+)\\.${a === 'arm64' ? 'arm64_' : ''}(${MACOS_CODES})\\.bottle\\.tar\\.gz`, 'g')
    : new RegExp(`cloudflared-([0-9.]+)\\.${a === 'arm64' ? 'arm64' : 'x86_64'}_linux\\.bottle\\.tar\\.gz`, 'g');
  let best = null;
  let bestV = '';
  for (const m of html.matchAll(pattern)) {
    if (m[1] > bestV) { bestV = m[1]; best = m[0]; }
  }
  return best ? `${TUNA_BOTTLES}${best}` : null;
}

async function downloadCloudflared(binPath, signal) {
  const { os, a, ext } = platformBinary();
  const dir = dirname(binPath);
  const tmpFile = join(dir, `cloudflared.download`);
  const isWindows = os === 'windows';
  // 发布资产：Windows 是 .exe（下载即二进制），macOS/Linux 是 .tgz（需解压）
  const asset = isWindows ? `cloudflared-windows-${a}.exe` : `cloudflared-${os}-${a}.tgz`;
  const fetchSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(120_000)])
    : AbortSignal.timeout(120_000);

  // 构建有序源列表：[{url, host}]；清华（如有，仅 macOS/Linux）排第一，再官方 + 加速源
  const sources = [];
  if (!isWindows) {
    const tua = await tsinghuaBottleUrl({ os, a }).catch(() => null);
    if (tua) sources.push({ url: tua, host: 'mirrors.tuna.tsinghua.edu.cn' });
  }
  for (const m of CLOUDFLARED_MIRRORS) sources.push({ url: m(asset), host: hostOf(m(asset)) });

  let lastErr = null;
  for (let i = 0; i < sources.length; i++) {
    const { url, host } = sources[i];
    console.log(`⬇️  下载 cloudflared（${i + 1}/${sources.length}：${host}）…`);
    try {
      // 多线程分块（官方 GitHub 支持 Range，Windows 50MB 从几分钟降到几十秒）；
      // 不支持 Range 的源自动回退单线程
      await downloadFile(url, tmpFile, { signal: fetchSignal });
      // 简单校验：空文件/极小文件视为下载失败（可能是镜像返回了错误页）
      const st = await stat(tmpFile);
      if (st.size < 1024 * 1024) throw new Error(`文件异常小（${st.size} 字节），疑似镜像错误页`);
      lastErr = null;
      break; // 下载成功
    } catch (err) {
      lastErr = err;
      await rm(tmpFile, { force: true }).catch(() => {}); // 清掉半截文件
      console.warn(`  ⚠️ 源 ${i + 1} 失败：${err?.message ?? err}，尝试下一个…`);
    }
  }
  if (lastErr) {
    throw new Error(
      `cloudflared 下载失败：所有源都不通（最后错误：${lastErr?.message ?? lastErr}）。`
      + (isWindows
        ? `Windows 可手动安装后重试：winget install cloudflared；或下载 ${asset} 放到 ${dir} 目录 | download failed — try: winget install cloudflared, or put the exe into ${dir}`
        : `可手动安装后重试：npm i -g cloudflared（装好命令行 cloudflared 即可，无需下载）；或开启代理/换网络后重试 | all mirrors failed — install cloudflared manually: npm i -g cloudflared, then retry`),
    );
  }

  let extracted = join(dir, `cloudflared${ext}`);
  if (isWindows) {
    // Windows：exe 直接就是二进制，无需解压
    await rename(tmpFile, extracted).catch(async () => {
      await cp(tmpFile, extracted).catch(() => {});
    });
  } else {
    // 解压到独立临时子目录（bottle 解压产物会占用 cacheDir/cloudflared 这个名字，
    // 直接解压到 dir 会让目标路径变成目录，rename 失败）
    const extractDir = join(dir, `.extract-${process.pid}-${Date.now()}`);
    await mkdir(extractDir, { recursive: true });
    try {
      await new Promise((resolve, reject) => {
        const child = spawn('tar', ['-xzf', tmpFile, '-C', extractDir], { stdio: 'ignore' });
        child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`cloudflared 解压失败（code=${code}）`)));
        child.once('error', reject);
      });
      // 找真实的二进制**文件**（排除目录）：
      // - GitHub tgz：extractDir/cloudflared
      // - Homebrew bottle（清华）：extractDir/cloudflared/<版本>/bin/cloudflared
      const { readdir } = await import('node:fs/promises');
      let found = null;
      const direct = join(extractDir, `cloudflared${ext}`);
      try { if ((await stat(direct)).isFile()) found = direct; } catch { /* 不存在 */ }
      if (!found) {
        const verDir = join(extractDir, 'cloudflared');
        try {
          const vers = await readdir(verDir);
          for (const v of vers) {
            const bin = join(verDir, v, 'bin', `cloudflared${ext}`);
            try { if ((await stat(bin)).isFile()) { found = bin; break; } } catch { /* 继续 */ }
          }
        } catch { /* 无此目录 */ }
      }
      if (!found) throw new Error('cloudflared 解压成功但未找到二进制 | binary not found after extract');
      if (found !== extracted) {
        await rename(found, extracted).catch(async () => { await cp(found, extracted).catch(() => {}); });
      }
    } finally {
      await rm(extractDir, { recursive: true, force: true }).catch(() => {});
    }
  }
  if (!isWindows) await chmod(extracted, 0o755);
  // 解压/搬移完成就删掉临时下载文件，避免长期占用缓存目录
  await rm(tmpFile, { force: true }).catch(() => {});
  return extracted;
}

/** PATH 里是否已有 cloudflared。 */
function cloudflaredOnPath() {
  try {
    execSync(process.platform === 'win32' ? 'where cloudflared' : 'command -v cloudflared', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** in-flight 下载（单飞）：并发调用复用同一次，防止交错写入损坏 tgz。 */
let downloading = null;

/**
 * 拿一个可用的 cloudflared 路径。
 * 优先：PATH 已有 → 直接用；否则用持久缓存（$DSH_HOME/dsh-pocket/cloudflared），
 * 只有缓存缺失才下载——避免每次开启公网都重新下 20MB。
 */
export { tsinghuaBottleUrl };

export async function resolveCloudflared({ home, onPhase = () => {}, signal } = {}) {
  if (cloudflaredOnPath()) return 'cloudflared';
  const dshHome = home ?? process.env.DSH_HOME ?? join(homedir(), '.dsh');
  const cacheDir = join(dshHome, 'dsh-pocket', 'bin');
  const { os, a, ext } = platformBinary();
  // 缓存命中，兼容两种文件名（issue #15）：
  // 1) 本插件下载时写入的 bin 名：cloudflared.exe
  // 2) 手动放置的**发布资产名**：cloudflared-windows-amd64.exe（与下载失败的错误提示一致）
  const candidates = [
    join(cacheDir, `cloudflared${ext}`),
    join(cacheDir, `cloudflared-${os}-${a}${ext}`),
  ];
  for (const bin of candidates) {
    try {
      await access(bin);
      // Linux：识别并丢弃 Homebrew bottle 坏缓存（issue #22）——其 ELF 解释器是
      // @@HOMEBREW_PREFIX@@ 占位符，直接 spawn 报 ENOENT；读文件头（解释器路径在
      // ELF 头部附近）即可识别，命中则删掉走重新下载
      if (os === 'linux') {
        try {
          const fd = await open(bin, 'r');
          const head = Buffer.alloc(8192);
          await fd.read(head, 0, 8192, 0);
          await fd.close();
          if (head.includes('@@HOMEBREW_PREFIX@@')) {
            await rm(bin, { force: true }).catch(() => {});
            console.warn('dsh-pocket: discarding unusable Homebrew-bottle cloudflared cache | 丢弃不可用的 Homebrew bottle 缓存，重新下载');
            continue;
          }
        } catch { /* 读失败按正常缓存处理 */ }
      }
      return bin; // 缓存命中，秒开
    } catch { /* 继续找下一个 */ }
  }
  onPhase('downloading');
  await mkdir(cacheDir, { recursive: true });
  if (!downloading) {
    downloading = downloadCloudflared(join(cacheDir, `cloudflared${ext}`), signal).finally(() => { downloading = null; });
  }
  return downloading;
}

/**
 * 启动 cloudflared 快速隧道，返回公网 URL。
 * @param {object} opts
 * @param {number} opts.port  本机代理端口
 * @param {string} [opts.home] $DSH_HOME（cloudflared 持久缓存）
 * @param {AbortSignal} [opts.signal]
 * @param {(phase:string)=>void} [opts.onPhase] 进度回调：downloading→starting→registering→ready
 * @returns {Promise<{url:string, kill:()=>void}>}
 */
export async function startQuickTunnel({ port, home, signal, onPhase = () => {} }) {
  const bin = await resolveCloudflared({ home, onPhase, signal });
  onPhase('starting');
  // 强制 HTTP/2（TCP 443）而不是默认的 QUIC（UDP 7844）：
  // 国内网络/部分企业网常屏蔽 UDP 7844，导致 tunnel 报 error 1033（Tunnel error）；
  // HTTP/2 走 443 更稳。若平台未来恢复 QUIC 可达，可去掉 --protocol http2。
  const child = spawn(bin, ['tunnel', '--url', `http://127.0.0.1:${port}`, '--protocol', 'http2', '--no-autoupdate'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // H1：spawn 失败（缓存二进制损坏等）必须接住，否则 uncaughtException 崩宿主
  child.on('error', (err) => {
    cleanup?.();
    onPhase?.('error');
    rejectErr?.(new Error(`cloudflared 启动失败：${err?.message ?? err}（可删除 $DSH_HOME/dsh-pocket/bin 缓存后重试）`));
  });
  onPhase('registering');

  let cleanup = null;
  let rejectErr = null;
  const url = await new Promise((resolve, reject) => {
    let buf = '';
    const onData = (chunk) => {
      buf += String(chunk);
      const m = buf.match(QUICK_TUNNEL_URL_RE);
      if (m) {
        cleanup();
        onPhase('ready');
        resolve(m[0]);
      }
    };
    const onExit = (code) => {
      cleanup();
      // 带上 cloudflared 自己的输出尾段（stderr 常含具体原因：403/协议/网络等），
      // 否则「code=1」用户无从排查（issue #65）
      const tail = buf.trim().split(/\r?\n/).slice(-3).join('\n').trim();
      reject(new Error(`cloudflared 退出（code=${code}）${tail ? '：' + tail.slice(0, 500) : ''}`));
    };
    cleanup = () => {
      child.stdout.off('data', onData);
      child.stderr.off('data', onData);
      child.off('exit', onExit);
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      // M4：摘掉监听后管道不再消费 → 64KB 缓冲填满会阻塞 cloudflared → 继续吞掉输出
      child.stdout.resume();
      child.stderr.resume();
    };
    const onAbort = () => {
      cleanup();
      child.kill();
      reject(new Error('已取消 | cancelled'));
    };
    const timer = setTimeout(() => {
      cleanup();
      child.kill();
      reject(new Error(
        'cloudflared 启动超时（30s）——请检查是否开着代理/VPN（Clash 等 TUN 模式会掐断隧道连接），退出代理后重试 | '
        + 'timeout — if you run a proxy/VPN (Clash etc., TUN mode), it can block the tunnel; quit it and retry',
      ));
    }, 30_000);

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('exit', onExit);
    signal?.addEventListener('abort', onAbort, { once: true });
    rejectErr = reject;
  });

  // M1：隧道进程运行中死亡（崩溃/被杀）→ 通知监听方（service 据此把状态从 ready 打回）
  const exitListeners = new Set();
  child.on('exit', (code) => {
    for (const cb of exitListeners) cb(code);
  });

  return {
    url,
    kill: () => {
      try { child.kill(); } catch { /* 忽略 */ }
    },
    /** 注册「进程已退出」回调，返回取消函数。 */
    onExit: (cb) => {
      exitListeners.add(cb);
      return () => exitListeners.delete(cb);
    },
  };
}

// ================= 固定域名（命名隧道，配合 Cloudflare Access） =================
//
// 固定域名必须走**命名隧道**（named tunnel），前提是有一个托管在 Cloudflare 的域名：
//   1. cloudflared tunnel login        —— 唯一交互步骤：拉起浏览器授权，生成 ~/.cloudflared/cert.pem
//   2. cloudflared tunnel create <name> —— 建隧道，得 tunnel ID（本插件幂等复用）
//   3. cloudflared tunnel route dns <name> <hostname> —— 把子域名 CNAME 到隧道
//   4. cloudflared tunnel run <id> --config <生成配置>  —— 运行，URL 固定 https://<hostname>
// 认证层建议用 Cloudflare Access（零信任，边缘 MFA：邮箱 OTP / TOTP / 硬件密钥）：
// 固定 URL 不再轮换，必须换成真正的认证层——Access 恰好就在隧道前面（边缘），
// 未认证请求根本到不了隧道；dsh-pocket 内置 8 位 PIN 由设置页按 Access 开关决定是否保留。

/** cloudflared 证书目录（login 产物 cert.pem 固定在这；与 DSH_HOME 无关）。 */
export const CLOUDFLARED_DIR = join(homedir(), '.cloudflared');

/** cert.pem 路径（cloudflared tunnel login 产物，证明该 Cloudflare 账号已授权本机）。 */
export function cloudflaredCertPath() {
  return join(CLOUDFLARED_DIR, 'cert.pem');
}

/** 是否已完成 `cloudflared tunnel login`（cert.pem 存在）。 */
export async function certExists() {
  try {
    await access(cloudflaredCertPath());
    return true;
  } catch {
    return false;
  }
}

/**
 * 跑一次 cloudflared 子命令（收集 stdout/stderr，带超时）。
 * 非零退出抛错（带 cloudflared 自己的输出尾段，方便用户排查）。
 * @returns {Promise<{code:number, stdout:string, stderr:string}>}
 */
export async function runCloudflared(bin, args, { timeoutMs = 60_000, signal } = {}) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      return reject(new Error(`cloudflared 启动失败：${err?.message ?? err}`));
    }
    let out = '';
    let errOut = '';
    const onData = (c) => { out += String(c); if (out.length > 8000) out = out.slice(-8000); };
    const onErr = (c) => { errOut += String(c); if (errOut.length > 8000) errOut = errOut.slice(-8000); };
    child.stdout.on('data', onData);
    child.stderr.on('data', onErr);
    const timer = setTimeout(() => { try { child.kill(); } catch { /* 忽略 */ } }, timeoutMs);
    const onAbort = () => { try { child.kill(); } catch { /* 忽略 */ } };
    signal?.addEventListener('abort', onAbort, { once: true });
    child.once('error', (err) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      reject(new Error(`cloudflared 启动失败：${err?.message ?? err}`));
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      if (code !== 0) {
        const tail = (errOut || out).trim().split(/\r?\n/).slice(-4).join('\n').trim();
        reject(new Error(`cloudflared ${args[0] ?? ''} 失败（code=${code}）${tail ? '：' + tail.slice(0, 600) : ''}`));
      } else {
        resolve({ code, stdout: out, stderr: errOut });
      }
    });
  });
}

/** 打开系统默认浏览器（登录授权用）；失败静默。 */
export function openBrowser(url) {
  const { platform } = process;
  const cmd = platform === 'win32'
    ? ['cmd', ['/c', 'start', '', url]]
    : platform === 'darwin'
      ? ['open', [url]]
      : ['xdg-open', [url]];
  try {
    const c = spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true });
    c.on('error', () => {});
    c.unref?.();
  } catch { /* 忽略 */ }
}

/**
 * 启动 `cloudflared tunnel login`（浏览器授权，生成 cert.pem）。
 * 这是命名隧道唯一需要人工参与的步骤；其余（create/route/run）全自动。
 * 返回 { kill, promise }：promise 在**进程退出**时 resolve（{ code }），
 * 是否成功以 cert.pem 是否出现为准（由调用方轮询 certExists()）。
 * @param {object} opts
 * @param {string} opts.bin cloudflared 路径
 * @param {(url:string)=>void} [opts.onUrl] 回调授权 URL（用于显示/自动打开浏览器）
 */
export function startLogin({ bin, onUrl = () => {} } = {}) {
  const child = spawn(bin, ['tunnel', 'login'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let buf = '';
  const onData = (c) => {
    buf += String(c);
    // cloudflared 打印授权 URL（dash.cloudflare.com/argotunnel?callback=...），取第一个
    const m = buf.match(/https:\/\/dash\.cloudflare\.com\/argotunnel\?[^\s\r\n]+/i);
    if (m) {
      onUrl(m[0]);
      child.stdout.off('data', onData);
      child.stderr.off('data', onData);
    }
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  child.on('error', () => {});
  const done = new Promise((resolve) => {
    child.once('exit', (code) => resolve({ code }));
  });
  return { kill: () => { try { child.kill(); } catch { /* 忽略 */ } }, done };
}

/**
 * 确保命名隧道存在，返回 { id }。
 * 幂等：同名隧道已存在（可能上次创建过/其他工具建的）时查 `tunnel list` 复用其 ID。
 */
export async function ensureNamedTunnel({ bin, name = 'dsh-pocket', signal } = {}) {
  try {
    const r = await runCloudflared(bin, ['tunnel', 'create', name], { signal });
    const m = String(r.stdout).match(/with id\s+([0-9a-f]{8}-[0-9a-f-]{27,36})/i);
    if (m) return { id: m[1].toLowerCase() };
    // 输出格式变了但创建成功（name 已存在时 create 会报错，走到 catch）
    const listed = await findTunnelId(bin, name, signal);
    if (listed) return { id: listed };
    throw new Error(`隧道创建成功但无法解析 ID | tunnel created but ID could not be parsed: ${r.stdout.slice(0, 300)}`);
  } catch (err) {
    // create 失败（最常见：同名隧道已存在）→ 查列表复用
    if (/already exists|already been created|conflict|Duplicate/i.test(String(err?.message ?? ''))) {
      const id = await findTunnelId(bin, name, signal);
      if (id) return { id, existing: true };
    }
    throw err;
  }
}

/** 在 `cloudflared tunnel list --output json` 里按名字找隧道 ID；无匹配返回 null。 */
async function findTunnelId(bin, name, signal) {
  try {
    const r = await runCloudflared(bin, ['tunnel', 'list', '--output', 'json'], { signal });
    const list = JSON.parse(r.stdout);
    const found = (Array.isArray(list) ? list : []).find((t) => String(t?.name ?? '') === name);
    return found?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * 把域名 CNAME 到命名隧道（`cloudflared tunnel route dns`）。
 * 幂等：CNAME 已存在（"already exists"）视为成功——DNS 已经在指向隧道。
 * @returns {Promise<{ok:boolean, already?:boolean, output:string}>}
 */
export async function routeDns({ bin, name, hostname, signal } = {}) {
  try {
    const r = await runCloudflared(bin, ['tunnel', 'route', 'dns', name, hostname], { signal });
    return { ok: true, output: r.stdout.trim() };
  } catch (err) {
    const msg = String(err?.message ?? '');
    if (/already exists|already in use|already routed|CNAME.*exist/i.test(msg)) {
      return { ok: true, already: true, output: msg };
    }
    throw err;
  }
}

/**
 * 生成命名隧道的运行配置（config.yml）。
 * 独立文件（放在 $DSH_HOME/dsh-pocket/），不碰用户 ~/.cloudflared/config.yml，
 * 避免用户自有的 ingress 规则干扰（--url 形式会静默被已有 config 覆盖）。
 * ingress 只匹配目标 hostname，其余一律 404——比 catch-all 更收紧。
 * @returns {string} YAML 内容
 */
export function namedTunnelConfigYaml({ id, hostname, port, credentialsFile }) {
  return [
    `tunnel: ${id}`,
    `credentials-file: ${credentialsFile}`,
    'ingress:',
    `  - hostname: ${hostname}`,
    `    service: http://127.0.0.1:${port}`,
    '  - service: http_status:404',
    '',
  ].join('\n');
}

/**
 * 命名隧道的启动参数。
 * cloudflared 的全局选项必须放在 `tunnel run` 之前；若放在 tunnel ID 后，
 * CLI 会把它们当成额外的位置参数并拒绝启动。
 */
export function namedTunnelRunArgs({ id, configPath }) {
  return ['--config', configPath, '--protocol', 'http2', '--no-autoupdate', 'tunnel', 'run', id];
}

/**
 * 启动命名隧道，返回 { url: 'https://<hostname>', kill, onExit }。
 * 就绪判定：cloudflared 输出 "Registered tunnel connection"（边缘连接建立）。
 * 固定 URL 已知，无需像快速隧道那样解析随机子域。
 */
export async function startNamedTunnel({ port, id, hostname, home, signal, onPhase = () => {} } = {}) {
  const bin = await resolveCloudflared({ home, onPhase, signal });
  onPhase('starting');
  const dshHome = home ?? process.env.DSH_HOME ?? join(homedir(), '.dsh');
  const cfgDir = join(dshHome, 'dsh-pocket');
  const cfgPath = join(cfgDir, `named-${id}.yml`);
  await mkdir(cfgDir, { recursive: true });
  const { writeFile } = await import('node:fs/promises');
  await writeFile(cfgPath, namedTunnelConfigYaml({
    id, hostname, port,
    credentialsFile: join(CLOUDFLARED_DIR, `${id}.json`),
  }), 'utf8');

  // 与快速隧道一致：强制 HTTP/2（TCP 443）而非默认 QUIC（UDP 7844）——
  // 国内网络/企业网常屏蔽 UDP 7844 → error 1033；HTTP/2 走 443 更稳。
  const child = spawn(bin, namedTunnelRunArgs({ id, configPath: cfgPath }), {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.on('error', (err) => {
    cleanup?.();
    onPhase?.('error');
    rejectErr?.(new Error(`cloudflared 启动失败：${err?.message ?? err}（可删除 $DSH_HOME/dsh-pocket/bin 缓存后重试）`));
  });
  onPhase('registering');

  let cleanup = null;
  let rejectErr = null;
  await new Promise((resolve, reject) => {
    let buf = '';
    const onData = (chunk) => {
      buf += String(chunk);
      // 就绪标志：边缘连接已注册
      if (/registered tunnel connection/i.test(buf)) {
        cleanup();
        onPhase('ready');
        resolve();
        return;
      }
      // 常见致命错误——尽早报错，别让 UI 一直转。
      // 只用明确的失败短语（"no error" 之类良性输出不能误判），拿不准就等退出/超时。
      if (/cannot determine default ingress|no tunnel credentials|credentials file not found|failed to (create|start)|tunnel .{0,40} not found|invalid .{0,20} tunnel/i.test(buf)) {
        const tail = buf.trim().split(/\r?\n/).slice(-3).join('\n').trim();
        cleanup();
        onPhase('error');
        reject(new Error(`隧道注册失败：${tail.slice(0, 500)}`));
      }
    };
    const onExit = (code) => {
      cleanup();
      const tail = buf.trim().split(/\r?\n/).slice(-3).join('\n').trim();
      reject(new Error(`cloudflared 退出（code=${code}）${tail ? '：' + tail.slice(0, 500) : ''}`));
    };
    cleanup = () => {
      child.stdout.off('data', onData);
      child.stderr.off('data', onData);
      child.off('exit', onExit);
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      child.stdout.resume();
      child.stderr.resume();
    };
    const onAbort = () => {
      cleanup();
      child.kill();
      reject(new Error('已取消 | cancelled'));
    };
    const timer = setTimeout(() => {
      cleanup();
      child.kill();
      reject(new Error('cloudflared 启动超时（45s）——请检查是否开着代理/VPN（Clash 等 TUN 模式会掐断隧道连接）| timeout — a proxy/VPN (Clash TUN) can block the tunnel; quit it and retry'));
    }, 45_000);

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('exit', onExit);
    signal?.addEventListener('abort', onAbort, { once: true });
    rejectErr = reject;
  });

  // 与快速隧道一致：进程运行中死亡 → 通知监听方（service 据此把状态打回）
  const exitListeners = new Set();
  child.on('exit', (code) => {
    for (const cb of exitListeners) cb(code);
  });

  return {
    url: `https://${hostname}`,
    kill: () => {
      try { child.kill(); } catch { /* 忽略 */ }
    },
    onExit: (cb) => {
      exitListeners.add(cb);
      return () => exitListeners.delete(cb);
    },
  };
}
