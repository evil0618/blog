/**
 * ============================================
 * shadcn-hexo 主题 - Liquid Glass 折射引擎 v3
 * ============================================
 * 对标 iOS 26「Liquid Glass」的观感拆解：
 *   - 玻璃中心是"清"的：内容几乎不糊，只有极轻的柔化（blur ~2px）
 *   - 折射集中在圆角边缘：feDisplacementMap 沿 SDF 法线把边缘画面
 *     向外"拉弯"，形成苹果那种镜片边缘的弯曲感
 *   - 饱和度和亮度轻微提升，白色填充很薄（~12-16%），主要靠
 *     边缘高光 + 折射出镜，而不是靠"磨砂白"
 *   - 环境光随滚动产生视差，折射出来的彩色随之流动
 * 性能策略：
 *   - 位移图按 (尺寸,圆角) 缓存，避免重复生成
 *   - 位移图降采样（长边封顶 300px），折射是柔和渐变，低分辨率足够
 *   - 只对少量大表面做真折射，卡片列表等用纯 CSS 玻璃
 *   - 滚动视差走 rAF + CSS 变量，不触发 JS 布局
 * 非 Chromium 浏览器整体降级为 liquid.css 的纯 CSS 玻璃。
 */
(function () {
  'use strict';

  // ===== 折射参数（对标 iOS 26：清中心 + 强边缘） =====
  var DISPLACEMENT_SCALE = 46;  // 边缘折射最大偏移
  var EDGE_BLUR = 0.6;          // 折射前轻柔化
  var SOFT_BLUR = 2;            // 折射后整体轻模糊（保持"清玻璃"）
  var SATURATE = 182;
  var BRIGHTNESS = 108;
  var MAP_MAX_DIM = 300;        // 位移图长边上限（降采样）

  // 参与真折射的表面（数量少，控性能；卡片用纯 CSS 玻璃）
  var SURFACE_SELECTOR = [
    'header.sticky',
    '.article-page',
    '#search-dialog > div:last-child',
    '#settings-dialog > div:last-child',
    '#mobile-menu'
  ].join(',');

  // ===== 能力检测 =====
  function isChromium() { return /Chrom(e|ium)/.test(navigator.userAgent); }
  function reducedTransparency() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-transparency: reduce)').matches);
  }

  var SUPPORTED = isChromium() && window.CSS && window.CSS.supports &&
    window.CSS.supports('backdrop-filter', 'blur(1px)') && !reducedTransparency();

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var XLINK_NS = 'http://www.w3.org/1999/xlink';
  var surfaces = [];
  var mapCache = {};
  var defsSvg = null;
  var active = false;
  var rebuildTimer = 0, dialogTimer = 0;

  function isLiquid() { return document.documentElement.classList.contains('liquid'); }

  // ===== SVG 滤镜容器 =====
  function ensureDefs() {
    if (defsSvg && document.body.contains(defsSvg)) return defsSvg;
    defsSvg = document.createElementNS(SVG_NS, 'svg');
    defsSvg.setAttribute('width', '0');
    defsSvg.setAttribute('height', '0');
    defsSvg.style.position = 'absolute';
    defsSvg.style.left = '0';
    defsSvg.style.top = '0';
    defsSvg.style.overflow = 'hidden';
    defsSvg.setAttribute('aria-hidden', 'true');
    document.body.appendChild(defsSvg);
    return defsSvg;
  }

  function makeFilter(id) {
    var host = ensureDefs();
    var f = document.getElementById(id);
    if (f) { while (f.firstChild) f.removeChild(f.firstChild); return f; }
    f = document.createElementNS(SVG_NS, 'filter');
    f.id = id;
    f.setAttribute('x', '0'); f.setAttribute('y', '0');
    f.setAttribute('width', '100%'); f.setAttribute('height', '100%');
    host.appendChild(f);
    return f;
  }

  function clampNum(v, a, b) { return v < a ? a : (v > b ? b : v); }

  // ===== 位移图：圆角矩形（表面折射） =====
  // 中心 128（不偏移），越靠近边缘沿 SDF 法线向外偏移越强，
  // 过渡带用 smoothstep，得到平滑的"镜片边缘"折射。
  function buildRoundRectMap(w, h, r) {
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    var imgData = ctx.createImageData(w, h);
    var d = imgData.data;
    var band = clampNum(Math.min(w, h) * 0.22, 8, 34);
    var rad = clampNum(r, 0, Math.min(w, h) / 2);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        var qx = clampNum(x, rad, w - rad);
        var qy = clampNum(y, rad, h - rad);
        var dx = x - qx, dy = y - qy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > rad) { d[i]=128; d[i+1]=128; d[i+2]=128; d[i+3]=255; continue; }
        var edge, nx, ny;
        if (dist > 0.001) { edge = rad - dist; nx = dx / dist; ny = dy / dist; }
        else {
          var dl=x, dr=w-x, dt=y, db=h-y;
          var m = Math.min(Math.min(dl,dr), Math.min(dt,db));
          edge=m; nx=(m===dl)?-1:(m===dr)?1:0; ny=(m===dt)?-1:(m===db)?1:0;
        }
        var mag=0;
        if (edge<band){ var t=1-edge/band; mag=t*t*(3-2*t); }
        var p=mag*127;
        d[i]=128+Math.round(nx*p); d[i+1]=128+Math.round(ny*p); d[i+2]=128; d[i+3]=255;
      }
    }
    ctx.putImageData(imgData,0,0);
    return canvas.toDataURL('image/png');
  }

  /** 带缓存 + 降采样的圆角矩形位移图 */
  function roundRectMap(w, h, r) {
    var scale = Math.min(1, MAP_MAX_DIM / Math.max(w, h));
    var sw = Math.max(2, Math.round(w * scale));
    var sh = Math.max(2, Math.round(h * scale));
    var sr = Math.max(0, r * scale);
    var key = sw + 'x' + sh + 'r' + Math.round(sr);
    if (mapCache[key]) return mapCache[key];
    var url = buildRoundRectMap(sw, sh, sr);
    if (url) mapCache[key] = url;
    return url;
  }

  // ===== 滤镜装配 =====
  function buildSurfaceFilter(id, dataUrl, w, h, scale) {
    var f = makeFilter(id);
    var blur = document.createElementNS(SVG_NS,'feGaussianBlur');
    blur.setAttribute('in','SourceGraphic'); blur.setAttribute('stdDeviation', String(EDGE_BLUR));
    blur.setAttribute('result','soft'); f.appendChild(blur);
    var img = document.createElementNS(SVG_NS,'feImage');
    img.setAttribute('href', dataUrl);
    img.setAttributeNS(XLINK_NS,'xlink:href', dataUrl);
    img.setAttribute('x','0'); img.setAttribute('y','0');
    img.setAttribute('width', String(w)); img.setAttribute('height', String(h));
    img.setAttribute('preserveAspectRatio','none'); img.setAttribute('result','map');
    f.appendChild(img);
    var disp = document.createElementNS(SVG_NS,'feDisplacementMap');
    disp.setAttribute('in','soft'); disp.setAttribute('in2','map');
    disp.setAttribute('scale', String(scale));
    disp.setAttribute('xChannelSelector','R'); disp.setAttribute('yChannelSelector','G');
    f.appendChild(disp);
  }

  // ===== 表面管理 =====
  function collectSurfaces() {
    var nodes = document.querySelectorAll(SURFACE_SELECTOR);
    var next = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var exist = null;
      for (var j = 0; j < surfaces.length; j++) if (surfaces[j].el === el) { exist = surfaces[j]; break; }
      next.push(exist || { el: el, filterId: 'lg-refract-' + i, w: 0, h: 0 });
      if (!exist) next[next.length-1].filterId = 'lg-refract-' + i;
    }
    surfaces = next;
  }

  function clearInline() {
    for (var i = 0; i < surfaces.length; i++) {
      var st = surfaces[i].el && surfaces[i].el.style;
      if (st) { st.backdropFilter=''; st.webkitBackdropFilter=''; }
    }
  }

  function rebuild(force) {
    if (!isLiquid()) return;
    collectSurfaces();
    for (var i = 0; i < surfaces.length; i++) {
      var s = surfaces[i], el = s.el;
      if (!el || !el.isConnected) continue;
      var rect = el.getBoundingClientRect();
      var w = Math.round(rect.width), h = Math.round(rect.height);
      if (w < 24 || h < 24) continue;
      var cs = window.getComputedStyle(el);
      var r = parseFloat(cs.borderTopLeftRadius) || 24;
      if (!force && s.w === w && s.h === h && el.style.backdropFilter) continue;
      var dataUrl = roundRectMap(w, h, r);
      if (!dataUrl) continue;
      s.w = w; s.h = h;
      buildSurfaceFilter(s.filterId, dataUrl, w, h, DISPLACEMENT_SCALE);
      var v = 'url(#' + s.filterId + ') blur(' + SOFT_BLUR + 'px) saturate(' + SATURATE + '%) brightness(' + BRIGHTNESS + '%)';
      el.style.backdropFilter = v;
      el.style.webkitBackdropFilter = v;
    }
  }

  // ===== 环境光滚动视差（折射随滚动"活"起来） =====
  var scrollRAF = 0;
  function onScroll() {
    if (scrollRAF) return;
    scrollRAF = requestAnimationFrame(function () {
      scrollRAF = 0;
      document.documentElement.style.setProperty('--lg-scroll', String(window.scrollY || 0));
    });
  }

  // ===== 状态切换 =====
  function applyState() {
    if (isLiquid()) {
      if (!active) {
        active = true;
        rebuild(true);
        document.documentElement.style.setProperty('--lg-scroll', String(window.scrollY || 0));
        window.addEventListener('scroll', onScroll, { passive: true });
      }
    } else if (active) {
      active = false;
      clearInline();
      window.removeEventListener('scroll', onScroll);
    }
  }

  function scheduleRebuild() {
    if (!active) return;
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(function(){ rebuild(true); }, 260);
  }
  function scheduleDialogCheck() {
    if (!active) return;
    clearTimeout(dialogTimer);
    dialogTimer = setTimeout(function(){ rebuild(false); }, 130);
  }

  // ===== 启动 =====
  function init() {
    if (!SUPPORTED) return;
    collectSurfaces();
    applyState();

    new MutationObserver(applyState).observe(document.documentElement, {
      attributes: true, attributeFilter: ['class']
    });

    var dlgObs = new MutationObserver(scheduleDialogCheck);
    ['search-dialog','settings-dialog','mobile-menu'].forEach(function(id){
      var el = document.getElementById(id);
      if (el) dlgObs.observe(el, { attributes:true, attributeFilter:['class'] });
    });

    var rz = 0;
    window.addEventListener('resize', function(){
      clearTimeout(rz); rz = setTimeout(scheduleRebuild, 200);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
