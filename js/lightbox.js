/**
 * ============================================
 * shadcn-hexo 主题 - 图片灯箱（PhotoSwipe v5）
 * ============================================
 * 功能：
 * - 为文章内图片添加点击放大查看功能
 * - 使用 PhotoSwipe v5（CDN 加载）
 * - 自动为图片包裹 <a> 标签并设置尺寸属性
 * - 支持图片加载失败的优雅降级
 * 依赖：PhotoSwipe v5（window.PhotoSwipe, window.PhotoSwipeLightbox）
 */
(function () {
  'use strict';

  /**
   * 初始化灯箱功能
   * 在 DOMContentLoaded 后执行
   */
  function initLightbox() {
    // 检查 PhotoSwipe 是否已从 CDN 加载成功
    if (typeof window.PhotoSwipe === 'undefined' ||
        typeof window.PhotoSwipeLightbox === 'undefined') {
      console.warn('[shadcn-hexo] PhotoSwipe 未加载，灯箱功能不可用');
      return;
    }

    // 获取所有文章内容区域
    var articleContents = document.querySelectorAll('.article-content');

    if (articleContents.length === 0) {
      // 当前页面没有文章内容（如首页列表页），无需初始化
      return;
    }

    // 为每篇文章中的图片设置灯箱链接
    articleContents.forEach(function (article, index) {
      setupArticleImages(article, index);
    });

    // 初始化 PhotoSwipe Lightbox 实例
    initPhotoSwipe();
  }

  /**
   * 为单篇文章中的图片设置灯箱属性
   * @param {HTMLElement} article - 文章内容容器
   * @param {number} index - 文章索引（用于分组）
   */
  function setupArticleImages(article, index) {
    // 设置分组标识，同一篇文章的图片在同一灯箱中浏览
    article.setAttribute('data-pswp-group', 'article-' + index);

    // 获取文章内所有图片
    var images = article.querySelectorAll('img');

    images.forEach(function (img) {
      // 跳过已经被包裹在灯箱链接中的图片（防止重复处理）
      if (img.parentElement && img.parentElement.classList.contains('pswp-link')) {
        return;
      }

      // 跳过没有 src 的图片
      if (!img.src) return;

      // 创建包裹链接
      var link = document.createElement('a');
      link.href = img.src;
      link.className = 'pswp-link';
      link.setAttribute('data-pswp-group', 'article-' + index);

      // 设置图片尺寸属性（PhotoSwipe 需要用于布局计算）
      var width = img.naturalWidth || img.width || 1200;
      var height = img.naturalHeight || img.height || 800;

      // 确保尺寸为有效正数
      if (width <= 0) width = 1200;
      if (height <= 0) height = 800;

      link.setAttribute('data-pswp-width', width);
      link.setAttribute('data-pswp-height', height);

      // 将链接插入到图片位置，图片移入链接内
      img.parentNode.insertBefore(link, img);
      link.appendChild(img);

      // 监听图片加载完成，更新尺寸属性（处理懒加载图片）
      if (!img.complete) {
        img.addEventListener('load', function () {
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            link.setAttribute('data-pswp-width', img.naturalWidth);
            link.setAttribute('data-pswp-height', img.naturalHeight);
          }
        });

        // 图片加载失败时的优雅处理
        img.addEventListener('error', function () {
          // 加载失败的图片不提供灯箱功能
          link.style.cursor = 'default';
          link.removeAttribute('data-pswp-width');
          link.removeAttribute('data-pswp-height');
          link.classList.remove('pswp-link');
          link.classList.add('pswp-link-disabled');
        });
      }
    });
  }

  /**
   * 初始化 PhotoSwipe Lightbox
   * 使用事件委托方式，一个实例处理所有文章图片
   */
  function initPhotoSwipe() {
    var lightbox = new window.PhotoSwipeLightbox({
      // 选择器：匹配所有文章容器内的灯箱链接
      gallery: '.article-content',
      children: 'a.pswp-link',

      // PhotoSwipe 核心模块（从 CDN 全局变量获取）
      pswpModule: window.PhotoSwipe,

      // 预加载策略：当前图片前后各预加载 1 张
      preload: [1, 1],

      // 内边距设置
      padding: { top: 40, bottom: 40, left: 20, right: 20 },

      // 背景不透明度
      bgOpacity: 0.9,

      // 缩放动画
      zoomAnimationDuration: 300,

      // 显示关闭按钮
      closeOnVerticalDrag: true,

      // 图片间距
      spacing: 0.1
    });

    // 监听灯箱打开事件（可选：用于统计或禁止背景滚动）
    lightbox.on('change', function () {
      // 图片切换时的回调（预留扩展）
    });

    // 灯箱打开时隐藏液态玻璃 Dock（避免遮挡照片 / 误触），关闭时恢复
    var dockEl = document.getElementById('liquid-dock');
    if (dockEl) {
      lightbox.on('initialZoomIn', function () {
        dockEl.classList.add('dock-hidden');
      });
      lightbox.on('close', function () {
        dockEl.classList.remove('dock-hidden');
      });
    }

    // 注册微信式放大/缩小按钮到顶部工具栏
    lightbox.on('uiRegister', function () {
      var pswp = lightbox.pswp;

      // 以视口中心为焦点，按步进缩放当前图片
      function zoomBy(factor) {
        var slide = pswp.currSlide;
        if (!slide) return;
        var levels = slide.levels || {};
        var fit = levels.fit || slide.currZoomLevel;
        var max = levels.max || fit * 4;
        var target = slide.currZoomLevel * factor;
        target = Math.max(fit, Math.min(max, target));
        slide.zoomTo(
          target,
          { x: pswp.viewportSize.x / 2, y: pswp.viewportSize.y / 2 },
          250
        );
      }

      // 缩小按钮
      pswp.ui.registerElement({
        name: 'zoomOut',
        ariaLabel: '缩小',
        order: 8,
        isButton: true,
        html:
          '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path><path d="M8 11h6"></path></svg>',
        onClick: function () {
          zoomBy(1 / 1.5);
        }
      });

      // 放大按钮
      pswp.ui.registerElement({
        name: 'zoomIn',
        ariaLabel: '放大',
        order: 9,
        isButton: true,
        html:
          '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path><path d="M8 11h6"></path><path d="M11 8v6"></path></svg>',
        onClick: function () {
          zoomBy(1.5);
        }
      });
    });

    // 初始化灯箱
    lightbox.init();
  }

  // ========== 启动 ==========

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLightbox);
  } else {
    // DOM 已就绪，直接初始化
    initLightbox();
  }
})();
