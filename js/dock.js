/**
 * ============================================
 * shadcn-hexo 主题 - 液态玻璃快捷 Dock
 * ============================================
 * 仿 iOS 26 / Apple 相册底栏：
 * - 提供 首页 / 搜索 / 回到顶部 三个快捷操作
 * - 一颗"水滴"高亮 blob 在按钮间流动形变：
 *   移动时先朝目标方向拉伸（前缘先走），随后后缘追上并弹性收敛成圆润水滴，
 *   与 Apple 底栏选中态的液态效果一致。
 *
 * 几何说明（修 Android 椭圆问题的关键）：
 * - 统一使用 offsetLeft / offsetWidth（布局值，不受 transform 影响）。
 *   旧版用 getBoundingClientRect()，会被 Dock 入场动画的 scale(0.9→1)
 *   污染，导致 blob 宽度被算小、停在"主页"上时变成椭圆。
 * - blob 的 style.left 与按钮 offsetLeft 的坐标原点可能相差一个常量
 *   （padding/border 基准不同），所以只计算两者的 *差值* 再叠加到
 *   blob 当前计算 left 上，常量自然抵消。
 *
 * 仅在液态玻璃模式下可见（CSS 控制），经典模式下按钮点击仍可用。
 */
(function () {
  'use strict';

  var dock = null;
  var blob = null;
  var items = [];
  var activeAction = 'home';
  var morphTimer = 0;

  // ========== 几何工具 ==========

  /** blob 当前 style.left 的计算值（px，相对 Dock padding box） */
  function blobComputedLeft() {
    var v = parseFloat(window.getComputedStyle(blob).left);
    return isNaN(v) ? 0 : v;
  }

  /**
   * 两相水滴形变：把 blob 移到 btn。
   * 向右 → 阶段1 宽度先拉到目标右缘（left 不动）；阶段2 left 追上 + 宽度收敛。
   * 向左 → 镜像：left 先到目标左缘 + 宽度拉开；再收敛。
   * 收敛用带回弹的贝塞尔曲线，落定后是正圆（宽 = 按钮宽 = blob 高）。
   */
  function morphBlobTo(btn) {
    if (!blob || !btn || !btn.isConnected) return;

    // 目标与当前几何（全部来自布局值，免疫 transform/动画污染）
    var targetLeft = btn.offsetLeft;
    var targetWidth = btn.offsetWidth;
    var curLeftOffset = blob.offsetLeft;
    var curWidth = blob.offsetWidth;
    var baseLeft = blobComputedLeft();

    var delta = targetLeft - curLeftOffset;
    if (Math.abs(delta) < 1 && Math.abs(targetWidth - curWidth) < 1) return;

    var endLeft = baseLeft + delta;
    var stretchLeft, stretchWidth;

    if (delta > 0) {
      // 向右：前缘（右侧）先扑到目标右缘
      stretchLeft = baseLeft;
      stretchWidth = curWidth + delta;
    } else {
      // 向左：前缘（左侧）先扑到目标左缘
      stretchLeft = baseLeft + delta;
      stretchWidth = curWidth - delta;
    }

    clearTimeout(morphTimer);

    // 阶段 1：拉伸（快，ease-out）
    blob.style.transition =
      'left 0.2s cubic-bezier(0.4, 0, 0.2, 1), width 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
    blob.style.left = stretchLeft + 'px';
    blob.style.width = stretchWidth + 'px';

    morphTimer = setTimeout(function () {
      // 阶段 2：后缘追赶 + 弹性收敛成水滴圆
      blob.style.transition =
        'left 0.46s cubic-bezier(0.3, 1.35, 0.45, 1), width 0.46s cubic-bezier(0.3, 1.35, 0.45, 1)';
      blob.style.left = endLeft + 'px';
      blob.style.width = targetWidth + 'px';

      morphTimer = setTimeout(function () {
        // 交还给 CSS 里的默认 transition，避免残留内联值
        blob.style.transition = '';
      }, 500);
    }, 170);
  }

  /** 无动画地把 blob 吸附到 btn（初始定位 / resize） */
  function snapBlobTo(btn) {
    if (!blob || !btn || !btn.isConnected) return;
    clearTimeout(morphTimer);
    var baseLeft = blobComputedLeft();
    var delta = btn.offsetLeft - blob.offsetLeft;
    blob.style.transition = 'none';
    blob.style.left = baseLeft + delta + 'px';
    blob.style.width = btn.offsetWidth + 'px';
    // 双 rAF 后恢复，让后续交互走 CSS 过渡
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        blob.style.transition = '';
      });
    });
  }

  function activeBtn() {
    for (var i = 0; i < items.length; i++) {
      if (items[i].getAttribute('data-action') === activeAction) return items[i];
    }
    return items[0];
  }

  // ========== 行为 ==========

  function siteRoot() {
    var m = document.querySelector('meta[name="site-root"]');
    return m ? m.getAttribute('content') : '/';
  }

  function doAction(action) {
    switch (action) {
      case 'home':
        window.location.href = siteRoot();
        break;
      case 'search': {
        var s = document.getElementById('search-trigger');
        if (s) s.click();
        break;
      }
      case 'top':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
    }
  }

  // ========== 初始化 ==========

  function init() {
    dock = document.getElementById('liquid-dock');
    if (!dock) return;
    blob = dock.querySelector('.dock-blob');
    items = Array.prototype.slice.call(dock.querySelectorAll('.dock-item'));

    items.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-action');
        // 水滴先吸附到被点击的按钮
        activeAction = action;
        morphBlobTo(btn);
        doAction(action);
      });

      // 悬停时水滴跟随（触屏基本不会触发 mouseenter）
      btn.addEventListener('mouseenter', function () {
        morphBlobTo(btn);
      });
    });

    // 指针离开 dock，水滴回到激活项
    dock.addEventListener('mouseleave', function () {
      morphBlobTo(activeBtn());
    });

    // 初始定位：等布局稳定后无动画吸附到激活项
    requestAnimationFrame(function () {
      snapBlobTo(activeBtn());
    });

    window.addEventListener('resize', function () {
      snapBlobTo(activeBtn());
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
