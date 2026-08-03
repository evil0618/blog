/**
 * ============================================
 * shadcn-hexo 主题 - 设置面板 & 新版样式切换
 * ============================================
 * 功能：
 * - 打开/关闭设置弹窗
 * - "新版页面"开关：在 <html> 上切换 .liquid 类
 * - 用 Cookie 记住用户选择，下次访问自动应用（配合 head 内联脚本防闪烁）
 * 依赖：无（纯原生 JS）
 */
(function () {
  'use strict';

  // Cookie 键名与取值
  var COOKIE_KEY = 'blog_ui_style';
  var STYLE_LIQUID = 'liquid';
  var STYLE_CLASSIC = 'classic';

  // DOM 引用
  var settingsDialog = null;
  var settingsOverlay = null;
  var settingsClose = null;
  var settingsTrigger = null;
  var mobileSettingsTrigger = null;
  var liquidToggle = null;

  // ========== Cookie 工具 ==========

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie =
      name + '=' + encodeURIComponent(value) +
      '; expires=' + d.toUTCString() +
      '; path=/; SameSite=Lax';
  }

  // ========== 样式切换 ==========

  /** 当前是否处于液态玻璃模式 */
  function isLiquid() {
    return document.documentElement.classList.contains('liquid');
  }

  /** 应用样式状态到开关 UI（不写 Cookie） */
  function syncSwitchUI() {
    if (!liquidToggle) return;
    liquidToggle.setAttribute('aria-checked', isLiquid() ? 'true' : 'false');
  }

  /** 设置液态模式开/关，并持久化到 Cookie */
  function setLiquid(enable) {
    if (enable) {
      document.documentElement.classList.add('liquid');
    } else {
      document.documentElement.classList.remove('liquid');
    }
    setCookie(COOKIE_KEY, enable ? STYLE_LIQUID : STYLE_CLASSIC, 365);
    syncSwitchUI();
  }

  // ========== 弹窗控制 ==========

  function openDialog() {
    if (!settingsDialog) return;
    settingsDialog.classList.remove('hidden');
    syncSwitchUI();
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
  }

  function closeDialog() {
    if (!settingsDialog) return;
    settingsDialog.classList.add('hidden');
    document.removeEventListener('keydown', handleEscape);
    document.body.style.overflow = '';
  }

  function handleEscape(e) {
    if (e.key === 'Escape') closeDialog();
  }

  // ========== 初始化 ==========

  function init() {
    settingsDialog = document.getElementById('settings-dialog');
    settingsOverlay = document.getElementById('settings-overlay');
    settingsClose = document.getElementById('settings-close');
    settingsTrigger = document.getElementById('settings-trigger');
    liquidToggle = document.getElementById('liquid-toggle');

    if (!settingsDialog) return;

    // 打开按钮
    if (settingsTrigger) {
      settingsTrigger.addEventListener('click', openDialog);
    }

    // 移动端设置入口：先收起侧滑菜单，再打开设置弹窗
    mobileSettingsTrigger = document.getElementById('mobile-settings-trigger');
    if (mobileSettingsTrigger) {
      mobileSettingsTrigger.addEventListener('click', function () {
        // 侧滑菜单由 mobile-menu.js 负责关闭（本按钮带 .mobile-menu-link）
        // 稍等动画收敛后再弹出设置，避免两个弹层抢焦点
        setTimeout(openDialog, 220);
      });
    }

    // 关闭按钮 & 遮罩
    if (settingsClose) settingsClose.addEventListener('click', closeDialog);
    settingsDialog.addEventListener('click', function (e) {
      if (e.target === settingsDialog || e.target === settingsOverlay) {
        closeDialog();
      }
    });

    // 开关：点击翻转
    if (liquidToggle) {
      liquidToggle.addEventListener('click', function () {
        setLiquid(!isLiquid());
      });
    }

    // 初始同步一次开关状态（head 内联脚本可能已应用 .liquid）
    syncSwitchUI();
  }

  // 暴露给外部（便于调试或其它脚本查询当前样式）
  window.ShadcnSettings = {
    isLiquid: isLiquid,
    setLiquid: setLiquid
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
