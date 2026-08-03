/**
 * ============================================
 * shadcn-hexo 主题 - 主脚本（公共工具与交互）
 * ============================================
 * 功能：
 * - 通用工具函数（防抖、日期格式化）
 * - 锚点平滑滚动
 * - 返回顶部按钮（动态创建，滚动 300px 后显示）
 * 依赖：无（纯原生 JS）
 */
(function () {
  'use strict';

  // ========== 工具函数 ==========

  /**
   * 防抖函数
   * 在指定延迟内如果再次调用，则重新计时
   * @param {Function} fn - 需要防抖的函数
   * @param {number} delay - 延迟时间（毫秒）
   * @returns {Function} 防抖后的函数
   */
  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var context = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    };
  }

  /**
   * 格式化日期
   * 将日期对象格式化为 YYYY-MM-DD 或自定义格式
   * @param {Date|string|number} date - 日期对象、时间戳或日期字符串
   * @param {string} format - 格式模板，默认 'YYYY-MM-DD'
   * @returns {string} 格式化后的日期字符串
   */
  function formatDate(date, format) {
    if (!date) return '';

    var d;
    if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'number') {
      d = new Date(date);
    } else {
      d = new Date(date);
    }

    // 无效日期检查
    if (isNaN(d.getTime())) return '';

    format = format || 'YYYY-MM-DD';

    var year = d.getFullYear();
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var hours = d.getHours();
    var minutes = d.getMinutes();
    var seconds = d.getSeconds();

    // 补零
    function pad(n) {
      return n < 10 ? '0' + n : '' + n;
    }

    return format
      .replace('YYYY', year)
      .replace('MM', pad(month))
      .replace('DD', pad(day))
      .replace('HH', pad(hours))
      .replace('mm', pad(minutes))
      .replace('ss', pad(seconds));
  }

  // 将工具函数挂载到全局（供其他脚本或模板使用）
  window.ShadcnHexoUtils = {
    debounce: debounce,
    formatDate: formatDate
  };

  // ========== 锚点平滑滚动 ==========

  /**
   * 初始化锚点平滑滚动
   * 为页面内所有锚点链接添加平滑滚动行为
   */
  function initSmoothScroll() {
    document.addEventListener('click', function (e) {
      // 查找最近的锚点链接
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;

      var targetId = link.getAttribute('href');

      // 跳过空锚点
      if (targetId === '#' || targetId === '') return;

      var target = document.querySelector(targetId);
      if (!target) return;

      // 阻止默认跳转行为
      e.preventDefault();

      // 平滑滚动到目标位置
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      // 更新 URL hash（不触发页面跳转）
      if (window.history && window.history.pushState) {
        window.history.pushState(null, '', targetId);
      }
    });
  }

  // ========== 返回顶部按钮 ==========

  // 返回顶部按钮元素引用
  var backToTopBtn = null;

  // 显示按钮的滚动阈值（像素）
  var SCROLL_THRESHOLD = 300;

  /**
   * 创建返回顶部按钮
   * 动态创建 DOM 元素，使用 shadcn 按钮样式
   */
  function createBackToTopButton() {
    backToTopBtn = document.createElement('button');
    backToTopBtn.id = 'back-to-top';
    backToTopBtn.setAttribute('aria-label', '返回顶部');
    backToTopBtn.setAttribute('title', '返回顶部');

    // shadcn 风格按钮样式：固定定位、圆形、带阴影
    backToTopBtn.className =
      'fixed bottom-6 right-6 z-50 inline-flex items-center justify-center ' +
      'rounded-full h-10 w-10 border border-border bg-background ' +
      'text-foreground shadow-md transition-all duration-300 ' +
      'hover:bg-accent hover:text-accent-foreground ' +
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
      'opacity-0 pointer-events-none';

    // 向上箭头 SVG 图标
    backToTopBtn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" ' +
      'viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="m18 15-6-6-6 6"/></svg>';

    // 点击事件：平滑滚动到页面顶部
    backToTopBtn.addEventListener('click', function () {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });

    // 添加到页面
    document.body.appendChild(backToTopBtn);
  }

  /**
   * 根据滚动位置切换返回顶部按钮的可见性
   */
  function toggleBackToTopVisibility() {
    if (!backToTopBtn) return;

    var scrollY = window.pageYOffset || document.documentElement.scrollTop;

    if (scrollY > SCROLL_THRESHOLD) {
      // 显示按钮
      backToTopBtn.classList.remove('opacity-0', 'pointer-events-none');
      backToTopBtn.classList.add('opacity-100');
    } else {
      // 隐藏按钮
      backToTopBtn.classList.add('opacity-0', 'pointer-events-none');
      backToTopBtn.classList.remove('opacity-100');
    }
  }

  /**
   * 初始化返回顶部功能
   */
  function initBackToTop() {
    createBackToTopButton();

    // 监听滚动事件（使用防抖优化性能）
    var handleScroll = debounce(toggleBackToTopVisibility, 50);
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 初始状态检查
    toggleBackToTopVisibility();
  }

  // ========== 启动 ==========

  /**
   * 主初始化函数
   */
  function init() {
    initSmoothScroll();
    initBackToTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM 已就绪，直接初始化
    init();
  }
})();
