/**
 * ============================================
 * shadcn-hexo 主题 - 启动画面（Splash Screen）控制
 * ============================================
 * 功能：页面加载完成后淡出启动画面并移除 DOM 元素
 * 依赖：无（纯原生 JS）
 */
(function () {
  'use strict';

  // 淡出动画时长（毫秒），需与 CSS transition 时长一致
  var FADE_DURATION = 500;

  // 安全超时时间（毫秒）：如果 load 事件未触发，强制移除启动画面
  var FORCE_REMOVE_TIMEOUT = 5000;

  // 标记是否已经执行过移除（防止重复执行）
  var removed = false;

  /**
   * 移除启动画面
   * 先添加透明度类触发淡出动画，动画结束后从 DOM 中移除元素
   */
  function removeSplash() {
    // 防止重复执行
    if (removed) return;

    var splash = document.getElementById('splash');

    // 如果元素不存在，直接标记完成
    if (!splash) {
      removed = true;
      return;
    }

    // 添加淡出类（CSS 中已定义 transition 属性）
    splash.classList.add('opacity-0');

    // 等待淡出动画完成后，从 DOM 中彻底移除元素
    setTimeout(function () {
      if (splash.parentNode) {
        splash.parentNode.removeChild(splash);
      }
      removed = true;
    }, FADE_DURATION);
  }

  /**
   * 安全超时机制
   * 如果页面 load 事件在指定时间内未触发（例如某些资源加载缓慢），
   * 强制移除启动画面，避免用户被阻塞
   */
  var forceTimer = setTimeout(function () {
    removeSplash();
  }, FORCE_REMOVE_TIMEOUT);

  /**
   * 监听页面 load 事件
   * 所有资源（图片、样式、脚本等）加载完毕后触发
   */
  window.addEventListener('load', function () {
    // 清除安全超时计时器（load 已正常触发）
    clearTimeout(forceTimer);

    // 使用 requestAnimationFrame 确保浏览器已完成当前帧渲染
    // 避免在资源加载完成的同一帧内立即开始淡出（可能导致闪烁）
    requestAnimationFrame(function () {
      removeSplash();
    });
  });

  /**
   * 额外保护：如果 DOMContentLoaded 后 3 秒页面仍未 load
   * （例如大量图片缓慢加载），也执行移除
   * 这比 5 秒的 forceTimer 更积极地提升用户体验
   */
  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      removeSplash();
    }, 3000);
  });
})();
