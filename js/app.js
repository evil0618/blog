/*!
 * app.js — Shadcn-style site interactions (vanilla JS, no jQuery)
 * Handles: theme toggle, mobile drawer, back-to-top.
 * Binds by stable IDs/classes; other agents' markup must use these exact IDs.
 */
(function () {
  'use strict';

  var DARK_COLOR = '#09090b';
  var LIGHT_COLOR = '#ffffff';
  var STORAGE_KEY = 'theme';

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function isDark() {
    return document.documentElement.classList.contains('dark');
  }

  function setThemeColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    meta.setAttribute('content', isDark() ? DARK_COLOR : LIGHT_COLOR);
  }

  function updateToggleIcon(btn) {
    if (!btn) return;
    var icon = btn.querySelector('i');
    if (!icon) return;
    // Convention: button shows the action's icon.
    // Light mode -> show fa-moon (click to go dark).
    // Dark mode  -> show fa-sun  (click to go light).
    icon.classList.remove('fa-sun', 'fa-moon');
    icon.classList.add(isDark() ? 'fa-sun' : 'fa-moon');
  }

  function initThemeToggle() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;

    updateToggleIcon(btn);
    btn.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme');

    btn.addEventListener('click', function () {
      var nowDark = !isDark();
      document.documentElement.classList.toggle('dark', nowDark);
      try {
        localStorage.setItem(STORAGE_KEY, nowDark ? 'dark' : 'light');
      } catch (e) {}
      setThemeColor();
      updateToggleIcon(btn);
      btn.setAttribute('aria-label', nowDark ? 'Switch to light theme' : 'Switch to dark theme');
    });
  }

  function setDrawer(open, btn, drawer, overlay) {
    if (!drawer || !overlay) return;
    if (open) {
      drawer.classList.remove('hidden');
      overlay.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      drawer.classList.add('overscroll-contain');
      if (btn) {
        btn.setAttribute('aria-expanded', 'true');
      }
    } else {
      drawer.classList.add('hidden');
      overlay.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
      if (btn) {
        btn.setAttribute('aria-expanded', 'false');
      }
    }
  }

  function initMobileDrawer() {
    var btn = document.getElementById('mobile-menu-toggle');
    var drawer = document.getElementById('mobile-drawer');
    var overlay = document.getElementById('mobile-overlay');
    if (!drawer || !overlay) return;

    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', 'mobile-drawer');
      btn.addEventListener('click', function () {
        var willOpen = drawer.classList.contains('hidden');
        setDrawer(willOpen, btn, drawer, overlay);
      });
    }

    overlay.addEventListener('click', function () {
      setDrawer(false, btn, drawer, overlay);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !drawer.classList.contains('hidden')) {
        setDrawer(false, btn, drawer, overlay);
        if (btn) btn.focus();
      }
    });

    var links = drawer.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function () {
        setDrawer(false, btn, drawer, overlay);
      });
    }
  }

  function initBackTop() {
    var btn = document.getElementById('back-top');
    if (!btn) return;

    function onScroll() {
      if (window.scrollY > window.innerHeight) {
        btn.classList.remove('hidden');
      } else {
        btn.classList.add('hidden');
      }
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    btn.addEventListener('click', function () {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth'
      });
    });
  }

  function init() {
    initThemeToggle();
    initMobileDrawer();
    initBackTop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
