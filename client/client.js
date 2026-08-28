window.__ModuleLoader__.load({
  id: "dsh-pocket",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    // The DSH client module system provides react as a module, never as a
    // global. esbuild keeps react external (see the build config above) and
    // its classic JSX transform emits bare React.createElement calls for the
    // mobile components (which import only named hooks, not React itself), so
    // the bundle must bind React itself - otherwise every mobile component
    // crashes at render time with "ReferenceError: React is not defined".
    var React = require("react");
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// client/index.jsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name,
  redactStatus: () => redactStatus
});
module.exports = __toCommonJS(index_exports);
var import_react2 = require("react");

// client/api.js
var POCKET_RPC_CHANNEL = "/dsh-pocket";
var POCKET_ENDPOINTS = Object.freeze({
  status: "pocket.status",
  tunnelStart: "tunnel.start",
  tunnelStop: "tunnel.stop",
  version: "pocket.version",
  update: "pocket.update",
  restart: "pocket.restart",
  lanTokenRefresh: "token.lanRefresh",
  lanAuthSetEnabled: "lanAuth.setEnabled",
  lanSetOverride: "lan.setOverride",
  lanSetEnabled: "lan.setEnabled",
  virtualUse: "virtual.use",
  virtualRefresh: "virtual.refresh",
  pinSetCustom: "pin.setCustom",
  fixedSetHostname: "fixed.setHostname",
  fixedSetAccess: "fixed.setAccess",
  fixedVerifyAccess: "fixed.verifyAccess",
  fixedSetPinAlways: "fixed.setPinAlways",
  fixedLogin: "fixed.login",
  fixedSetup: "fixed.setup",
  guestCreate: "guest.create",
  guestCreateInvite: "guest.createInvite",
  guestSetEnabled: "guest.setEnabled",
  guestSetLogin: "guest.setLogin",
  guestKick: "guest.kick",
  guestRevoke: "guest.revoke"
});
function compareVersions(a, b) {
  const pa = String(a).replace(/^[vV]/, "").split(".");
  const pb = String(b).replace(/^[vV]/, "").split(".");
  for (let i = 0; i < 3; i++) {
    const x = parseInt(pa[i], 10) || 0;
    const y = parseInt(pb[i], 10) || 0;
    if (x !== y) return x - y;
  }
  const aPre = String(a).replace(/^[vV]/, "").match(/-.*$/)?.[0] ?? "";
  const bPre = String(b).replace(/^[vV]/, "").match(/-.*$/)?.[0] ?? "";
  if (!aPre && !bPre) return 0;
  if (!aPre) return 1;
  if (!bPre) return -1;
  const aParts = aPre.slice(1).split(".");
  const bParts = bPre.slice(1).split(".");
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const ax = aParts[i] ?? "";
    const bx = bParts[i] ?? "";
    if (ax === bx) continue;
    const aNum = /^\d+$/.test(ax);
    const bNum = /^\d+$/.test(bx);
    if (aNum && bNum) return Number(ax) - Number(bx);
    if (aNum) return 1;
    if (bNum) return -1;
    return ax < bx ? -1 : 1;
  }
  return 0;
}
function redactStatus(s) {
  return {
    proxyRunning: s?.proxyRunning === true,
    proxyPort: s?.proxyPort ?? null,
    lanUrl: s?.lanUrl ?? null,
    lanQr: s?.lanQr ?? null,
    lanCandidates: Array.isArray(s?.lanCandidates) ? s.lanCandidates : [],
    lanIpOverride: s?.lanIpOverride ?? "",
    virtualNetworks: Array.isArray(s?.virtualNetworks) ? s.virtualNetworks : [],
    tunnelRunning: s?.tunnelRunning === true,
    tunnelMode: s?.tunnelMode ?? null,
    tunnelUrl: s?.tunnelUrl ?? null,
    tunnelQr: s?.tunnelQr ?? null,
    tunnelState: s?.tunnelState ?? { phase: "idle" },
    dshPort: s?.dshPort ?? null,
    // 固定域名（命名隧道）状态与登录进程
    fixed: s?.fixed ?? { hostname: "", accessEnabled: false, pinAlways: false, accessCheck: { state: "not-requested", detail: "" }, setup: { cert: false, tunnel: false, dns: false } },
    fixedLogin: s?.fixedLogin ?? null
  };
}

// client/mobile/MobileNavToggle.tsx
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
function MobileNavToggle({ toggleSidebar, t }) {
  const toggleExplorer = () => {
    const frame = document.querySelector('[data-mobile-nav="frame"]');
    if (frame === null) return;
    if (frame.hasAttribute("data-aionui-explorer-open")) {
      frame.removeAttribute("data-aionui-explorer-open");
    } else {
      frame.setAttribute("data-aionui-explorer-open", "");
    }
  };
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-mobile-nav": "toggle",
      "aria-label": t("open"),
      title: t("open"),
      onClick: () => toggleSidebar()
    },
    /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives.IconPanelLeftOutline16, { size: 16 })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-mobile-nav": "files",
      "aria-label": t("files"),
      title: t("files"),
      onClick: toggleExplorer
    },
    /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives.IconFolderOpenOutline16, { size: 16 })
  ));
}

// client/mobile/MobileNavOverlay.tsx
var import_react = require("react");
var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");
var MOBILE_QUERY = "(max-width: 1023px)";
function useMobile() {
  const [mobile, setMobile] = (0, import_react.useState)(() => window.matchMedia(MOBILE_QUERY).matches);
  (0, import_react.useEffect)(() => {
    const query = window.matchMedia(MOBILE_QUERY);
    const onChange = (event) => setMobile(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return mobile;
}
function findFrame() {
  return document.querySelector("[data-shell-overlay]")?.parentElement ?? null;
}
function MobileNavOverlay({ toggleSidebar, t }) {
  const mobile = useMobile();
  const [open, setOpen] = (0, import_react.useState)(false);
  const [fabVisible, setFabVisible] = (0, import_react.useState)(false);
  (0, import_react.useLayoutEffect)(() => {
    if (!mobile) {
      setOpen(false);
      return;
    }
    const frame = findFrame();
    if (frame === null) return;
    frame.setAttribute("data-mobile-nav", "frame");
    const sync = () => setOpen(!frame.hasAttribute("data-sidebar-collapsed"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(frame, { attributes: true, attributeFilter: ["data-sidebar-collapsed"] });
    return () => {
      observer.disconnect();
      frame.removeAttribute("data-mobile-nav");
    };
  }, [mobile]);
  (0, import_react.useEffect)(() => {
    if (!mobile) {
      setFabVisible(false);
      return;
    }
    const sync = () => setFabVisible(document.querySelector('[data-phase="active"]') === null);
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-phase"]
    });
    return () => observer.disconnect();
  }, [mobile]);
  (0, import_react.useEffect)(() => {
    if (!mobile || !open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && document.querySelector('[aria-modal="true"]') === null) toggleSidebar();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [mobile, open, toggleSidebar]);
  (0, import_react.useEffect)(() => {
    if (!mobile || !open) return;
    const onDrawerClick = (event) => {
      if (document.querySelector('[aria-modal="true"]') !== null) return;
      const target = event.target;
      if (target === null) return;
      const drawer = document.querySelector('[data-mobile-nav="frame"] > :first-child');
      if (drawer === null || !drawer.contains(target)) return;
      if (target.closest('[class*="sessionRow"] button') !== null) return;
      const navigates = target.closest(
        'button[data-dsh-taskboard-entry], button[data-dsh-ssh-entry], [class*="newSession"], [class*="sessionRow"], [class*="searchResultRow"], [class*="searchResultWorkspace"], [data-mobile-nav="files"]'
      );
      if (navigates !== null) toggleSidebar();
    };
    document.addEventListener("click", onDrawerClick, true);
    return () => document.removeEventListener("click", onDrawerClick, true);
  }, [mobile, open, toggleSidebar]);
  (0, import_react.useEffect)(() => {
    if (!mobile || !open) return;
    const onOutsideClick = (event) => {
      if (document.querySelector('[aria-modal="true"]') !== null) return;
      const target = event.target;
      if (target === null) return;
      if (target.closest('[data-mobile-nav="toggle"]') !== null) return;
      const drawer = document.querySelector('[data-mobile-nav="frame"] > :first-child');
      if (drawer !== null && drawer.contains(target)) return;
      toggleSidebar();
    };
    document.addEventListener("click", onOutsideClick, true);
    return () => document.removeEventListener("click", onOutsideClick, true);
  }, [mobile, open, toggleSidebar]);
  if (!mobile) return null;
  return /* @__PURE__ */ React.createElement(React.Fragment, null, open && /* @__PURE__ */ React.createElement("div", { "data-mobile-nav": "backdrop" }), fabVisible && !open && /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-mobile-nav": "fab",
      "aria-label": t("open"),
      title: t("open"),
      onClick: () => toggleSidebar()
    },
    /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives2.IconPanelLeftOutline16, { size: 18 })
  ));
}

// client/mobile/MobileDrawerFooter.tsx
var import_dsh_client_ui_primitives3 = require("@deepseek-ai/dsh-client-ui-primitives");
function MobileDrawerFooter({ useSessions, downloadSessionLog, toggleSidebar, t }) {
  const sessionId = useSessions((state) => state.current);
  const openExplorer = () => {
    document.querySelector('[data-mobile-nav="frame"]')?.setAttribute("data-aionui-explorer-open", "");
    toggleSidebar();
  };
  return /* @__PURE__ */ React.createElement("div", { "data-mobile-nav": "drawer-actions" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-mobile-nav": "explorer",
      "aria-label": t("files"),
      title: t("files"),
      onClick: openExplorer
    },
    /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives3.IconPanelLeftOutline16, { size: 14 }),
    /* @__PURE__ */ React.createElement("span", null, t("files"))
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      "data-mobile-nav": "session-log",
      "aria-label": t("sessionLog"),
      title: t("sessionLog"),
      disabled: sessionId === void 0,
      onClick: () => {
        if (sessionId !== void 0) downloadSessionLog(sessionId);
      }
    },
    /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives3.IconDownloadOutline16, { size: 14 }),
    /* @__PURE__ */ React.createElement("span", null, t("sessionLog"))
  ));
}

// client/mobile/mobile.css.ts
var MOBILE_CSS = `
/* ---------- base control styles (rendered at any width, hidden where unused) ---------- */

[data-mobile-nav="toggle"],
[data-mobile-nav="files"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: none;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--dsw-alias-label-secondary, inherit);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="toggle"]:hover,
[data-mobile-nav="files"]:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06));
}
[data-mobile-nav="toggle"]:focus-visible,
[data-mobile-nav="files"]:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, #4f6ef7);
  outline-offset: 1px;
}

/* Drawer footer actions: the relocated Session log download plus the Files
   action that opens the dsh-web-ui explorer sheet. */
[data-mobile-nav="drawer-actions"] {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
/* \u5BBF\u4E3B\u6CA1\u6709 aionui explorer \u5217\uFF08\u5B98\u65B9 DSH \u65E0 dsh-web-ui\uFF0Cissue #48\uFF09\u65F6\u9690\u85CF
   \u79FB\u52A8\u7AEF\u300C\u6587\u4EF6\u6D4F\u89C8\u300D\u5165\u53E3\uFF08header \u56FE\u6807 + drawer footer \u9879\uFF09\u2014\u2014\u4E0D\u7136\u70B9\u4E86\u6CA1\u53CD\u5E94\u3002 */
[data-mobile-nav-explorer="0"] [data-mobile-nav="files"],
[data-mobile-nav-explorer="0"] [data-mobile-nav="explorer"] {
  display: none !important;
}
[data-mobile-nav="session-log"],
[data-mobile-nav="explorer"] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .12));
  border-radius: 12px;
  background: transparent;
  color: var(--dsw-alias-label-primary, inherit);
  font-family: inherit;
  font-size: 13px;
  line-height: 20px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="session-log"]:hover:not(:disabled),
[data-mobile-nav="explorer"]:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06));
}
[data-mobile-nav="session-log"]:disabled {
  color: var(--dsw-alias-label-dimmed, rgba(0, 0, 0, .35));
  cursor: default;
}

/* Floating fallback button (hero / blank phases without a session header).
   The top clears the camera band below the status bar; when the client has
   set viewport-fit=cover the safe-area inset moves it below the notch too. */
[data-mobile-nav="fab"] {
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 72px);
  left: 10px;
  z-index: 21;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .12));
  border-radius: 50%;
  background: var(--dsw-alias-button-floating-fill, #ffffff);
  color: var(--dsw-alias-label-primary, inherit);
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, .18);
  -webkit-tap-highlight-color: transparent;
}
[data-mobile-nav="fab"]:hover {
  background: var(--dsw-alias-button-floating-hover, rgba(0, 0, 0, .08));
}
[data-mobile-nav="fab"]:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, #4f6ef7);
  outline-offset: 2px;
}

/* Dimmed backdrop under the open drawer; above every column, below the drawer.
   pointer-events: none \u2014\u2014 \u70B9\u51FB\u7A7F\u900F\uFF08issue #38\uFF09\uFF1Abackdrop \u53EA\u8D1F\u8D23\u89C6\u89C9\u538B\u6697\uFF0C
   \u4E0D\u62A2\u70B9\u51FB\u3002\u5173\u95ED\u62BD\u5C49\u6539\u7531 MobileNavOverlay \u7684 document \u7EA7\u300C\u62BD\u5C49\u5916\u70B9\u51FB\u300D\u76D1\u542C\u5904\u7406
   \uFF08\u7B49\u4EF7\u4E8E\u539F\u6765\u7684\u70B9\u51FB\u906E\u7F69\u5173\u95ED\uFF0C\u4E14\u62BD\u5C49\u5185\u70B9\u51FB\u4E0D\u518D\u88AB backdrop \u5403\u6389\uFF09\u3002 */
[data-mobile-nav="backdrop"] {
  position: absolute;
  inset: 0;
  z-index: 30;
  background: rgba(0, 0, 0, .45);
  pointer-events: none;
  animation: dsh-mobile-nav-fade .2s var(--ds-ease-in-out, ease-in-out);
  -webkit-tap-highlight-color: transparent;
}
@keyframes dsh-mobile-nav-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
/* Settings sheet entrance: the official dialog mounts with no animation at
   all, so it snaps in. Fade + slight rise/scale reads as a proper sheet. */
@keyframes dsh-mobile-nav-sheet-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
/* Preview sheet rise: the aionui preview column opens as a bottom sheet. */
@keyframes dsh-mobile-nav-sheet-up {
  from {
    opacity: 0;
    transform: translateY(28px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* ---------- mobile-only layout ---------- */

@media (max-width: 1023px) {
  /* --- Phone chrome ---
     The system status bar stays visible (no fullscreen). Two adjustments
     make it behave:
     - touch-action: manipulation kills double-tap-to-zoom (and the 300ms
       tap delay) while keeping pan and pinch zoom; the client also
       suppresses legacy-iOS gesturestart as a fallback.
     - With the client's viewport-fit=cover, env(safe-area-inset-top) is the
       status bar / notch height; the rules below push the app content below
       it so the status bar never covers anything. Off notched phones (or in
       a normal browser tab where the layout viewport already sits below the
       status bar) the inset is 0 and nothing shifts. */
  html,
  body {
    touch-action: manipulation !important;
  }

  /* AppFrame: the drawer takes the sidebar column out of grid flow, so the
     remaining in-flow items (center, details) land in tracks 1..2: give the
     center every pixel and keep the details track at zero. The top padding
     clears the status bar / notch for every in-flow surface (session header,
     messages, composer); the absolutely-positioned drawer is unaffected (its
     containing block is the frame's padding box, i.e. still the frame top). */
  [data-mobile-nav="frame"] {
    position: relative !important;
    grid-template-columns: minmax(0, 1fr) 0 0 !important;
    padding-top: env(safe-area-inset-top, 0px) !important;
  }

  /* \u4E3B\u5185\u5BB9\u5217\uFF08\u7B2C 2 \u4E2A\u7F51\u683C\u5B50\u5143\u7D20\uFF09\u5728\u5B98\u65B9\u6837\u5F0F\u91CC\u6709\u663E\u5F0F grid-column: 2\u2014\u2014
     \u7F51\u683C\u88AB\u538B\u7F29\u6210 [1fr, 0, 0] \u540E\u5B83\u4F1A\u843D\u5728 0px \u7684\u7B2C 2 \u8F68\uFF0C\u6574\u4E2A\u4E3B\u754C\u9762\u88AB\u6324\u51FA
     \u89C6\u53E3\uFF08\u53EA\u5269\u80CC\u666F\u56FE\uFF09\u3002\u5FC5\u987B\u663E\u5F0F\u628A\u5B83\u62C9\u56DE\u7B2C 1 \u8F68\uFF08issue #5\uFF09\u3002
     \u7B2C 3 \u5217\uFF08details\uFF09\u4FDD\u6301 0 \u8F68\u5373\u53EF\uFF0C\u65E0\u9700\u5904\u7406\u3002 */
  [data-mobile-nav="frame"] > :nth-child(2) {
    grid-column: 1 !important;
    grid-row: 1 !important;
    min-width: 0 !important;
  }

  /* The sidebar column (first grid child) becomes a left drawer. The drawer
     hugs the sidebar content exactly (the wide sidebar carries an inline
     width, ~280px): a fixed 92vw box would leave a white strip where the
     container background shows beside the content.
     Closed state: translateX(-110%) \u2014 more than -100% of the max-content
     width \u2014 guarantees the whole drawer (and its shadow, had it one) leaves
     the viewport. A mere -100% leaves a sliver on screen; -105% (as used
     before) left 14px of the drawer plus a long 32px-blur shadow gradient
     visible along the left edge of the main UI. No box-shadow at all: the
     dimmed backdrop already separates drawer from content.
     Z-index note: the backdrop renders inside the shell's overlay layer
     ([data-shell-overlay]), which forms its own stacking context. Third-party
     plugins can force that layer up with !important (dsh-update-checker sets
     it to 500), and when the layer outranks the drawer, the backdrop paints
     ABOVE the drawer and swallows every tap \u2014 the drawer opens but no row
     can be pressed (every tap just closes it). The drawer must therefore
     outrank any such raise: 600 clears the known 500 while staying under the
     fixed-position banners/toasts (z 9999) that float at the viewport level. */
  [data-mobile-nav="frame"] > :first-child {
    position: absolute !important;
    inset: 0 auto 0 0 !important;
    width: max-content !important;
    max-width: 92vw !important;
    z-index: 600 !important;
    transform: translateX(-110%);
    transition: transform .28s var(--ds-ease-in-out, ease-in-out);
    background: var(--dsw-alias-bg-base, #ffffff);
    /* Keep the drawer's own content below the status bar / notch: the drawer
       spans the full frame height (its absolute containing block is the
       frame's padding box, so the frame's own safe-area padding does NOT
       reach it). The drawer background paints the status-bar strip, which
       the client's theme-color meta matches, so the strip reads seamless. */
    padding-top: env(safe-area-inset-top, 0px) !important;
    /* Kill the official sidebarCol right border: with the backdrop the edge
       reads cleanly, and the settings dialog (width:100% of this box) stays
       pixel-flush with the drawer. */
    border-right: none !important;
  }

  /* Expanded state (frame without data-sidebar-collapsed) slides the drawer in.
     The open state must be transform:none \u2014 NOT translateX(0): an identity
     transform still makes the drawer the containing block for fixed-position
     descendants (the settings dialog's .VOzbGW_overlay is portaled into the
     sidebar DOM). With the identity transform the wide settings sheet
     (100vw-16) overflows the 280px drawer, the dialog's focus scrolls the
     overflow:hidden drawer to scrollLeft=102, and every static child (plus the
     fixed overlay) shifts 102px off-screen. With transform:none the overlay is
     viewport-anchored: it dims the full screen and the sheet sits at left:8. */
  [data-mobile-nav="frame"]:not([data-sidebar-collapsed]) > :first-child {
    transform: none !important;
  }

  /* Drag handles are useless on touch and would float over the drawer. */
  [data-side="sidebar"],
  [data-side="details"] {
    display: none !important;
  }

  /* --- Conversation text on mobile ---
     The official message flow keeps desktop's 32px side gutters and 16px
     type. On a phone: shrink the type a notch and widen the lines by
     trimming the gutters (the sidebar drawer list keeps its size). The
     flow's scroll container is the only _scroll element holding markdown
     <p> paragraphs \u2014 the composer's own scroll (textarea) is excluded
     via :has(p). */
  /* The official main scroll body reserves scrollbar-gutter for desktop
     scrollbars (8px), which shoves every column off-center on a phone.
     Classic desktop scrollbars (Edge/Chrome) also occupy ~8-17px in a
     phone-sized viewport, shifting the column further. Mobile scrolling
     is touch/wheel, so remove the scrollbar entirely on phones: the
     column is then exactly centered in every browser. */
  [data-phase] [class$="_scrollBody"] {
    scrollbar-gutter: auto !important;
    scrollbar-width: none !important;
  }
  [data-phase] [class$="_scrollBody"]::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
  }
  /* Message action rows (copy / run-time badges) can overflow the right
     edge on narrow screens \u2014 keep them inside the message width. */
  [data-phase] [class$="_actions"] {
    overflow: hidden !important;
  }
  [data-phase] [class$="_actions"] [class$="_timeEnd"] {
    flex: 0 1 auto !important;
    min-width: 0 !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  [data-phase] [class$="_scroll"]:has(p) {
    padding-left: 20px !important;
    padding-right: 20px !important;
    font-size: 15px !important;
  }
  /* The official markdown styles set an explicit 16px on paragraphs and
     list items, so the container's inherited 15px is not enough. User
     messages render their text in a div whose class carries _text_
     (16px too) \u2014 cover it as well. */
  [data-phase] [class$="_scroll"]:has(p) p,
  [data-phase] [class$="_scroll"]:has(p) li,
  [data-phase] [class$="_scroll"]:has(p) [class*="_text_"] {
    font-size: 15px !important;
  }

  /* --- Composer bottom row on mobile ---
     The official row gives the model pill (trailing) flex:0 0 auto, which
     squeezes the agent-permission pill (modes) down to 15px: the pill's
     chevron then overflows on top of the model name. Let the permission
     pill keep its natural width and let the model pill shrink instead.
     Anchored by the composer card (:has(textarea)): row = last child,
     tools = first child, permission pill = its 2nd child, model pill =
     row's last child. */
  [data-phase] [class*="_card"]:has(textarea) > :last-child {
    gap: 8px !important;
  }
  [data-phase] [class*="_card"]:has(textarea) > :last-child > :first-child {
    gap: 8px !important;
  }
  [data-phase] [class*="_card"]:has(textarea) > :last-child > :first-child > :nth-child(2) {
    flex: 0 0 auto !important;
  }
  [data-phase] [class*="_card"]:has(textarea) > :last-child > :last-child {
    flex: 1 1 auto !important;
    min-width: 0 !important;
  }

  /* --- Session header on mobile ---
     Layout goal: [toggle] [session title] [mode badge] in a row, with the
     Session log capsule removed from the header (relocated to the drawer
     footer). Stable structural hooks only:
       [data-phase] header                     the session header element
       header > :first-child                   titleRow (titleCluster + utilities)
       header > :first-child > :last-child     headerUtilities (Session log seat) */
  [data-phase] header {
    padding-right: 12px !important;
  }
  /* Give the title row a lane clear of the absolutely-placed toggle, then
     balance the header: with header padding-right 12px, a 20px left
     padding puts the title's geometric center exactly on the viewport
     center (measured 195/195 at 390px). */
  [data-phase] header > :first-child {
    padding-left: 20px !important;
  }
  /* The directory toggle sits at the far left of the header (the header
     is position:relative; the data-slot wrappers are display:contents). */
  [data-mobile-nav="toggle"] {
    position: absolute !important;
    left: 8px !important;
    top: 12px !important;
    z-index: 2 !important;
  }
  /* The Files action sits at the FAR RIGHT of the header so it reads as a
     distinct control from the directory toggle on the left (which opens
     the history sidebar). */
  [data-mobile-nav="files"] {
    position: absolute !important;
    left: auto !important;
    right: 8px !important;
    top: 12px !important;
    z-index: 2 !important;
  }
  /* Session log download: gone from the header row on mobile (the utilities
     seat holds only the session-log-export capsule). */
  [data-phase] header > :first-child > :last-child {
    display: none !important;
  }

  /* --- Settings dialog on mobile ---
     Desktop: 800px two-column flex (188px nav + content). Mobile: a
     near-full-width sheet \u2014 nav tabs wrap into rows on top, option rows
     stay horizontal (title+description left, control right). Structural
     selectors are scoped to the unique aria-modal dialog; every
     settings-specific rule is gated with
     :has(> :first-child > :last-child > button) \u2014 the settings nav tab
     list holds <button> tabs, so the transient export dialog (the same
     primitives Modal, header(title+close)+description+body) keeps its
     official centered card layout. Requires :has() support
     (Chromium 105+, 2022). */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) {
    position: absolute !important;
    left: 8px !important;
    /* Fixed top (no translateY): a transform on the panel combined with the
       panel overflowing the max-content drawer shifts the fixed overlay's
       coordinate frame, dragging the whole sidebar content off-screen. The
       safe-area inset keeps the sheet below the status bar / notch. */
    top: calc(env(safe-area-inset-top, 0px) + 12px) !important;
    width: calc(100vw - 16px) !important;
    max-width: calc(100vw - 16px) !important;
    /* Height follows the content (no dead space under a short page); it
       caps at 100dvh-24 (less the safe-area top) and the options area
       scrolls only then. */
    height: auto !important;
    max-height: min(800px, calc(100vh - 24px - env(safe-area-inset-top, 0px))) !important;
    max-height: min(800px, calc(100dvh - 24px - env(safe-area-inset-top, 0px))) !important;
    flex-direction: column !important;
    border-radius: 14px !important;
    animation: dsh-mobile-nav-sheet-in .22s var(--ds-ease-out, ease-in-out);
  }
  /* The settings sheet's dimmed mask fades in with the panel (the mask is
     the first child of the overlay that directly contains the sheet). */
  :has(> [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"]))) > :first-child {
    animation: dsh-mobile-nav-fade .18s var(--ds-ease-out, ease-in-out);
  }
  @media (prefers-reduced-motion: reduce) {
    [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])),
    :has(> [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"]))) > :first-child {
      animation: none !important;
    }
  }
  /* The export dialog (not the settings sheet) must never overflow the
     viewport: the official centered card can be wider than 390px. */
  [aria-modal="true"]:not(:has(> :first-child > :last-child > button)) {
    max-width: calc(100vw - 32px) !important;
  }
  /* Nav bar: hide the "Settings" caption (redundant on a full-width sheet)
     and wrap the tab list so every tab is visible \u2014 a horizontal scroll cut
     the last tab ("Plugins") off with no affordance to scroll. */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) > :first-child {
    width: 100% !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 6px !important;
    padding: 10px 12px 8px !important;
  }
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) > :first-child > :first-child {
    display: none !important;
  }
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) > :first-child > :last-child {
    flex-direction: row !important;
    flex-wrap: wrap !important;
    width: 100% !important;
    gap: 6px !important;
    overflow: visible !important;
  }
  /* Content toolbar (Open configuration file + close): spread to the edges
     instead of clustering right with a dead zone on the left. The toolbar
     children carry official auto-margins that would defeat space-between,
     so neutralize them. The close button gets a round tappable base so it
     reads as its own control, not part of the outline button. */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) > :last-child > :first-child {
    justify-content: space-between !important;
    align-items: center !important;
    padding: 0 12px !important;
    min-height: 40px !important;
  }
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) > :last-child > :first-child > * {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) > :last-child > :first-child > :last-child {
    width: 32px !important;
    height: 32px !important;
    border-radius: 50% !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: var(--dsw-alias-interactive-bg-hover, rgba(0, 0, 0, .06)) !important;
  }
  /* Appearance mode cards: the official cube row renders three tall
     vertical cards (~268px) that eat half the sheet. Turn them into a
     compact horizontal trio (icon + label inline, equal widths).
     Relies on the official cube-row class name of this version. */
  [aria-modal="true"] [class$="_cubeRow"] {
    gap: 6px !important;
  }
  [aria-modal="true"] [class$="_cubeRow"] > * {
    flex: 1 1 0 !important;
    flex-direction: row !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    padding: 10px 8px !important;
    min-height: 0 !important;
  }
  /* Content: the options scroll area gets bottom breathing room so the last
     row never sits flush against the sheet's rounded corner. */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) > :last-child {
    flex: 1 1 auto !important;
    min-height: 0 !important;
  }
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) > :last-child > :last-child {
    padding: 0 12px 24px !important;
  }

  /* ---------- dsh-web-ui family compatibility ----------
     The linxin666 plugin suite extends the shell frame directly:
       - aionui-panel appends two trailing grid columns (explorer / preview)
         plus absolute drag handles to [data-dsh-frame]; its 5-track inline
         grid is already overridden above, but the handles and columns would
         still float over the main UI. On mobile the columns leave the grid
         as floating bottom sheets and keep their own visibility state \u2014
         the suite's collapse chevron / preview tabs still work, so no
         feature is lost. The task-board / ssh plugins inject sidebar
         entries and center-column takeover panels; the entries need
         spacing and the kanban needs scrollable columns. */

  /* Touch devices: the drag handles are useless \u2014 the floating expand
     button is the opener. */
  .aionui-explorer-handle,
  .aionui-preview-handle {
    display: none !important;
  }

  /* Shared base: both columns leave the grid as floating panels. The
     explorer is gated shut by default (its own persisted expanded state
     must never cover the mobile UI on load); the header Files action opens
     it via the frame marker below, and the sheet's own collapse chevron
     clears it. Preview stays owned by the suite (hidden while no tab is
     open). The per-column rules below override the geometry. */
  [data-aionui-explorer-col],
  [data-aionui-preview-col] {
    position: fixed !important;
    z-index: 55 !important;
    background: var(--aion-bg-base, #ffffff) !important;
    border-left: none !important;
  }
  /* Explorer (file tree) bottom sheet: bottom edge aligned exactly with
     the composer card's bottom line \u2014 the card sits 36px above the
     viewport bottom (8px composer padding + the 28px stats strip below
     the card), so the sheet uses the same 36px bottom offset. */
  [data-aionui-explorer-col] {
    visibility: hidden !important;
    left: 8px !important;
    right: 8px !important;
    top: auto !important;
    bottom: 36px !important;
    width: auto !important;
    height: min(55dvh, 460px) !important;
    max-height: calc(100dvh - 44px) !important;
    border-radius: 14px !important;
    overflow: hidden !important;
    box-shadow: 0 -4px 28px rgba(0, 0, 0, .18) !important;
    animation: dsh-mobile-nav-sheet-up .24s var(--ds-ease-out, ease-in-out) !important;
  }
  /* Preview (file content) bottom sheet. Gated shut by default: the suite
     persists open preview tabs in localStorage and restores them on load,
     which would pop the sheet over the fresh UI. The client only sets the
     frame marker after the user taps a file row in the explorer; the
     suite's own collapse chevron clears it via the visibility watcher. */
  [data-aionui-preview-col] {
    visibility: hidden !important;
    position: fixed !important;
    left: 8px !important;
    right: 8px !important;
    top: auto !important;
    bottom: 40px !important;
    width: auto !important;
    height: min(50dvh, 420px) !important;
    max-height: calc(100dvh - 48px) !important;
    border-radius: 14px !important;
    overflow: hidden !important;
    box-shadow: 0 -4px 28px rgba(0, 0, 0, .18) !important;
    z-index: 56 !important;
    animation: dsh-mobile-nav-sheet-up .24s var(--ds-ease-out, ease-in-out) !important;
  }
  /* User-opened preview sheet (frame marker, set on file-row tap). */
  [data-mobile-nav="frame"][data-aionui-preview-open] [data-aionui-preview-col] {
    visibility: visible !important;
  }
  /* The Files action opens the explorer sheet (frame marker). */
  [data-mobile-nav="frame"][data-aionui-explorer-open] [data-aionui-explorer-col] {
    visibility: visible !important;
  }
  /* The open drawer must never sit under a sheet: while the frame is in the
     narrow-expanded state both sheets yield (later in the file than the
     open marker rule, so it wins at equal specificity). */
  [data-mobile-nav="frame"]:not([data-sidebar-collapsed]) [data-aionui-explorer-col],
  [data-mobile-nav="frame"]:not([data-sidebar-collapsed]) [data-aionui-preview-col] {
    visibility: hidden !important;
  }
  /* The suite's own expand button reads the store state we bypass on
     mobile \u2014 hide it; the header Files action is the opener. */
  .aionui-floating-expand {
    display: none !important;
  }

  /* dsh-web-ui sidebar entries (task board / ssh) sit flush against each
     other \u2014 give the injected rows breathing room. */
  button[data-dsh-taskboard-entry],
  button[data-dsh-ssh-entry] {
    margin-bottom: 8px !important;
  }

  /* Task board: five kanban columns at minmax(0,1fr) crush into ~78px phone
     strips. Give every column a usable minimum and let the row scroll. */
  [data-dsh-taskboard-board] > [class$="_columns"] {
    grid-template-columns: repeat(5, minmax(240px, 1fr)) !important;
    overflow-x: auto !important;
  }
  /* The floating button must not float over a takeover panel (task board /
     ssh own the center column while active). */
  html[data-dsh-taskboard-active] [data-mobile-nav="fab"],
  html[data-dsh-ssh-active] [data-mobile-nav="fab"],
  html[data-dsh-taskboard-active] [data-mobile-nav="backdrop"],
  html[data-dsh-ssh-active] [data-mobile-nav="backdrop"] {
    display: none !important;
  }
  /* Board header: let the search field take the slack instead of squeezing
     the action buttons. */
  [data-dsh-taskboard-board] > [class$="_boardHeader"] [class$="_search"] {
    flex: 1 1 auto !important;
    min-width: 80px !important;
  }

  /* ---------- dsh-web-ui polish: plugin market search ----------
     The market tab row (Discover / Themes / Installed + the plugin search
     box) is a no-wrap flex: at 390px the tabs plus the ~218px search box
     (~475px total) overflow the ~334px sheet and the search box runs off
     the right edge of the screen (it also forces a horizontal scrollbar on
     the sheet's options area). Let the row wrap: the tabs keep the first
     line and the search box gets its own full-width second line. */

  [aria-modal="true"] [class$="_tabs"] {
    flex-wrap: wrap !important;
    row-gap: 8px !important;
  }
  [aria-modal="true"] [class$="_searchInline"] {
    flex: 1 1 100% !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  /* ---------- dsh-usage-stats polish: usage & balance panel ----------
     The panel's stats row shows three token counters side by side
     (today / month / total). The counters use tabular nowrap figures whose
     min-content width overflows the ~336px panel body on a phone: figures
     clip at the row's edges and the panel grows a horizontal scrollbar.
     Stack the three counters vertically \u2014 full-width rows, so the figures
     always fit. */

  [class*="usg_"][class$="_statsRow"] {
    flex-direction: column !important;
  }
  [class*="usg_"][class$="_stat"] {
    flex: 0 0 auto !important;
    width: 100% !important;
    min-width: 0 !important;
  }

  /* ---------- dsh-web-ui polish: settings sheet ----------
     The official dialog is a desktop two-column form; on a phone the
     label/control split leaves a huge dead gap and long descriptions wrap
     into tall stacks. Stack each row (text above, control full-width) and
     compact the nav tabs into an even wrap. */

  /* Nav tabs: a stable 3-per-row grid (two clean rows instead of a ragged
     wrap) with tighter cells. */
  [aria-modal="true"]:has(> :first-child > :last-child > button):not(:has([role="navigation"])) > :first-child > :last-child {
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 6px !important;
  }
  [aria-modal="true"] [class$="_navCell"] {
    padding: 6px 8px !important;
    gap: 6px !important;
    font-size: 13px !important;
    justify-content: flex-start !important;
  }
  [aria-modal="true"] [class$="_navCell"] svg {
    width: 14px !important;
    height: 14px !important;
    flex: none !important;
  }
  /* Setting rows: text on top, control below at full width. */
  [aria-modal="true"] [class$="_section"] [class$="_row"] {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 8px !important;
  }
  [aria-modal="true"] [class$="_section"] [class$="_row"] > :first-child {
    width: 100% !important;
    max-width: none !important;
  }
  [aria-modal="true"] [class$="_section"] [class$="_row"] > :last-child {
    width: 100% !important;
    max-width: none !important;
  }
  /* Appearance mode group: give the cube row a consistent bordered
     segmented look (the official borders differ per state). */
  [aria-modal="true"] [class$="_cubeRow"] > * {
    border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, .12)) !important;
  }

  /* ---------- dsh-web-ui polish: explorer sheet ----------
     The aionui explorer was designed for a desktop side column: compact the
     header, search box and tree rows so a phone shows more entries, and pad
     the scroll bottom so the last row never sits flush on the edge. */

  [data-aionui-explorer-col] [class$="_tabBar"] {
    height: 36px !important;
  }
  [data-aionui-explorer-col] [class$="_tabBtn"],
  [data-aionui-explorer-col] [class$="_tabBtnActive"] {
    padding: 0 12px !important;
    font-size: 13px !important;
  }
  [data-aionui-explorer-col] [class$="_searchBox"] {
    height: 32px !important;
    font-size: 13px !important;
  }
  [data-aionui-explorer-col] [class$="_treeRow"] {
    height: 30px !important;
    font-size: 13px !important;
  }
  [data-aionui-explorer-col] [class$="_treeRow"] svg {
    width: 14px !important;
    height: 14px !important;
  }
  [data-aionui-explorer-col] [class$="_scrollArea"] {
    padding-bottom: 28px !important;
  }

  /* ---------- dsh-web-ui polish: drawer footer ----------
     The injected footer actions (Files + Session log) become two equal pill
     buttons instead of text-width capsules. */

  /* The official footerActions row also hosts the remote-web-ui entry
     row (two icon buttons); without wrapping the two groups squeeze each
     other on one line. Wrap so each group gets its own full-width row. */
  [data-mobile-nav="frame"] [class$="_footerActions"] {
    flex-wrap: wrap !important;
    gap: 6px !important;
  }
  [data-mobile-nav="drawer-actions"] {
    width: 100% !important;
  }
  [data-mobile-nav="drawer-actions"] > button {
    flex: 1 1 0 !important;
    padding: 0 8px !important;
    white-space: nowrap !important;
  }

  /* ---------- dsh-web-ui polish: floating pet ----------
     The whale-girl pet (dsh-pet) floats at the viewport corner with a
     persisted, draggable position. On phones the pet is scaled down so
     it does not dominate the screen; the plugin's own drag + persist
     still work (the position itself is left alone \u2014 the mobile default
     position is seeded via the pet API to just above the composer). */

  body > [class$="_float"]:has([class$="_sprite"][role="button"]) {
    transform: scale(.66);
    transform-origin: bottom right;
  }
  /* While a modal dialog (settings sheet / export) owns the screen the pet
     floats ABOVE it and covers the dialog content; modal semantics say the
     background is inert, so hide the pet for the modal's lifetime. */
  body:has([aria-modal="true"]) > [class$="_float"]:has([class$="_sprite"][role="button"]) {
    display: none !important;
  }

  /* ---------- dsh-web-ui polish: conversation stats line ----------
     The official session-status row (turns / steps / LLM time / TTFT /
     cache) is long. The client marks the exact row with
     [data-mobile-nav="stats"] (text-anchored, hashed classes can't be
     targeted). Layout: ONE fixed-height (28px) flex strip that scrolls
     horizontally \u2014 the full metrics stream stays reachable by swiping,
     the row never grows vertically, no ellipsis or fade, 12px gaps
     between metric groups, a 2px scrollbar as the swipe affordance. */

  [data-mobile-nav="stats"] {
    display: flex !important;
    flex-flow: row nowrap !important;
    align-items: center !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 0 !important;
    height: 28px !important;
    min-height: 28px !important;
    max-height: 28px !important;
    box-sizing: border-box !important;
    white-space: nowrap !important;
    overflow-x: auto !important;
    overflow-y: hidden !important;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    scrollbar-width: thin !important;
    scrollbar-color: var(--dsw-alias-border-l1, rgba(0, 0, 0, .28)) transparent !important;
    padding: 0 0 4px !important;
    line-height: 20px !important;
    font-size: 12px !important;
  }
  [data-mobile-nav="stats"]::-webkit-scrollbar {
    height: 2px !important;
  }
  [data-mobile-nav="stats"]::-webkit-scrollbar-thumb {
    background: var(--dsw-alias-label-tertiary, rgba(0, 0, 0, .3)) !important;
    border-radius: 2px !important;
  }
  [data-mobile-nav="stats"]::-webkit-scrollbar-track {
    background: transparent !important;
  }
  [data-mobile-nav="stats"] > * {
    display: flex !important;
    flex: 0 0 auto !important;
    flex-flow: row nowrap !important;
    align-items: center !important;
    width: max-content !important;
    min-width: max-content !important;
    max-width: none !important;
    white-space: nowrap !important;
    margin-right: 12px !important;
    padding: 0 !important;
  }
  [data-mobile-nav="stats"] > *:last-child {
    margin-right: 0 !important;
  }
  [data-mobile-nav="stats"] * {
    white-space: nowrap !important;
  }

  /* ---------- hero composer on mobile ----------
     The official hero card carries a 2-line textarea plus a tall tool row,
     which reads oversized on a phone. Tighten the empty-state rhythm: keep
     the official centered hero, shrink the textarea line box, slim the card
     padding and the tool row, and close the gap under the headline. */

  [data-phase="hero"] [class$="_card"]:has(textarea) {
    padding-top: 6px !important;
    gap: 8px !important;
  }
  /* The official composer autosizes the textarea and writes an inline
     height (2 lines on the hero empty state) on the textarea's scroll/grow
     wrappers. :placeholder-shown lets us collapse the EMPTY state to one
     line with !important; as soon as the user types, the pseudo-class no
     longer matches and the autosizer's inline height takes over again \u2014 so
     multi-line growth keeps working. */
  [data-phase="hero"] textarea:placeholder-shown {
    height: 28px !important;
  }
  [data-phase="hero"] [class$="_card"]:has(textarea:placeholder-shown) > [class$="_scroll"],
  [data-phase="hero"] [class$="_card"]:has(textarea:placeholder-shown) [class$="_grow"] {
    height: 28px !important;
  }
  [data-phase="hero"] [class$="_card"]:has(textarea) > [class$="_row"] {
    padding-top: 2px !important;
  }
  [data-phase="hero"] [class$="_headline"] {
    line-height: 1.15 !important;
    margin-bottom: 0 !important;
  }
  [data-phase="hero"] [class$="_stack"] {
    gap: 0 !important;
  }
}

/* ---------- desktop: the mobile controls must never appear ---------- */

@media (min-width: 1024px) {
  [data-mobile-nav="toggle"],
  [data-mobile-nav="files"],
  [data-mobile-nav="fab"],
  [data-mobile-nav="backdrop"],
  [data-mobile-nav="session-log"],
  [data-mobile-nav="explorer"],
  [data-mobile-nav="drawer-actions"] {
    display: none !important;
  }
}
`;

// client/mobile/locales.ts
var NS = "mobileNav";
var zh = {
  "open": "\u6253\u5F00\u76EE\u5F55",
  "close": "\u6536\u8D77\u76EE\u5F55",
  "backdrop": "\u70B9\u51FB\u5173\u95ED\u76EE\u5F55",
  "sessionLog": "\u5BFC\u51FA\u4F1A\u8BDD\u65E5\u5FD7",
  "files": "\u6587\u4EF6\u6D4F\u89C8"
};
var en = {
  "open": "Open directory",
  "close": "Close directory",
  "backdrop": "Click to close directory",
  "sessionLog": "Session log",
  "files": "Files"
};

// client/mobile/mobile-apply.tsx
function mobileApply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-mobile-nav: dictionaries");
  ctx.effect(() => {
    const tag = document.createElement("style");
    tag.dataset.plugin = "@dsh-external/dsh-mobile-nav";
    tag.dataset.pluginCss = "@dsh-external/dsh-mobile-nav/mobile.css";
    tag.textContent = MOBILE_CSS;
    document.head.appendChild(tag);
    return () => {
      tag.remove();
    };
  }, "dsh-mobile-nav: styles");
  ctx.effect(() => {
    const narrow = window.matchMedia("(max-width: 1023px)");
    const viewport = document.querySelector('meta[name="viewport"]');
    const originalViewport = viewport?.content ?? "";
    const themeMeta = document.createElement("meta");
    themeMeta.name = "theme-color";
    const bodyBg = () => getComputedStyle(document.body).backgroundColor;
    const sync = () => {
      if (viewport !== null) viewport.content = "width=device-width, initial-scale=1, viewport-fit=cover";
      themeMeta.content = bodyBg();
      if (themeMeta.parentElement === null) document.head.appendChild(themeMeta);
    };
    const restore = () => {
      if (viewport !== null) viewport.content = originalViewport;
      themeMeta.remove();
    };
    const onGestureStart = (event) => event.preventDefault();
    if (narrow.matches) sync();
    const onChange = (event) => event.matches ? sync() : restore();
    narrow.addEventListener("change", onChange);
    const observer = new MutationObserver(() => {
      if (narrow.matches) themeMeta.content = bodyBg();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });
    document.addEventListener("gesturestart", onGestureStart);
    return () => {
      narrow.removeEventListener("change", onChange);
      observer.disconnect();
      document.removeEventListener("gesturestart", onGestureStart);
      restore();
    };
  }, "dsh-mobile-nav: status bar theme + viewport + zoom guard");
  ctx.effect(() => {
    const narrow = window.matchMedia("(max-width: 1023px)");
    if (!narrow.matches) return () => {
    };
    const onChevronClick = (event) => {
      const target = event.target;
      if (target === null || !target.closest(".aionui-collapse-chevron")) return;
      document.querySelector('[data-mobile-nav="frame"]')?.removeAttribute("data-aionui-explorer-open");
    };
    document.addEventListener("click", onChevronClick, true);
    return () => document.removeEventListener("click", onChevronClick, true);
  }, "dsh-mobile-nav: aionui explorer close marker");
  ctx.effect(() => {
    const narrow = window.matchMedia("(max-width: 1023px)");
    if (!narrow.matches) return () => {
    };
    const frame = () => document.querySelector('[data-mobile-nav="frame"]');
    const check = () => {
      const has = document.querySelector("[data-aionui-explorer-col]") !== null;
      frame()?.setAttribute("data-mobile-nav-explorer", has ? "1" : "0");
    };
    check();
    const timer = window.setTimeout(check, 1500);
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, "dsh-mobile-nav: explorer availability (issue #48)");
  ctx.effect(() => {
    const narrow = window.matchMedia("(max-width: 1023px)");
    if (!narrow.matches) return () => {
    };
    const frame = () => document.querySelector('[data-mobile-nav="frame"]');
    const onTap = (event) => {
      const target = event.target;
      if (target === null) return;
      if (target.closest('[data-aionui-explorer-col] [class$="_treeRow"]') === null) return;
      frame()?.setAttribute("data-aionui-preview-open", "");
    };
    const sync = () => {
      const pv = document.querySelector("[data-aionui-preview-col]");
      if (pv === null) return;
      if (getComputedStyle(pv).visibility === "hidden") frame()?.removeAttribute("data-aionui-preview-open");
    };
    document.addEventListener("click", onTap, true);
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["style"] });
    sync();
    return () => {
      document.removeEventListener("click", onTap, true);
      observer.disconnect();
    };
  }, "dsh-mobile-nav: preview sheet open marker");
  ctx.effect(() => {
    const narrow = window.matchMedia("(max-width: 1023px)");
    if (!narrow.matches) return () => {
    };
    const moveTps = (stats) => {
      if ([...stats.children].some((c) => /^TPS\s+\d/.test((c.textContent ?? "").trim()))) return;
      const stack = stats.closest('[class$="_composerStack"]');
      if (stack === null) return;
      for (const el of stack.querySelectorAll("div")) {
        const text = (el.textContent ?? "").trim();
        if (!/^TPS\s+\d/.test(text)) continue;
        if (el.children.length > 0) continue;
        stats.appendChild(el);
        return;
      }
    };
    const mark = () => {
      for (const root of document.querySelectorAll('[data-phase] [class$="_root"]')) {
        if (root.closest('[class$="_composerStack"]') === null) continue;
        const text = root.textContent ?? "";
        if (!/(turns|steps|\bLLM\b|轮|步)/.test(text)) continue;
        if (root.querySelector("textarea") !== null) continue;
        root.setAttribute("data-mobile-nav", "stats");
        moveTps(root);
        return;
      }
    };
    const observer = new MutationObserver(mark);
    observer.observe(document.body, { childList: true, subtree: true });
    mark();
    return () => {
      observer.disconnect();
    };
  }, "dsh-mobile-nav: stats line marker");
  ctx.effect(() => {
    const narrow = window.matchMedia("(max-width: 1023px)");
    if (!narrow.matches) return () => {
    };
    const cols = ["[data-aionui-explorer-col]", "[data-aionui-preview-col]"];
    const seen = /* @__PURE__ */ new Map();
    const play = (el) => {
      el.animate(
        [
          { opacity: 0, transform: "translateY(28px)" },
          { opacity: 1, transform: "none" }
        ],
        { duration: 280, easing: "cubic-bezier(.16, 1, .3, 1)", fill: "backwards" }
      );
    };
    const check = () => {
      for (const sel of cols) {
        const el = document.querySelector(sel);
        if (el === null) continue;
        const visible = getComputedStyle(el).visibility === "visible";
        const prev = seen.get(sel) ?? false;
        if (visible && !prev) play(el);
        seen.set(sel, visible);
      }
    };
    const observer = new MutationObserver(check);
    observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ["style", "class", "data-aionui-explorer-open"] });
    check();
    return () => {
      observer.disconnect();
    };
  }, "dsh-mobile-nav: sheet rise animation replay");
  ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
    name: "conversation.session.header.actions",
    id: "mobile-nav-toggle",
    order: 10,
    locale: NS,
    inject: () => ({
      toggleSidebar: () => ctx.layout.toggleSidebar()
    })
  }, MobileNavToggle));
  ctx.slots.inject("shell.overlay", () => ctx.slots.register({
    name: "shell.overlay",
    id: "mobile-nav-overlay",
    order: 10,
    locale: NS,
    inject: () => ({
      toggleSidebar: () => ctx.layout.toggleSidebar()
    })
  }, MobileNavOverlay));
  ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
    name: "sidebar.footer.action",
    id: "mobile-nav-session-log",
    order: 10,
    locale: NS,
    inject: () => ({
      downloadSessionLog: (sessionId) => ctx.sessionLogDownload.download(sessionId),
      toggleSidebar: () => ctx.layout.toggleSidebar()
    })
  }, MobileDrawerFooter));
}

// client/pocket-locales.js
var NS2 = "pocket";
var zh2 = {
  "section": "\u624B\u673A\u8BBF\u95EE",
  "title": "\u{1F4F1} \u624B\u673A\u8BBF\u95EE",
  "subtitle": "\u624B\u673A\u626B\u7801\u6253\u5F00\u7684\u5C31\u662F\u7535\u8111\u4E0A\u7684\u8FD9\u4E2A\u754C\u9762\uFF0C\u5B9E\u65F6\u540C\u6B65",
  "remoteSummaryLocal": "\u4EC5\u672C\u5730\u8BBF\u95EE",
  "remoteSummaryLocalDetail": "\u5C40\u57DF\u7F51 / \u865A\u62DF\u5C40\u57DF\u7F51\u53EF\u7528\uFF1B\u516C\u7F51\u672A\u5F00\u542F",
  "remoteSummaryLocalFixedDetail": "\u56FA\u5B9A\u57DF\u540D\u5DF2\u914D\u7F6E\uFF0C\u5F53\u524D\u672A\u5F00\u542F\u516C\u7F51",
  "remoteSummaryConnecting": "\u6B63\u5728\u5EFA\u7ACB\u516C\u7F51\u8BBF\u95EE",
  "remoteSummaryConnectingDetail": "Cloudflare \u96A7\u9053\u6B63\u5728\u8FDE\u63A5\uFF0C\u8BF7\u7A0D\u5019",
  "remoteSummaryOnline": "\u6B63\u5728\u516C\u7F51\u8BBF\u95EE",
  "remoteSummaryOnlineDetail": "{mode} \xB7 {host} \xB7 {access} \xB7 {pin}",
  "remoteSummaryProblem": "\u516C\u7F51\u8BBF\u95EE\u4E0D\u53EF\u7528",
  "remoteSummaryProblemDetail": "{detail}",
  "remoteModeQuick": "\u5FEB\u901F\u96A7\u9053",
  "remoteModeFixed": "\u56FA\u5B9A\u57DF\u540D",
  "remoteAccessVerified": "Access \u5DF2\u9A8C\u8BC1",
  "remoteAccessUnverified": "Access \u672A\u9A8C\u8BC1",
  "remotePinForced": "PIN \u5F3A\u5236\u5F00\u542F",
  "remotePinEnabled": "PIN \u5DF2\u5F00\u542F",
  "remotePinDisabled": "PIN \u5DF2\u5173\u95ED",
  "developer": "\u5F00\u53D1\u8005\uFF1A\u7A0B\u5E8F\u5458\u5C11\u5317\u6668",
  "starAsk": "\u2B50 \u987A\u624B\u7559\u9897 Star\uFF0C\u4F5C\u8005\u80FD\u9AD8\u5174\u4E00\u6574\u5929",
  "starOriginal": "\u539F\u4F5C\u8005",
  "starFork": "\u6211\u7684\u7248\u672C",
  "restarted": "\u{1F504} \u5DF2\u91CD\u542F",
  "ok": "\u77E5\u9053\u4E86",
  "bgHint": "\u8FDB\u7A0B\u5728\u540E\u53F0\u8FD0\u884C\uFF08\u4E0D\u6302\u7EC8\u7AEF\uFF09\u3002\u5982\u9700\u505C\u6B62\uFF1A{cmd}",
  "updatedRestart": "\u2705 \u5DF2\u66F4\u65B0 v{ver}\uFF0C\u91CD\u542F\u751F\u6548",
  "updateAutoRestarting": "\u2705 \u5DF2\u66F4\u65B0 v{ver}\uFF0C\u6B63\u5728\u81EA\u52A8\u91CD\u542F\u2026",
  "updatedOk": "\u2705 \u5DF2\u66F4\u65B0 v{ver}",
  "updateAvailable": "\u{1F4E6} \u65B0\u7248\u672C v{ver}",
  "updating": "\u66F4\u65B0\u4E2D\u2026",
  "updateTo": "\u66F4\u65B0\u5230 v{ver}",
  "restartingNow": "\u6B63\u5728\u91CD\u542F\u751F\u6548\u2026",
  "restarting": "\u91CD\u542F\u4E2D\u2026",
  "restartNow": "\u{1F504} \u91CD\u542F dsh web \u751F\u6548",
  "updatingDetail": "\u23F3 \u66F4\u65B0\u4E2D\uFF08\u901A\u5E38 1-2 \u5206\u949F\uFF09\xB7 \u5DF2\u7B49\u5F85 {s} \u79D2",
  "restartingDetail": "\u23F3 \u6B63\u5728\u91CD\u542F\u751F\u6548\uFF08\u901A\u5E38 10-30 \u79D2\uFF09\xB7 \u5DF2\u7B49\u5F85 {s} \u79D2",
  "updatedAutoDetail": "\u2705 \u5DF2\u66F4\u65B0\uFF0C\u6B63\u5728\u81EA\u52A8\u91CD\u542F\u751F\u6548\uFF0C\u8BF7\u7A0D\u5019\u5237\u65B0",
  "updatedRestartDetail": "\u2705 \u5DF2\u66F4\u65B0\uFF0C\u91CD\u542F dsh web \u751F\u6548",
  "updateFailed": "\u274C \u5931\u8D25\uFF1A{err}\uFF08\u624B\u52A8\u66F4\u65B0\uFF1Adsh plugin --profile web update dsh-pocket --latest -w\uFF09",
  "versionRange": "\u5F53\u524D v{cur} \u2192 \u6700\u65B0 v{latest}",
  "lanTitle": "\u{1F4F6} \u5C40\u57DF\u7F51\uFF08\u540C\u4E00 WiFi\uFF09",
  "lanHint": "\u624B\u673A\u8FDE\u63A5\u540C\u4E00 WiFi \u540E\u626B\u7801\u5373\u53EF\u6253\u5F00",
  "lanAccess": "\u5C40\u57DF\u7F51\u8BBF\u95EE",
  "lanDisabledHint": "\u{1F512} \u5C40\u57DF\u7F51\u8BBF\u95EE\u5DF2\u5173\u95ED\uFF1A\u624B\u673A\u626B\u7801/\u94FE\u63A5\u5747\u4E0D\u53EF\u7528\uFF08\u516C\u7F51\u4E0D\u53D7\u5F71\u54CD\uFF09\u3002\u70B9\u300C\u5F00\u300D\u6062\u590D\u3002",
  "lanToggleTitleOff": "\u5173\u95ED\u5C40\u57DF\u7F51\u8BBF\u95EE",
  "lanToggleBodyOff": "\u5173\u95ED\u540E\uFF0C\u540C\u4E00 WiFi \u4E0B\u7684\u624B\u673A\u5C06\u65E0\u6CD5\u626B\u7801\u8BBF\u95EE\uFF08\u5C40\u57DF\u7F51\u4E8C\u7EF4\u7801/\u94FE\u63A5\u7ACB\u5373\u5931\u6548\uFF09\u3002\u516C\u7F51\u8BBF\u95EE\u4E0D\u53D7\u5F71\u54CD\u3002\u786E\u5B9A\u5173\u95ED\uFF1F",
  "lanToggleTitleOn": "\u5F00\u542F\u5C40\u57DF\u7F51\u8BBF\u95EE",
  "lanToggleBodyOn": "\u5F00\u542F\u540E\uFF0C\u540C\u4E00 WiFi \u7684\u624B\u673A\u626B\u7801\u5373\u53EF\u8BBF\u95EE\uFF08\u9ED8\u8BA4\u9700\u8F93\u5165\u5C40\u57DF\u7F51\u5BC6\u7801\uFF09\u3002\u786E\u5B9A\u5F00\u542F\uFF1F",
  "confirm": "\u786E\u5B9A",
  "lanAddress": "\u5C40\u57DF\u7F51\u5730\u5740",
  "lanAddressAuto": "\u81EA\u52A8\uFF08\u63A8\u8350\uFF09",
  "lanAddressHint": "\u9AD8\u7EA7\u9009\u9879\uFF1A\u4E00\u822C\u4E0D\u9700\u8981\u4FEE\u6539\uFF1B\u4F7F\u7528 Tailscale/VPN \u7B49\u8FDC\u7A0B\u8BBF\u95EE\u65F6\u53EF\u624B\u52A8\u9009\u62E9",
  "lanPin": "\u5C40\u57DF\u7F51\u8BBF\u95EE\u5BC6\u7801",
  "on": "\u5F00",
  "off": "\u5173",
  "lanPinValue": "\u{1F510} \u8BBF\u95EE\u5BC6\u7801\uFF1A{pin}\uFF08\u624B\u673A\u6253\u5F00\u9700\u8F93\u5165\uFF1B\u4E0E\u516C\u7F51\u5BC6\u7801\u5206\u5F00\uFF09",
  "lanPinCustomValue": "\u{1F510} \u8BBF\u95EE\u5BC6\u7801\uFF1A{pin}\uFF08\u81EA\u5B9A\u4E49\uFF1B\u624B\u673A\u6253\u5F00\u9700\u8F93\u5165\uFF09",
  "refresh": "\u5237\u65B0",
  "customize": "\u81EA\u5B9A\u4E49",
  "customizing": "\u65B0\u5BC6\u7801\uFF088 \u4F4D\u6570\u5B57\uFF09\uFF1A",
  "save": "\u4FDD\u5B58",
  "cancel": "\u53D6\u6D88",
  "pinInvalid": "\u5BC6\u7801\u5FC5\u987B\u662F 8 \u4F4D\u6570\u5B57",
  "pinCustomHint": "\u81EA\u5B9A\u4E49\u540E\u5F00\u542F\u516C\u7F51\u4E0D\u518D\u81EA\u52A8\u6362\u65B0",
  "lanPinOff": "\u{1F513} \u5BC6\u7801\u5DF2\u5173\u95ED\uFF1A\u626B\u7801\u76F4\u8FDE\uFF0C\u65E0\u9700\u5BC6\u7801\uFF08\u4EC5\u540C\u4E00\u5C40\u57DF\u7F51\u8BBE\u5907\u53EF\u8BBF\u95EE\uFF1B\u516C\u7F51\u4ECD\u8981\u5BC6\u7801\uFF09",
  "virtualTitle": "\u{1F310} \u865A\u62DF\u5C40\u57DF\u7F51\uFF08\u63A8\u8350\u81EA\u7528\uFF09",
  "virtualHint": "Tailscale / ZeroTier\uFF1A\u624B\u673A\u548C\u7535\u8111\u52A0\u5165\u540C\u4E00\u865A\u62DF\u7F51\u7EDC\u540E\uFF0C\u4EFB\u4F55\u7F51\u7EDC\u4E0B\u90FD\u53EF\u5B89\u5168\u8BBF\u95EE\uFF0C\u65E0\u9700\u516C\u7F51\u57DF\u540D\u3002",
  "virtualUse": "\u4E00\u952E\u9009\u7528",
  "virtualSelected": "\u6B63\u5728\u4F7F\u7528",
  "virtualRefresh": "\u91CD\u65B0\u68C0\u6D4B",
  "virtualNone": "\u672A\u68C0\u6D4B\u5230\u53EF\u7528\u7684 Tailscale \u6216 ZeroTier \u5730\u5740\u3002\u8BF7\u786E\u8BA4\u7535\u8111\u5BA2\u6237\u7AEF\u5DF2\u5B89\u88C5\u3001\u5DF2\u767B\u5F55\u5E76\u8FDE\u63A5\u7F51\u7EDC\u3002",
  "virtualPhoneHint": "\u8BF7\u786E\u8BA4\u624B\u673A\u4E5F\u5DF2\u8FDE\u63A5\u540C\u4E00\u865A\u62DF\u7F51\u7EDC\uFF0C\u518D\u626B\u63CF\u6B64\u4E8C\u7EF4\u7801\u3002",
  "virtualSafetyTitle": "\u{1F512} \u5B89\u5168\u63D0\u793A",
  "virtualSafetyBody": "\u865A\u62DF\u5C40\u57DF\u7F51\u53EA\u5141\u8BB8\u5DF2\u52A0\u5165\u7F51\u7EDC\u7684\u8BBE\u5907\u8BBF\u95EE\uFF1B\u4ECD\u5EFA\u8BAE\u4FDD\u7559 DSH PIN\uFF0C\u4F5C\u4E3A\u7B2C\u4E8C\u9053\u4FDD\u62A4\u3002",
  "virtualPinOff": "\u26A0 PIN \u5DF2\u5173\u95ED\uFF1A\u540C\u4E00\u865A\u62DF\u7F51\u7EDC\u5185\u7684\u5DF2\u6388\u6743\u8BBE\u5907\u53EF\u76F4\u63A5\u8FDB\u5165 DSH\u3002",
  "virtualPinOffTitle": "\u5173\u95ED\u865A\u62DF\u5C40\u57DF\u7F51 PIN\uFF1F",
  "virtualPinOffBody": "\u52A0\u5165\u540C\u4E00 Tailscale / ZeroTier \u7F51\u7EDC\u7684\u8BBE\u5907\u5C06\u53EF\u76F4\u63A5\u8FDB\u5165 DSH\u3002\u8BF7\u786E\u8BA4\u8FD9\u4E9B\u8BBE\u5907\u90FD\u7531\u4F60\u63A7\u5236\u3002",
  "virtualPinOffConfirm": "\u4ECD\u7136\u5173\u95ED",
  "guestTitle": "\u{1F465} \u4E34\u65F6\u8BBF\u5BA2\u8BBF\u95EE",
  "guestHint": "\u521B\u5EFA\u5E26\u6709\u6548\u671F\u7684\u72EC\u7ACB PIN\uFF1B\u53EF\u67E5\u770B\u5728\u7EBF\u72B6\u6001\u3001\u7981\u7528\u767B\u5F55\u3001\u8E22\u4E0B\u7EBF\u6216\u7ACB\u5373\u4F5C\u5E9F\u3002\u5173\u95ED\u603B\u5F00\u5173\u4F1A\u7EC8\u6B62\u5168\u90E8\u8BBF\u5BA2\u4F1A\u8BDD\u3002",
  "guestFullAccessWarning": "\u26A0 \u8BBF\u5BA2\u62E5\u6709\u5B8C\u6574 DSH \u64CD\u4F5C\u80FD\u529B\uFF0C\u4EC5\u5206\u4EAB\u7ED9\u53EF\u4FE1\u7684\u4EBA\u3002Cloudflare Access \u542F\u7528\u65F6\uFF0C\u8BBF\u5BA2\u4ECD\u9700\u5148\u901A\u8FC7\u5176\u8FB9\u7F18\u8BA4\u8BC1\u3002",
  "guestLabel": "\u5907\u6CE8\uFF08\u5982\uFF1A\u540C\u4E8B\uFF09",
  "guestMinutes": "\u5206\u949F",
  "guestHours": "\u5C0F\u65F6",
  "guestScopeBoth": "\u5168\u90E8\u5165\u53E3",
  "guestScopeLan": "\u5C40\u57DF\u7F51/\u865A\u62DF\u7F51",
  "guestScopePublic": "\u4EC5\u516C\u7F51",
  "guestCreate": "\u521B\u5EFA\u8BBF\u5BA2 PIN",
  "guestPinOnce": "\u8BF7\u7ACB\u5373\u590D\u5236\uFF1APIN \u53EA\u663E\u793A\u8FD9\u4E00\u6B21",
  "guestCopy": "\u590D\u5236 PIN",
  "guestShare": "\u5206\u4EAB\u94FE\u63A5",
  "guestShareTitle": "\u5206\u4EAB\u4E34\u65F6\u8BBF\u5BA2\u94FE\u63A5",
  "guestShareHint": "\u672C\u6B21\u751F\u6210\u4F1A\u4F7F\u6B64\u524D\u7684\u5206\u4EAB\u94FE\u63A5\u5931\u6548\uFF1BPIN \u4E0D\u4F1A\u51FA\u73B0\u5728\u94FE\u63A5\u4E2D\u3002",
  "guestShareText": "DSH Pocket \u4E34\u65F6\u8BBF\u5BA2\u8BBF\u95EE",
  "guestShareLan": "\u5C40\u57DF\u7F51 / \u865A\u62DF\u5C40\u57DF\u7F51\u94FE\u63A5",
  "guestSharePublic": "\u516C\u7F51\u94FE\u63A5",
  "guestShareFixed": "\u56FA\u5B9A\u57DF\u540D\u516C\u7F51\u94FE\u63A5",
  "guestSystemShare": "\u7CFB\u7EDF\u5206\u4EAB",
  "guestCopyLink": "\u590D\u5236\u94FE\u63A5",
  "guestShareUnavailable": "\u5F53\u524D\u6CA1\u6709\u7B26\u5408\u6388\u6743\u8303\u56F4\u7684\u53EF\u7528\u5730\u5740\uFF1B\u8BF7\u5148\u5F00\u542F\u5BF9\u5E94\u7684\u5C40\u57DF\u7F51\u6216\u516C\u7F51\u5165\u53E3\u3002",
  "guestScopeExcluded": "\u8BE5\u8BBF\u5BA2\u7684\u8BBF\u95EE\u8303\u56F4\u4E0D\u5305\u542B\u6B64\u5165\u53E3\u3002",
  "guestLanDisabled": "\u5C40\u57DF\u7F51\u8BBF\u95EE\u5DF2\u5173\u95ED\uFF0C\u5F00\u542F\u540E\u624D\u80FD\u751F\u6210\u6B64\u94FE\u63A5\u3002",
  "guestPublicDisabled": "\u516C\u7F51\u96A7\u9053\u5C1A\u672A\u8FD0\u884C\uFF1B\u5F00\u542F\u5FEB\u901F\u96A7\u9053\u6216\u56FA\u5B9A\u57DF\u540D\u540E\u4F1A\u751F\u6210\u5916\u7F51\u94FE\u63A5\u3002",
  "guestAddressUnavailable": "\u5F53\u524D\u5165\u53E3\u5730\u5740\u5C1A\u672A\u5C31\u7EEA\u3002",
  "guestCopied": "\u2713 \u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F",
  "guestCopyFailed": "\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u957F\u6309\u6216\u624B\u52A8\u9009\u62E9\u4E0A\u65B9\u94FE\u63A5\u590D\u5236\u3002",
  "guestShareSecurity": "\u{1F510} \u94FE\u63A5\u672C\u8EAB\u5C31\u662F\u4E34\u65F6\u8BBF\u95EE\u51ED\u636E\uFF0C\u8BF7\u53EA\u53D1\u7ED9\u53EF\u4FE1\u7684\u4EBA\u3002\u7ACB\u5373\u4F5C\u5E9F\u4F1A\u540C\u65F6\u8BA9 PIN\u3001\u94FE\u63A5\u548C\u73B0\u6709\u4F1A\u8BDD\u5931\u6548\u3002",
  "guestOnline": "\u5728\u7EBF {count} \u53F0",
  "guestRecent": "\u6700\u8FD1\u6D3B\u8DC3",
  "guestOffline": "\u79BB\u7EBF",
  "guestUnnamed": "\u672A\u547D\u540D\u8BBF\u5BA2",
  "guestRemaining": "\u5269\u4F59\u7EA6 {minutes} \u5206\u949F",
  "guestDisableLogin": "\u7981\u7528\u65B0\u767B\u5F55",
  "guestEnableLogin": "\u5141\u8BB8\u65B0\u767B\u5F55",
  "guestKick": "\u8E22\u4E0B\u7EBF",
  "guestRevoke": "\u7ACB\u5373\u4F5C\u5E9F",
  "lanStarting": "\u4EE3\u7406\u672A\u5C31\u7EEA\u2026",
  "wanTitle": "\u{1F310} \u516C\u7F51\uFF08\u4EBA\u5728\u5916\u9762\uFF09",
  "wanHint": "\u4EFB\u4F55\u7F51\u7EDC\u626B\u7801\u5373\u7528\uFF08URL \u6BCF\u6B21\u91CD\u542F\u81EA\u52A8\u6362\u65B0\uFF09",
  "wanPin": "\u{1F510} \u8BBF\u95EE\u5BC6\u7801\uFF1A{pin}\uFF08\u6BCF\u6B21\u5F00\u542F\u516C\u7F51\u53D8\u65B0\uFF1B\u624B\u673A\u6253\u5F00\u94FE\u63A5\u9700\u8F93\u5165\u6B64\u5BC6\u7801\uFF09",
  "wanPinCustom": "\u{1F510} \u8BBF\u95EE\u5BC6\u7801\uFF1A{pin}\uFF08\u81EA\u5B9A\u4E49\uFF0C\u5F00\u542F\u516C\u7F51\u4E0D\u518D\u81EA\u52A8\u6362\u65B0\uFF09",
  "stopTunnel": "\u5173\u95ED\u516C\u7F51",
  "enable": "\u5F00\u542F\u516C\u7F51\u8BBF\u95EE",
  "opening": "\u5F00\u542F\u4E2D\u2026",
  "disclaimerTitle": "\u26A0\uFE0F \u5B89\u5168\u514D\u8D23\u58F0\u660E",
  "disclaimerBody": "\u5F00\u542F\u516C\u7F51 = \u628A\u672C\u673A DSH\uFF08\u80FD\u6267\u884C\u4EE3\u7801\uFF09\u66B4\u9732\u5230\u4E92\u8054\u7F51\u3002\u4EFB\u4F55\u4EBA\u62FF\u5230\u516C\u7F51\u94FE\u63A5\u548C\u5BC6\u7801\uFF0C\u90FD\u80FD\u8BBF\u95EE\u751A\u81F3\u64CD\u4F5C\u4F60\u7684\u7535\u8111\u3002\u8BF7\u786E\u8BA4\uFF1A\u2460 \u4F7F\u7528\u81EA\u5B9A\u4E49\u5F3A\u5BC6\u7801\u6216\u59A5\u5584\u4FDD\u7BA1\u81EA\u52A8\u5BC6\u7801\uFF1B\u2461 \u7528\u5B8C\u7ACB\u5373\u300C\u5173\u95ED\u516C\u7F51\u300D\uFF1B\u2462 \u516C\u53F8/\u6D89\u5BC6\u7F51\u7EDC\u8BF7\u5148\u786E\u8BA4\u5408\u89C4\u3002",
  "disclaimerAgree": "\u6211\u5DF2\u77E5\u60C5\uFF0C\u540C\u610F\u5F00\u542F",
  "disclaimerHint": "\u8BF7\u52FE\u9009\u300C\u6211\u5DF2\u77E5\u60C5\u300D\u540E\u518D\u5F00\u542F\u516C\u7F51",
  "downloading": "\u23F3 \u4E0B\u8F7D cloudflared\uFF08\u9996\u6B21\u7EA6 20-50MB\uFF0C\u901A\u5E38 1-2 \u5206\u949F\uFF1B\u4E4B\u540E\u79D2\u5F00\uFF09\xB7 \u5DF2\u7B49\u5F85 {s} \u79D2",
  "connecting": "\u23F3 \u8FDE\u63A5 Cloudflare \u8FB9\u7F18\uFF08\u901A\u5E38 5-30 \u79D2\uFF09\xB7 \u5DF2\u7B49\u5F85 {s} \u79D2{suffix}",
  "slowHint": " \u2014 \u6709\u70B9\u4E45\uFF1F\u68C0\u67E5\u662F\u5426\u5F00\u7740\u4EE3\u7406/VPN\uFF08Clash TUN \u7B49\uFF09",
  "error": "\u274C \u5F00\u542F\u5931\u8D25\uFF1A{detail}\uFF08\u53EF\u91CD\u8BD5\uFF1B\u82E5\u662F\u4EE3\u7406/VPN \u95EE\u9898\u89C1 README \u6392\u969C\uFF09",
  "unknownError": "\u672A\u77E5\u9519\u8BEF",
  "feedback": "\u6709\u95EE\u9898\uFF1F\u6B22\u8FCE\u5230 GitHub Issues \u53CD\u9988 \u{1F64F}",
  // ---- 公网区块：快速隧道 / 固定域名 两个子块 ----
  "quickTitle": "\u5FEB\u901F\u96A7\u9053\uFF08\u4E34\u65F6\u5730\u5740 \xB7 \u65E0\u9700\u8D26\u53F7\uFF09",
  "quickHint": "URL \u6BCF\u6B21\u91CD\u542F\u6362\u65B0\uFF0C\u624B\u673A\u4EFB\u4F55\u7F51\u7EDC\u626B\u7801\u5373\u7528",
  "fixedTitle": "\u{1F517} \u56FA\u5B9A\u57DF\u540D\uFF08\u9700 Cloudflare \u6258\u7BA1\u57DF\u540D \xB7 \u63A8\u8350\u914D\u5408 Access\uFF09",
  "fixedSubtitle": "URL \u56FA\u5B9A\u4E0D\u53D8\uFF1B\u5EFA\u8BAE\u5F00\u542F Cloudflare Access \u505A\u8FB9\u7F18 MFA \u8BA4\u8BC1\uFF0C\u4EE3\u66FF/\u52A0\u5F3A 8 \u4F4D\u5BC6\u7801",
  // 折叠状态标签（头部一行：未配置 / 待初始化 / 已就绪 / 运行中）
  "fixedStatusUnconfigured": "\u672A\u914D\u7F6E",
  "fixedStatusPending": "\u5F85\u521D\u59CB\u5316",
  "fixedStatusReady": "\u5DF2\u5C31\u7EEA",
  "fixedStatusRunning": "\u8FD0\u884C\u4E2D",
  "fixedCollapsedHint": "\u7ED1\u5B9A\u81EA\u5DF1\u7684\u57DF\u540D\uFF0C\u516C\u7F51\u5730\u5740\u56FA\u5B9A\u4E0D\u53D8\uFF08\u70B9\u51FB\u5C55\u5F00\uFF09",
  "fixedAdvanced": "\u9AD8\u7EA7\u9009\u9879",
  "fixedAdvancedHint": "\u7EB5\u6DF1\u9632\u5FA1\u7B49\u8FDB\u9636\u8BBE\u7F6E",
  // Access 配置引导弹窗（按地点分组：CF 后台 / 插件本页 / 手机）
  "fixedGuideBtn": "\u914D\u7F6E\u5F15\u5BFC",
  "fixedGuideTitle": "Cloudflare Access \u914D\u7F6E\u5F15\u5BFC",
  "fixedGuideIntro": "\u5168\u7A0B\u5206 3 \u5904\u64CD\u4F5C\uFF1ACF \u540E\u53F0\u3001\u63D2\u4EF6\u672C\u9875\u3001\u624B\u673A\u3002\u6BCF\u6B65\u90FD\u6807\u4E86\u300C\u5728\u54EA\u64CD\u4F5C\u300D\u3002",
  "fixedGuideLocCfdash": "\u{1F4CD} CF \u540E\u53F0\uFF08\u6D4F\u89C8\u5668\u65B0\u5F00 dash.cloudflare.com\uFF0C\u7EA6 5 \u5206\u949F\uFF09",
  "fixedGuideLocPlugin": "\u{1F4CD} \u63D2\u4EF6\u672C\u9875\uFF08\u5C31\u662F\u5F53\u524D\u8FD9\u4E2A\u9875\u9762\uFF09",
  "fixedGuideLocPhone": "\u{1F4CD} \u624B\u673A\u4E0A\uFF08\u9996\u6B21\u8BBF\u95EE\u65F6\uFF09",
  "fixedGuideStep1": "\u2460 \u521B\u5EFA Access \u5E94\u7528",
  "fixedGuideStep1Detail": "Zero Trust \u2192 Access \u2192 Applications \u2192 Add an application \u2192 Self-hosted\u3002Application domain \u586B {hostname}\uFF08\u6B64\u5904\u586B\u7684\u662F\u4F60\u4FDD\u5B58\u7684\u57DF\u540D\uFF09\u3002",
  "fixedGuideStep2": "\u2461 \u6DFB\u52A0\u8EAB\u4EFD\u9A8C\u8BC1\u65B9\u5F0F\uFF08MFA\uFF09",
  "fixedGuideStep2Detail": "Zero Trust \u2192 Settings \u2192 Authentication\uFF1AEmail \u9ED8\u8BA4\u5DF2\u6709\uFF08\u90AE\u7BB1\u9A8C\u8BC1\u7801\uFF09\uFF1BTOTP \u6309\u9700\u6DFB\u52A0\uFF08\u8BA4\u8BC1\u5668 App\uFF09\u3002",
  "fixedGuideStep3": "\u2462 \u914D\u7F6E\u767B\u5F55\u7B56\u7565",
  "fixedGuideStep3Detail": "Policy \u2192 Allow\uFF1BInclude \u9009 Everyone \u6216\u9650\u5B9A\u4F60\u7684\u90AE\u7BB1\u57DF\u540D\uFF1BRequire \u52FE\u9009 One-time PIN \u548C/\u6216 TOTP\u3002",
  "fixedGuideStep4": "\u2463 \u6253\u5F00\u300CCloudflare Access\u300D\u5F00\u5173",
  "fixedGuideStep4Detail": "\u56DE\u5230\u63D2\u4EF6\u672C\u9875\uFF0C\u628A\u4E0A\u9762 Access \u5F00\u5173\u4ECE\u300C\u5173\u300D\u70B9\u6210\u300C\u5F00\u300D\u3002",
  "fixedGuideStep5": "\u2464 \u624B\u673A\u9996\u6B21\u8BBF\u95EE",
  "fixedGuideStep5Detail": "\u626B\u63D2\u4EF6\u4E8C\u7EF4\u7801\u6253\u5F00 {hostname} \u2192 Cloudflare \u767B\u5F55\u9875\u8F93\u5165\u9A8C\u8BC1\u7801 \u2192 \u8FDB\u5165 DSH\uFF08\u4E4B\u540E\u957F\u671F\u514D\u8F93\uFF09\u3002",
  "fixedGuideMfaTitle": "MFA \u65B9\u5F0F\uFF08\u4E8C\u9009\u4E00\u6216\u90FD\u8981\uFF09",
  "fixedGuideMfa1": "\u90AE\u7BB1 One-time PIN\uFF1A\u96F6\u914D\u7F6E\uFF0C\u6BCF\u6B21\u767B\u5F55\u90AE\u7BB1\u6536\u9A8C\u8BC1\u7801",
  "fixedGuideMfa2": "TOTP \u8BA4\u8BC1\u5668\uFF1A\u9996\u6B21\u767B\u5F55\u65F6 CF \u767B\u5F55\u9875\u663E\u793A\u4E8C\u7EF4\u7801\uFF0C\u7528 Google Authenticator / Authy \u626B\u7801\u7ED1\u5B9A",
  "fixedGuideQrNote": "\u6CE8\u610F\uFF1A\u63D2\u4EF6\u4E0A\u7684\u4E8C\u7EF4\u7801\u662F\u6253\u5F00 DSH \u7684\u94FE\u63A5\uFF1BMFA \u5BC6\u94A5\u4E8C\u7EF4\u7801\u7531 Cloudflare \u5728\u767B\u5F55\u9875\u751F\u6210\uFF0C\u4E24\u8005\u4E0D\u662F\u4E00\u56DE\u4E8B\u3002",
  "fixedHostnameLabel": "\u57DF\u540D",
  "fixedHostnamePlaceholder": "\u5982 dsh.example.com",
  "fixedSave": "\u4FDD\u5B58",
  "fixedSaved": "\u2713 \u5DF2\u4FDD\u5B58\uFF1A{hostname}\uFF08\u6539\u57DF\u540D\u9700\u91CD\u65B0\u300C\u521D\u59CB\u5316\u96A7\u9053\u4E0E DNS\u300D\uFF09",
  "fixedSetupWizard": "\u521D\u59CB\u5316\u5411\u5BFC",
  "fixedStep1": "\u2460 \u767B\u5F55 Cloudflare \u6388\u6743",
  "fixedStep1Done": "\u2713 \u5DF2\u6388\u6743",
  "fixedLoginBtn": "\u767B\u5F55\u6388\u6743",
  "fixedLoginHint": "\u6D4F\u89C8\u5668\u5DF2\u6253\u5F00\uFF08\u6216\u70B9\u4E0B\u65B9\u94FE\u63A5\uFF09\uFF0C\u5728 Cloudflare \u9875\u9762\u5B8C\u6210\u6388\u6743\u540E\u81EA\u52A8\u8FDB\u5165\u4E0B\u4E00\u6B65",
  "fixedOpenUrl": "\u6253\u5F00\u6388\u6743\u94FE\u63A5",
  "fixedStep2": "\u2461 \u521D\u59CB\u5316\u96A7\u9053\u4E0E DNS",
  "fixedStep2Done": "\u2713 \u96A7\u9053 + DNS \u5DF2\u5C31\u7EEA",
  "fixedSetupBtn": "\u521D\u59CB\u5316\u96A7\u9053\u4E0E DNS",
  "fixedSetupBusy": "\u521D\u59CB\u5316\u4E2D\uFF08\u5EFA\u96A7\u9053 + \u7ED1 DNS\uFF0C\u7EA6 10-30 \u79D2\uFF09\u2026",
  "fixedNeedLoginFirst": "\u8BF7\u5148\u5B8C\u6210\u7B2C \u2460 \u6B65\u767B\u5F55\u6388\u6743",
  "fixedNeedHostname": "\u8BF7\u5148\u586B\u5199\u5E76\u4FDD\u5B58\u57DF\u540D",
  "fixedNeedSetup": "\u8BF7\u5148\u5B8C\u6210\u7B2C \u2461 \u6B65\u300C\u521D\u59CB\u5316\u96A7\u9053\u4E0E DNS\u300D",
  "fixedStep3": "\u2462 \u5F00\u542F\u56FA\u5B9A\u57DF\u540D",
  "fixedEnableBtn": "\u5F00\u542F\u56FA\u5B9A\u57DF\u540D",
  "fixedRunning": "\u2705 \u56FA\u5B9A\u57DF\u540D\u8FD0\u884C\u4E2D",
  "fixedRuntimeLive": "\u25CF \u672C\u5730 cloudflared \u5DF2\u8FD0\u884C\u5E76\u8FDE\u63A5 Cloudflare\uFF08\u4EE3\u7406\u7AEF\u53E3 {port}\uFF09",
  "fixedRuntimeStopped": "\u25CB \u672C\u5730\u96A7\u9053\u672A\u8FD0\u884C\uFF1B\u57DF\u540D\u4F1A\u663E\u793A Cloudflare 1033\uFF0C\u70B9\u51FB\u300C\u5F00\u542F\u56FA\u5B9A\u57DF\u540D\u300D\u542F\u52A8",
  "fixedRuntimeDownloading": "\u25CC \u6B63\u5728\u4E0B\u8F7D cloudflared\uFF08\u5DF2\u7B49\u5F85 {s} \u79D2\uFF09",
  "fixedRuntimeStarting": "\u25CC \u6B63\u5728\u542F\u52A8\u5E76\u8FDE\u63A5 Cloudflare\uFF1A{detail}",
  "fixedRuntimeError": "\u25CF \u672C\u5730\u96A7\u9053\u542F\u52A8\u5931\u8D25\uFF1A{detail}",
  "fixedStop": "\u5173\u95ED\u56FA\u5B9A\u57DF\u540D",
  "fixedWanPin": "\u{1F510} \u8BBF\u95EE\u5BC6\u7801\uFF1A{pin}\uFF08\u56FA\u5B9A\u57DF\u540D\uFF1B\u624B\u673A\u6253\u5F00\u9700\u8F93\u5165\uFF09",
  "fixedAccessTitle": "Cloudflare Access\uFF08\u63A8\u8350 \xB7 \u8FB9\u7F18 MFA\uFF09",
  "fixedAccessHintOn": "\u5DF2\u4E3A\u8BE5\u57DF\u540D\u542F\u7528 Access\uFF1A\u672A\u8BA4\u8BC1\u8BF7\u6C42\u5728 Cloudflare \u8FB9\u7F18\u5C31\u88AB\u62E6\u622A\uFF0C\u624B\u673A\u9700\u901A\u8FC7 MFA\uFF08\u90AE\u7BB1\u9A8C\u8BC1\u7801/\u786C\u4EF6\u5BC6\u94A5\u7B49\uFF09",
  "fixedAccessHintOff": "\u672A\u542F\u7528 Access\uFF1A\u56FA\u5B9A\u57DF\u540D\u5F3A\u5236\u8981\u6C42 8 \u4F4D PIN\uFF08\u5426\u5219 DSH \u76F4\u63A5\u66B4\u9732\u516C\u7F51\uFF09",
  "fixedAccessUnverified": "\u{1F512} Access \u5C1A\u672A\u9A8C\u8BC1\uFF0CPIN \u5DF2\u5F3A\u5236\u5F00\u542F",
  "fixedAccessDocs": "Access \u914D\u7F6E\u6559\u7A0B",
  "fixedPinTitle": "\u989D\u5916\u8981\u6C42 8 \u4F4D PIN",
  "fixedPinHintOn": "Access \u4E4B\u5916\u518D\u52A0\u4E00\u9053 8 \u4F4D\u5BC6\u7801\uFF08\u7EB5\u6DF1\u9632\u5FA1\uFF09",
  "fixedPinHintOff": "\u7531 Cloudflare Access \u8D1F\u8D23\u8BA4\u8BC1\uFF08\u63A8\u8350\uFF0C\u4F53\u9A8C\u6700\u987A\uFF09",
  "fixedPinForced": "\u{1F512} \u672A\u542F\u7528 Access\uFF0C\u56FA\u5B9A\u57DF\u540D\u5FC5\u987B\u4F7F\u7528 8 \u4F4D\u8BBF\u95EE\u5BC6\u7801",
  "fixedLoginErr": "\u767B\u5F55\u5931\u8D25\uFF1A{err}"
};
var en2 = {
  "section": "Phone access",
  "title": "\u{1F4F1} Phone access",
  "subtitle": "The phone shows this exact screen, live",
  "remoteSummaryLocal": "Local access only",
  "remoteSummaryLocalDetail": "LAN / virtual LAN is available; public access is off",
  "remoteSummaryLocalFixedDetail": "Custom domain is configured; public access is currently off",
  "remoteSummaryConnecting": "Establishing public access",
  "remoteSummaryConnectingDetail": "Cloudflare Tunnel is connecting; please wait",
  "remoteSummaryOnline": "Public access is live",
  "remoteSummaryOnlineDetail": "{mode} \xB7 {host} \xB7 {access} \xB7 {pin}",
  "remoteSummaryProblem": "Public access unavailable",
  "remoteSummaryProblemDetail": "{detail}",
  "remoteModeQuick": "Quick tunnel",
  "remoteModeFixed": "Custom domain",
  "remoteAccessVerified": "Access verified",
  "remoteAccessUnverified": "Access unverified",
  "remotePinForced": "PIN enforced",
  "remotePinEnabled": "PIN enabled",
  "remotePinDisabled": "PIN off",
  "developer": "Developer: \u5C11\u5317\u6668 (shaobeichen)",
  "starAsk": "\u2B50 Drop a Star if it helped \u2014 it makes the author\u2019s day",
  "starOriginal": "Original author",
  "starFork": "My version",
  "restarted": "\u{1F504} Restarted",
  "ok": "Got it",
  "bgHint": "Running in the background (not attached to a terminal). To stop: {cmd}",
  "updatedRestart": "\u2705 Updated to v{ver} \u2014 restart to apply",
  "updateAutoRestarting": "\u2705 Updated to v{ver} \u2014 auto-restarting\u2026",
  "updatedOk": "\u2705 Updated to v{ver}",
  "updateAvailable": "\u{1F4E6} Update available: v{ver}",
  "updating": "Updating\u2026",
  "updateTo": "Update to v{ver}",
  "restartingNow": "Restarting to apply\u2026",
  "restarting": "Restarting\u2026",
  "restartNow": "\u{1F504} Restart dsh web now",
  "updatingDetail": "\u23F3 Updating (usually 1-2 min) \xB7 {s}s elapsed",
  "restartingDetail": "\u23F3 Restarting to apply (usually 10-30s) \xB7 {s}s elapsed",
  "updatedAutoDetail": "\u2705 Updated \u2014 auto-restarting in progress, refresh shortly",
  "updatedRestartDetail": "\u2705 Updated \u2014 restart dsh web to apply",
  "updateFailed": "\u274C Failed: {err} (manual update: dsh plugin --profile web update dsh-pocket --latest -w)",
  "versionRange": "Current v{cur} \u2192 latest v{latest}",
  "lanTitle": "\u{1F4F6} LAN (same Wi-Fi)",
  "lanHint": "Scan to open once your phone is on the same Wi-Fi",
  "lanAccess": "LAN access",
  "lanDisabledHint": '\u{1F512} LAN access is off \u2014 the QR code and link are unavailable (public access is unaffected). Tap "On" to restore.',
  "lanToggleTitleOff": "Turn off LAN access",
  "lanToggleBodyOff": "Once off, phones on the same Wi-Fi can no longer scan to connect (the LAN QR code and link stop working immediately). Public access is unaffected. Turn it off?",
  "lanToggleTitleOn": "Turn on LAN access",
  "lanToggleBodyOn": "Once on, phones on the same Wi-Fi can scan to connect (a LAN PIN is required by default). Turn it on?",
  "confirm": "Confirm",
  "lanAddress": "LAN address",
  "lanAddressAuto": "Auto (recommended)",
  "lanAddressHint": "Advanced option: usually no change needed; select manually when accessing through Tailscale/VPN",
  "lanPin": "LAN access PIN",
  "on": "On",
  "off": "Off",
  "lanPinValue": "\u{1F510} PIN: {pin} (required on the phone; separate from the public PIN)",
  "lanPinCustomValue": "\u{1F510} PIN: {pin} (custom; required on the phone)",
  "refresh": "Refresh",
  "customize": "Customize",
  "customizing": "New PIN (8 digits): ",
  "save": "Save",
  "cancel": "Cancel",
  "pinInvalid": "PIN must be exactly 8 digits",
  "pinCustomHint": "custom PINs are not rotated on tunnel start",
  "lanPinOff": "\u{1F513} PIN off \u2014 scan & go, no PIN (LAN devices only; public still requires PIN)",
  "virtualTitle": "\u{1F310} Virtual LAN (recommended for personal use)",
  "virtualHint": "Tailscale / ZeroTier: once the phone and computer join the same virtual network, access safely from anywhere without a public domain.",
  "virtualUse": "Use this address",
  "virtualSelected": "In use",
  "virtualRefresh": "Detect again",
  "virtualNone": "No usable Tailscale or ZeroTier address was detected. Make sure the desktop client is installed, signed in, and connected.",
  "virtualPhoneHint": "Make sure the phone is connected to the same virtual network, then scan this QR code.",
  "virtualSafetyTitle": "\u{1F512} Security note",
  "virtualSafetyBody": "Only devices that joined this virtual network can access it. Keeping the DSH PIN adds a second layer of protection.",
  "virtualPinOff": "\u26A0 PIN is off: authorized devices in this virtual network can enter DSH directly.",
  "virtualPinOffTitle": "Turn off the Virtual LAN PIN?",
  "virtualPinOffBody": "Devices that joined the same Tailscale / ZeroTier network can enter DSH directly. Confirm that you control all of those devices.",
  "virtualPinOffConfirm": "Turn off anyway",
  "guestTitle": "\u{1F465} Temporary guest access",
  "guestHint": "Create expiring PINs, see activity, disable sign-ins, sign sessions out, or revoke access. Turning this feature off ends all guest sessions.",
  "guestFullAccessWarning": "\u26A0 Guests have full DSH capabilities. Share only with people you trust. With Cloudflare Access enabled, guests must pass edge authentication first.",
  "guestLabel": "Label (e.g. coworker)",
  "guestMinutes": "minutes",
  "guestHours": "hours",
  "guestScopeBoth": "All entrances",
  "guestScopeLan": "LAN / virtual LAN",
  "guestScopePublic": "Public only",
  "guestCreate": "Create guest PIN",
  "guestPinOnce": "Copy now: this PIN is shown only once",
  "guestCopy": "Copy PIN",
  "guestShare": "Share link",
  "guestShareTitle": "Share temporary guest access",
  "guestShareHint": "Generating this link invalidates the previous share link. The PIN is not included in the URL.",
  "guestShareText": "Temporary DSH Pocket guest access",
  "guestShareLan": "LAN / virtual LAN link",
  "guestSharePublic": "Public link",
  "guestShareFixed": "Fixed-domain public link",
  "guestSystemShare": "Share",
  "guestCopyLink": "Copy link",
  "guestShareUnavailable": "No matching address is available. Enable the corresponding LAN or public entrance first.",
  "guestScopeExcluded": "This entrance is outside the guest grant scope.",
  "guestLanDisabled": "LAN access is off. Enable it to create this link.",
  "guestPublicDisabled": "No public tunnel is running. Start a quick tunnel or fixed domain to create an external link.",
  "guestAddressUnavailable": "This entrance address is not ready yet.",
  "guestCopied": "\u2713 Copied to clipboard",
  "guestCopyFailed": "Copy failed. Long-press or select the link above and copy it manually.",
  "guestShareSecurity": "\u{1F510} The link itself is a temporary credential. Share it only with someone you trust. Revoking access invalidates the PIN, link, and active sessions.",
  "guestOnline": "{count} online",
  "guestRecent": "Recently active",
  "guestOffline": "Offline",
  "guestUnnamed": "Unnamed guest",
  "guestRemaining": "About {minutes} minutes left",
  "guestDisableLogin": "Disable sign-ins",
  "guestEnableLogin": "Allow sign-ins",
  "guestKick": "Sign out",
  "guestRevoke": "Revoke now",
  "lanStarting": "Proxy starting\u2026",
  "wanTitle": "\u{1F310} Anywhere (public)",
  "wanHint": "Scan from any network (the URL changes on every restart)",
  "wanPin": "\u{1F510} PIN: {pin} (changes each time the tunnel is enabled; required on the phone)",
  "wanPinCustom": "\u{1F510} PIN: {pin} (custom \u2014 not rotated on tunnel start)",
  "stopTunnel": "Stop",
  "enable": "Enable anywhere",
  "opening": "Enabling\u2026",
  "disclaimerTitle": "\u26A0\uFE0F Security disclaimer",
  "disclaimerBody": "Enabling public access exposes this computer\u2019s DSH (which can execute code) to the internet. Anyone with the public link and PIN can reach \u2014 and operate \u2014 your computer. Please confirm: \u2460 use a strong custom PIN or keep the auto-generated one safe; \u2461 turn public access OFF as soon as you\u2019re done; \u2462 on a corporate/classified network, confirm compliance first.",
  "disclaimerAgree": "I understand and agree",
  "disclaimerHint": 'Check "I understand" before enabling public access',
  "downloading": "\u23F3 Downloading cloudflared (first run ~20-50MB, usually 1-2 min; instant afterward) \xB7 {s}s elapsed",
  "connecting": "\u23F3 Connecting to Cloudflare edge (usually 5-30s) \xB7 {s}s elapsed{suffix}",
  "slowHint": " \u2014 taking long? Check for a proxy/VPN (e.g., Clash TUN)",
  "error": "\u274C Failed to enable: {detail} (you can retry; for proxy/VPN issues see the README)",
  "unknownError": "unknown error",
  "feedback": "\u{1F64F} Questions? Open an issue on GitHub",
  // ---- Public block: quick tunnel / fixed domain ----
  "quickTitle": "Quick tunnel (temporary \xB7 no account needed)",
  "quickHint": "The URL changes on every restart; scan from any network",
  "fixedTitle": "\u{1F517} Fixed domain (needs a Cloudflare-hosted domain \xB7 Access recommended)",
  "fixedSubtitle": "The URL never changes; enable Cloudflare Access for edge MFA \u2014 it replaces or strengthens the 8-digit PIN",
  // Collapsed status label (header row: unconfigured / pending / ready / running)
  "fixedStatusUnconfigured": "Not configured",
  "fixedStatusPending": "Setup pending",
  "fixedStatusReady": "Ready",
  "fixedStatusRunning": "Running",
  "fixedCollapsedHint": "Bind your own domain for a permanent public URL (click to expand)",
  "fixedAdvanced": "Advanced options",
  "fixedAdvancedHint": "Defense-in-depth and other advanced settings",
  // Access setup guide modal (grouped by location: CF dashboard / plugin page / phone)
  "fixedGuideBtn": "Setup guide",
  "fixedGuideTitle": "Cloudflare Access setup guide",
  "fixedGuideIntro": "The whole flow happens in 3 places: the Cloudflare Dashboard, this plugin page, and your phone. Every step says where.",
  "fixedGuideLocCfdash": "\u{1F4CD} Cloudflare Dashboard (new tab: dash.cloudflare.com, ~5 min)",
  "fixedGuideLocPlugin": "\u{1F4CD} This plugin page (the page you\u2019re on)",
  "fixedGuideLocPhone": "\u{1F4CD} On your phone (first visit)",
  "fixedGuideStep1": "\u2460 Create an Access application",
  "fixedGuideStep1Detail": "Zero Trust \u2192 Access \u2192 Applications \u2192 Add an application \u2192 Self-hosted. Set Application domain to {hostname} (the hostname you saved).",
  "fixedGuideStep2": "\u2461 Add identity providers (MFA)",
  "fixedGuideStep2Detail": "Zero Trust \u2192 Settings \u2192 Authentication: Email is enabled by default (email code); add TOTP if you want an authenticator app.",
  "fixedGuideStep3": "\u2462 Configure the access policy",
  "fixedGuideStep3Detail": "Policy \u2192 Allow; Include: Everyone or restrict to your email domain; Require: check One-time PIN and/or TOTP.",
  "fixedGuideStep4": "\u2463 Turn the Cloudflare Access switch on",
  "fixedGuideStep4Detail": "Back on this plugin page, flip the Access switch above from off to on.",
  "fixedGuideStep5": "\u2464 First visit from the phone",
  "fixedGuideStep5Detail": "Scan the plugin QR code to open {hostname} \u2192 enter the code on the Cloudflare sign-in page \u2192 you\u2019re in (stays signed in afterward).",
  "fixedGuideMfaTitle": "MFA methods (pick one or both)",
  "fixedGuideMfa1": "Email One-time PIN: zero setup, a verification code arrives by email each sign-in",
  "fixedGuideMfa2": "TOTP authenticator: on first sign-in the Cloudflare login page shows a QR code \u2014 scan it with Google Authenticator / Authy",
  "fixedGuideQrNote": "Note: the QR code in this plugin opens DSH; the MFA secret QR code is generated by Cloudflare on its login page. They are not the same.",
  "fixedHostnameLabel": "Hostname",
  "fixedHostnamePlaceholder": "e.g. dsh.example.com",
  "fixedSave": "Save",
  "fixedSaved": '\u2713 Saved: {hostname} (re-run "Initialize tunnel & DNS" after changing it)',
  "fixedSetupWizard": "Setup wizard",
  "fixedStep1": "\u2460 Log in to Cloudflare",
  "fixedStep1Done": "\u2713 Authorized",
  "fixedLoginBtn": "Log in",
  "fixedLoginHint": "The browser opened (or use the link below); authorize in Cloudflare and the wizard continues automatically",
  "fixedOpenUrl": "Open authorization link",
  "fixedStep2": "\u2461 Initialize tunnel & DNS",
  "fixedStep2Done": "\u2713 Tunnel + DNS ready",
  "fixedSetupBtn": "Initialize tunnel & DNS",
  "fixedSetupBusy": "Initializing (create tunnel + route DNS, ~10-30s)\u2026",
  "fixedNeedLoginFirst": "Finish step \u2460 (Cloudflare login) first",
  "fixedNeedHostname": "Set and save a hostname first",
  "fixedNeedSetup": 'Finish step \u2461 "Initialize tunnel & DNS" first',
  "fixedStep3": "\u2462 Enable the fixed domain",
  "fixedEnableBtn": "Enable fixed domain",
  "fixedRunning": "\u2705 Fixed domain is live",
  "fixedRuntimeLive": "\u25CF Local cloudflared is running and connected to Cloudflare (proxy port {port})",
  "fixedRuntimeStopped": "\u25CB Local tunnel is stopped; the domain will show Cloudflare 1033. Select \u201CEnable fixed domain\u201D to start it.",
  "fixedRuntimeDownloading": "\u25CC Downloading cloudflared ({s}s elapsed)",
  "fixedRuntimeStarting": "\u25CC Starting and connecting to Cloudflare: {detail}",
  "fixedRuntimeError": "\u25CF Local tunnel failed to start: {detail}",
  "fixedStop": "Stop fixed domain",
  "fixedWanPin": "\u{1F510} PIN: {pin} (fixed domain; required on the phone)",
  "fixedAccessTitle": "Cloudflare Access (recommended \xB7 edge MFA)",
  "fixedAccessHintOn": "Access is enabled for this hostname: unauthenticated requests are blocked at the Cloudflare edge; the phone signs in with MFA (email code / hardware key, etc.)",
  "fixedAccessHintOff": "Access is off: the fixed domain requires an 8-digit PIN (otherwise DSH would be exposed directly to the internet)",
  "fixedAccessUnverified": "\u{1F512} Access is not verified \u2014 the PIN is enforced",
  "fixedAccessDocs": "Access setup guide",
  "fixedPinTitle": "Also require an 8-digit PIN",
  "fixedPinHintOn": "An extra PIN on top of Access (defense in depth)",
  "fixedPinHintOff": "Cloudflare Access handles authentication (recommended, smoothest UX)",
  "fixedPinForced": "\u{1F512} Access is off \u2014 the fixed domain must use an 8-digit PIN",
  "fixedLoginErr": "Login failed: {err}"
};

// client/index.jsx
var name = "dsh-pocket";
var inject = ["slots", "connection", "layout", "locale", "sessionLogDownload"];
function fmt(t, key, vars) {
  let s = t(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = String(s).split(`{${k}}`).join(String(v));
    }
  }
  return s;
}
var styles = {
  card: { background: "var(--dsw-alias-bg-layer-1,#fff)", border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", borderRadius: 12, padding: "16px 20px", maxWidth: 480 },
  block: { borderTop: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", marginTop: 16, paddingTop: 16 },
  muted: { color: "var(--dsw-alias-label-tertiary,#8b93a1)", fontSize: 12, lineHeight: 1.5 },
  code: { fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12, wordBreak: "break-all", margin: "6px 0 10px", color: "var(--dsw-alias-label-primary,inherit)" },
  // 主按钮：官方 md 胶囊形（36px）
  primary: { font: "inherit", cursor: "pointer", border: "none", background: "var(--dsw-alias-button-primary-fill, var(--dsw-alias-brand-primary,#4f6ef7))", color: "var(--dsw-alias-label-primary-foreground, #fff)", height: 36, padding: "0 16px", borderRadius: 999, fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", justifyContent: "center" },
  // 次级按钮：官方 outline/ghost 胶囊形
  btn: { font: "inherit", cursor: "pointer", border: "1px solid var(--dsw-alias-button-ghost-active-border, var(--dsw-alias-border-l2,#d1d5db))", background: "var(--dsw-alias-bg-layer-1,#fff)", color: "var(--dsw-alias-label-primary,inherit)", height: 36, padding: "0 16px", borderRadius: 999, fontSize: 13, display: "inline-flex", alignItems: "center", justifyContent: "center" },
  qr: { width: 220, height: 220, borderRadius: 10, border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", margin: "8px 0" },
  warn: { color: "var(--dsw-alias-state-warn-primary,#b45309)", fontSize: 12, lineHeight: 1.5 }
};
function publicAccessState(status) {
  const phase = status?.tunnelState?.phase ?? "idle";
  const fixed = status?.fixed ?? {};
  const fixedConfigured = Boolean(fixed.hostname && fixed.setup?.tunnel && fixed.setup?.dns);
  if (status?.tunnelRunning && phase === "ready") return { kind: "online" };
  if (["downloading", "starting", "registering", "checking"].includes(phase)) return { kind: "connecting" };
  if (phase === "error") return { kind: "problem", detail: status?.tunnelState?.detail };
  if (fixedConfigured) return { kind: "local", detail: "fixed-stopped" };
  return { kind: "local" };
}
function publicStateColor(kind) {
  return { local: "#8b93a1", connecting: "#b45309", online: "#15803d", problem: "#dc2626" }[kind] ?? "#8b93a1";
}
function publicStateLabel(t, kind) {
  return kind === "online" ? t("remoteSummaryOnline") : kind === "connecting" ? t("remoteSummaryConnecting") : kind === "problem" ? t("remoteSummaryProblem") : t("remoteSummaryLocal");
}
function installPublicAccessIndicators(ctx, rpcCall, t) {
  let latest = { kind: "local" };
  const entryText = (node) => {
    const clone = node.cloneNode(true);
    clone.querySelectorAll("[data-dsh-pocket-status],[data-dsh-pocket-status-text]").forEach((item) => item.remove());
    return (clone.textContent ?? "").trim();
  };
  const candidates = (labels) => Array.from(document.querySelectorAll('button,[role="button"]')).filter((node) => labels.includes(entryText(node)));
  const paint = (node, id) => {
    if (!node || !node.isConnected) return;
    let dot = node.querySelector(`:scope > [data-dsh-pocket-status="${id}"]`);
    if (!dot) {
      dot = document.createElement("span");
      dot.dataset.dshPocketStatus = id;
      dot.setAttribute("aria-hidden", "true");
      dot.style.cssText = "display:inline-block;width:8px;height:8px;border-radius:50%;margin-left:7px;vertical-align:middle;flex:0 0 auto;";
      node.appendChild(dot);
    }
    const label = publicStateLabel(t, latest.kind);
    dot.style.background = publicStateColor(latest.kind);
    dot.title = label;
    node.querySelector(`:scope > [data-dsh-pocket-status-text="${id}"]`)?.remove();
  };
  const render = () => {
    for (const node of candidates([t("section"), "Phone access"])) paint(node, "phone-nav");
    for (const node of candidates(["\u8BBE\u7F6E", "Settings"])) paint(node, "global-settings");
  };
  const refresh = async () => {
    try {
      const result = await rpcCall(POCKET_ENDPOINTS.status, {});
      if (result?.ok) latest = publicAccessState(result.value);
    } catch {
    }
    render();
  };
  ctx.effect(() => {
    refresh();
    const observer = new MutationObserver(render);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    const timer = setInterval(refresh, 3e3);
    return () => {
      observer.disconnect();
      clearInterval(timer);
    };
  }, "dsh-pocket: public access status indicators");
}
function PocketSettingsTab({ rpcCall, t }) {
  const [status, setStatus] = (0, import_react2.useState)(null);
  const [busy, setBusy] = (0, import_react2.useState)(false);
  const [error, setError] = (0, import_react2.useState)(null);
  const [tunnelState, setTunnelState] = (0, import_react2.useState)(null);
  const [restartNotice, setRestartNotice] = (0, import_react2.useState)(false);
  const [updateInfo, setUpdateInfo] = (0, import_react2.useState)(null);
  const [isDesktop, setIsDesktop] = (0, import_react2.useState)(false);
  const [now, setNow] = (0, import_react2.useState)(Date.now());
  const [guestForm, setGuestForm] = (0, import_react2.useState)({ label: "", durationMinutes: 60, scope: "both" });
  const [newGuestPin, setNewGuestPin] = (0, import_react2.useState)(null);
  const [guestShare, setGuestShare] = (0, import_react2.useState)(null);
  const [copyNotice, setCopyNotice] = (0, import_react2.useState)("");
  (0, import_react2.useEffect)(() => {
    const t2 = setInterval(() => setNow(Date.now()), 1e3);
    return () => clearInterval(t2);
  }, []);
  const elapsed = (startedAt) => startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1e3)) : 0;
  const call = async (endpoint, payload) => {
    const res = await rpcCall(endpoint, payload);
    if (!res?.ok) throw new Error(res?.error?.message ?? "RPC failed");
    return res.value;
  };
  const load = async () => {
    try {
      const s = await call(POCKET_ENDPOINTS.status, {});
      setStatus(s);
      setTunnelState(s.tunnelState ?? null);
      setFixedHostnameInput((cur) => cur === "" ? s.fixed?.hostname ?? "" : cur);
      if (s.desktop) setIsDesktop(true);
      if (s.restartNotice) {
        setRestartNotice(true);
        setUpdateInfo(null);
        if (!sessionStorage.getItem("dshp-auto-reloaded")) {
          sessionStorage.setItem("dshp-auto-reloaded", "1");
          setTimeout(() => {
            try {
              location.reload();
            } catch {
            }
          }, 2e3);
        }
      }
    } catch {
    }
  };
  (0, import_react2.useEffect)(() => {
    load();
    const t2 = setInterval(load, 3e3);
    return () => clearInterval(t2);
  }, []);
  (0, import_react2.useEffect)(() => {
    try {
      sessionStorage.removeItem("dshp-auto-reloaded");
    } catch {
    }
  }, []);
  (0, import_react2.useEffect)(() => {
    if (isDesktop) return;
    let alive = true;
    const check = async () => {
      try {
        const v = await call(POCKET_ENDPOINTS.version, {});
        const meta = await (await fetch("https://registry.npmjs.org/dsh-pocket/latest", { cache: "no-store" })).json();
        if (!alive) return;
        const latest = typeof meta?.version === "string" ? meta.version : null;
        if (latest && v.current && compareVersions(latest, v.current) > 0) {
          setUpdateInfo({ current: v.current, latest, updating: false, result: null });
        } else if (v.current && v.loaded && compareVersions(v.current, v.loaded) > 0) {
          setUpdateInfo({ current: v.current, latest: v.current, updating: false, result: "ok", updated: true });
        }
      } catch {
      }
    };
    check();
    const t2 = setInterval(check, 5 * 60 * 1e3);
    return () => {
      alive = false;
      clearInterval(t2);
    };
  }, [isDesktop]);
  const restartPocket = async () => {
    setUpdateInfo((u) => ({ ...u, restarting: true, startedAt: Date.now() }));
    try {
      await Promise.race([
        call(POCKET_ENDPOINTS.restart, {}),
        new Promise((_, rej) => setTimeout(() => rej(new Error("restart requested (no reply within 3s)")), 3e3))
      ]);
      setUpdateInfo((u) => ({ ...u, restarting: true, result: "ok" }));
    } catch (err) {
      const msg = String(err?.message ?? "");
      if (/connection|socket|fetch|network|abort|cancelled|ECONN|disconnect|closed|timeout/i.test(msg)) {
        setUpdateInfo((u) => ({ ...u, restarting: true, result: "ok" }));
        return;
      }
      setUpdateInfo((u) => ({ ...u, restarting: false, result: "fail", output: err.message }));
    }
  };
  const runUpdate = async () => {
    setUpdateInfo((u) => ({ ...u, updating: true, result: null, startedAt: Date.now() }));
    try {
      const r = await call(POCKET_ENDPOINTS.update, {});
      setUpdateInfo((u) => ({
        ...u,
        updating: false,
        result: r.ok ? "ok" : "fail",
        autoRestart: r.autoRestart === true,
        output: r.output ?? r.error
      }));
    } catch (err) {
      setUpdateInfo((u) => ({ ...u, updating: false, result: "fail", output: err.message }));
    }
  };
  const [disclaimerOpen, setDisclaimerOpen] = (0, import_react2.useState)(false);
  const [disclaimerChecked, setDisclaimerChecked] = (0, import_react2.useState)(false);
  const [disclaimerMode, setDisclaimerMode] = (0, import_react2.useState)("quick");
  const doStartTunnel = async () => {
    setBusy(true);
    setError(null);
    setTunnelState({ phase: "starting", detail: "\u6B63\u5728\u5F00\u542F\u2026", startedAt: Date.now() });
    try {
      setStatus(await call(POCKET_ENDPOINTS.tunnelStart, { disclaimer: true }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const startTunnel = () => {
    setDisclaimerMode("quick");
    setDisclaimerChecked(false);
    setDisclaimerOpen(true);
  };
  const confirmDisclaimer = () => {
    if (!disclaimerChecked) return;
    setDisclaimerOpen(false);
    if (disclaimerMode === "fixed") doStartFixedTunnel();
    else doStartTunnel();
  };
  const stopTunnel = async () => {
    try {
      setStatus(await call(POCKET_ENDPOINTS.tunnelStop, {}));
    } catch {
    }
  };
  const [fixedHostnameInput, setFixedHostnameInput] = (0, import_react2.useState)("");
  const [fixedBusy, setFixedBusy] = (0, import_react2.useState)(false);
  const [fixedStarting, setFixedStarting] = (0, import_react2.useState)(false);
  const [fixedOpen, setFixedOpen] = (0, import_react2.useState)(false);
  const [fixedAdvOpen, setFixedAdvOpen] = (0, import_react2.useState)(false);
  const [fixedGuideOpen, setFixedGuideOpen] = (0, import_react2.useState)(false);
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
  const startFixedTunnel = () => {
    setDisclaimerMode("fixed");
    setDisclaimerChecked(false);
    setDisclaimerOpen(true);
  };
  const doStartFixedTunnel = async () => {
    setFixedBusy(true);
    setFixedStarting(true);
    setError(null);
    setTunnelState({ phase: "starting", detail: "\u6B63\u5728\u5F00\u542F\u56FA\u5B9A\u57DF\u540D\u2026", startedAt: Date.now() });
    try {
      setStatus(await call(POCKET_ENDPOINTS.tunnelStart, { disclaimer: true, mode: "fixed" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setFixedBusy(false);
      setFixedStarting(false);
    }
  };
  const setFixedAccess = async (on) => {
    try {
      setStatus(await call(POCKET_ENDPOINTS.fixedSetAccess, { on }));
    } catch (err) {
      setError(err.message);
    }
  };
  const setFixedPinAlways = async (on) => {
    try {
      setStatus(await call(POCKET_ENDPOINTS.fixedSetPinAlways, { on }));
    } catch (err) {
      setError(err.message);
    }
  };
  const refreshLanPin = async () => {
    try {
      const r = await call(POCKET_ENDPOINTS.lanTokenRefresh, {});
      setStatus((s) => ({ ...s, lanToken: r.lanToken }));
    } catch {
    }
  };
  const setLanAuth = async (on) => {
    try {
      const r = await call(POCKET_ENDPOINTS.lanAuthSetEnabled, { on });
      setStatus((s) => ({ ...s, lanAuthEnabled: r.lanAuthEnabled }));
    } catch {
    }
  };
  const [virtualPinOffOpen, setVirtualPinOffOpen] = (0, import_react2.useState)(false);
  const [lanToggleOpen, setLanToggleOpen] = (0, import_react2.useState)(null);
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
  const guestAction = async (endpoint, payload = {}) => {
    try {
      const r = await call(endpoint, payload);
      setStatus((s) => ({ ...s, guestAccess: r?.grants ? r : s?.guestAccess }));
      return r;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };
  const createGuest = async () => {
    const r = await guestAction(POCKET_ENDPOINTS.guestCreate, guestForm);
    if (r?.pin) {
      setCopyNotice("");
      setNewGuestPin({ pin: r.pin, expiresAt: r.grant.expiresAt });
      setStatus((s) => ({ ...s, guestAccess: { ...s?.guestAccess ?? {}, grants: [...s?.guestAccess?.grants ?? [], r.grant] } }));
      setGuestForm((f) => ({ ...f, label: "" }));
    }
  };
  const createGuestShare = async (grant) => {
    const r = await guestAction(POCKET_ENDPOINTS.guestCreateInvite, { id: grant.id });
    if (!r?.secret) return;
    const links = [];
    const add = (kind, label, base, available, reason) => {
      let url = "";
      if (available && base) {
        try {
          url = `${new URL("/pocket-invite", base).toString()}#invite=${encodeURIComponent(r.secret)}`;
        } catch {
        }
      }
      links.push({ kind, label, url, available: !!url, reason });
    };
    const lanAllowed = grant.scope !== "public";
    const publicAllowed = grant.scope !== "lan";
    add(
      "lan",
      t("guestShareLan"),
      status?.lanUrl,
      lanAllowed && status?.lanEnabled !== false && !!status?.lanUrl,
      !lanAllowed ? t("guestScopeExcluded") : status?.lanEnabled === false ? t("guestLanDisabled") : t("guestAddressUnavailable")
    );
    add(
      "public",
      status?.tunnelMode === "fixed" ? t("guestShareFixed") : t("guestSharePublic"),
      status?.tunnelUrl,
      publicAllowed && status?.tunnelRunning === true && !!status?.tunnelUrl,
      !publicAllowed ? t("guestScopeExcluded") : t("guestPublicDisabled")
    );
    setCopyNotice("");
    setGuestShare({ grant, links });
  };
  const copyText = async (value) => {
    try {
      if (navigator.clipboard?.writeText && globalThis.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const area = document.createElement("textarea");
        area.value = value;
        area.setAttribute("readonly", "");
        area.style.cssText = "position:fixed;left:-9999px;top:0";
        document.body.appendChild(area);
        area.select();
        area.setSelectionRange(0, area.value.length);
        const copied = document.execCommand("copy");
        document.body.removeChild(area);
        if (!copied) throw new Error("copy unavailable");
      }
      setCopyNotice(t("guestCopied"));
      return true;
    } catch {
      setCopyNotice(t("guestCopyFailed"));
      return false;
    }
  };
  const shareGuestLink = async (item) => {
    try {
      if (navigator.share) await navigator.share({ title: t("guestShareTitle"), text: t("guestShareText"), url: item.url });
      else await copyText(item.url);
    } catch {
    }
  };
  const [customPin, setCustomPin] = (0, import_react2.useState)(null);
  const saveCustomPin = async (which) => {
    try {
      const r = await call(POCKET_ENDPOINTS.pinSetCustom, { which, value: customPin?.value ?? "" });
      setStatus((s) => ({
        ...s,
        accessToken: which === "public" ? r.pin : s.accessToken,
        lanToken: which === "lan" ? r.pin : s.lanToken,
        publicPinCustom: which === "public" ? true : s.publicPinCustom,
        lanPinCustom: which === "lan" ? true : s.lanPinCustom
      }));
      setCustomPin(null);
    } catch (err) {
      setCustomPin((c) => ({ ...c, err: err.message }));
    }
  };
  const customPinRow = (which) => (0, import_react2.createElement)(
    "div",
    { style: { marginTop: 6, fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)", lineHeight: 1.5 } },
    t("customizing"),
    (0, import_react2.createElement)("input", {
      style: { width: 110, margin: "0 6px", padding: "4px 8px", fontSize: 14, letterSpacing: 2, textAlign: "center", border: "1px solid var(--dsw-alias-border-l2,#d1d5db)", borderRadius: 6, outline: "none" },
      type: "password",
      inputMode: "numeric",
      maxLength: 8,
      value: customPin?.value ?? "",
      autoFocus: true,
      onChange: (e) => setCustomPin((c) => ({ ...c, value: e.target.value.replace(/\D/g, ""), err: null })),
      onKeyDown: (e) => {
        if (e.key === "Enter") saveCustomPin(which);
        if (e.key === "Escape") setCustomPin(null);
      }
    }),
    (0, import_react2.createElement)("button", { style: { ...styles.btn, height: 26, padding: "0 10px", fontSize: 12, marginLeft: 2 }, onClick: () => saveCustomPin(which) }, t("save")),
    (0, import_react2.createElement)("button", { style: { ...styles.btn, height: 26, padding: "0 10px", fontSize: 12 }, onClick: () => setCustomPin(null) }, t("cancel")),
    customPin?.err ? (0, import_react2.createElement)("div", { style: { color: "var(--dsw-alias-state-error-primary,#dc2626)", marginTop: 4 } }, customPin.err) : null
  );
  const customBtn = (which) => (0, import_react2.createElement)("button", { style: { ...styles.btn, height: 26, padding: "0 10px", fontSize: 12, marginLeft: 8 }, onClick: () => setCustomPin({ which, value: "", err: null }) }, t("customize"));
  const lanUrl = status?.lanUrl;
  const virtualNetworks = status?.virtualNetworks || [];
  const activeVirtualNetwork = virtualNetworks.find((network) => network.ip === status?.lanIpOverride) ?? null;
  const requestLanAuth = (on) => {
    if (!on && activeVirtualNetwork) setVirtualPinOffOpen(true);
    else void setLanAuth(on);
  };
  const tunnelUrl = status?.tunnelUrl;
  const tunnelPhase = tunnelState?.phase ?? "idle";
  const tunnelStarting = ["downloading", "starting", "registering"].includes(tunnelPhase);
  const tunnelStateDetail = tunnelState?.detail ?? "";
  const tunnelStateStarted = tunnelState?.startedAt ?? null;
  const tunnelMode = status?.tunnelMode ?? null;
  const fixedInfo = status?.fixed ?? { hostname: "", accessEnabled: false, pinAlways: false, accessCheck: { state: "not-requested", detail: "" }, setup: { cert: false, tunnel: false, dns: false } };
  const fHostname = fixedInfo.hostname ?? "";
  const fCert = fixedInfo.setup?.cert === true;
  const fTunnel = fixedInfo.setup?.tunnel === true;
  const fDns = fixedInfo.setup?.dns === true;
  const fAccess = fixedInfo.accessEnabled === true;
  const fAccessVerified = fixedInfo.accessCheck?.state === "verified";
  const fAccessCheckDetail = fixedInfo.accessCheck?.detail ?? "";
  const fPinAlways = fixedInfo.pinAlways === true;
  const fixedRunning = tunnelMode === "fixed" && Boolean(tunnelUrl);
  const quickRunning = tunnelMode !== "fixed" && Boolean(tunnelUrl);
  const fixedPinRequired = !fAccess || !fAccessVerified || fPinAlways;
  const fixedStatus = !fHostname ? "unconfigured" : fixedRunning ? "running" : fTunnel && fDns ? "ready" : "pending";
  const fixedStatusLabel = fixedStatus === "unconfigured" ? t("fixedStatusUnconfigured") : fixedStatus === "running" ? t("fixedStatusRunning") : fixedStatus === "ready" ? t("fixedStatusReady") : t("fixedStatusPending");
  const fixedStatusColor = fixedStatus === "unconfigured" ? "var(--dsw-alias-label-tertiary,#8b93a1)" : fixedStatus === "running" ? "var(--dsw-alias-state-success-primary,#15803d)" : fixedStatus === "ready" ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-state-warn-primary,#b45309)";
  const remoteState = publicAccessState(status);
  let remoteHost = "\u2014";
  if (tunnelMode === "fixed") remoteHost = fHostname;
  else if (tunnelUrl) {
    try {
      remoteHost = new URL(tunnelUrl).host;
    } catch {
      remoteHost = tunnelUrl;
    }
  }
  const remoteSummaryDetail = remoteState.kind === "online" ? fmt(t, "remoteSummaryOnlineDetail", {
    mode: tunnelMode === "fixed" ? t("remoteModeFixed") : t("remoteModeQuick"),
    host: remoteHost,
    access: fAccess ? fAccessVerified ? t("remoteAccessVerified") : t("remoteAccessUnverified") : t("remoteAccessUnverified"),
    pin: fixedPinRequired ? t("remotePinForced") : t("remotePinDisabled")
  }) : remoteState.kind === "connecting" ? t("remoteSummaryConnectingDetail") : remoteState.kind === "problem" ? fmt(t, "remoteSummaryProblemDetail", { detail: remoteState.detail || t("fixedRuntimeStopped") }) : remoteState.detail === "fixed-stopped" ? t("remoteSummaryLocalFixedDetail") : t("remoteSummaryLocalDetail");
  return (0, import_react2.createElement)(
    "div",
    { style: styles.card },
    (0, import_react2.createElement)(
      "div",
      { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
      (0, import_react2.createElement)(
        "div",
        null,
        (0, import_react2.createElement)("strong", null, t("title")),
        (0, import_react2.createElement)("div", { style: styles.muted }, t("subtitle"))
      ),
      (0, import_react2.createElement)(
        "div",
        { style: { fontSize: 12, color: "var(--dsw-alias-label-tertiary,#8b93a1)", textAlign: "right" } },
        (0, import_react2.createElement)("div", { style: { whiteSpace: "nowrap" } }, t("developer")),
        (0, import_react2.createElement)("div", { style: { whiteSpace: "nowrap" } }, t("starAsk")),
        (0, import_react2.createElement)(
          "span",
          { style: { display: "inline-flex", gap: 6, alignItems: "center" } },
          (0, import_react2.createElement)("a", { href: "https://github.com/shaobeichen/dsh-pocket", target: "_blank", rel: "noreferrer", style: { color: "var(--dsw-alias-brand-primary,#4f6ef7)", fontSize: 12, lineHeight: 1.6, textDecoration: "underline" } }, t("starOriginal")),
          (0, import_react2.createElement)("span", null, "\xB7"),
          (0, import_react2.createElement)("a", { href: "https://github.com/hanjiangfly/dsh-pocket", target: "_blank", rel: "noreferrer", style: { color: "var(--dsw-alias-brand-primary,#4f6ef7)", fontSize: 12, lineHeight: 1.6, textDecoration: "underline" } }, t("starFork"))
        )
      )
    ),
    // 保底层：官方 settings.section 插槽内的常驻状态摘要。
    (0, import_react2.createElement)(
      "div",
      { style: { ...styles.block, borderLeft: `4px solid ${publicStateColor(remoteState.kind)}`, borderRadius: 8, background: "var(--dsw-alias-bg-layer-2,#f7f7f8)", padding: "10px 12px" } },
      (0, import_react2.createElement)(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 7, fontWeight: 600, fontSize: 13 } },
        (0, import_react2.createElement)("span", { style: { width: 8, height: 8, borderRadius: "50%", background: publicStateColor(remoteState.kind), display: "inline-block", flex: "0 0 auto" } }),
        publicStateLabel(t, remoteState.kind)
      ),
      (0, import_react2.createElement)("div", { style: { ...styles.muted, marginTop: 4, wordBreak: "break-word" } }, remoteSummaryDetail)
    ),
    // 桌面端不显示更新/重启横幅（更新由 DSH Desktop 管理），也不需要额外提示
    // 重启后提示（进程在后台运行，停止方法）——左侧蓝色色条（桌面端不会触发本插件的自重启）
    !isDesktop && restartNotice ? (0, import_react2.createElement)(
      "div",
      { style: { ...styles.block, borderLeft: "4px solid var(--dsw-alias-brand-primary,#4f6ef7)", borderRadius: 8, background: "var(--dsw-alias-bg-layer-2,#f3f4f6)", padding: "10px 12px" } },
      (0, import_react2.createElement)(
        "div",
        { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
        (0, import_react2.createElement)("div", { style: { fontWeight: 600, fontSize: 13 } }, t("restarted")),
        (0, import_react2.createElement)("button", { style: styles.btn, onClick: () => setRestartNotice(false) }, t("ok"))
      ),
      (0, import_react2.createElement)("div", { style: styles.muted, marginTop: 4, wordBreak: "break-all" }, fmt(t, "bgHint", { cmd: status?.killHint ?? `lsof -ti :${status?.dshPort ?? 3080} | xargs kill -9` }))
    ) : null,
    // 更新提示——左侧黄色色条（提示有新版本）；单状态：有更新/更新中/已更新自动重启，不并存
    // 桌面端不渲染（更新由 DSH Desktop 管理）
    !isDesktop && updateInfo ? (0, import_react2.createElement)(
      "div",
      { style: { ...styles.block, borderLeft: "4px solid var(--dsw-alias-state-warn-primary,#b45309)", borderRadius: 8, background: "var(--dsw-alias-bg-layer-2,#f3f4f6)", padding: "10px 12px" } },
      (0, import_react2.createElement)(
        "div",
        { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
        (0, import_react2.createElement)(
          "div",
          { style: { fontWeight: 600, fontSize: 13 } },
          updateInfo.updated ? fmt(t, "updatedRestart", { ver: updateInfo.current }) : updateInfo.result === "ok" ? updateInfo.autoRestart ? fmt(t, "updateAutoRestarting", { ver: updateInfo.latest }) : fmt(t, "updatedOk", { ver: updateInfo.latest }) : fmt(t, "updateAvailable", { ver: updateInfo.latest })
        ),
        updateInfo.result !== "ok" ? (0, import_react2.createElement)("button", { style: styles.primary, onClick: runUpdate, disabled: updateInfo.updating }, updateInfo.updating ? t("updating") : fmt(t, "updateTo", { ver: updateInfo.latest })) : updateInfo.autoRestart ? (0, import_react2.createElement)("button", { style: styles.btn, disabled: true }, t("restartingNow")) : (0, import_react2.createElement)("button", { style: styles.primary, onClick: restartPocket, disabled: updateInfo.restarting }, updateInfo.restarting ? t("restarting") : t("restartNow"))
      ),
      (0, import_react2.createElement)(
        "div",
        { style: styles.muted, marginTop: 4 },
        updateInfo.updating ? fmt(t, "updatingDetail", { s: elapsed(updateInfo.startedAt) }) : updateInfo.restarting ? fmt(t, "restartingDetail", { s: elapsed(updateInfo.startedAt) }) : updateInfo.result === "ok" ? updateInfo.autoRestart ? t("updatedAutoDetail") : t("updatedRestartDetail") : updateInfo.result === "fail" ? fmt(t, "updateFailed", { err: updateInfo.output || t("unknownError") }) : fmt(t, "versionRange", { cur: updateInfo.current, latest: updateInfo.latest })
      )
    ) : null,
    // 局域网
    (0, import_react2.createElement)(
      "div",
      { style: styles.block },
      (0, import_react2.createElement)("div", { style: { fontWeight: 600, fontSize: 13 } }, t("lanTitle")),
      // 局域网访问总开关：关闭后扫码/链接直接失效（公网不受影响）
      (0, import_react2.createElement)(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 8 } },
        (0, import_react2.createElement)("span", { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)" } }, t("lanAccess")),
        (0, import_react2.createElement)("button", {
          style: { ...styles.btn, height: 28, padding: "0 12px", fontSize: 12, fontWeight: status?.lanEnabled !== false ? 600 : 400, background: status?.lanEnabled !== false ? "var(--dsw-alias-button-primary-fill, var(--dsw-alias-brand-primary,#4f6ef7))" : "var(--dsw-alias-bg-layer-1,#fff)", color: status?.lanEnabled !== false ? "var(--dsw-alias-label-primary-foreground, #fff)" : "var(--dsw-alias-label-primary,inherit)" },
          onClick: () => requestLanToggle(true)
        }, t("on")),
        (0, import_react2.createElement)("button", {
          style: { ...styles.btn, height: 28, padding: "0 12px", fontSize: 12, fontWeight: status?.lanEnabled === false ? 600 : 400, background: status?.lanEnabled === false ? "var(--dsw-alias-state-error-primary,#dc2626)" : "var(--dsw-alias-bg-layer-1,#fff)", color: status?.lanEnabled === false ? "#fff" : "var(--dsw-alias-label-primary,inherit)" },
          onClick: () => requestLanToggle(false)
        }, t("off"))
      ),
      status?.lanEnabled === false ? (0, import_react2.createElement)("div", { style: { marginTop: 8, fontSize: 12, color: "var(--dsw-alias-state-warn-primary,#b45309)", lineHeight: 1.5 } }, t("lanDisabledHint")) : lanUrl ? (0, import_react2.createElement)(
        "div",
        null,
        (0, import_react2.createElement)("img", { src: status.lanQr, alt: "LAN QR", style: styles.qr }),
        (0, import_react2.createElement)("div", { style: styles.code }, lanUrl),
        (0, import_react2.createElement)("div", { style: styles.muted }, t("lanHint")),
        (0, import_react2.createElement)(
          "label",
          { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)" } },
          t("lanAddress"),
          (0, import_react2.createElement)(
            "select",
            {
              value: status?.lanIpOverride || "",
              onChange: (e) => setLanAddress(e.target.value),
              style: { font: "inherit", height: 30, padding: "0 8px", borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2,#d1d5db)", background: "var(--dsw-alias-bg-layer-1,#fff)", color: "var(--dsw-alias-label-primary,inherit)" }
            },
            (0, import_react2.createElement)("option", { value: "" }, t("lanAddressAuto")),
            (status?.lanCandidates || []).map((ip) => (0, import_react2.createElement)("option", { key: ip, value: ip }, ip))
          )
        ),
        (0, import_react2.createElement)("div", { style: { ...styles.muted, marginTop: 2 } }, t("lanAddressHint")),
        // 访问密码开关（issue #24）：默认开启；关闭后扫码直连（仅同一局域网设备可访问）
        (0, import_react2.createElement)(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 8 } },
          (0, import_react2.createElement)("span", { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)" } }, t("lanPin")),
          (0, import_react2.createElement)("button", {
            style: { ...styles.btn, height: 28, padding: "0 12px", fontSize: 12, fontWeight: status?.lanAuthEnabled !== false ? 600 : 400, background: status?.lanAuthEnabled !== false ? "var(--dsw-alias-button-primary-fill, var(--dsw-alias-brand-primary,#4f6ef7))" : "var(--dsw-alias-bg-layer-1,#fff)", color: status?.lanAuthEnabled !== false ? "var(--dsw-alias-label-primary-foreground, #fff)" : "var(--dsw-alias-label-primary,inherit)" },
            onClick: () => requestLanAuth(true)
          }, t("on")),
          (0, import_react2.createElement)("button", {
            style: { ...styles.btn, height: 28, padding: "0 12px", fontSize: 12, fontWeight: status?.lanAuthEnabled === false ? 600 : 400, background: status?.lanAuthEnabled === false ? "var(--dsw-alias-state-error-primary,#dc2626)" : "var(--dsw-alias-bg-layer-1,#fff)", color: status?.lanAuthEnabled === false ? "#fff" : "var(--dsw-alias-label-primary,inherit)" },
            onClick: () => requestLanAuth(false)
          }, t("off"))
        ),
        status?.lanAuthEnabled !== false ? customPin?.which === "lan" ? customPinRow("lan") : (0, import_react2.createElement)(
          "div",
          { style: { marginTop: 6, fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)", lineHeight: 1.5 } },
          fmt(t, status?.lanPinCustom ? "lanPinCustomValue" : "lanPinValue", { pin: status.lanToken }),
          (0, import_react2.createElement)("button", { style: { ...styles.btn, height: 26, padding: "0 10px", fontSize: 12, marginLeft: 8 }, onClick: refreshLanPin }, t("refresh")),
          customBtn("lan")
        ) : (0, import_react2.createElement)(
          "div",
          { style: { marginTop: 6, fontSize: 12, color: "var(--dsw-alias-state-warn-primary,#b45309)", lineHeight: 1.5 } },
          activeVirtualNetwork ? t("virtualPinOff") : t("lanPinOff")
        )
      ) : (0, import_react2.createElement)("div", { style: styles.muted }, t("lanStarting"))
    ),
    // 虚拟局域网：把已连接的 Tailscale / ZeroTier 网卡变成一键可用的专属二维码。
    (0, import_react2.createElement)(
      "div",
      { style: styles.block },
      (0, import_react2.createElement)("div", { style: { fontWeight: 600, fontSize: 13 } }, t("virtualTitle")),
      (0, import_react2.createElement)("div", { style: { ...styles.muted, marginTop: 4 } }, t("virtualHint")),
      (0, import_react2.createElement)("button", { style: { ...styles.btn, height: 28, padding: "0 12px", fontSize: 12, marginTop: 8 }, onClick: refreshVirtualNetworks }, t("virtualRefresh")),
      virtualNetworks.length === 0 ? (0, import_react2.createElement)("div", { style: { ...styles.warn, marginTop: 8 } }, t("virtualNone")) : virtualNetworks.map((network) => {
        const selected = activeVirtualNetwork?.ip === network.ip;
        return (0, import_react2.createElement)(
          "div",
          { key: `${network.kind}-${network.ip}`, style: { marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--dsw-alias-border-l2,#e5e7eb)" } },
          (0, import_react2.createElement)(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 8 } },
            (0, import_react2.createElement)("span", { style: { fontSize: 12, fontWeight: 600 } }, `\u25CF ${network.label}`),
            (0, import_react2.createElement)("span", { style: { ...styles.code, margin: 0, color: "var(--dsw-alias-label-secondary,#6b7280)" } }, network.ip),
            (0, import_react2.createElement)("button", {
              style: { ...styles.btn, marginLeft: "auto", height: 28, padding: "0 12px", fontSize: 12, ...selected ? { borderColor: "var(--dsw-alias-state-success-primary,#15803d)", color: "var(--dsw-alias-state-success-primary,#15803d)" } : {} },
              onClick: () => useVirtualNetwork(network.ip)
            }, selected ? t("virtualSelected") : t("virtualUse"))
          ),
          selected && network.url ? (0, import_react2.createElement)(
            "div",
            null,
            (0, import_react2.createElement)("img", { src: network.qr, alt: `${network.label} QR`, style: styles.qr }),
            (0, import_react2.createElement)("div", { style: styles.code }, network.url),
            (0, import_react2.createElement)("div", { style: styles.muted }, t("virtualPhoneHint")),
            (0, import_react2.createElement)("div", { style: { ...styles.warn, marginTop: 6 } }, t("virtualSafetyTitle")),
            (0, import_react2.createElement)("div", { style: styles.muted }, t("virtualSafetyBody"))
          ) : null
        );
      })
    ),
    // 公网
    (0, import_react2.createElement)(
      "div",
      { style: styles.block },
      (0, import_react2.createElement)("div", { style: { fontWeight: 600, fontSize: 13 } }, t("wanTitle")),
      // 共享的隧道进度（两种模式共用 tunnelState；谁在跑/在开就显示谁的进度）
      tunnelStarting ? (0, import_react2.createElement)(
        "div",
        { style: { marginTop: 6, fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)" } },
        tunnelPhase === "downloading" ? fmt(t, "downloading", { s: elapsed(tunnelStateStarted) }) : fmt(t, "connecting", { s: elapsed(tunnelStateStarted), suffix: elapsed(tunnelStateStarted) > 30 ? t("slowHint") : "" })
      ) : tunnelPhase === "error" ? (0, import_react2.createElement)(
        "div",
        { style: { marginTop: 6, fontSize: 12, color: "var(--dsw-alias-state-error-primary,#dc2626)" } },
        fmt(t, "error", { detail: tunnelStateDetail || t("unknownError") })
      ) : null,
      // ---- 快速隧道（临时地址，无需账号）----
      (0, import_react2.createElement)(
        "div",
        { style: { ...styles.block, borderTop: "1px dashed var(--dsw-alias-border-l2,#e5e7eb)", marginTop: 10, paddingTop: 10 } },
        (0, import_react2.createElement)("div", { style: { fontSize: 12, fontWeight: 600, color: "var(--dsw-alias-label-secondary,#6b7280)", marginBottom: 4 } }, t("quickTitle")),
        quickRunning ? (0, import_react2.createElement)(
          "div",
          null,
          (0, import_react2.createElement)("img", { src: status.tunnelQr, alt: "Tunnel QR", style: styles.qr }),
          (0, import_react2.createElement)("div", { style: styles.code }, tunnelUrl),
          (0, import_react2.createElement)("div", { style: styles.muted }, t("quickHint")),
          status.accessToken ? customPin?.which === "public" ? customPinRow("public") : (0, import_react2.createElement)(
            "div",
            { style: { marginTop: 6, fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)", lineHeight: 1.5 } },
            fmt(t, status?.publicPinCustom ? "wanPinCustom" : "wanPin", { pin: status.accessToken }),
            customBtn("public"),
            status?.publicPinCustom ? (0, import_react2.createElement)("div", { style: { marginTop: 2, fontSize: 11, color: "var(--dsw-alias-state-warn-primary,#b45309)" } }, t("pinCustomHint")) : null
          ) : null,
          (0, import_react2.createElement)("button", { style: styles.btn, onClick: stopTunnel }, t("stopTunnel"))
        ) : (0, import_react2.createElement)(
          "div",
          null,
          (0, import_react2.createElement)("button", { style: { ...styles.primary, margin: "8px 0" }, onClick: startTunnel, disabled: busy }, busy ? t("opening") : t("enable")),
          (0, import_react2.createElement)("div", { style: styles.muted }, t("quickHint"))
        )
      ),
      // ---- 固定域名（命名隧道 + Cloudflare Access）----
      // 高级功能默认折叠：头部一行（标题 + 状态标签 + 展开箭头），点开才显示向导与开关。
      // 状态点一目了然：未配置 / 待初始化 / 已就绪 / 运行中——不用展开就能判断进度。
      (0, import_react2.createElement)(
        "div",
        { style: { ...styles.block, borderTop: "1px dashed var(--dsw-alias-border-l2,#e5e7eb)", marginTop: 10, paddingTop: 10 } },
        (0, import_react2.createElement)(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }, onClick: () => setFixedOpen(!fixedOpen) },
          (0, import_react2.createElement)("span", { style: { fontSize: 12, fontWeight: 600, color: "var(--dsw-alias-label-secondary,#6b7280)" } }, t("fixedTitle")),
          (0, import_react2.createElement)("span", { style: { marginLeft: "auto", fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 999, color: fixedStatusColor, border: `1px solid ${fixedStatusColor}`, background: "var(--dsw-alias-bg-layer-1,#fff)" } }, fixedStatusLabel),
          (0, import_react2.createElement)("span", { style: { fontSize: 10, color: "var(--dsw-alias-label-tertiary,#8b93a1)" } }, fixedOpen ? "\u25B4" : "\u25BE")
        ),
        // 折叠摘要：已配置显示域名，未配置给提示（含 Access 推荐说明）
        !fixedOpen ? (0, import_react2.createElement)(
          "div",
          { style: { ...styles.muted, marginTop: 2 } },
          fHostname ? fHostname : t("fixedCollapsedHint")
        ) : null,
        // 展开内容（向导 + 开关）
        !fixedOpen ? null : (0, import_react2.createElement)(
          "div",
          null,
          (0, import_react2.createElement)("div", { style: { ...styles.muted, marginTop: 2 } }, t("fixedSubtitle")),
          // 域名输入/保存
          (0, import_react2.createElement)(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 6, marginTop: 8 } },
            (0, import_react2.createElement)("span", { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)" } }, t("fixedHostnameLabel")),
            (0, import_react2.createElement)("input", {
              style: { flex: 1, minWidth: 0, font: "inherit", height: 30, padding: "0 8px", borderRadius: 8, border: "1px solid var(--dsw-alias-border-l2,#d1d5db)", background: "var(--dsw-alias-bg-layer-1,#fff)", color: "var(--dsw-alias-label-primary,inherit)", outline: "none" },
              placeholder: t("fixedHostnamePlaceholder"),
              value: fixedHostnameInput,
              onChange: (e) => setFixedHostnameInput(e.target.value),
              onKeyDown: (e) => {
                if (e.key === "Enter") saveFixedHostname();
              }
            }),
            (0, import_react2.createElement)("button", { style: { ...styles.btn, height: 30, padding: "0 12px", fontSize: 12 }, onClick: saveFixedHostname, disabled: fixedBusy }, t("fixedSave"))
          ),
          fHostname ? (0, import_react2.createElement)("div", { style: { marginTop: 4, fontSize: 11, color: "var(--dsw-alias-state-success-primary,#15803d)" } }, fmt(t, "fixedSaved", { hostname: fHostname })) : null,
          // 初始化向导：① 登录 ② 建隧道+绑 DNS ③ 开启
          (0, import_react2.createElement)("div", { style: { ...styles.muted, marginTop: 10, fontWeight: 600 } }, t("fixedSetupWizard")),
          (0, import_react2.createElement)(
            "div",
            { style: { marginTop: 6, fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)", lineHeight: 1.6 } },
            // ① 登录
            (0, import_react2.createElement)(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
              (0, import_react2.createElement)("span", null, fCert ? `\u2705 ${t("fixedStep1Done")}` : t("fixedStep1")),
              fCert ? null : (0, import_react2.createElement)("button", { style: { ...styles.btn, height: 26, padding: "0 10px", fontSize: 12 }, onClick: runFixedLogin, disabled: fixedBusy }, t("fixedLoginBtn"))
            ),
            // 登录进行中/授权链接
            !fCert && status?.fixedLogin?.url ? (0, import_react2.createElement)(
              "div",
              { style: { marginTop: 4, fontSize: 11, color: "var(--dsw-alias-state-warn-primary,#b45309)", lineHeight: 1.5 } },
              t("fixedLoginHint"),
              (0, import_react2.createElement)(
                "div",
                null,
                (0, import_react2.createElement)("a", { href: status.fixedLogin.url, target: "_blank", rel: "noreferrer", style: { color: "var(--dsw-alias-brand-primary,#4f6ef7)", textDecoration: "underline" } }, t("fixedOpenUrl"))
              )
            ) : null,
            // ② 初始化
            (0, import_react2.createElement)(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" } },
              (0, import_react2.createElement)("span", null, fTunnel && fDns ? `\u2705 ${t("fixedStep2Done")}` : t("fixedStep2")),
              !(fTunnel && fDns) ? (0, import_react2.createElement)("button", {
                style: { ...styles.btn, height: 26, padding: "0 10px", fontSize: 12 },
                onClick: runFixedSetup,
                disabled: fixedBusy || !fCert || !fHostname,
                title: !fCert ? t("fixedNeedLoginFirst") : !fHostname ? t("fixedNeedHostname") : ""
              }, fixedBusy ? t("fixedSetupBusy") : t("fixedSetupBtn")) : null
            ),
            // ③ 开启/运行
            (0, import_react2.createElement)(
              "div",
              { style: { marginTop: 8, padding: "7px 9px", borderRadius: 8, fontSize: 11, lineHeight: 1.5, background: fixedRunning ? "rgba(22,163,74,.08)" : fixedStarting ? "rgba(217,119,6,.10)" : "rgba(220,38,38,.08)", color: fixedRunning ? "var(--dsw-alias-state-success-primary,#15803d)" : fixedStarting ? "var(--dsw-alias-state-warn-primary,#b45309)" : "var(--dsw-alias-state-error-primary,#dc2626)" } },
              fixedRunning ? fmt(t, "fixedRuntimeLive", { port: status?.proxyPort ?? "\u2014" }) : fixedStarting ? tunnelPhase === "downloading" ? fmt(t, "fixedRuntimeDownloading", { s: elapsed(tunnelStateStarted) }) : fmt(t, "fixedRuntimeStarting", { detail: tunnelStateDetail || fmt(t, "connecting", { s: elapsed(tunnelStateStarted), suffix: "" }) }) : tunnelPhase === "error" ? fmt(t, "fixedRuntimeError", { detail: tunnelStateDetail || t("unknownError") }) : t("fixedRuntimeStopped")
            ),
            fixedRunning ? (0, import_react2.createElement)(
              "div",
              { style: { marginTop: 8 } },
              (0, import_react2.createElement)("div", { style: { fontSize: 12, fontWeight: 600, color: "var(--dsw-alias-state-success-primary,#15803d)" } }, t("fixedRunning")),
              (0, import_react2.createElement)("img", { src: status.tunnelQr, alt: "Fixed QR", style: styles.qr }),
              (0, import_react2.createElement)("div", { style: styles.code }, tunnelUrl),
              fixedPinRequired && status.accessToken ? customPin?.which === "public" ? customPinRow("public") : (0, import_react2.createElement)(
                "div",
                { style: { marginTop: 6, fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)", lineHeight: 1.5 } },
                fmt(t, status?.publicPinCustom ? "wanPinCustom" : "fixedWanPin", { pin: status.accessToken }),
                customBtn("public"),
                status?.publicPinCustom ? (0, import_react2.createElement)("div", { style: { marginTop: 2, fontSize: 11, color: "var(--dsw-alias-state-warn-primary,#b45309)" } }, t("pinCustomHint")) : null
              ) : null,
              (0, import_react2.createElement)("button", { style: styles.btn, onClick: stopTunnel }, t("fixedStop"))
            ) : (0, import_react2.createElement)(
              "div",
              { style: { marginTop: 6 } },
              (0, import_react2.createElement)("button", {
                style: { ...styles.primary },
                onClick: startFixedTunnel,
                disabled: fixedBusy || !fTunnel || !fDns || !fHostname
              }, t("fixedEnableBtn")),
              (!fTunnel || !fDns) && fHostname ? (0, import_react2.createElement)(
                "div",
                { style: { marginTop: 4, fontSize: 11, color: "var(--dsw-alias-state-warn-primary,#b45309)" } },
                !fCert ? t("fixedNeedLoginFirst") : t("fixedNeedSetup")
              ) : null
            )
          ),
          // Cloudflare Access 开关（推荐）
          (0, import_react2.createElement)(
            "div",
            { style: { borderTop: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", marginTop: 10, paddingTop: 8 } },
            (0, import_react2.createElement)(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 8 } },
              (0, import_react2.createElement)("span", { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)" } }, t("fixedAccessTitle")),
              (0, import_react2.createElement)("button", {
                style: { ...styles.btn, height: 28, padding: "0 12px", fontSize: 12, fontWeight: fAccess ? 600 : 400, background: fAccess ? "var(--dsw-alias-button-primary-fill, var(--dsw-alias-brand-primary,#4f6ef7))" : "var(--dsw-alias-bg-layer-1,#fff)", color: fAccess ? "var(--dsw-alias-label-primary-foreground, #fff)" : "var(--dsw-alias-label-primary,inherit)" },
                onClick: () => setFixedAccess(true)
              }, t("on")),
              (0, import_react2.createElement)("button", {
                style: { ...styles.btn, height: 28, padding: "0 12px", fontSize: 12, fontWeight: !fAccess ? 600 : 400, background: !fAccess ? "var(--dsw-alias-state-error-primary,#dc2626)" : "var(--dsw-alias-bg-layer-1,#fff)", color: !fAccess ? "#fff" : "var(--dsw-alias-label-primary,inherit)" },
                onClick: () => setFixedAccess(false)
              }, t("off")),
              // 配置引导：内嵌 CF Dashboard 步骤（比外链教程更少跳转）
              (0, import_react2.createElement)("button", { style: { ...styles.btn, height: 28, padding: "0 10px", fontSize: 11, marginLeft: "auto" }, onClick: () => setFixedGuideOpen(true) }, t("fixedGuideBtn"))
            ),
            (0, import_react2.createElement)(
              "div",
              { style: { marginTop: 4, fontSize: 11, lineHeight: 1.5, color: fAccess ? "var(--dsw-alias-label-tertiary,#8b93a1)" : "var(--dsw-alias-state-warn-primary,#b45309)" } },
              fAccess ? fAccessVerified ? t("fixedAccessHintOn") : `\u{1F512} ${fAccessCheckDetail || t("fixedAccessUnverified")}` : t("fixedAccessHintOff")
            ),
            fAccess ? (0, import_react2.createElement)("button", {
              style: { ...styles.btn, height: 26, padding: "0 10px", fontSize: 11, marginTop: 6 },
              disabled: fixedBusy || !fixedRunning,
              onClick: async () => {
                setFixedBusy(true);
                try {
                  setStatus(await call(POCKET_ENDPOINTS.fixedVerifyAccess, {}));
                } catch (err) {
                  setError(err.message);
                } finally {
                  setFixedBusy(false);
                }
              }
            }, "\u91CD\u65B0\u9A8C\u8BC1 Access") : null,
            // PIN 策略：Access 关 → 强制 PIN（安全提示，主界面直接显示，不藏）
            fAccess ? null : (0, import_react2.createElement)("div", { style: { marginTop: 6, fontSize: 11, color: "var(--dsw-alias-state-warn-primary,#b45309)" } }, t("fixedPinForced")),
            // 高级选项（默认折叠）：仅 Access 开启时有意义——「额外要求 8 位 PIN」纵深防御
            fAccess ? (0, import_react2.createElement)(
              "div",
              { style: { marginTop: 8, borderTop: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", paddingTop: 8 } },
              (0, import_react2.createElement)(
                "div",
                { style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none", fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)" }, onClick: () => setFixedAdvOpen(!fixedAdvOpen) },
                (0, import_react2.createElement)("span", null, t("fixedAdvanced")),
                (0, import_react2.createElement)("span", { style: { marginLeft: "auto", fontSize: 10, color: "var(--dsw-alias-label-tertiary,#8b93a1)" } }, fixedAdvOpen ? "\u25B4" : "\u25BE")
              ),
              (0, import_react2.createElement)("div", { style: { marginTop: 2, fontSize: 11, color: "var(--dsw-alias-label-tertiary,#8b93a1)" } }, t("fixedAdvancedHint")),
              fixedAdvOpen ? (0, import_react2.createElement)(
                "div",
                { style: { marginTop: 8 } },
                (0, import_react2.createElement)(
                  "div",
                  { style: { display: "flex", alignItems: "center", gap: 8 } },
                  (0, import_react2.createElement)("span", { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)" } }, t("fixedPinTitle")),
                  (0, import_react2.createElement)("button", {
                    style: { ...styles.btn, height: 28, padding: "0 12px", fontSize: 12, fontWeight: fPinAlways ? 600 : 400, background: fPinAlways ? "var(--dsw-alias-button-primary-fill, var(--dsw-alias-brand-primary,#4f6ef7))" : "var(--dsw-alias-bg-layer-1,#fff)", color: fPinAlways ? "var(--dsw-alias-label-primary-foreground, #fff)" : "var(--dsw-alias-label-primary,inherit)" },
                    onClick: () => setFixedPinAlways(true)
                  }, t("on")),
                  (0, import_react2.createElement)("button", {
                    style: { ...styles.btn, height: 28, padding: "0 12px", fontSize: 12, fontWeight: !fPinAlways ? 600 : 400, background: "var(--dsw-alias-bg-layer-1,#fff)", color: "var(--dsw-alias-label-primary,inherit)" },
                    onClick: () => setFixedPinAlways(false)
                  }, t("off"))
                ),
                (0, import_react2.createElement)("div", { style: { marginTop: 4, fontSize: 11, color: "var(--dsw-alias-label-tertiary,#8b93a1)" } }, fPinAlways ? t("fixedPinHintOn") : t("fixedPinHintOff"))
              ) : null
            ) : null
          )
        )
      )
    ),
    // 临时访客 PIN：授权记录持久化，会话/在线连接由当前进程管理。
    (0, import_react2.createElement)(
      "div",
      { style: styles.block },
      (0, import_react2.createElement)(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8 } },
        (0, import_react2.createElement)("strong", { style: { fontSize: 13 } }, t("guestTitle")),
        (0, import_react2.createElement)("button", { style: { ...styles.btn, height: 28, padding: "0 12px", marginLeft: "auto" }, onClick: () => guestAction(POCKET_ENDPOINTS.guestSetEnabled, { on: status?.guestAccess?.enabled !== true }) }, status?.guestAccess?.enabled === true ? t("on") : t("off"))
      ),
      (0, import_react2.createElement)("div", { style: styles.muted }, t("guestHint")),
      (0, import_react2.createElement)("div", { style: styles.warn, marginTop: 4 }, t("guestFullAccessWarning")),
      newGuestPin ? (0, import_react2.createElement)(
        "div",
        { style: { marginTop: 10, padding: 10, borderRadius: 8, background: "rgba(22,163,74,.08)", color: "var(--dsw-alias-state-success-primary,#15803d)" } },
        (0, import_react2.createElement)("div", { style: { fontSize: 12 } }, t("guestPinOnce")),
        (0, import_react2.createElement)("div", { style: { fontSize: 22, fontWeight: 700, letterSpacing: 4 } }, newGuestPin.pin),
        (0, import_react2.createElement)("button", { style: { ...styles.btn, height: 28 }, onClick: () => copyText(newGuestPin.pin) }, t("guestCopy")),
        (0, import_react2.createElement)("button", { style: { ...styles.btn, height: 28, marginLeft: 6 }, onClick: () => setNewGuestPin(null) }, t("ok")),
        copyNotice ? (0, import_react2.createElement)("div", { style: { marginTop: 5, fontSize: 11 } }, copyNotice) : null
      ) : null,
      status?.guestAccess?.enabled === true ? (0, import_react2.createElement)(
        "div",
        { style: { marginTop: 10 } },
        (0, import_react2.createElement)(
          "div",
          { style: { display: "grid", gridTemplateColumns: "1fr 110px 110px", gap: 6 } },
          (0, import_react2.createElement)("input", { style: { minWidth: 0, height: 30, border: "1px solid var(--dsw-alias-border-l2,#d1d5db)", borderRadius: 8, padding: "0 8px" }, placeholder: t("guestLabel"), maxLength: 40, value: guestForm.label, onChange: (e) => setGuestForm((f) => ({ ...f, label: e.target.value })) }),
          (0, import_react2.createElement)(
            "select",
            { style: { height: 32, borderRadius: 8 }, value: guestForm.durationMinutes, onChange: (e) => setGuestForm((f) => ({ ...f, durationMinutes: Number(e.target.value) })) },
            [15, 60, 240, 1440].map((m) => (0, import_react2.createElement)("option", { key: m, value: m }, m < 60 ? `${m} ${t("guestMinutes")}` : `${m / 60} ${t("guestHours")}`))
          ),
          (0, import_react2.createElement)(
            "select",
            { style: { height: 32, borderRadius: 8 }, value: guestForm.scope, onChange: (e) => setGuestForm((f) => ({ ...f, scope: e.target.value })) },
            (0, import_react2.createElement)("option", { value: "both" }, t("guestScopeBoth")),
            (0, import_react2.createElement)("option", { value: "lan" }, t("guestScopeLan")),
            (0, import_react2.createElement)("option", { value: "public" }, t("guestScopePublic"))
          )
        ),
        (0, import_react2.createElement)("button", { style: { ...styles.primary, height: 32, marginTop: 8 }, onClick: createGuest }, t("guestCreate"))
      ) : null,
      (status?.guestAccess?.grants ?? []).filter((g) => g.state !== "expired" && g.state !== "revoked").map((g) => {
        const seconds = Math.max(0, Math.floor((g.expiresAt - now) / 1e3));
        const activeText = g.online > 0 ? fmt(t, "guestOnline", { count: g.online }) : g.recent > 0 ? t("guestRecent") : t("guestOffline");
        return (0, import_react2.createElement)(
          "div",
          { key: g.id, style: { marginTop: 10, padding: 10, border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", borderRadius: 8 } },
          (0, import_react2.createElement)("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, (0, import_react2.createElement)("strong", { style: { fontSize: 12 } }, g.label || t("guestUnnamed")), (0, import_react2.createElement)("span", { style: { marginLeft: "auto", fontSize: 11, color: g.online ? "var(--dsw-alias-state-success-primary,#15803d)" : "var(--dsw-alias-label-tertiary,#8b93a1)" } }, activeText)),
          (0, import_react2.createElement)("div", { style: styles.muted }, `${g.scope === "both" ? t("guestScopeBoth") : g.scope === "lan" ? t("guestScopeLan") : t("guestScopePublic")} \xB7 ${fmt(t, "guestRemaining", { minutes: Math.ceil(seconds / 60) })}`),
          (0, import_react2.createElement)(
            "div",
            { style: { display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" } },
            (0, import_react2.createElement)("button", { style: { ...styles.btn, height: 27, padding: "0 10px", fontSize: 11, color: "var(--dsw-alias-brand-primary,#4f6ef7)" }, onClick: () => createGuestShare(g) }, t("guestShare")),
            (0, import_react2.createElement)("button", { style: { ...styles.btn, height: 27, padding: "0 10px", fontSize: 11 }, onClick: () => guestAction(POCKET_ENDPOINTS.guestSetLogin, { id: g.id, on: !g.loginEnabled }) }, g.loginEnabled ? t("guestDisableLogin") : t("guestEnableLogin")),
            (0, import_react2.createElement)("button", { style: { ...styles.btn, height: 27, padding: "0 10px", fontSize: 11 }, onClick: () => guestAction(POCKET_ENDPOINTS.guestKick, { id: g.id }) }, t("guestKick")),
            (0, import_react2.createElement)("button", { style: { ...styles.btn, height: 27, padding: "0 10px", fontSize: 11, color: "var(--dsw-alias-state-error-primary,#dc2626)" }, onClick: () => guestAction(POCKET_ENDPOINTS.guestRevoke, { id: g.id }) }, t("guestRevoke"))
          )
        );
      })
    ),
    error ? (0, import_react2.createElement)("div", { style: { color: "var(--dsw-alias-state-error-primary,#dc2626)", fontSize: 12, marginTop: 8 } }, `\u274C ${error}`) : null,
    guestShare ? (0, import_react2.createElement)(
      "div",
      { style: { position: "fixed", inset: 0, zIndex: 1e4, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 } },
      (0, import_react2.createElement)(
        "div",
        { style: { background: "var(--dsw-alias-bg-layer-1,#fff)", borderRadius: 12, maxWidth: 430, width: "100%", padding: "20px 22px", boxShadow: "0 8px 32px rgba(0,0,0,.18)" } },
        (0, import_react2.createElement)("div", { style: { fontWeight: 600, fontSize: 15 } }, t("guestShareTitle")),
        (0, import_react2.createElement)("div", { style: { ...styles.muted, marginTop: 5 } }, t("guestShareHint")),
        guestShare.links.map((item) => (0, import_react2.createElement)(
          "div",
          { key: item.kind, style: { marginTop: 10, padding: 9, border: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", borderRadius: 8, opacity: item.available ? 1 : 0.72 } },
          (0, import_react2.createElement)("div", { style: { fontSize: 12, fontWeight: 600 } }, item.label),
          item.available ? (0, import_react2.createElement)(
            "div",
            null,
            (0, import_react2.createElement)("div", { style: { ...styles.code, fontSize: 10, margin: "4px 0 7px" } }, item.url),
            (0, import_react2.createElement)("button", { style: { ...styles.primary, height: 28, padding: "0 12px" }, onClick: () => shareGuestLink(item) }, navigator.share ? t("guestSystemShare") : t("guestCopyLink")),
            (0, import_react2.createElement)("button", { style: { ...styles.btn, height: 28, padding: "0 12px", marginLeft: 6 }, onClick: () => copyText(item.url) }, t("guestCopyLink"))
          ) : (0, import_react2.createElement)("div", { style: { ...styles.warn, marginTop: 5 } }, item.reason)
        )),
        copyNotice ? (0, import_react2.createElement)("div", { style: { marginTop: 8, fontSize: 12, color: copyNotice === t("guestCopied") ? "var(--dsw-alias-state-success-primary,#15803d)" : "var(--dsw-alias-state-error-primary,#dc2626)" } }, copyNotice) : null,
        (0, import_react2.createElement)("div", { style: { ...styles.warn, marginTop: 10 } }, t("guestShareSecurity")),
        (0, import_react2.createElement)("button", { style: { ...styles.btn, width: "100%", marginTop: 14 }, onClick: () => setGuestShare(null) }, t("ok"))
      )
    ) : null,
    // 局域网访问开关确认弹框（关闭/打开时弹窗提醒）
    lanToggleOpen !== null ? (0, import_react2.createElement)(
      "div",
      { style: { position: "fixed", inset: 0, zIndex: 1e4, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 } },
      (0, import_react2.createElement)(
        "div",
        { style: { background: "var(--dsw-alias-bg-layer-1,#fff)", borderRadius: 12, maxWidth: 420, width: "100%", padding: "20px 22px", boxShadow: "0 8px 32px rgba(0,0,0,.18)" } },
        (0, import_react2.createElement)("div", { style: { fontWeight: 600, fontSize: 15, color: lanToggleOpen ? "var(--dsw-alias-brand-primary,#4f6ef7)" : "var(--dsw-alias-state-warn-primary,#b45309)", marginBottom: 10 } }, t(lanToggleOpen ? "lanToggleTitleOn" : "lanToggleTitleOff")),
        (0, import_react2.createElement)("div", { style: { fontSize: 13, lineHeight: 1.7, color: "var(--dsw-alias-label-primary,inherit)" } }, t(lanToggleOpen ? "lanToggleBodyOn" : "lanToggleBodyOff")),
        (0, import_react2.createElement)(
          "div",
          { style: { display: "flex", gap: 8, marginTop: 16 } },
          (0, import_react2.createElement)("button", { style: { ...styles.btn, flex: 1 }, onClick: () => setLanToggleOpen(null) }, t("cancel")),
          (0, import_react2.createElement)("button", { style: { ...styles.primary, flex: 1 }, onClick: confirmLanToggle }, t("confirm"))
        )
      )
    ) : null,
    // 虚拟局域网允许关 PIN，但需单独确认，避免用户误以为它与普通家庭 LAN 等价。
    virtualPinOffOpen ? (0, import_react2.createElement)(
      "div",
      { style: { position: "fixed", inset: 0, zIndex: 1e4, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 } },
      (0, import_react2.createElement)(
        "div",
        { style: { background: "var(--dsw-alias-bg-layer-1,#fff)", borderRadius: 12, maxWidth: 420, width: "100%", padding: "20px 22px", boxShadow: "0 8px 32px rgba(0,0,0,.18)" } },
        (0, import_react2.createElement)("div", { style: { fontWeight: 600, fontSize: 15, color: "var(--dsw-alias-state-warn-primary,#b45309)", marginBottom: 10 } }, t("virtualPinOffTitle")),
        (0, import_react2.createElement)("div", { style: { fontSize: 13, lineHeight: 1.7, color: "var(--dsw-alias-label-primary,inherit)" } }, t("virtualPinOffBody")),
        (0, import_react2.createElement)(
          "div",
          { style: { display: "flex", gap: 8, marginTop: 16 } },
          (0, import_react2.createElement)("button", { style: { ...styles.btn, flex: 1 }, onClick: () => setVirtualPinOffOpen(false) }, t("cancel")),
          (0, import_react2.createElement)("button", { style: { ...styles.primary, flex: 1, background: "var(--dsw-alias-state-error-primary,#dc2626)" }, onClick: () => {
            setVirtualPinOffOpen(false);
            void setLanAuth(false);
          } }, t("virtualPinOffConfirm"))
        )
      )
    ) : null,
    // 安全免责声明弹框（issue #31）：每次开启公网访问前确认
    disclaimerOpen ? (0, import_react2.createElement)(
      "div",
      { style: { position: "fixed", inset: 0, zIndex: 1e4, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 } },
      (0, import_react2.createElement)(
        "div",
        { style: { background: "var(--dsw-alias-bg-layer-1,#fff)", borderRadius: 12, maxWidth: 420, width: "100%", padding: "20px 22px", boxShadow: "0 8px 32px rgba(0,0,0,.18)" } },
        (0, import_react2.createElement)("div", { style: { fontWeight: 600, fontSize: 15, color: "var(--dsw-alias-state-warn-primary,#b45309)", marginBottom: 10 } }, t("disclaimerTitle")),
        (0, import_react2.createElement)("div", { style: { fontSize: 13, lineHeight: 1.7, color: "var(--dsw-alias-label-primary,inherit)" } }, t("disclaimerBody")),
        (0, import_react2.createElement)(
          "label",
          { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 13, cursor: "pointer" } },
          (0, import_react2.createElement)("input", { type: "checkbox", checked: disclaimerChecked, onChange: (e) => setDisclaimerChecked(e.target.checked), style: { width: 16, height: 16 } }),
          t("disclaimerAgree")
        ),
        (0, import_react2.createElement)(
          "div",
          { style: { display: "flex", gap: 8, marginTop: 16 } },
          (0, import_react2.createElement)("button", { style: { ...styles.btn, flex: 1 }, onClick: () => setDisclaimerOpen(false) }, t("cancel")),
          (0, import_react2.createElement)("button", {
            style: { ...styles.primary, flex: 1, opacity: disclaimerChecked ? 1 : 0.5 },
            disabled: !disclaimerChecked,
            onClick: confirmDisclaimer
          }, t("disclaimerAgree"))
        ),
        !disclaimerChecked ? (0, import_react2.createElement)("div", { style: { marginTop: 8, fontSize: 12, color: "var(--dsw-alias-state-error-primary,#dc2626)" } }, t("disclaimerHint")) : null
      )
    ) : null,
    // Cloudflare Access 配置引导弹窗：按地点分组（CF 后台 / 插件本页 / 手机），每步标清在哪操作
    fixedGuideOpen ? (0, import_react2.createElement)(
      "div",
      { style: { position: "fixed", inset: 0, zIndex: 1e4, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 } },
      (0, import_react2.createElement)(
        "div",
        { style: { background: "var(--dsw-alias-bg-layer-1,#fff)", borderRadius: 12, maxWidth: 460, width: "100%", maxHeight: "80vh", overflowY: "auto", padding: "20px 22px", boxShadow: "0 8px 32px rgba(0,0,0,.18)" } },
        (0, import_react2.createElement)("div", { style: { fontWeight: 600, fontSize: 15, color: "var(--dsw-alias-brand-primary,#4f6ef7)", marginBottom: 6 } }, t("fixedGuideTitle")),
        (0, import_react2.createElement)("div", { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)", lineHeight: 1.6 } }, t("fixedGuideIntro")),
        // 三组步骤：CF 后台（①②③）→ 插件本页（④）→ 手机（⑤）
        [
          { loc: "fixedGuideLocCfdash", steps: [["fixedGuideStep1", "fixedGuideStep1Detail"], ["fixedGuideStep2", "fixedGuideStep2Detail"], ["fixedGuideStep3", "fixedGuideStep3Detail"]] },
          { loc: "fixedGuideLocPlugin", steps: [["fixedGuideStep4", "fixedGuideStep4Detail"]] },
          { loc: "fixedGuideLocPhone", steps: [["fixedGuideStep5", "fixedGuideStep5Detail"]] }
        ].map(
          (group) => (0, import_react2.createElement)(
            "div",
            { key: group.loc, style: { marginTop: 10 } },
            (0, import_react2.createElement)("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--dsw-alias-brand-primary,#4f6ef7)", lineHeight: 1.5 } }, t(group.loc)),
            group.steps.map(
              ([titleKey, detailKey]) => (0, import_react2.createElement)(
                "div",
                { key: titleKey, style: { marginTop: 6, fontSize: 12, lineHeight: 1.6 } },
                (0, import_react2.createElement)("div", { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary,inherit)" } }, t(titleKey)),
                (0, import_react2.createElement)("div", { style: { marginTop: 2, color: "var(--dsw-alias-label-secondary,#6b7280)" } }, fmt(t, detailKey, { hostname: fHostname || t("fixedHostnamePlaceholder") }))
              )
            )
          )
        ),
        // MFA 方式说明
        (0, import_react2.createElement)(
          "div",
          { style: { borderTop: "1px solid var(--dsw-alias-border-l2,#e5e7eb)", marginTop: 12, paddingTop: 10, fontSize: 12, lineHeight: 1.7 } },
          (0, import_react2.createElement)("div", { style: { fontWeight: 600, color: "var(--dsw-alias-label-primary,inherit)" } }, t("fixedGuideMfaTitle")),
          (0, import_react2.createElement)("div", { style: { color: "var(--dsw-alias-label-secondary,#6b7280)" } }, `\u2022 ${t("fixedGuideMfa1")}`),
          (0, import_react2.createElement)("div", { style: { color: "var(--dsw-alias-label-secondary,#6b7280)" } }, `\u2022 ${t("fixedGuideMfa2")}`)
        ),
        // 二维码性质提醒（安全相关，用醒目色）
        (0, import_react2.createElement)("div", { style: { marginTop: 10, fontSize: 11, color: "var(--dsw-alias-state-warn-primary,#b45309)", lineHeight: 1.6 } }, t("fixedGuideQrNote")),
        (0, import_react2.createElement)(
          "div",
          { style: { display: "flex", gap: 8, marginTop: 16 } },
          (0, import_react2.createElement)("a", { href: "https://developers.cloudflare.com/cloudflare-one/policies/access/", target: "_blank", rel: "noreferrer", style: { ...styles.btn, flex: 1, textDecoration: "none", justifyContent: "center" } }, t("fixedAccessDocs")),
          (0, import_react2.createElement)("button", { style: { ...styles.primary, flex: 1 }, onClick: () => setFixedGuideOpen(false) }, t("ok"))
        )
      )
    ) : null,
    // 页面最底部：反馈入口
    (0, import_react2.createElement)(
      "div",
      { style: { ...styles.block, textAlign: "center" } },
      (0, import_react2.createElement)(
        "a",
        { href: "https://github.com/hanjiangfly/dsh-pocket/issues", target: "_blank", rel: "noreferrer", style: { fontSize: 12, color: "var(--dsw-alias-label-secondary,#6b7280)", textDecoration: "none" } },
        t("feedback")
      )
    )
  );
}
function apply(ctx) {
  mobileApply(ctx);
  const rpcCall = (endpoint, payload, signal) => ctx.connection.rpc.call(POCKET_RPC_CHANNEL, endpoint, payload, signal);
  const translate = ctx.locale.bind(NS2);
  ctx.effect(() => ctx.locale.register(NS2, { zh: zh2, en: en2 }), "dsh-pocket: pocket locale dictionaries");
  installPublicAccessIndicators(ctx, rpcCall, translate);
  ctx.slots.inject(
    "settings.section",
    () => ctx.slots.register(
      {
        name: "settings.section",
        id: "pocket",
        order: 1,
        label: () => translate("section"),
        inject: () => ({ rpcCall, t: translate })
      },
      PocketSettingsTab
    )
  );
}

    return module.exports;
  }
});
