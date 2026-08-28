// dsh-pocket Web RPC（loopback-only）：设置页 ⇄ Host 的手机访问通道

import { POCKET_RPC_CHANNEL, POCKET_ENDPOINTS, redactStatus } from '../client/api.js';

function ok(value) {
  return { ok: true, value };
}

/**
 * 构造符合 DSH rpcErrorSchema 的错误（按 code 的 discriminated union，
 * details 必填且分分支定形；'internal' 不在合法 code 集合里）。
 */
function fail(code, message) {
  if (code === 'cancelled') return { ok: false, error: { code: 'cancelled', message, details: {} } };
  // 其余一律归入 bad-request（issues 是自由数组）
  return { ok: false, error: { code: 'bad-request', message, details: { issues: [{ message }] } } };
}

/** 各平台停止 dsh web 进程的命令（Windows 没有 lsof/kill）。 */
export function killHint(port) {
  if (process.platform === 'win32') {
    return `netstat -ano | findstr :${port}（找 LISTENING 的 PID）→ taskkill /PID <PID> /F`;
  }
  return `lsof -ti :${port} | xargs kill -9`;
}

/** 注册 /dsh-pocket 逻辑通道（仅本机 loopback 可调）。 */
export function installPocketRpc(ctx, { service, log = console, desktop = false, runUpdate = null, restart = null, restartNotice = null, getToken = null, getLanToken = null, refreshLanToken = null, getLanAuthEnabled = null, setLanAuthEnabled = null, getLanEnabled = null, setLanEnabled = null, getLanIpOverride = null, setLanIpOverride = null, getPinCustom = null, setCustomPin = null, getFixedHostname = null, setFixedHostname = null, getFixedAccessEnabled = null, setFixedAccessEnabled = null, getFixedPinAlways = null, setFixedPinAlways = null, getPublicAutoRestore = null, setPublicAutoRestore = null, fixedSetup = null, guestAccess = null }) {
  if (!ctx?.connection?.rpc?.handle) {
    log.warn?.('dsh-pocket: DSH Host Connection RPC unavailable — settings tab disabled | 无 Connection RPC，设置页不可用');
    return () => {};
  }
  return ctx.connection.rpc.handle(POCKET_RPC_CHANNEL, async (endpoint, payload = {}, signal) => {
    if (signal?.aborted) return fail('cancelled', 'The request was cancelled.');

    // status 响应：服务状态 + 重启提示 + 停止命令 + 桌面端标志 + 公网/局域网访问密码 + 局域网密码开关
    const statusPayload = async () => {
      let notice = null;
      try { notice = (await restartNotice?.()) ?? null; } catch { notice = null; }
      const s = await service.status();
      return ok({
        ...redactStatus(s),
        desktop,
        restartNotice: notice,
        killHint: killHint(s.dshPort ?? 3080),
        accessToken: getToken?.() ?? null,
        lanToken: getLanToken?.() ?? null,
        lanAuthEnabled: getLanAuthEnabled?.() ?? true,
        lanEnabled: getLanEnabled?.() ?? true,
        publicPinCustom: getPinCustom?.('public') ?? false,
        lanPinCustom: getPinCustom?.('lan') ?? false,
        publicAutoRestore: getPublicAutoRestore?.() ?? false,
        guestAccess: guestAccess?.status?.() ?? { enabled: true, grants: [] },
      });
    };

    try {
      if (endpoint === POCKET_ENDPOINTS.status) {
        return await statusPayload();
      }
      if (endpoint === POCKET_ENDPOINTS.lanTokenRefresh) {
        const fresh = refreshLanToken?.() ?? null;
        if (!fresh) return fail('bad-request', '局域网密码刷新不可用 | LAN PIN refresh unavailable');
        return ok({ lanToken: fresh });
      }
      if (endpoint === POCKET_ENDPOINTS.lanAuthSetEnabled) {
        const enabled = setLanAuthEnabled?.(payload?.on === true);
        if (enabled === undefined) return fail('bad-request', '局域网密码开关不可用 | LAN PIN switch unavailable');
        return ok({ lanAuthEnabled: enabled });
      }
      if (endpoint === POCKET_ENDPOINTS.lanSetEnabled) {
        const enabled = setLanEnabled?.(payload?.on === true);
        if (enabled === undefined) return fail('bad-request', '局域网访问开关不可用 | LAN access switch unavailable');
        return ok({ lanEnabled: enabled });
      }
      if (endpoint === POCKET_ENDPOINTS.lanSetOverride) {
        // 返回完整 status：前端 setStatus(await call(...)) 直接替换 status 对象，
        // 若只返回 { lanIpOverride } 会丢掉 accessToken/lanToken/tunnelUrl 等字段，
        // 且 lanUrl/二维码不会随新 IP 刷新（PR #47 的客户端写法依赖完整 status）。
        try {
          const ip = setLanIpOverride?.(payload?.ip ?? '');
          if (ip === undefined) return fail('bad-request', '局域网地址设置不可用 | LAN address setting unavailable');
          return await statusPayload();
        } catch (err) {
          return fail('bad-request', err?.message ?? String(err));
        }
      }
      if (endpoint === POCKET_ENDPOINTS.pinSetCustom) {
        const which = payload?.which === 'public' || payload?.which === 'lan' ? payload.which : null;
        if (!which) return fail('bad-request', '未知密码类型 | unknown PIN kind');
        try {
          const pin = setCustomPin?.(which, payload?.value);
          if (pin === undefined) return fail('bad-request', '自定义密码不可用 | custom PIN unavailable');
          return ok({ which, pin, custom: true });
        } catch (err) {
          return fail('bad-request', err?.message ?? String(err));
        }
      }
      if (endpoint === POCKET_ENDPOINTS.tunnelStart) {
        // 安全免责声明（issue #31）：每次开启公网都必须先确认（前端弹框勾选）。
        // 服务端强制校验，防止绕过前端直接调 RPC。
        if (payload?.disclaimer !== true) {
          return fail('bad-request', '开启公网前请先阅读并勾选安全免责声明 | please accept the security disclaimer before enabling public access');
        }
        // 固定域名模式：{ mode: 'fixed' }；默认快速隧道（向后兼容）
        await service.startTunnel({ mode: payload?.mode === 'fixed' ? 'fixed' : 'quick' });
        return await statusPayload();
      }
      if (endpoint === POCKET_ENDPOINTS.tunnelStop) {
        service.stopTunnel();
        return await statusPayload();
      }
      if (endpoint === POCKET_ENDPOINTS.tunnelSetAutoRestore) {
        try {
          const enabled = await setPublicAutoRestore?.(payload?.on === true);
          if (enabled === undefined) return fail('bad-request', '公网自动恢复开关不可用 | public auto-restore switch unavailable');
          return await statusPayload();
        } catch (err) { return fail('bad-request', err?.message ?? String(err)); }
      }
      if (endpoint === POCKET_ENDPOINTS.fixedSetHostname) {
        // 校验 + 持久化固定域名；返回完整 status（hostname/二维码/向导状态一起刷新）
        try {
          const v = setFixedHostname?.(payload?.hostname ?? '');
          if (v === undefined) return fail('bad-request', '固定域名设置不可用 | fixed hostname setting unavailable');
          return await statusPayload();
        } catch (err) {
          return fail('bad-request', err?.message ?? String(err));
        }
      }
      if (endpoint === POCKET_ENDPOINTS.fixedSetAccess) {
        const on = setFixedAccessEnabled?.(payload?.on === true);
        if (on === undefined) return fail('bad-request', 'Cloudflare Access 开关不可用 | Access switch unavailable');
        return await statusPayload();
      }
      if (endpoint === POCKET_ENDPOINTS.virtualUse) {
        try {
          const ip = await service.useVirtualNetwork?.(payload?.ip ?? '');
          if (!ip) return fail('bad-request', '虚拟局域网不可用 | virtual LAN unavailable');
          // 选用虚拟网络的安全默认值：重新打开 LAN PIN。用户之后仍可主动关闭，
          // 但前端会给出专门的风险确认。
          setLanEnabled?.(true);
          setLanAuthEnabled?.(true);
          const saved = setLanIpOverride?.(ip);
          if (saved === undefined) return fail('bad-request', '局域网地址设置不可用 | LAN address setting unavailable');
          return await statusPayload();
        } catch (err) {
          return fail('bad-request', err?.message ?? String(err));
        }
      }
      if (endpoint === POCKET_ENDPOINTS.virtualRefresh) {
        service.refreshVirtualNetworks?.();
        return await statusPayload();
      }
      if (endpoint === POCKET_ENDPOINTS.fixedVerifyAccess) {
        await service.verifyFixedAccess?.();
        return await statusPayload();
      }
      if (endpoint === POCKET_ENDPOINTS.fixedSetPinAlways) {
        const on = setFixedPinAlways?.(payload?.on === true);
        if (on === undefined) return fail('bad-request', '额外 PIN 开关不可用 | extra-PIN switch unavailable');
        return await statusPayload();
      }
      if (endpoint === POCKET_ENDPOINTS.fixedLogin) {
        // 第 1 步：cloudflared tunnel login（浏览器授权，生成 cert.pem）。
        // 返回授权 URL；完成后端状态由 status().fixed.setup.cert 轮询反映。
        try {
          const r = await service.startFixedLogin();
          return ok({ url: r?.url ?? '', already: r?.already === true });
        } catch (err) {
          return fail('bad-request', err?.message ?? String(err));
        }
      }
      if (endpoint === POCKET_ENDPOINTS.fixedSetup) {
        // 第 2 步：建命名隧道 + 绑 DNS（幂等；需要 cert + hostname）
        try {
          const r = await fixedSetup?.();
          if (!r) return fail('bad-request', '固定域名初始化不可用 | fixed-domain setup unavailable');
          return await statusPayload();
        } catch (err) {
          return fail('bad-request', err?.message ?? String(err));
        }
      }
      if (endpoint === POCKET_ENDPOINTS.guestCreate) {
        if (!guestAccess) return fail('bad-request', '临时访客访问不可用 | guest access unavailable');
        try { return ok(guestAccess.create(payload)); } catch (err) { return fail('bad-request', err?.message ?? String(err)); }
      }
      if (endpoint === POCKET_ENDPOINTS.guestCreateInvite) {
        if (!guestAccess) return fail('bad-request', '临时访客访问不可用 | guest access unavailable');
        try { return ok(guestAccess.createInvite(String(payload?.id ?? ''))); } catch (err) { return fail('bad-request', err?.message ?? String(err)); }
      }
      if (endpoint === POCKET_ENDPOINTS.guestSetEnabled) {
        if (!guestAccess) return fail('bad-request', '临时访客访问不可用 | guest access unavailable');
        return ok(guestAccess.setEnabled(payload?.on === true));
      }
      if (endpoint === POCKET_ENDPOINTS.guestSetLogin) {
        if (!guestAccess) return fail('bad-request', '临时访客访问不可用 | guest access unavailable');
        try { return ok(guestAccess.setLoginEnabled(String(payload?.id ?? ''), payload?.on === true)); } catch (err) { return fail('bad-request', err?.message ?? String(err)); }
      }
      if (endpoint === POCKET_ENDPOINTS.guestKick) {
        if (!guestAccess) return fail('bad-request', '临时访客访问不可用 | guest access unavailable');
        return ok(guestAccess.kick(String(payload?.id ?? '')));
      }
      if (endpoint === POCKET_ENDPOINTS.guestRevoke) {
        if (!guestAccess) return fail('bad-request', '临时访客访问不可用 | guest access unavailable');
        try { return ok(guestAccess.revoke(String(payload?.id ?? ''))); } catch (err) { return fail('bad-request', err?.message ?? String(err)); }
      }
      if (endpoint === POCKET_ENDPOINTS.version) {
        return ok({ current: runUpdate?.currentVersion?.() ?? null, loaded: runUpdate?.loadedVersion?.() ?? null });
      }
      if (endpoint === POCKET_ENDPOINTS.update) {
        // 桌面端：更新由 DSH Desktop 管理，这里关闭（不删除，仅禁用）
        if (desktop) return fail('bad-request', '桌面版更新由 DSH Desktop 管理，已在此环境停用 | updates are managed by DSH Desktop here');
        if (!runUpdate) return fail('bad-request', '更新不可用 | update unavailable');
        const result = await runUpdate.perform(payload?.profile ?? 'web');
        // 更新成功 → 自动重启生效（用户只点一次；helper 拉起失败则保持现状，可手动重启）
        if (result?.ok && restart) {
          const rr = restart();
          result.autoRestart = rr?.helperPid != null;
        }
        return ok(result);
      }
      if (endpoint === POCKET_ENDPOINTS.restart) {
        // 桌面端：重启由 DSH Desktop 管理，这里关闭（不删除，仅禁用）
        if (desktop) return fail('bad-request', '桌面版重启由 DSH Desktop 管理，已在此环境停用 | restart is managed by DSH Desktop here');
        if (!restart) return fail('bad-request', '重启不可用 | restart unavailable');
        const result = restart();
        // 重启拉起失败（helper 都没 spawn 出来）→ 如实报错，别让 UI 误报成功
        if (!result || result.helperPid == null) {
          return fail('bad-request', `重启失败：${result?.error ?? '未知'} | restart failed`);
        }
        const dshPort = service.dshPort ?? 3080;
        return ok({ ...result, hint: `重启后进程在后台运行；如需停止：${killHint(dshPort)}` });
      }
      return fail('bad-request', `Unknown endpoint: ${endpoint}`);
    } catch (err) {
      log.error?.('dsh-pocket: rpc %s failed | RPC 失败: %s', endpoint, err?.message ?? err);
      return fail('bad-request', err?.message ?? String(err));
    }
  }, { authority: 'loopback' });
}
