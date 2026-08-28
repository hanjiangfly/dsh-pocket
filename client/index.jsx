// dsh-pocket 网页客户端：
//   1. 设置页签「手机访问」（局域网/公网二维码 + 更新/重启提示）
//   2. 移动端适配（移植自 MIT 项目 dsh-web-mobile，见 client/mobile/LICENSE.dsh-web-mobile）
//
// 手机扫码打开的就是电脑上的 dsh web，实时同步；窄屏自动变成抽屉布局。
//
// 注：Web Push 已移除——浏览器推送依赖 Google FCM（Chrome）等境外服务，
// 国内直连被墙，普通用户用不了。专注扫码同屏这一件事。

import { createElement as h, Fragment, useEffect, useState } from 'react';

import { POCKET_RPC_CHANNEL, POCKET_ENDPOINTS, redactStatus, compareVersions } from './api.js';
import { mobileApply } from './mobile/mobile-apply.tsx';
import { NS as POCKET_NS, zh as POCKET_ZH, en as POCKET_EN } from './pocket-locales.js';

const name = 'dsh-pocket';
const inject = ['slots', 'connection', 'layout', 'locale', 'sessionLogDownload'];

// 词典在 pocket-locales.js；这里只做「取 key → 替换 {占位符} → 字符串」。
// 不依赖 DSH t() 的插值能力，避免行为不一致。
function fmt(t, key, vars) {
  let s = t(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = String(s).split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

// 官方 DeepSeek Harness 设计系统（dsh-client-ui-theme design-platform.css）：
// 按钮 md=36px 胶囊形 / sm=28px；品牌色 --dsw-alias-brand-primary；
// hover 走 --dsw-alias-button-*-hover；间距 4px 栅格；正文 13px。
const styles = {
  card: { background: 'var(--dsw-alias-bg-layer-1,#fff)', border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', borderRadius: 12, padding: '16px 20px', maxWidth: 480 },
  block: { borderTop: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', marginTop: 16, paddingTop: 16 },
  muted: { color: 'var(--dsw-alias-label-tertiary,#8b93a1)', fontSize: 12, lineHeight: 1.5 },
  code: { fontFamily: 'ui-monospace,Menlo,monospace', fontSize: 12, wordBreak: 'break-all', margin: '6px 0 10px', color: 'var(--dsw-alias-label-primary,inherit)' },
  // 主按钮：官方 md 胶囊形（36px）
  primary: { font: 'inherit', cursor: 'pointer', border: 'none', background: 'var(--dsw-alias-button-primary-fill, var(--dsw-alias-brand-primary,#4f6ef7))', color: 'var(--dsw-alias-label-primary-foreground, #fff)', height: 36, padding: '0 16px', borderRadius: 999, fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  // 次级按钮：官方 outline/ghost 胶囊形
  btn: { font: 'inherit', cursor: 'pointer', border: '1px solid var(--dsw-alias-button-ghost-active-border, var(--dsw-alias-border-l2,#d1d5db))', background: 'var(--dsw-alias-bg-layer-1,#fff)', color: 'var(--dsw-alias-label-primary,inherit)', height: 36, padding: '0 16px', borderRadius: 999, fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  qr: { width: 220, height: 220, borderRadius: 10, border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', margin: '8px 0' },
  warn: { color: 'var(--dsw-alias-state-warn-primary,#b45309)', fontSize: 12, lineHeight: 1.5 },
};

// 同一份后端事实同时驱动设置页摘要、设置导航徽标、全局设置入口的小圆点。
// 后两者只是 DOM 增强：DSH 改版找不到节点时会静默失效，绝不影响设置页或安全逻辑。
function publicAccessState(status) {
  const phase = status?.tunnelState?.phase ?? 'idle';
  const fixed = status?.fixed ?? {};
  const fixedConfigured = Boolean(fixed.hostname && fixed.setup?.tunnel && fixed.setup?.dns);
  if (status?.tunnelRunning && phase === 'ready') return { kind: 'online' };
  if (['downloading', 'starting', 'registering', 'checking'].includes(phase)) return { kind: 'connecting' };
  if (phase === 'error') return { kind: 'problem', detail: status?.tunnelState?.detail };
  // 用户主动关闭隧道后是 idle，不是故障；仍可在灰色摘要中说明固定域名已配置。
  if (fixedConfigured) return { kind: 'local', detail: 'fixed-stopped' };
  return { kind: 'local' };
}

function publicStateColor(kind) {
  return ({ local: '#8b93a1', connecting: '#b45309', online: '#15803d', problem: '#dc2626' })[kind] ?? '#8b93a1';
}

function publicStateLabel(t, kind) {
  return kind === 'online' ? t('remoteSummaryOnline')
    : kind === 'connecting' ? t('remoteSummaryConnecting')
      : kind === 'problem' ? t('remoteSummaryProblem') : t('remoteSummaryLocal');
}

/**
 * 两个非正式位置的“渐进增强”。DSH 没有为设置左栏/全局设置按钮提供状态插槽，
 * 因而只在找到明确的交互节点时附加一个无交互的小圆点；找不到即什么也不做。
 */
function installPublicAccessIndicators(ctx, rpcCall, t) {
  let latest = { kind: 'local' };
  // 自己插入的状态节点不参与匹配，避免热更新或后续状态刷新时把“手机访问 ●”误判为另一个标签。
  const entryText = (node) => {
    const clone = node.cloneNode(true);
    clone.querySelectorAll('[data-dsh-pocket-status],[data-dsh-pocket-status-text]').forEach((item) => item.remove());
    return (clone.textContent ?? '').trim();
  };
  const candidates = (labels) => Array.from(document.querySelectorAll('button,[role="button"]'))
    .filter((node) => labels.includes(entryText(node)));
  const paint = (node, id) => {
    if (!node || !node.isConnected) return;
    let dot = node.querySelector(`:scope > [data-dsh-pocket-status="${id}"]`);
    if (!dot) {
      dot = document.createElement('span');
      dot.dataset.dshPocketStatus = id;
      dot.setAttribute('aria-hidden', 'true');
      dot.style.cssText = 'display:inline-block;width:8px;height:8px;border-radius:50%;margin-left:7px;vertical-align:middle;flex:0 0 auto;';
      node.appendChild(dot);
    }
    const label = publicStateLabel(t, latest.kind);
    dot.style.background = publicStateColor(latest.kind);
    dot.title = label;
    // 旧版曾在左栏显示文字，空间不足会截断“手机访问”；热更新时顺便清理。
    node.querySelector(`:scope > [data-dsh-pocket-status-text="${id}"]`)?.remove();
  };
  const render = () => {
    // 设置对话框左栏：仅状态点，完整说明只保留在右侧顶部摘要。
    for (const node of candidates([t('section'), 'Phone access'])) paint(node, 'phone-nav');
    // 应用左下角的“设置”：只显示圆点，避免挤压全局导航。
    for (const node of candidates(['设置', 'Settings'])) paint(node, 'global-settings');
  };
  const refresh = async () => {
    try {
      // connection.rpc 返回 { ok, value }；设置页本身会在 call() 中拆 value，
      // 全局/左栏增强层也必须读取同一份快照，否则会把所有状态误判为“仅本地”。
      const result = await rpcCall(POCKET_ENDPOINTS.status, {});
      if (result?.ok) latest = publicAccessState(result.value);
    } catch { /* 本地服务短暂重启时保留上次灯色 */ }
    render();
  };
  ctx.effect(() => {
    refresh();
    const observer = new MutationObserver(render);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    const timer = setInterval(refresh, 3000);
    return () => { observer.disconnect(); clearInterval(timer); };
  }, 'dsh-pocket: public access status indicators');
}

function PocketSettingsTab({ rpcCall, t }) {
  const [status, setStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('access');
  const [autoRestoreRiskOpen, setAutoRestoreRiskOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [tunnelState, setTunnelState] = useState(null); // 隧道进度 {phase, detail, startedAt}
  const [restartNotice, setRestartNotice] = useState(false); // 重启后提示
  const [updateInfo, setUpdateInfo] = useState(null); // { current, latest, updating, result, startedAt } | null
  const [isDesktop, setIsDesktop] = useState(false); // DSH Desktop（Electron）环境：更新/重启由桌面版管理
  const [now, setNow] = useState(Date.now()); // 每秒 tick，驱动倒计时
  const [guestForm, setGuestForm] = useState({ label: '', durationMinutes: 60, scope: 'both' });
  const [newGuestPin, setNewGuestPin] = useState(null);
  const [guestShare, setGuestShare] = useState(null);
  const [copyNotice, setCopyNotice] = useState('');

  // 进行中操作的「已等待 X 秒」倒计时
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = (startedAt) => (startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0);

  const call = async (endpoint, payload) => {
    const res = await rpcCall(endpoint, payload);
    if (!res?.ok) throw new Error(res?.error?.message ?? 'RPC failed');
    return res.value;
  };

  const load = async () => {
    try {
      const s = await call(POCKET_ENDPOINTS.status, {});
      setStatus(s);
      setTunnelState(s.tunnelState ?? null);
      setFixedHostnameInput((cur) => cur === '' ? (s.fixed?.hostname ?? '') : cur); // 首次加载预填域名
      if (s.desktop) setIsDesktop(true);
      if (s.restartNotice) {
        // 新进程确认起来了：显示一次「已重启」，清掉旧的更新横幅（单状态，不并存），
        // 然后自动刷新页面加载新代码——不用用户手动刷新
        setRestartNotice(true);
        setUpdateInfo(null);
        if (!sessionStorage.getItem('dshp-auto-reloaded')) {
          sessionStorage.setItem('dshp-auto-reloaded', '1');
          setTimeout(() => { try { location.reload(); } catch { /* 忽略 */ } }, 2000);
        }
      }
    } catch { /* 忽略瞬时失败 */ }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  // 每次页面加载清掉自动刷新标记——这样下次重启（更新后）才能再次触发自动刷新
  useEffect(() => {
    try { sessionStorage.removeItem('dshp-auto-reloaded'); } catch { /* 忽略 */ }
  }, []);

  // 版本检测：host 当前版本 vs npm registry latest（registry 带 CORS *）
  // 两种情况显示横幅：① 有新版可更新；② 磁盘已更新但进程还是旧代码（重启生效）
  // cache: 'no-store' —— registry 响应带缓存头，浏览器会缓存旧版本号导致「小版本不提示」
  // 周期重查（每 5 分钟）：npm registry 的 /latest 走 CDN 边缘缓存，刚发布后打开页面
  // 可能拿到旧版本号——周期性重查让更新提示在缓存刷新后自动出现，不用重开页面。
  // 桌面端（isDesktop）：更新/重启由 DSH Desktop 管理，这里不做版本检测、不显示更新横幅
  useEffect(() => {
    if (isDesktop) return;
    let alive = true;
    const check = async () => {
      try {
        const v = await call(POCKET_ENDPOINTS.version, {});
        const meta = await (await fetch('https://registry.npmjs.org/dsh-pocket/latest', { cache: 'no-store' })).json();
        if (!alive) return;
        const latest = typeof meta?.version === 'string' ? meta.version : null;
        if (latest && v.current && compareVersions(latest, v.current) > 0) {
          setUpdateInfo({ current: v.current, latest, updating: false, result: null });
        } else if (v.current && v.loaded && compareVersions(v.current, v.loaded) > 0) {
          // 已更新未重启：显示「已更新，重启生效」+ 重启按钮
          setUpdateInfo({ current: v.current, latest: v.current, updating: false, result: 'ok', updated: true });
        }
      } catch { /* 网络失败静默 */ }
    };
    check();
    const t = setInterval(check, 5 * 60 * 1000);
    return () => { alive = false; clearInterval(t); };
  }, [isDesktop]);

  // 重启宿主（更新生效必需：刷新页面不会重载服务端代码）
  const restartPocket = async () => {
    setUpdateInfo((u) => ({ ...u, restarting: true, startedAt: Date.now() }));
    try {
      // 宿主 500ms 后自杀，RPC 响应可能来不及送达 → 3 秒超时兜底，别让按钮永远卡「重启中…」
      await Promise.race([
        call(POCKET_ENDPOINTS.restart, {}),
        new Promise((_, rej) => setTimeout(() => rej(new Error('restart requested (no reply within 3s)')), 3000)),
      ]);
      setUpdateInfo((u) => ({ ...u, restarting: true, result: 'ok' }));
    } catch (err) {
      // 网络断连/超时同样视为「已请求重启」——旧进程即将退出，等新进程起来后刷新即可
      const msg = String(err?.message ?? '');
      if (/connection|socket|fetch|network|abort|cancelled|ECONN|disconnect|closed|timeout/i.test(msg)) {
        setUpdateInfo((u) => ({ ...u, restarting: true, result: 'ok' }));
        return;
      }
      setUpdateInfo((u) => ({ ...u, restarting: false, result: 'fail', output: err.message }));
    }
  };

  // 一键更新：调宿主 dsh plugin update（成功后宿主自动重启生效，用户只点一次）
  const runUpdate = async () => {
    setUpdateInfo((u) => ({ ...u, updating: true, result: null, startedAt: Date.now() }));
    try {
      const r = await call(POCKET_ENDPOINTS.update, {});
      setUpdateInfo((u) => ({
        ...u,
        updating: false,
        result: r.ok ? 'ok' : 'fail',
        autoRestart: r.autoRestart === true,
        output: r.output ?? r.error,
      }));
    } catch (err) {
      setUpdateInfo((u) => ({ ...u, updating: false, result: 'fail', output: err.message }));
    }
  };

  // 安全免责声明（issue #31）：每次开启公网都必须先弹框勾选「我已知情」。
  // 服务端同样强制（tunnel.start 需 disclaimer: true），防绕过前端直接调 RPC。
  // 区分模式：'quick'（快速隧道）| 'fixed'（固定域名）——确认后按模式开启。
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [disclaimerMode, setDisclaimerMode] = useState('quick');

  const doStartTunnel = async () => {
    setBusy(true);
    setError(null);
    setTunnelState({ phase: 'starting', detail: '正在开启…', startedAt: Date.now() });
    try {
      setStatus(await call(POCKET_ENDPOINTS.tunnelStart, { disclaimer: true }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const startTunnel = () => {
    // 每次开启都弹免责确认（勾选后才能继续）
    setDisclaimerMode('quick');
    setDisclaimerChecked(false);
    setDisclaimerOpen(true);
  };
  const confirmDisclaimer = () => {
    if (!disclaimerChecked) return; // 未勾选不允许
    setDisclaimerOpen(false);
    if (disclaimerMode === 'fixed') doStartFixedTunnel();
    else doStartTunnel();
  };

  const stopTunnel = async () => {
    try { setStatus(await call(POCKET_ENDPOINTS.tunnelStop, {})); } catch { /* 忽略 */ }
  };

  // ---- 固定域名（命名隧道 + Cloudflare Access）----
  const [fixedHostnameInput, setFixedHostnameInput] = useState('');
  const [fixedBusy, setFixedBusy] = useState(false);
  const [fixedStarting, setFixedStarting] = useState(false);
  const [fixedOpen, setFixedOpen] = useState(false); // 固定域名区块默认折叠（高级功能，展开才显示向导）
  const [fixedAdvOpen, setFixedAdvOpen] = useState(false); // 「高级选项」（额外 PIN 纵深防御）默认折叠
  const [fixedGuideOpen, setFixedGuideOpen] = useState(false); // Access 配置引导弹窗

  /** 保存固定域名（服务端校验；改域名后需重新初始化隧道与 DNS）。 */
  const saveFixedHostname = async () => {
    setFixedBusy(true);
    setError(null);
    try {
      setStatus(await call(POCKET_ENDPOINTS.fixedSetHostname, { hostname: fixedHostnameInput }));
    } catch (err) {
      setError(err.message);
    } finally {
      setFixedBusy(false);
    }
  };
  /** 第 1 步：登录 Cloudflare（浏览器授权，生成 cert.pem；完成状态由轮询反映）。 */
  const runFixedLogin = async () => {
    setFixedBusy(true);
    setError(null);
    try {
      await call(POCKET_ENDPOINTS.fixedLogin, {});
    } catch (err) {
      setError(err.message);
    } finally {
      setFixedBusy(false);
    }
  };
  /** 第 2 步：建命名隧道 + 绑 DNS（幂等；需要已登录 + 已保存域名）。 */
  const runFixedSetup = async () => {
    setFixedBusy(true);
    setError(null);
    try {
      setStatus(await call(POCKET_ENDPOINTS.fixedSetup, {}));
    } catch (err) {
      setError(err.message);
    } finally {
      setFixedBusy(false);
    }
  };
  /** 第 3 步：开启固定域名（同样先过免责声明）。 */
  const startFixedTunnel = () => {
    setDisclaimerMode('fixed');
    setDisclaimerChecked(false);
    setDisclaimerOpen(true);
  };
  const doStartFixedTunnel = async () => {
    setFixedBusy(true);
    setFixedStarting(true);
    setError(null);
    setTunnelState({ phase: 'starting', detail: '正在开启固定域名…', startedAt: Date.now() });
    try {
      setStatus(await call(POCKET_ENDPOINTS.tunnelStart, { disclaimer: true, mode: 'fixed' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setFixedBusy(false);
      setFixedStarting(false);
    }
  };
  /** Cloudflare Access 开关（边缘 MFA；关闭时固定域名强制 PIN）。 */
  const setFixedAccess = async (on) => {
    try {
      setStatus(await call(POCKET_ENDPOINTS.fixedSetAccess, { on }));
    } catch (err) {
      setError(err.message);
    }
  };
  /** Access 之外「额外要求 8 位 PIN」开关（纵深防御）。 */
  const setFixedPinAlways = async (on) => {
    try {
      setStatus(await call(POCKET_ENDPOINTS.fixedSetPinAlways, { on }));
    } catch (err) {
      setError(err.message);
    }
  };

  // 刷新局域网访问密码（旧密码立即作废）
  const refreshLanPin = async () => {
    try {
      const r = await call(POCKET_ENDPOINTS.lanTokenRefresh, {});
      setStatus((s) => ({ ...s, lanToken: r.lanToken }));
    } catch { /* 忽略 */ }
  };

  // 局域网访问密码开关（issue #24）：默认开启；关闭后局域网扫码直连（公网不受影响）
  const setLanAuth = async (on) => {
    try {
      const r = await call(POCKET_ENDPOINTS.lanAuthSetEnabled, { on });
      setStatus((s) => ({ ...s, lanAuthEnabled: r.lanAuthEnabled }));
    } catch { /* 忽略 */ }
  };
  const [virtualPinOffOpen, setVirtualPinOffOpen] = useState(false);

  // 局域网访问总开关：关闭后局域网扫码/链接直接失效（公网不受影响）。
  // 切换前弹窗确认（弹窗提醒）；服务端用 setLanEnabled 持久化，代理按 Host 实时拦截。
  const [lanToggleOpen, setLanToggleOpen] = useState(null); // null | true | false（目标 on 状态）
  const requestLanToggle = (on) => setLanToggleOpen(on);
  const confirmLanToggle = async () => {
    const on = lanToggleOpen;
    setLanToggleOpen(null);
    if (on === null) return;
    try {
      const r = await call(POCKET_ENDPOINTS.lanSetEnabled, { on });
      setStatus((s) => ({ ...s, lanEnabled: r.lanEnabled }));
    } catch (err) {
      setError(err.message);
    }
  };

  // 局域网地址手动覆盖（Tailscale/VPN 等远程访问场景）：空值恢复自动选择
  const setLanAddress = async (ip) => {
    try {
      setStatus(await call(POCKET_ENDPOINTS.lanSetOverride, { ip }));
    } catch (err) {
      setError(err.message);
    }
  };
  const useVirtualNetwork = async (ip) => {
    try {
      setStatus(await call(POCKET_ENDPOINTS.virtualUse, { ip }));
    } catch (err) {
      setError(err.message);
    }
  };
  const refreshVirtualNetworks = async () => {
    try {
      setStatus(await call(POCKET_ENDPOINTS.virtualRefresh, {}));
    } catch (err) {
      setError(err.message);
    }
  };
  const setAutoRestore = async (on) => {
    if (on) { setAutoRestoreRiskOpen(true); return; }
    try { setStatus(await call(POCKET_ENDPOINTS.tunnelSetAutoRestore, { on: false })); } catch (err) { setError(err.message); }
  };
  const confirmAutoRestore = async () => {
    setAutoRestoreRiskOpen(false);
    try { setStatus(await call(POCKET_ENDPOINTS.tunnelSetAutoRestore, { on: true })); } catch (err) { setError(err.message); }
  };
  const guestAction = async (endpoint, payload = {}) => {
    try {
      const r = await call(endpoint, payload);
      setStatus((s) => ({ ...s, guestAccess: r?.grants ? r : s?.guestAccess }));
      return r;
    } catch (err) { setError(err.message); return null; }
  };
  const createGuest = async () => {
    const r = await guestAction(POCKET_ENDPOINTS.guestCreate, guestForm);
    if (r?.pin) {
      setCopyNotice('');
      setNewGuestPin({ pin: r.pin, expiresAt: r.grant.expiresAt });
      setStatus((s) => ({ ...s, guestAccess: { ...(s?.guestAccess ?? {}), grants: [...(s?.guestAccess?.grants ?? []), r.grant] } }));
      setGuestForm((f) => ({ ...f, label: '' }));
    }
  };
  const createGuestShare = async (grant) => {
    const r = await guestAction(POCKET_ENDPOINTS.guestCreateInvite, { id: grant.id });
    if (!r?.secret) return;
    const links = [];
    const add = (kind, label, base, available, reason) => {
      let url = '';
      if (available && base) {
        try { url = `${new URL('/pocket-invite', base).toString()}#invite=${encodeURIComponent(r.secret)}`; } catch { /* 忽略无效 URL */ }
      }
      links.push({ kind, label, url, available: !!url, reason });
    };
    const lanAllowed = grant.scope !== 'public';
    const publicAllowed = grant.scope !== 'lan';
    add('lan', t('guestShareLan'), status?.lanUrl, lanAllowed && status?.lanEnabled !== false && !!status?.lanUrl,
      !lanAllowed ? t('guestScopeExcluded') : status?.lanEnabled === false ? t('guestLanDisabled') : t('guestAddressUnavailable'));
    add('public', status?.tunnelMode === 'fixed' ? t('guestShareFixed') : t('guestSharePublic'), status?.tunnelUrl,
      publicAllowed && status?.tunnelRunning === true && !!status?.tunnelUrl,
      !publicAllowed ? t('guestScopeExcluded') : t('guestPublicDisabled'));
    setCopyNotice('');
    setGuestShare({ grant, links });
  };
  const copyText = async (value) => {
    try {
      if (navigator.clipboard?.writeText && globalThis.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const area = document.createElement('textarea');
        area.value = value; area.setAttribute('readonly', '');
        area.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(area); area.select(); area.setSelectionRange(0, area.value.length);
        const copied = document.execCommand('copy'); document.body.removeChild(area);
        if (!copied) throw new Error('copy unavailable');
      }
      setCopyNotice(t('guestCopied'));
      return true;
    } catch { setCopyNotice(t('guestCopyFailed')); return false; }
  };
  const shareGuestLink = async (item) => {
    try {
      if (navigator.share) await navigator.share({ title: t('guestShareTitle'), text: t('guestShareText'), url: item.url });
      else await copyText(item.url);
    } catch { /* 用户取消系统分享时静默 */ }
  };

  // 自定义访问密码（issue #33）：公网/局域网各自设固定 8 位数字；自定义后公网不再自动轮换。
  // customPin: { which: 'public'|'lan', value, err } | null —— 正在输入自定义密码的区块
  const [customPin, setCustomPin] = useState(null);
  const saveCustomPin = async (which) => {
    try {
      const r = await call(POCKET_ENDPOINTS.pinSetCustom, { which, value: customPin?.value ?? '' });
      setStatus((s) => ({
        ...s,
        accessToken: which === 'public' ? r.pin : s.accessToken,
        lanToken: which === 'lan' ? r.pin : s.lanToken,
        publicPinCustom: which === 'public' ? true : s.publicPinCustom,
        lanPinCustom: which === 'lan' ? true : s.lanPinCustom,
      }));
      setCustomPin(null);
    } catch (err) {
      setCustomPin((c) => ({ ...c, err: err.message }));
    }
  };
  // 渲染自定义输入行（共用）：输入框 + 保存/取消
  const customPinRow = (which) => h('div', { style: { marginTop: 6, fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)', lineHeight: 1.5 } },
    t('customizing'),
    h('input', {
      style: { width: 110, margin: '0 6px', padding: '4px 8px', fontSize: 14, letterSpacing: 2, textAlign: 'center', border: '1px solid var(--dsw-alias-border-l2,#d1d5db)', borderRadius: 6, outline: 'none' },
      type: 'password',
      inputMode: 'numeric',
      maxLength: 8,
      value: customPin?.value ?? '',
      autoFocus: true,
      onChange: (e) => setCustomPin((c) => ({ ...c, value: e.target.value.replace(/\D/g, ''), err: null })),
      onKeyDown: (e) => { if (e.key === 'Enter') saveCustomPin(which); if (e.key === 'Escape') setCustomPin(null); },
    }),
    h('button', { style: { ...styles.btn, height: 26, padding: '0 10px', fontSize: 12, marginLeft: 2 }, onClick: () => saveCustomPin(which) }, t('save')),
    h('button', { style: { ...styles.btn, height: 26, padding: '0 10px', fontSize: 12 }, onClick: () => setCustomPin(null) }, t('cancel')),
    customPin?.err ? h('div', { style: { color: 'var(--dsw-alias-state-error-primary,#dc2626)', marginTop: 4 } }, customPin.err) : null,
  );
  // 「自定义」按钮（非输入态显示在密码行末尾）
  const customBtn = (which) => h('button', { style: { ...styles.btn, height: 26, padding: '0 10px', fontSize: 12, marginLeft: 8 }, onClick: () => setCustomPin({ which, value: '', err: null }) }, t('customize'));

  const lanUrl = status?.lanUrl;
  const virtualNetworks = status?.virtualNetworks || [];
  const activeVirtualNetwork = virtualNetworks.find((network) => network.ip === status?.lanIpOverride) ?? null;
  const requestLanAuth = (on) => {
    if (!on && activeVirtualNetwork) setVirtualPinOffOpen(true);
    else void setLanAuth(on);
  };
  const tunnelUrl = status?.tunnelUrl;
  const tunnelPhase = tunnelState?.phase ?? 'idle';
  const tunnelStarting = ['downloading', 'starting', 'registering'].includes(tunnelPhase);
  const tunnelStateDetail = tunnelState?.detail ?? '';
  const tunnelStateStarted = tunnelState?.startedAt ?? null;
  // 固定域名（命名隧道）状态
  const tunnelMode = status?.tunnelMode ?? null;
  const fixedInfo = status?.fixed ?? { hostname: '', accessEnabled: false, pinAlways: false, accessCheck: { state: 'not-requested', detail: '' }, setup: { cert: false, tunnel: false, dns: false } };
  const fHostname = fixedInfo.hostname ?? '';
  const fCert = fixedInfo.setup?.cert === true;
  const fTunnel = fixedInfo.setup?.tunnel === true;
  const fDns = fixedInfo.setup?.dns === true;
  const fAccess = fixedInfo.accessEnabled === true;
  const fAccessVerified = fixedInfo.accessCheck?.state === 'verified';
  const fAccessCheckDetail = fixedInfo.accessCheck?.detail ?? '';
  const fPinAlways = fixedInfo.pinAlways === true;
  const fixedRunning = tunnelMode === 'fixed' && Boolean(tunnelUrl);
  const quickRunning = tunnelMode !== 'fixed' && Boolean(tunnelUrl);
  const fixedPinRequired = !fAccess || !fAccessVerified || fPinAlways; // 未验证时必须保留 PIN
  // 折叠摘要：状态标签（未配置/待初始化/已就绪/运行中）+ 对应颜色
  const fixedStatus = !fHostname ? 'unconfigured' : (fixedRunning ? 'running' : (fTunnel && fDns ? 'ready' : 'pending'));
  const fixedStatusLabel = fixedStatus === 'unconfigured' ? t('fixedStatusUnconfigured')
    : fixedStatus === 'running' ? t('fixedStatusRunning')
    : fixedStatus === 'ready' ? t('fixedStatusReady')
    : t('fixedStatusPending');
  const fixedStatusColor = fixedStatus === 'unconfigured' ? 'var(--dsw-alias-label-tertiary,#8b93a1)'
    : fixedStatus === 'running' ? 'var(--dsw-alias-state-success-primary,#15803d)'
    : fixedStatus === 'ready' ? 'var(--dsw-alias-brand-primary,#4f6ef7)'
    : 'var(--dsw-alias-state-warn-primary,#b45309)';
  const remoteState = publicAccessState(status);
  let remoteHost = '—';
  if (tunnelMode === 'fixed') remoteHost = fHostname;
  else if (tunnelUrl) {
    try { remoteHost = new URL(tunnelUrl).host; } catch { remoteHost = tunnelUrl; }
  }
  const remoteSummaryDetail = remoteState.kind === 'online'
    ? fmt(t, 'remoteSummaryOnlineDetail', {
      mode: tunnelMode === 'fixed' ? t('remoteModeFixed') : t('remoteModeQuick'),
      host: remoteHost,
      access: fAccess ? (fAccessVerified ? t('remoteAccessVerified') : t('remoteAccessUnverified')) : t('remoteAccessUnverified'),
      pin: fixedPinRequired ? t('remotePinForced') : t('remotePinDisabled'),
    })
    : remoteState.kind === 'connecting' ? t('remoteSummaryConnectingDetail')
      : remoteState.kind === 'problem' ? fmt(t, 'remoteSummaryProblemDetail', { detail: remoteState.detail || t('fixedRuntimeStopped') })
        : remoteState.detail === 'fixed-stopped' ? t('remoteSummaryLocalFixedDetail') : t('remoteSummaryLocalDetail');
  const tabButton = (id, label) => h('button', {
    style: { ...styles.btn, height: 30, padding: '0 11px', fontSize: 12, fontWeight: activeTab === id ? 600 : 400, background: activeTab === id ? 'var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#4f6ef7))' : 'var(--dsw-alias-bg-layer-1,#fff)', color: activeTab === id ? 'var(--dsw-alias-label-primary-foreground,#fff)' : 'var(--dsw-alias-label-primary,inherit)' },
    onClick: () => setActiveTab(id),
  }, label);

  return h('div', { style: styles.card },
    h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
      h('div', null,
        h('strong', null, t('title')),
        h('div', { style: styles.muted }, t('subtitle')),
      ),
      h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-tertiary,#8b93a1)', textAlign: 'right' } },
        h('div', { style: { whiteSpace: 'nowrap' } }, t('developer')),
        h('div', { style: { whiteSpace: 'nowrap' } }, t('starAsk')),
        h('span', { style: { display: 'inline-flex', gap: 6, alignItems: 'center' } },
          h('a', { href: 'https://github.com/shaobeichen/dsh-pocket', target: '_blank', rel: 'noreferrer', style: { color: 'var(--dsw-alias-brand-primary,#4f6ef7)', fontSize: 12, lineHeight: 1.6, textDecoration: 'underline' } }, t('starOriginal')),
          h('span', null, '·'),
          h('a', { href: 'https://github.com/hanjiangfly/dsh-pocket', target: '_blank', rel: 'noreferrer', style: { color: 'var(--dsw-alias-brand-primary,#4f6ef7)', fontSize: 12, lineHeight: 1.6, textDecoration: 'underline' } }, t('starFork')),
        ),
      ),
    ),

    // 保底层：官方 settings.section 插槽内的常驻状态摘要。
    h('div', { style: { ...styles.block, borderLeft: `4px solid ${publicStateColor(remoteState.kind)}`, borderRadius: 8, background: 'var(--dsw-alias-bg-layer-2,#f7f7f8)', padding: '10px 12px' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600, fontSize: 13 } },
        h('span', { style: { width: 8, height: 8, borderRadius: '50%', background: publicStateColor(remoteState.kind), display: 'inline-block', flex: '0 0 auto' } }),
        publicStateLabel(t, remoteState.kind),
      ),
      h('div', { style: { ...styles.muted, marginTop: 4, wordBreak: 'break-word' } }, remoteSummaryDetail),
    ),

    h('div', { style: { display: 'flex', gap: 6, marginTop: 14, borderBottom: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', paddingBottom: 10, flexWrap: 'wrap' } },
      tabButton('access', t('tabAccess')), tabButton('network', t('tabNetwork')), tabButton('security', t('tabSecurity')),
    ),

    activeTab === 'access' ? h('div', null,
      h('div', { style: styles.block },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          h('strong', { style: { fontSize: 13 } }, t('autoRestoreTitle')),
          h('button', { style: { ...styles.btn, height: 28, padding: '0 12px', fontSize: 12, marginLeft: 'auto', fontWeight: status?.publicAutoRestore ? 600 : 400, background: status?.publicAutoRestore ? 'var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#4f6ef7))' : 'var(--dsw-alias-bg-layer-1,#fff)', color: status?.publicAutoRestore ? 'var(--dsw-alias-label-primary-foreground,#fff)' : 'var(--dsw-alias-label-primary,inherit)' }, onClick: () => setAutoRestore(status?.publicAutoRestore !== true) }, status?.publicAutoRestore ? t('on') : t('off')),
        ),
        h('div', { style: { ...styles.muted, marginTop: 4 } }, status?.publicAutoRestore ? t('autoRestoreHintOn') : t('autoRestoreHintOff')),
      ),
      h('div', { style: styles.block },
        h('strong', { style: { fontSize: 13 } }, t('accessCurrentLinks')),
        lanUrl ? h('div', { style: { marginTop: 8 } }, h('img', { src: status?.lanQr, alt: 'LAN QR', style: { ...styles.qr, width: 150, height: 150 } }), h('div', { style: styles.code }, lanUrl)) : null,
        tunnelUrl ? h('div', { style: { marginTop: 8 } }, h('img', { src: status?.tunnelQr, alt: 'Public QR', style: { ...styles.qr, width: 150, height: 150 } }), h('div', { style: styles.code }, tunnelUrl)) : h('div', { style: { ...styles.muted, marginTop: 8 } }, t('accessNoPublic')),
      ),
    ) : null,
    activeTab === 'security' ? h('div', { style: styles.block },
      h('strong', { style: { fontSize: 13 } }, t('securitySummary')),
      h('div', { style: { ...styles.muted, marginTop: 6 } }, t('securityHint')),
      h('div', { style: { ...styles.warn, marginTop: 8 } }, fAccess && fAccessVerified ? t('remoteAccessVerified') : t('remoteAccessUnverified')),
    ) : null,

    // 桌面端不显示更新/重启横幅（更新由 DSH Desktop 管理），也不需要额外提示

    // 重启后提示（进程在后台运行，停止方法）——左侧蓝色色条（桌面端不会触发本插件的自重启）
    !isDesktop && restartNotice ? h('div', { style: { ...styles.block, borderLeft: '4px solid var(--dsw-alias-brand-primary,#4f6ef7)', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-2,#f3f4f6)', padding: '10px 12px' } },
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
        h('div', { style: { fontWeight: 600, fontSize: 13 } }, t('restarted')),
        h('button', { style: styles.btn, onClick: () => setRestartNotice(false) }, t('ok')),
      ),
      h('div', { style: styles.muted, marginTop: 4, wordBreak: 'break-all' }, fmt(t, 'bgHint', { cmd: status?.killHint ?? `lsof -ti :${status?.dshPort ?? 3080} | xargs kill -9` })),
    ) : null,

    // 更新提示——左侧黄色色条（提示有新版本）；单状态：有更新/更新中/已更新自动重启，不并存
    // 桌面端不渲染（更新由 DSH Desktop 管理）
    !isDesktop && updateInfo ? h('div', { style: { ...styles.block, borderLeft: '4px solid var(--dsw-alias-state-warn-primary,#b45309)', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-2,#f3f4f6)', padding: '10px 12px' } },
      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
        h('div', { style: { fontWeight: 600, fontSize: 13 } },
          updateInfo.updated
            ? fmt(t, 'updatedRestart', { ver: updateInfo.current })
            : updateInfo.result === 'ok'
              ? (updateInfo.autoRestart ? fmt(t, 'updateAutoRestarting', { ver: updateInfo.latest }) : fmt(t, 'updatedOk', { ver: updateInfo.latest }))
              : fmt(t, 'updateAvailable', { ver: updateInfo.latest })),
        updateInfo.result !== 'ok'
          ? h('button', { style: styles.primary, onClick: runUpdate, disabled: updateInfo.updating }, updateInfo.updating ? t('updating') : fmt(t, 'updateTo', { ver: updateInfo.latest }))
          : updateInfo.autoRestart
            ? h('button', { style: styles.btn, disabled: true }, t('restartingNow'))
            : h('button', { style: styles.primary, onClick: restartPocket, disabled: updateInfo.restarting }, updateInfo.restarting ? t('restarting') : t('restartNow')),
      ),
      h('div', { style: styles.muted, marginTop: 4 },
        updateInfo.updating
          ? fmt(t, 'updatingDetail', { s: elapsed(updateInfo.startedAt) })
        : updateInfo.restarting
          ? fmt(t, 'restartingDetail', { s: elapsed(updateInfo.startedAt) })
        : updateInfo.result === 'ok'
          ? (updateInfo.autoRestart ? t('updatedAutoDetail')
            : t('updatedRestartDetail'))
        : updateInfo.result === 'fail' ? fmt(t, 'updateFailed', { err: updateInfo.output || t('unknownError') })
        : fmt(t, 'versionRange', { cur: updateInfo.current, latest: updateInfo.latest })),
    ) : null,

    // 网络配置：局域网、虚拟局域网与两种公网隧道集中在这里，避免日常扫码页面过长。
    activeTab === 'network' ? h(Fragment, null,
    // 局域网
    h('div', { style: styles.block },
      h('div', { style: { fontWeight: 600, fontSize: 13 } }, t('lanTitle')),
      // 局域网访问总开关：关闭后扫码/链接直接失效（公网不受影响）
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 } },
        h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)' } }, t('lanAccess')),
        h('button', {
          style: { ...styles.btn, height: 28, padding: '0 12px', fontSize: 12, fontWeight: status?.lanEnabled !== false ? 600 : 400, background: status?.lanEnabled !== false ? 'var(--dsw-alias-button-primary-fill, var(--dsw-alias-brand-primary,#4f6ef7))' : 'var(--dsw-alias-bg-layer-1,#fff)', color: status?.lanEnabled !== false ? 'var(--dsw-alias-label-primary-foreground, #fff)' : 'var(--dsw-alias-label-primary,inherit)' },
          onClick: () => requestLanToggle(true),
        }, t('on')),
        h('button', {
          style: { ...styles.btn, height: 28, padding: '0 12px', fontSize: 12, fontWeight: status?.lanEnabled === false ? 600 : 400, background: status?.lanEnabled === false ? 'var(--dsw-alias-state-error-primary,#dc2626)' : 'var(--dsw-alias-bg-layer-1,#fff)', color: status?.lanEnabled === false ? '#fff' : 'var(--dsw-alias-label-primary,inherit)' },
          onClick: () => requestLanToggle(false),
        }, t('off')),
      ),
      status?.lanEnabled === false
        ? h('div', { style: { marginTop: 8, fontSize: 12, color: 'var(--dsw-alias-state-warn-primary,#b45309)', lineHeight: 1.5 } }, t('lanDisabledHint'))
        : (lanUrl
          ? h('div', null,
          h('img', { src: status.lanQr, alt: 'LAN QR', style: styles.qr }),
          h('div', { style: styles.code }, lanUrl),
          h('div', { style: styles.muted }, t('lanHint')),
          h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)' } },
            t('lanAddress'),
            h('select', {
              value: status?.lanIpOverride || '',
              onChange: (e) => setLanAddress(e.target.value),
              style: { font: 'inherit', height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid var(--dsw-alias-border-l2,#d1d5db)', background: 'var(--dsw-alias-bg-layer-1,#fff)', color: 'var(--dsw-alias-label-primary,inherit)' },
            },
            h('option', { value: '' }, t('lanAddressAuto')),
            (status?.lanCandidates || []).map((ip) => h('option', { key: ip, value: ip }, ip)),
            ),
          ),
          h('div', { style: { ...styles.muted, marginTop: 2 } }, t('lanAddressHint')),
          // 访问密码开关（issue #24）：默认开启；关闭后扫码直连（仅同一局域网设备可访问）
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 } },
            h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)' } }, t('lanPin')),
            h('button', {
              style: { ...styles.btn, height: 28, padding: '0 12px', fontSize: 12, fontWeight: status?.lanAuthEnabled !== false ? 600 : 400, background: status?.lanAuthEnabled !== false ? 'var(--dsw-alias-button-primary-fill, var(--dsw-alias-brand-primary,#4f6ef7))' : 'var(--dsw-alias-bg-layer-1,#fff)', color: status?.lanAuthEnabled !== false ? 'var(--dsw-alias-label-primary-foreground, #fff)' : 'var(--dsw-alias-label-primary,inherit)' },
              onClick: () => requestLanAuth(true),
            }, t('on')),
            h('button', {
              style: { ...styles.btn, height: 28, padding: '0 12px', fontSize: 12, fontWeight: status?.lanAuthEnabled === false ? 600 : 400, background: status?.lanAuthEnabled === false ? 'var(--dsw-alias-state-error-primary,#dc2626)' : 'var(--dsw-alias-bg-layer-1,#fff)', color: status?.lanAuthEnabled === false ? '#fff' : 'var(--dsw-alias-label-primary,inherit)' },
              onClick: () => requestLanAuth(false),
            }, t('off')),
          ),
          status?.lanAuthEnabled !== false
            ? (customPin?.which === 'lan'
                ? customPinRow('lan')
                : h('div', { style: { marginTop: 6, fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)', lineHeight: 1.5 } },
                  fmt(t, status?.lanPinCustom ? 'lanPinCustomValue' : 'lanPinValue', { pin: status.lanToken }),
                  h('button', { style: { ...styles.btn, height: 26, padding: '0 10px', fontSize: 12, marginLeft: 8 }, onClick: refreshLanPin }, t('refresh')),
                  customBtn('lan'),
                ))
            : h('div', { style: { marginTop: 6, fontSize: 12, color: 'var(--dsw-alias-state-warn-primary,#b45309)', lineHeight: 1.5 } },
              activeVirtualNetwork ? t('virtualPinOff') : t('lanPinOff')),
          )
          : h('div', { style: styles.muted }, t('lanStarting'))),
    ),

    // 虚拟局域网：把已连接的 Tailscale / ZeroTier 网卡变成一键可用的专属二维码。
    h('div', { style: styles.block },
      h('div', { style: { fontWeight: 600, fontSize: 13 } }, t('virtualTitle')),
      h('div', { style: { ...styles.muted, marginTop: 4 } }, t('virtualHint')),
      h('button', { style: { ...styles.btn, height: 28, padding: '0 12px', fontSize: 12, marginTop: 8 }, onClick: refreshVirtualNetworks }, t('virtualRefresh')),
      virtualNetworks.length === 0
        ? h('div', { style: { ...styles.warn, marginTop: 8 } }, t('virtualNone'))
        : virtualNetworks.map((network) => {
          const selected = activeVirtualNetwork?.ip === network.ip;
          return h('div', { key: `${network.kind}-${network.ip}`, style: { marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--dsw-alias-border-l2,#e5e7eb)' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { style: { fontSize: 12, fontWeight: 600 } }, `● ${network.label}`),
              h('span', { style: { ...styles.code, margin: 0, color: 'var(--dsw-alias-label-secondary,#6b7280)' } }, network.ip),
              h('button', {
                style: { ...styles.btn, marginLeft: 'auto', height: 28, padding: '0 12px', fontSize: 12, ...(selected ? { borderColor: 'var(--dsw-alias-state-success-primary,#15803d)', color: 'var(--dsw-alias-state-success-primary,#15803d)' } : {}) },
                onClick: () => useVirtualNetwork(network.ip),
              }, selected ? t('virtualSelected') : t('virtualUse')),
            ),
            selected && network.url ? h('div', null,
              h('img', { src: network.qr, alt: `${network.label} QR`, style: styles.qr }),
              h('div', { style: styles.code }, network.url),
              h('div', { style: styles.muted }, t('virtualPhoneHint')),
              h('div', { style: { ...styles.warn, marginTop: 6 } }, t('virtualSafetyTitle')),
              h('div', { style: styles.muted }, t('virtualSafetyBody')),
            ) : null,
          );
        }),
    ),

    // 公网
    h('div', { style: styles.block },
      h('div', { style: { fontWeight: 600, fontSize: 13 } }, t('wanTitle')),
      // 共享的隧道进度（两种模式共用 tunnelState；谁在跑/在开就显示谁的进度）
      tunnelStarting
        ? h('div', { style: { marginTop: 6, fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)' } },
          tunnelPhase === 'downloading'
            ? fmt(t, 'downloading', { s: elapsed(tunnelStateStarted) })
            : fmt(t, 'connecting', { s: elapsed(tunnelStateStarted), suffix: elapsed(tunnelStateStarted) > 30 ? t('slowHint') : '' }))
        : tunnelPhase === 'error'
          ? h('div', { style: { marginTop: 6, fontSize: 12, color: 'var(--dsw-alias-state-error-primary,#dc2626)' } },
            fmt(t, 'error', { detail: tunnelStateDetail || t('unknownError') }))
          : null,

      // ---- 快速隧道（临时地址，无需账号）----
      h('div', { style: { ...styles.block, borderTop: '1px dashed var(--dsw-alias-border-l2,#e5e7eb)', marginTop: 10, paddingTop: 10 } },
        h('div', { style: { fontSize: 12, fontWeight: 600, color: 'var(--dsw-alias-label-secondary,#6b7280)', marginBottom: 4 } }, t('quickTitle')),
        quickRunning
          ? h('div', null,
            h('img', { src: status.tunnelQr, alt: 'Tunnel QR', style: styles.qr }),
            h('div', { style: styles.code }, tunnelUrl),
            h('div', { style: styles.muted }, t('quickHint')),
            status.accessToken
              ? (customPin?.which === 'public'
                  ? customPinRow('public')
                  : h('div', { style: { marginTop: 6, fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)', lineHeight: 1.5 } },
                    fmt(t, status?.publicPinCustom ? 'wanPinCustom' : 'wanPin', { pin: status.accessToken }),
                    customBtn('public'),
                    status?.publicPinCustom ? h('div', { style: { marginTop: 2, fontSize: 11, color: 'var(--dsw-alias-state-warn-primary,#b45309)' } }, t('pinCustomHint')) : null,
                  ))
              : null,
            h('button', { style: styles.btn, onClick: stopTunnel }, t('stopTunnel')),
          )
          : h('div', null,
            h('button', { style: { ...styles.primary, margin: '8px 0' }, onClick: startTunnel, disabled: busy }, busy ? t('opening') : t('enable')),
            h('div', { style: styles.muted }, t('quickHint')),
          ),
      ),

      // ---- 固定域名（命名隧道 + Cloudflare Access）----
      // 高级功能默认折叠：头部一行（标题 + 状态标签 + 展开箭头），点开才显示向导与开关。
      // 状态点一目了然：未配置 / 待初始化 / 已就绪 / 运行中——不用展开就能判断进度。
      h('div', { style: { ...styles.block, borderTop: '1px dashed var(--dsw-alias-border-l2,#e5e7eb)', marginTop: 10, paddingTop: 10 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }, onClick: () => setFixedOpen(!fixedOpen) },
          h('span', { style: { fontSize: 12, fontWeight: 600, color: 'var(--dsw-alias-label-secondary,#6b7280)' } }, t('fixedTitle')),
          h('span', { style: { marginLeft: 'auto', fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 999, color: fixedStatusColor, border: `1px solid ${fixedStatusColor}`, background: 'var(--dsw-alias-bg-layer-1,#fff)' } }, fixedStatusLabel),
          h('span', { style: { fontSize: 10, color: 'var(--dsw-alias-label-tertiary,#8b93a1)' } }, fixedOpen ? '▴' : '▾'),
        ),
        // 折叠摘要：已配置显示域名，未配置给提示（含 Access 推荐说明）
        !fixedOpen ? h('div', { style: { ...styles.muted, marginTop: 2 } },
          fHostname ? fHostname : t('fixedCollapsedHint'),
        ) : null,

        // 展开内容（向导 + 开关）
        !fixedOpen ? null : h('div', null,
          h('div', { style: { ...styles.muted, marginTop: 2 } }, t('fixedSubtitle')),

          // 域名输入/保存
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 } },
            h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)' } }, t('fixedHostnameLabel')),
            h('input', {
              style: { flex: 1, minWidth: 0, font: 'inherit', height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid var(--dsw-alias-border-l2,#d1d5db)', background: 'var(--dsw-alias-bg-layer-1,#fff)', color: 'var(--dsw-alias-label-primary,inherit)', outline: 'none' },
              placeholder: t('fixedHostnamePlaceholder'),
              value: fixedHostnameInput,
              onChange: (e) => setFixedHostnameInput(e.target.value),
              onKeyDown: (e) => { if (e.key === 'Enter') saveFixedHostname(); },
            }),
            h('button', { style: { ...styles.btn, height: 30, padding: '0 12px', fontSize: 12 }, onClick: saveFixedHostname, disabled: fixedBusy }, t('fixedSave')),
          ),
          fHostname ? h('div', { style: { marginTop: 4, fontSize: 11, color: 'var(--dsw-alias-state-success-primary,#15803d)' } }, fmt(t, 'fixedSaved', { hostname: fHostname })) : null,

          // 初始化向导：① 登录 ② 建隧道+绑 DNS ③ 开启
          h('div', { style: { ...styles.muted, marginTop: 10, fontWeight: 600 } }, t('fixedSetupWizard')),
          h('div', { style: { marginTop: 6, fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)', lineHeight: 1.6 } },
            // ① 登录
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
              h('span', null, fCert ? `✅ ${t('fixedStep1Done')}` : t('fixedStep1')),
              fCert
                ? null
                : h('button', { style: { ...styles.btn, height: 26, padding: '0 10px', fontSize: 12 }, onClick: runFixedLogin, disabled: fixedBusy }, t('fixedLoginBtn')),
            ),
            // 登录进行中/授权链接
            !fCert && status?.fixedLogin?.url
              ? h('div', { style: { marginTop: 4, fontSize: 11, color: 'var(--dsw-alias-state-warn-primary,#b45309)', lineHeight: 1.5 } },
                t('fixedLoginHint'),
                h('div', null,
                  h('a', { href: status.fixedLogin.url, target: '_blank', rel: 'noreferrer', style: { color: 'var(--dsw-alias-brand-primary,#4f6ef7)', textDecoration: 'underline' } }, t('fixedOpenUrl')),
                ),
              )
              : null,
            // ② 初始化
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' } },
              h('span', null, fTunnel && fDns ? `✅ ${t('fixedStep2Done')}` : t('fixedStep2')),
              !(fTunnel && fDns)
                ? h('button', {
                  style: { ...styles.btn, height: 26, padding: '0 10px', fontSize: 12 },
                  onClick: runFixedSetup,
                  disabled: fixedBusy || !fCert || !fHostname,
                  title: !fCert ? t('fixedNeedLoginFirst') : (!fHostname ? t('fixedNeedHostname') : ''),
                }, fixedBusy ? t('fixedSetupBusy') : t('fixedSetupBtn'))
                : null,
            ),
            // ③ 开启/运行
            h('div', { style: { marginTop: 8, padding: '7px 9px', borderRadius: 8, fontSize: 11, lineHeight: 1.5, background: fixedRunning ? 'rgba(22,163,74,.08)' : (fixedStarting ? 'rgba(217,119,6,.10)' : 'rgba(220,38,38,.08)'), color: fixedRunning ? 'var(--dsw-alias-state-success-primary,#15803d)' : (fixedStarting ? 'var(--dsw-alias-state-warn-primary,#b45309)' : 'var(--dsw-alias-state-error-primary,#dc2626)') } },
              fixedRunning
                ? fmt(t, 'fixedRuntimeLive', { port: status?.proxyPort ?? '—' })
                : fixedStarting
                  ? (tunnelPhase === 'downloading' ? fmt(t, 'fixedRuntimeDownloading', { s: elapsed(tunnelStateStarted) }) : fmt(t, 'fixedRuntimeStarting', { detail: tunnelStateDetail || fmt(t, 'connecting', { s: elapsed(tunnelStateStarted), suffix: '' }) }))
                  : (tunnelPhase === 'error' ? fmt(t, 'fixedRuntimeError', { detail: tunnelStateDetail || t('unknownError') }) : t('fixedRuntimeStopped')),
            ),
            fixedRunning
              ? h('div', { style: { marginTop: 8 } },
                h('div', { style: { fontSize: 12, fontWeight: 600, color: 'var(--dsw-alias-state-success-primary,#15803d)' } }, t('fixedRunning')),
                h('img', { src: status.tunnelQr, alt: 'Fixed QR', style: styles.qr }),
                h('div', { style: styles.code }, tunnelUrl),
                fixedPinRequired && status.accessToken
                  ? (customPin?.which === 'public'
                      ? customPinRow('public')
                      : h('div', { style: { marginTop: 6, fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)', lineHeight: 1.5 } },
                        fmt(t, status?.publicPinCustom ? 'wanPinCustom' : 'fixedWanPin', { pin: status.accessToken }),
                        customBtn('public'),
                        status?.publicPinCustom ? h('div', { style: { marginTop: 2, fontSize: 11, color: 'var(--dsw-alias-state-warn-primary,#b45309)' } }, t('pinCustomHint')) : null,
                      ))
                  : null,
                h('button', { style: styles.btn, onClick: stopTunnel }, t('fixedStop')),
              )
              : h('div', { style: { marginTop: 6 } },
                h('button', {
                  style: { ...styles.primary },
                  onClick: startFixedTunnel,
                  disabled: fixedBusy || !fTunnel || !fDns || !fHostname,
                }, t('fixedEnableBtn')),
                (!fTunnel || !fDns) && fHostname
                  ? h('div', { style: { marginTop: 4, fontSize: 11, color: 'var(--dsw-alias-state-warn-primary,#b45309)' } },
                    !fCert ? t('fixedNeedLoginFirst') : t('fixedNeedSetup'))
                  : null,
              ),
          ),

          // Cloudflare Access 开关（推荐）
          h('div', { style: { borderTop: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', marginTop: 10, paddingTop: 8 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)' } }, t('fixedAccessTitle')),
              h('button', {
                style: { ...styles.btn, height: 28, padding: '0 12px', fontSize: 12, fontWeight: fAccess ? 600 : 400, background: fAccess ? 'var(--dsw-alias-button-primary-fill, var(--dsw-alias-brand-primary,#4f6ef7))' : 'var(--dsw-alias-bg-layer-1,#fff)', color: fAccess ? 'var(--dsw-alias-label-primary-foreground, #fff)' : 'var(--dsw-alias-label-primary,inherit)' },
                onClick: () => setFixedAccess(true),
              }, t('on')),
              h('button', {
                style: { ...styles.btn, height: 28, padding: '0 12px', fontSize: 12, fontWeight: !fAccess ? 600 : 400, background: !fAccess ? 'var(--dsw-alias-state-error-primary,#dc2626)' : 'var(--dsw-alias-bg-layer-1,#fff)', color: !fAccess ? '#fff' : 'var(--dsw-alias-label-primary,inherit)' },
                onClick: () => setFixedAccess(false),
              }, t('off')),
              // 配置引导：内嵌 CF Dashboard 步骤（比外链教程更少跳转）
              h('button', { style: { ...styles.btn, height: 28, padding: '0 10px', fontSize: 11, marginLeft: 'auto' }, onClick: () => setFixedGuideOpen(true) }, t('fixedGuideBtn')),
            ),
          h('div', { style: { marginTop: 4, fontSize: 11, lineHeight: 1.5, color: fAccess ? 'var(--dsw-alias-label-tertiary,#8b93a1)' : 'var(--dsw-alias-state-warn-primary,#b45309)' } },
              fAccess ? (fAccessVerified ? t('fixedAccessHintOn') : `🔒 ${fAccessCheckDetail || t('fixedAccessUnverified')}`) : t('fixedAccessHintOff')),
            fAccess ? h('button', {
              style: { ...styles.btn, height: 26, padding: '0 10px', fontSize: 11, marginTop: 6 },
              disabled: fixedBusy || !fixedRunning,
              onClick: async () => { setFixedBusy(true); try { setStatus(await call(POCKET_ENDPOINTS.fixedVerifyAccess, {})); } catch (err) { setError(err.message); } finally { setFixedBusy(false); } },
            }, '重新验证 Access') : null,
            // PIN 策略：Access 关 → 强制 PIN（安全提示，主界面直接显示，不藏）
            fAccess
              ? null
              : h('div', { style: { marginTop: 6, fontSize: 11, color: 'var(--dsw-alias-state-warn-primary,#b45309)' } }, t('fixedPinForced')),
            // 高级选项（默认折叠）：仅 Access 开启时有意义——「额外要求 8 位 PIN」纵深防御
            fAccess
              ? h('div', { style: { marginTop: 8, borderTop: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', paddingTop: 8 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)' }, onClick: () => setFixedAdvOpen(!fixedAdvOpen) },
                  h('span', null, t('fixedAdvanced')),
                  h('span', { style: { marginLeft: 'auto', fontSize: 10, color: 'var(--dsw-alias-label-tertiary,#8b93a1)' } }, fixedAdvOpen ? '▴' : '▾'),
                ),
                h('div', { style: { marginTop: 2, fontSize: 11, color: 'var(--dsw-alias-label-tertiary,#8b93a1)' } }, t('fixedAdvancedHint')),
                fixedAdvOpen
                  ? h('div', { style: { marginTop: 8 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                      h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)' } }, t('fixedPinTitle')),
                      h('button', {
                        style: { ...styles.btn, height: 28, padding: '0 12px', fontSize: 12, fontWeight: fPinAlways ? 600 : 400, background: fPinAlways ? 'var(--dsw-alias-button-primary-fill, var(--dsw-alias-brand-primary,#4f6ef7))' : 'var(--dsw-alias-bg-layer-1,#fff)', color: fPinAlways ? 'var(--dsw-alias-label-primary-foreground, #fff)' : 'var(--dsw-alias-label-primary,inherit)' },
                        onClick: () => setFixedPinAlways(true),
                      }, t('on')),
                      h('button', {
                        style: { ...styles.btn, height: 28, padding: '0 12px', fontSize: 12, fontWeight: !fPinAlways ? 600 : 400, background: 'var(--dsw-alias-bg-layer-1,#fff)', color: 'var(--dsw-alias-label-primary,inherit)' },
                        onClick: () => setFixedPinAlways(false),
                      }, t('off')),
                    ),
                    h('div', { style: { marginTop: 4, fontSize: 11, color: 'var(--dsw-alias-label-tertiary,#8b93a1)' } }, fPinAlways ? t('fixedPinHintOn') : t('fixedPinHintOff')),
                  )
                  : null,
              )
              : null,
          ),
        ),
      ),
    ),

    ) : null,

    // 临时访客 PIN：授权记录持久化，会话/在线连接由当前进程管理。
    activeTab === 'access' ? h(Fragment, null,
    h('div', { style: styles.block },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
        h('strong', { style: { fontSize: 13 } }, t('guestTitle')),
        h('button', { style: { ...styles.btn, height: 28, padding: '0 12px', marginLeft: 'auto' }, onClick: () => guestAction(POCKET_ENDPOINTS.guestSetEnabled, { on: status?.guestAccess?.enabled !== true }) }, status?.guestAccess?.enabled === true ? t('on') : t('off')),
      ),
      h('div', { style: styles.muted }, t('guestHint')),
      h('div', { style: styles.warn, marginTop: 4 }, t('guestFullAccessWarning')),
      newGuestPin ? h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(22,163,74,.08)', color: 'var(--dsw-alias-state-success-primary,#15803d)' } },
        h('div', { style: { fontSize: 12 } }, t('guestPinOnce')),
        h('div', { style: { fontSize: 22, fontWeight: 700, letterSpacing: 4 } }, newGuestPin.pin),
        h('button', { style: { ...styles.btn, height: 28 }, onClick: () => copyText(newGuestPin.pin) }, t('guestCopy')),
        h('button', { style: { ...styles.btn, height: 28, marginLeft: 6 }, onClick: () => setNewGuestPin(null) }, t('ok')),
        copyNotice ? h('div', { style: { marginTop: 5, fontSize: 11 } }, copyNotice) : null,
      ) : null,
      status?.guestAccess?.enabled === true ? h('div', { style: { marginTop: 10 } },
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 110px 110px', gap: 6 } },
          h('input', { style: { minWidth: 0, height: 30, border: '1px solid var(--dsw-alias-border-l2,#d1d5db)', borderRadius: 8, padding: '0 8px' }, placeholder: t('guestLabel'), maxLength: 40, value: guestForm.label, onChange: (e) => setGuestForm((f) => ({ ...f, label: e.target.value })) }),
          h('select', { style: { height: 32, borderRadius: 8 }, value: guestForm.durationMinutes, onChange: (e) => setGuestForm((f) => ({ ...f, durationMinutes: Number(e.target.value) })) },
            [15, 60, 240, 1440].map((m) => h('option', { key: m, value: m }, m < 60 ? `${m} ${t('guestMinutes')}` : `${m / 60} ${t('guestHours')}`))),
          h('select', { style: { height: 32, borderRadius: 8 }, value: guestForm.scope, onChange: (e) => setGuestForm((f) => ({ ...f, scope: e.target.value })) },
            h('option', { value: 'both' }, t('guestScopeBoth')), h('option', { value: 'lan' }, t('guestScopeLan')), h('option', { value: 'public' }, t('guestScopePublic'))),
        ),
        h('button', { style: { ...styles.primary, height: 32, marginTop: 8 }, onClick: createGuest }, t('guestCreate')),
      ) : null,
      (status?.guestAccess?.grants ?? []).filter((g) => g.state !== 'expired' && g.state !== 'revoked').map((g) => {
        const seconds = Math.max(0, Math.floor((g.expiresAt - now) / 1000));
        const activeText = g.online > 0 ? fmt(t, 'guestOnline', { count: g.online }) : (g.recent > 0 ? t('guestRecent') : t('guestOffline'));
        return h('div', { key: g.id, style: { marginTop: 10, padding: 10, border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', borderRadius: 8 } },
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } }, h('strong', { style: { fontSize: 12 } }, g.label || t('guestUnnamed')), h('span', { style: { marginLeft: 'auto', fontSize: 11, color: g.online ? 'var(--dsw-alias-state-success-primary,#15803d)' : 'var(--dsw-alias-label-tertiary,#8b93a1)' } }, activeText)),
          h('div', { style: styles.muted }, `${g.scope === 'both' ? t('guestScopeBoth') : g.scope === 'lan' ? t('guestScopeLan') : t('guestScopePublic')} · ${fmt(t, 'guestRemaining', { minutes: Math.ceil(seconds / 60) })}`),
          h('div', { style: { display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' } },
            h('button', { style: { ...styles.btn, height: 27, padding: '0 10px', fontSize: 11, color: 'var(--dsw-alias-brand-primary,#4f6ef7)' }, onClick: () => createGuestShare(g) }, t('guestShare')),
            h('button', { style: { ...styles.btn, height: 27, padding: '0 10px', fontSize: 11 }, onClick: () => guestAction(POCKET_ENDPOINTS.guestSetLogin, { id: g.id, on: !g.loginEnabled }) }, g.loginEnabled ? t('guestDisableLogin') : t('guestEnableLogin')),
            h('button', { style: { ...styles.btn, height: 27, padding: '0 10px', fontSize: 11 }, onClick: () => guestAction(POCKET_ENDPOINTS.guestKick, { id: g.id }) }, t('guestKick')),
            h('button', { style: { ...styles.btn, height: 27, padding: '0 10px', fontSize: 11, color: 'var(--dsw-alias-state-error-primary,#dc2626)' }, onClick: () => guestAction(POCKET_ENDPOINTS.guestRevoke, { id: g.id }) }, t('guestRevoke')),
          ),
        );
      }),
    ),
    ) : null,

    error ? h('div', { style: { color: 'var(--dsw-alias-state-error-primary,#dc2626)', fontSize: 12, marginTop: 8 } }, `❌ ${error}`) : null,

    guestShare ? h('div', { style: { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } },
      h('div', { style: { background: 'var(--dsw-alias-bg-layer-1,#fff)', borderRadius: 12, maxWidth: 430, width: '100%', padding: '20px 22px', boxShadow: '0 8px 32px rgba(0,0,0,.18)' } },
        h('div', { style: { fontWeight: 600, fontSize: 15 } }, t('guestShareTitle')),
        h('div', { style: { ...styles.muted, marginTop: 5 } }, t('guestShareHint')),
        guestShare.links.map((item) => h('div', { key: item.kind, style: { marginTop: 10, padding: 9, border: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', borderRadius: 8, opacity: item.available ? 1 : .72 } },
          h('div', { style: { fontSize: 12, fontWeight: 600 } }, item.label),
          item.available
            ? h('div', null,
              h('div', { style: { ...styles.code, fontSize: 10, margin: '4px 0 7px' } }, item.url),
              h('button', { style: { ...styles.primary, height: 28, padding: '0 12px' }, onClick: () => shareGuestLink(item) }, navigator.share ? t('guestSystemShare') : t('guestCopyLink')),
              h('button', { style: { ...styles.btn, height: 28, padding: '0 12px', marginLeft: 6 }, onClick: () => copyText(item.url) }, t('guestCopyLink')),
            )
            : h('div', { style: { ...styles.warn, marginTop: 5 } }, item.reason),
        )),
        copyNotice ? h('div', { style: { marginTop: 8, fontSize: 12, color: copyNotice === t('guestCopied') ? 'var(--dsw-alias-state-success-primary,#15803d)' : 'var(--dsw-alias-state-error-primary,#dc2626)' } }, copyNotice) : null,
        h('div', { style: { ...styles.warn, marginTop: 10 } }, t('guestShareSecurity')),
        h('button', { style: { ...styles.btn, width: '100%', marginTop: 14 }, onClick: () => setGuestShare(null) }, t('ok')),
      ),
    ) : null,

    // 局域网访问开关确认弹框（关闭/打开时弹窗提醒）
    lanToggleOpen !== null ? h('div', { style: { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } },
      h('div', { style: { background: 'var(--dsw-alias-bg-layer-1,#fff)', borderRadius: 12, maxWidth: 420, width: '100%', padding: '20px 22px', boxShadow: '0 8px 32px rgba(0,0,0,.18)' } },
        h('div', { style: { fontWeight: 600, fontSize: 15, color: lanToggleOpen ? 'var(--dsw-alias-brand-primary,#4f6ef7)' : 'var(--dsw-alias-state-warn-primary,#b45309)', marginBottom: 10 } }, t(lanToggleOpen ? 'lanToggleTitleOn' : 'lanToggleTitleOff')),
        h('div', { style: { fontSize: 13, lineHeight: 1.7, color: 'var(--dsw-alias-label-primary,inherit)' } }, t(lanToggleOpen ? 'lanToggleBodyOn' : 'lanToggleBodyOff')),
        h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
          h('button', { style: { ...styles.btn, flex: 1 }, onClick: () => setLanToggleOpen(null) }, t('cancel')),
          h('button', { style: { ...styles.primary, flex: 1 }, onClick: confirmLanToggle }, t('confirm')),
        ),
      ),
    ) : null,

    autoRestoreRiskOpen ? h('div', { style: { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } },
      h('div', { style: { background: 'var(--dsw-alias-bg-layer-1,#fff)', borderRadius: 12, maxWidth: 430, width: '100%', padding: '20px 22px', boxShadow: '0 8px 32px rgba(0,0,0,.18)' } },
        h('div', { style: { fontWeight: 600, fontSize: 15, color: 'var(--dsw-alias-state-warn-primary,#b45309)' } }, t('autoRestoreRiskTitle')),
        h('div', { style: { marginTop: 10, fontSize: 13, lineHeight: 1.7 } }, t('autoRestoreRiskBody')),
        h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
          h('button', { style: { ...styles.btn, flex: 1 }, onClick: () => setAutoRestoreRiskOpen(false) }, t('cancel')),
          h('button', { style: { ...styles.primary, flex: 1 }, onClick: confirmAutoRestore }, t('autoRestoreRiskConfirm')),
        ),
      ),
    ) : null,

    // 虚拟局域网允许关 PIN，但需单独确认，避免用户误以为它与普通家庭 LAN 等价。
    virtualPinOffOpen ? h('div', { style: { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } },
      h('div', { style: { background: 'var(--dsw-alias-bg-layer-1,#fff)', borderRadius: 12, maxWidth: 420, width: '100%', padding: '20px 22px', boxShadow: '0 8px 32px rgba(0,0,0,.18)' } },
        h('div', { style: { fontWeight: 600, fontSize: 15, color: 'var(--dsw-alias-state-warn-primary,#b45309)', marginBottom: 10 } }, t('virtualPinOffTitle')),
        h('div', { style: { fontSize: 13, lineHeight: 1.7, color: 'var(--dsw-alias-label-primary,inherit)' } }, t('virtualPinOffBody')),
        h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
          h('button', { style: { ...styles.btn, flex: 1 }, onClick: () => setVirtualPinOffOpen(false) }, t('cancel')),
          h('button', { style: { ...styles.primary, flex: 1, background: 'var(--dsw-alias-state-error-primary,#dc2626)' }, onClick: () => { setVirtualPinOffOpen(false); void setLanAuth(false); } }, t('virtualPinOffConfirm')),
        ),
      ),
    ) : null,

    // 安全免责声明弹框（issue #31）：每次开启公网访问前确认
    disclaimerOpen ? h('div', { style: { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } },
      h('div', { style: { background: 'var(--dsw-alias-bg-layer-1,#fff)', borderRadius: 12, maxWidth: 420, width: '100%', padding: '20px 22px', boxShadow: '0 8px 32px rgba(0,0,0,.18)' } },
        h('div', { style: { fontWeight: 600, fontSize: 15, color: 'var(--dsw-alias-state-warn-primary,#b45309)', marginBottom: 10 } }, t('disclaimerTitle')),
        h('div', { style: { fontSize: 13, lineHeight: 1.7, color: 'var(--dsw-alias-label-primary,inherit)' } }, t('disclaimerBody')),
        h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 13, cursor: 'pointer' } },
          h('input', { type: 'checkbox', checked: disclaimerChecked, onChange: (e) => setDisclaimerChecked(e.target.checked), style: { width: 16, height: 16 } }),
          t('disclaimerAgree'),
        ),
        h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
          h('button', { style: { ...styles.btn, flex: 1 }, onClick: () => setDisclaimerOpen(false) }, t('cancel')),
          h('button', {
            style: { ...styles.primary, flex: 1, opacity: disclaimerChecked ? 1 : .5 },
            disabled: !disclaimerChecked,
            onClick: confirmDisclaimer,
          }, t('disclaimerAgree')),
        ),
        !disclaimerChecked ? h('div', { style: { marginTop: 8, fontSize: 12, color: 'var(--dsw-alias-state-error-primary,#dc2626)' } }, t('disclaimerHint')) : null,
      ),
    ) : null,

    // Cloudflare Access 配置引导弹窗：按地点分组（CF 后台 / 插件本页 / 手机），每步标清在哪操作
    fixedGuideOpen ? h('div', { style: { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 } },
      h('div', { style: { background: 'var(--dsw-alias-bg-layer-1,#fff)', borderRadius: 12, maxWidth: 460, width: '100%', maxHeight: '80vh', overflowY: 'auto', padding: '20px 22px', boxShadow: '0 8px 32px rgba(0,0,0,.18)' } },
        h('div', { style: { fontWeight: 600, fontSize: 15, color: 'var(--dsw-alias-brand-primary,#4f6ef7)', marginBottom: 6 } }, t('fixedGuideTitle')),
        h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)', lineHeight: 1.6 } }, t('fixedGuideIntro')),
        // 三组步骤：CF 后台（①②③）→ 插件本页（④）→ 手机（⑤）
        [
          { loc: 'fixedGuideLocCfdash', steps: [['fixedGuideStep1', 'fixedGuideStep1Detail'], ['fixedGuideStep2', 'fixedGuideStep2Detail'], ['fixedGuideStep3', 'fixedGuideStep3Detail']] },
          { loc: 'fixedGuideLocPlugin', steps: [['fixedGuideStep4', 'fixedGuideStep4Detail']] },
          { loc: 'fixedGuideLocPhone', steps: [['fixedGuideStep5', 'fixedGuideStep5Detail']] },
        ].map((group) =>
          h('div', { key: group.loc, style: { marginTop: 10 } },
            h('div', { style: { fontSize: 11, fontWeight: 700, color: 'var(--dsw-alias-brand-primary,#4f6ef7)', lineHeight: 1.5 } }, t(group.loc)),
            group.steps.map(([titleKey, detailKey]) =>
              h('div', { key: titleKey, style: { marginTop: 6, fontSize: 12, lineHeight: 1.6 } },
                h('div', { style: { fontWeight: 600, color: 'var(--dsw-alias-label-primary,inherit)' } }, t(titleKey)),
                h('div', { style: { marginTop: 2, color: 'var(--dsw-alias-label-secondary,#6b7280)' } }, fmt(t, detailKey, { hostname: fHostname || t('fixedHostnamePlaceholder') })),
              ),
            ),
          ),
        ),
        // MFA 方式说明
        h('div', { style: { borderTop: '1px solid var(--dsw-alias-border-l2,#e5e7eb)', marginTop: 12, paddingTop: 10, fontSize: 12, lineHeight: 1.7 } },
          h('div', { style: { fontWeight: 600, color: 'var(--dsw-alias-label-primary,inherit)' } }, t('fixedGuideMfaTitle')),
          h('div', { style: { color: 'var(--dsw-alias-label-secondary,#6b7280)' } }, `• ${t('fixedGuideMfa1')}`),
          h('div', { style: { color: 'var(--dsw-alias-label-secondary,#6b7280)' } }, `• ${t('fixedGuideMfa2')}`),
        ),
        // 二维码性质提醒（安全相关，用醒目色）
        h('div', { style: { marginTop: 10, fontSize: 11, color: 'var(--dsw-alias-state-warn-primary,#b45309)', lineHeight: 1.6 } }, t('fixedGuideQrNote')),
        h('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
          h('a', { href: 'https://developers.cloudflare.com/cloudflare-one/policies/access/', target: '_blank', rel: 'noreferrer', style: { ...styles.btn, flex: 1, textDecoration: 'none', justifyContent: 'center' } }, t('fixedAccessDocs')),
          h('button', { style: { ...styles.primary, flex: 1 }, onClick: () => setFixedGuideOpen(false) }, t('ok')),
        ),
      ),
    ) : null,

    // 页面最底部：反馈入口
    h('div', { style: { ...styles.block, textAlign: 'center' } },
      h('a', { href: 'https://github.com/hanjiangfly/dsh-pocket/issues', target: '_blank', rel: 'noreferrer', style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary,#6b7280)', textDecoration: 'none' } },
        t('feedback')),
    ),
  );
}

export function apply(ctx) {
  // 移动端适配（dsh-web-mobile 移植）：抽屉布局/触控/安全区，仅窄屏生效
  mobileApply(ctx);

  const rpcCall = (endpoint, payload, signal) =>
    ctx.connection.rpc.call(POCKET_RPC_CHANNEL, endpoint, payload, signal);

  // 设置页签接入 DSH 本地化：注册 pocket 词典（zh/en），并绑定一个随当前 locale 切换的 t()。
  const translate = ctx.locale.bind(POCKET_NS);
  ctx.effect(() => ctx.locale.register(POCKET_NS, { zh: POCKET_ZH, en: POCKET_EN }), 'dsh-pocket: pocket locale dictionaries');
  installPublicAccessIndicators(ctx, rpcCall, translate);

  // 设置一级入口（与 通用设置/模型/插件 同级，order 1 = 通用之后、最外层）
  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'pocket',
        order: 1,
        label: () => translate('section'),
        inject: () => ({ rpcCall, t: translate }),
      },
      PocketSettingsTab,
    ),
  );
}

export { name, inject, redactStatus };
