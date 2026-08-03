/**
 * ============================================
 * shadcn-hexo 主题 - 暗色模式控制器
 * ============================================
 * 功能：
 * - 支持用户手动切换亮色/暗色模式
 * - 支持基于北京时间（20:00-07:00）的自动切换
 * - 用户手动设置优先于自动切换
 * - 偏好保存在 localStorage 中
 * 依赖：无（纯原生 JS）
 */
(function () {
  'use strict';

  // ========== 配置常量 ==========

  // 自动暗色模式开始时间（北京时间，24小时制）
  var AUTO_START_HOUR = 20;

  // 自动暗色模式结束时间（北京时间，24小时制）
  var AUTO_END_HOUR = 7;

  // localStorage 存储键名
  var STORAGE_KEY = 'theme';

  // 自动检测间隔（毫秒）：每 60 秒检查一次时间
  var CHECK_INTERVAL = 60000;

  // ========== 工具函数 ==========

  /**
   * 获取当前北京时间的小时数（0-23）
   * 使用 Intl API 确保时区转换准确，不受用户本地时区影响
   * @returns {number} 当前北京时间的小时数
   */
  function getBeijingHour() {
    try {
      var timeStr = new Date().toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        hour: 'numeric',
        hour12: false
      });
      // toLocaleString 可能返回 "20" 或 "20时" 等格式，提取数字部分
      var hour = parseInt(timeStr, 10);
      // 处理 "24" 的边界情况（某些环境午夜返回 24）
      if (hour === 24) hour = 0;
      return isNaN(hour) ? new Date().getHours() : hour;
    } catch (e) {
      // 降级方案：如果 Intl API 不可用，使用本地时间
      return new Date().getHours();
    }
  }

  /**
   * 判断当前是否处于自动暗色模式时间段
   * 北京时间 20:00（含）至次日 07:00（不含）为暗色时段
   * @returns {boolean} 是否应该使用暗色模式
   */
  function isAutoDarkTime() {
    var hour = getBeijingHour();
    return hour >= AUTO_START_HOUR || hour < AUTO_END_HOUR;
  }

  /**
   * 获取用户手动设置的主题偏好
   * @returns {string|null} 'dark' | 'light' | null（未设置）
   */
  function getUserPreference() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
      return null;
    } catch (e) {
      // localStorage 不可用（隐私模式等），返回未设置
      return null;
    }
  }

  /**
   * 保存用户主题偏好到 localStorage
   * @param {string} theme - 'dark' 或 'light'
   */
  function savePreference(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      // localStorage 不可用时静默失败
    }
  }

  // ========== 主题应用 ==========

  /**
   * 应用主题到页面
   * 切换 <html> 元素的 'dark' 类
   * 图标切换由 Tailwind 的 dark: 变体自动处理（CSS 驱动），无需 JS 操作
   * @param {boolean} isDark - 是否为暗色模式
   */
  function applyTheme(isDark) {
    var root = document.documentElement;

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  // ========== 初始化 ==========

  /**
   * 初始化主题
   * 优先级：用户手动设置 > 自动时间检测
   */
  function initTheme() {
    var preference = getUserPreference();
    var isDark;

    if (preference !== null) {
      // 用户有明确偏好，使用用户设置
      isDark = preference === 'dark';
    } else {
      // 无用户偏好，使用自动时间检测
      isDark = isAutoDarkTime();
    }

    applyTheme(isDark);
  }

  /**
   * 绑定主题切换按钮的点击事件
   */
  function bindToggleButton() {
    var toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', function () {
      // 判断当前状态
      var isCurrentlyDark = document.documentElement.classList.contains('dark');

      // 切换到相反状态
      var newIsDark = !isCurrentlyDark;

      // 保存用户偏好（手动选择优先于自动切换）
      savePreference(newIsDark ? 'dark' : 'light');

      // 应用新主题
      applyTheme(newIsDark);
    });
  }

  /**
   * 启动自动检测定时器
   * 每分钟检查一次：
   * - 如果用户未手动设置偏好，根据时间自动切换
   * - 如果用户已手动设置，不做任何操作（尊重用户选择）
   */
  function startAutoCheck() {
    setInterval(function () {
      var preference = getUserPreference();

      // 仅在用户未手动设置时执行自动切换
      if (preference === null) {
        var shouldBeDark = isAutoDarkTime();
        var isCurrentlyDark = document.documentElement.classList.contains('dark');

        // 仅在状态需要变化时更新，避免不必要的 DOM 操作
        if (shouldBeDark !== isCurrentlyDark) {
          applyTheme(shouldBeDark);
        }
      }
    }, CHECK_INTERVAL);
  }

  // ========== 启动 ==========

  // 在 DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initTheme();
      bindToggleButton();
      startAutoCheck();
    });
  } else {
    // DOM 已经加载完成（脚本在底部加载的情况）
    initTheme();
    bindToggleButton();
    startAutoCheck();
  }
})();
