/**
 * ============================================
 * shadcn-hexo 主题 - 图片骨架屏加载
 * ============================================
 * 功能：
 * - 为文章图片和卡片封面添加加载占位骨架屏
 * - 图片加载完成后淡入显示，移除骨架屏
 * - 图片加载失败时优雅降级（显示 alt 文本）
 * - 支持 IntersectionObserver 懒加载（data-src 属性）
 * 依赖：无（纯原生 JS）
 */
(function () {
  'use strict';

  // 骨架屏默认高度类（用于文章内图片）
  var SKELETON_HEIGHT_CLASS = 'h-48';

  // 卡片封面骨架屏高度类
  var COVER_SKELETON_HEIGHT_CLASS = 'h-48';

  /**
   * 初始化骨架屏功能
   */
  function initSkeleton() {
    // 处理文章内容中的图片
    processImages('.article-content img');

    // 处理文章卡片封面图片
    processImages('.post-card-cover img');

    // 初始化懒加载（如果存在 data-src 属性的图片）
    initLazyLoad();
  }

  /**
   * 处理指定选择器匹配的所有图片
   * @param {string} selector - CSS 选择器
   */
  function processImages(selector) {
    var images = document.querySelectorAll(selector);

    images.forEach(function (img) {
      // 跳过已经处理过的图片
      if (img.getAttribute('data-skeleton-processed')) return;
      img.setAttribute('data-skeleton-processed', 'true');

      // 如果图片已经加载完成（浏览器缓存），无需骨架屏
      if (img.complete && img.naturalWidth > 0) {
        return;
      }

      // 创建骨架屏占位元素
      var skeleton = createSkeleton(img);

      // 将骨架屏插入到图片前面
      img.parentNode.insertBefore(skeleton, img);

      // 隐藏图片（初始透明）
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.3s ease-in-out';

      // 图片加载成功：淡入显示，移除骨架屏
      img.addEventListener('load', function () {
        // 淡入图片
        img.style.opacity = '1';

        // 移除骨架屏（带短暂延迟确保淡入动画开始）
        setTimeout(function () {
          if (skeleton.parentNode) {
            skeleton.parentNode.removeChild(skeleton);
          }
        }, 350);
      });

      // 图片加载失败：移除骨架屏，显示 alt 文本
      img.addEventListener('error', function () {
        // 移除骨架屏
        if (skeleton.parentNode) {
          skeleton.parentNode.removeChild(skeleton);
        }

        // 恢复图片可见性（显示 alt 文本和破损图标）
        img.style.opacity = '1';

        // 添加错误样式
        img.classList.add('img-load-error');
        img.style.minHeight = '80px';
        img.style.display = 'flex';
        img.style.alignItems = 'center';
        img.style.justifyContent = 'center';
        img.style.backgroundColor = 'hsl(var(--muted))';
        img.style.borderRadius = 'var(--radius)';
      });
    });
  }

  /**
   * 创建骨架屏占位元素
   * @param {HTMLElement} img - 目标图片元素
   * @returns {HTMLElement} 骨架屏 div 元素
   */
  function createSkeleton(img) {
    var skeleton = document.createElement('div');

    // 判断是否为卡片封面（使用不同的高度类）
    var isCover = img.closest('.post-card-cover') !== null;
    var heightClass = isCover ? COVER_SKELETON_HEIGHT_CLASS : SKELETON_HEIGHT_CLASS;

    skeleton.className = 'skeleton w-full ' + heightClass;

    // 如果图片有明确的宽高比，尝试匹配
    if (img.width > 0 && img.height > 0) {
      var ratio = img.height / img.width;
      // 对于宽图（如横幅），使用较小的高度
      if (ratio < 0.4) {
        skeleton.className = 'skeleton w-full h-32';
      }
    }

    // 设置 aria 属性（无障碍）
    skeleton.setAttribute('aria-hidden', 'true');

    return skeleton;
  }

  /**
   * 初始化懒加载功能
   * 使用 IntersectionObserver 监听带有 data-src 属性的图片
   * 当图片进入视口时，将 data-src 赋值给 src 开始加载
   */
  function initLazyLoad() {
    var lazyImages = document.querySelectorAll('img[data-src]');

    if (lazyImages.length === 0) return;

    // 检查浏览器是否支持 IntersectionObserver
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var img = entry.target;
            var dataSrc = img.getAttribute('data-src');

            if (dataSrc) {
              // 开始加载图片
              img.src = dataSrc;
              img.removeAttribute('data-src');
            }

            // 停止观察该图片
            obs.unobserve(img);
          }
        });
      }, {
        // 提前 200px 开始加载（预加载）
        rootMargin: '200px 0px',
        threshold: 0.01
      });

      lazyImages.forEach(function (img) {
        observer.observe(img);
      });
    } else {
      // 降级方案：不支持 IntersectionObserver 时直接加载所有图片
      lazyImages.forEach(function (img) {
        var dataSrc = img.getAttribute('data-src');
        if (dataSrc) {
          img.src = dataSrc;
          img.removeAttribute('data-src');
        }
      });
    }
  }

  // ========== 启动 ==========

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSkeleton);
  } else {
    // DOM 已就绪，直接初始化
    initSkeleton();
  }
})();
