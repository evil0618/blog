/**
 * ============================================
 * shadcn-hexo 主题 - 移动端侧滑菜单
 * ============================================
 * 功能：
 * - 点击汉堡按钮从右侧滑出导航菜单
 * - 点击遮罩 / 关闭按钮 / 菜单链接 / Esc 键关闭
 * - 打开时锁定背景滚动
 * - 窗口放大到桌面尺寸时自动关闭，避免状态残留
 */
(function () {
  'use strict';

  var menu = null;
  var overlay = null;
  var openBtn = null;
  var closeBtn = null;
  var isOpen = false;

  function init() {
    menu = document.getElementById('mobile-menu');
    overlay = document.getElementById('mobile-menu-overlay');
    openBtn = document.getElementById('mobile-menu-toggle');
    closeBtn = document.getElementById('mobile-menu-close');

    if (!menu || !openBtn) return;

    openBtn.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);

    // 点击菜单里的链接后自动收起
    var links = menu.querySelectorAll('.mobile-menu-link');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', closeMenu);
    }

    // Esc 关闭
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) closeMenu();
    });

    // 窗口变宽（切到桌面布局）时自动关闭，防止菜单卡在半开状态
    window.addEventListener('resize', function () {
      if (isOpen && window.innerWidth >= 640) closeMenu();
    });
  }

  function openMenu() {
    isOpen = true;
    if (overlay) {
      overlay.classList.remove('opacity-0', 'pointer-events-none');
    }
    menu.classList.remove('translate-x-full');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    isOpen = false;
    if (overlay) {
      overlay.classList.add('opacity-0', 'pointer-events-none');
    }
    menu.classList.add('translate-x-full');
    document.body.style.overflow = '';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
