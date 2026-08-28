// dsh-pocket 设置持久化（$DSH_HOME/dsh-pocket/settings.json）
//
// 当前项：
//   - lanEnabled        局域网访问总开关（默认开启）：关闭后局域网扫码/链接直接失效（代理拒绝局域网 Host）
//   - lanAuthEnabled    局域网访问密码开关（issue #24），默认开启
//   - proxyPort          Pocket 手机访问代理端口；缺失 = 自动从 3081 起避让
//   - publicPinCustom   公网密码是否用户自定义（issue #33），自定义后不自动轮换
//   - lanPinCustom      局域网密码是否用户自定义（issue #33）
//   - fixedHostname     固定域名（命名隧道）：子域名，如 dsh.example.com
//   - fixedTunnelId     命名隧道 ID（cloudflared tunnel create 产物，幂等复用）
//   - fixedRouted       域名 DNS 是否已绑定到隧道（route dns 成功即置位；改域名后重置）
//   - fixedAccessEnabled  固定域名是否已启用 Cloudflare Access（推荐，边缘 MFA 认证）
//   - fixedPinAlways      固定域名是否在 Access 之外**额外**要求 8 位 PIN（纵深防御；默认关）
// 默认**开启**（安全优先）：局域网扫码也要输 8 位密码；
// 用户可关闭——关闭后局域网扫码直连（仅同一网络内的设备能访问），公网不受影响（永远要密码）。
//
// 固定域名 PIN 策略（lib/index.js 按此决定代理是否要求密码）：
//   - 未启用 Access        → 强制要求 PIN（固定 URL 无认证层时不能裸奔）
//   - 启用 Access + 不额外要求 → 免 PIN（CF Access MFA 是第一道且唯一一道，推荐）
//   - 启用 Access + 额外要求  → 双因素（Access MFA + 8 位 PIN，纵深防御）

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { isValidIpv4 } from './ip.mjs';

const settingsRel = join('dsh-pocket', 'settings.json');
export function settingsPath() {
  return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), settingsRel);
}

function readSettings() {
  try {
    const raw = JSON.parse(readFileSync(settingsPath(), 'utf8'));
    return raw && typeof raw === 'object' ? raw : {};
  } catch { /* 无文件/损坏 → 默认 */ }
  return {};
}

function writeSettings(s) {
  try {
    mkdirSync(dirname(settingsPath()), { recursive: true });
    writeFileSync(settingsPath(), JSON.stringify(s, null, 2), { mode: 0o600 });
  } catch { /* 忽略 */ }
  return s;
}

/** 局域网访问总开关：默认开启（文件缺失/损坏都视为开启）。 */
export function lanEnabled() {
  return readSettings().lanEnabled !== false;
}

/** 设置局域网访问总开关，返回新状态（持久化）。 */
export function setLanEnabled(on) {
  const s = readSettings();
  s.lanEnabled = !!on;
  writeSettings(s);
  return s.lanEnabled;
}

/** 局域网访问密码开关：默认开启（文件缺失/损坏都视为开启）。 */
export function lanAuthEnabled() {
  return readSettings().lanAuthEnabled !== false;
}

/** 设置局域网访问密码开关，返回新状态（持久化）。 */
export function setLanAuthEnabled(on) {
  const s = readSettings();
  s.lanAuthEnabled = !!on;
  writeSettings(s);
  return s.lanAuthEnabled;
}

/** 自定义代理端口；null 表示自动（3081 起，端口冲突自动避让）。 */
export function normalizeProxyPort(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (!/^[0-9]+$/.test(raw)) throw new Error('代理端口必须是 1024–65535 的整数 | proxy port must be an integer from 1024 to 65535');
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('代理端口必须是 1024–65535 | proxy port must be 1024–65535');
  return port;
}

export function proxyPort() {
  try { return normalizeProxyPort(readSettings().proxyPort); } catch { return null; }
}

export function setProxyPort(value) {
  const port = normalizeProxyPort(value);
  const s = readSettings();
  if (port === null) delete s.proxyPort;
  else s.proxyPort = port;
  writeSettings(s);
  return port;
}

/** 局域网地址手动覆盖：默认空字符串 = 自动选择。 */
export function lanIpOverride() {
  return readSettings().lanIpOverride ?? '';
}

/** 设置局域网地址覆盖；空字符串清除覆盖，恢复自动选择。非法 IPv4 抛错。 */
export function setLanIpOverride(value) {
  const ip = String(value ?? '').trim();
  if (ip && !isValidIpv4(ip)) {
    throw new Error('局域网地址必须是 IPv4 地址 | LAN address must be an IPv4 address');
  }
  const s = readSettings();
  if (ip) s.lanIpOverride = ip;
  else delete s.lanIpOverride;
  writeSettings(s);
  return ip;
}

// ---------- 访问密码「自定义」标记（issue #33） ----------
// 用户可把公网/局域网密码设成自己固定的 8 位数字（自定义后不再自动轮换）。
// 标记存 settings.json：publicPinCustom / lanPinCustom。
const PIN_CUSTOM_KEYS = { public: 'publicPinCustom', lan: 'lanPinCustom' };

/** 该 PIN（public | lan）是否用户自定义过（自定义后不自动轮换）。 */
export function pinCustom(which) {
  const key = PIN_CUSTOM_KEYS[which];
  if (!key) return false;
  return readSettings()[key] === true;
}

/** 设置自定义标记，返回新状态。 */
export function setPinCustom(which, on) {
  const key = PIN_CUSTOM_KEYS[which];
  if (!key) return false;
  const s = readSettings();
  s[key] = !!on;
  writeSettings(s);
  return !!on;
}

// ---------- 固定域名（命名隧道 + Cloudflare Access） ----------
// 见文件头注释：hostname / tunnelId / routed / accessEnabled / pinAlways。

/** 固定域名是否合法：小写 DNS 名（至少两段、TLD 为字母），拒绝协议/路径/端口/IP。 */
export function normalizeHostname(input) {
  let v = String(input ?? '').trim().toLowerCase();
  v = v.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  if (!/^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(v)) return null;
  return v;
}

/** 当前固定域名；空字符串 = 未配置。 */
export function fixedHostname() {
  return readSettings().fixedHostname ?? '';
}

/** 设置固定域名（规范化校验；非法抛错）。改域名后旧 DNS 绑定作废，需重新 route。 */
export function setFixedHostname(value) {
  const v = normalizeHostname(value);
  if (!v) throw new Error('固定域名必须是合法域名（如 dsh.example.com），不能带协议/端口/路径 | hostname must be a valid domain like dsh.example.com');
  const s = readSettings();
  s.fixedHostname = v;
  s.fixedRouted = false; // 域名变了，旧 DNS 绑定不再对应
  writeSettings(s);
  return v;
}

/** 命名隧道 ID（cloudflared tunnel create 产物）；null = 未创建。 */
export function fixedTunnelId() {
  return readSettings().fixedTunnelId ?? '';
}

/** 保存命名隧道 ID，返回新值。 */
export function setFixedTunnelId(id) {
  const s = readSettings();
  s.fixedTunnelId = String(id ?? '').trim();
  writeSettings(s);
  return s.fixedTunnelId;
}

/** 域名 DNS 是否已绑定到隧道（route dns 成功后置位）。 */
export function fixedRouted() {
  return readSettings().fixedRouted === true;
}

/** 设置 DNS 绑定标记，返回新状态。 */
export function setFixedRouted(on) {
  const s = readSettings();
  s.fixedRouted = !!on;
  writeSettings(s);
  return s.fixedRouted;
}

/** 固定域名是否已启用 Cloudflare Access（边缘 MFA；推荐）。默认关。 */
export function fixedAccessEnabled() {
  return readSettings().fixedAccessEnabled === true;
}

/** 设置 Access 开关，返回新状态。 */
export function setFixedAccessEnabled(on) {
  const s = readSettings();
  s.fixedAccessEnabled = !!on;
  writeSettings(s);
  return s.fixedAccessEnabled;
}

/** 固定域名是否在 Access 之外**额外**要求 8 位 PIN（纵深防御）。默认关。 */
export function fixedPinAlways() {
  return readSettings().fixedPinAlways === true;
}

/** 设置额外 PIN 开关，返回新状态。 */
export function setFixedPinAlways(on) {
  const s = readSettings();
  s.fixedPinAlways = !!on;
  writeSettings(s);
  return s.fixedPinAlways;
}
