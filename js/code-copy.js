/**
 * ============================================
 * shadcn-hexo 主题 - 代码块优化 + 一键复制
 * ============================================
 * 功能：
 * - 为 Hexo 高亮代码块（figure.highlight）套一层容器并加头部栏
 * - 头部栏展示语言标签 + "复制"按钮，点击复制代码并给出反馈
 * - 同时兼容普通 <pre><code> 代码块
 * - 与亮/暗模式、经典/液态玻璃两种样式都兼容
 * 依赖：无（纯原生 JS）
 */
(function () {
  'use strict';

  /** 语言显示名映射（可按需扩展） */
  var LANG_LABELS = {
    js: 'JavaScript',
    javascript: 'JavaScript',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    jsx: 'JSX',
    tsx: 'TSX',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    json: 'JSON',
    bash: 'Bash',
    sh: 'Shell',
    shell: 'Shell',
    zsh: 'Shell',
    py: 'Python',
    python: 'Python',
    java: 'Java',
    c: 'C',
    cpp: 'C++',
    'c++': 'C++',
    cs: 'C#',
    go: 'Go',
    rust: 'Rust',
    yaml: 'YAML',
    yml: 'YAML',
    md: 'Markdown',
    markdown: 'Markdown',
    sql: 'SQL',
    plain: '代码',
    text: '代码'
  };

  /**
   * 从 figure.highlight 的 class 中提取语言
   * Hexo 输出形如 class="highlight js"
   */
  function detectLang(figure) {
    var classes = figure.className.split(/\s+/);
    for (var i = 0; i < classes.length; i++) {
      var c = classes[i];
      if (c && c !== 'highlight' && c !== 'highlight-figure') {
        return c.toLowerCase();
      }
    }
    return '';
  }

  /** 读取语言对应的显示标签 */
  function langLabel(lang) {
    return LANG_LABELS[lang] || (lang ? lang.toUpperCase() : '代码');
  }

  /**
   * 提取代码块的纯文本（用于复制）
   * 优先从 .code 中的 .line 逐行拼接，保证换行正确
   */
  function extractCode(container) {
    var codeCell = container.querySelector('.code');
    var scope = codeCell || container;

    var lines = scope.querySelectorAll('.line');
    if (lines.length > 0) {
      var arr = [];
      lines.forEach(function (line) {
        arr.push(line.textContent);
      });
      return arr.join('\n');
    }

    // 兜底：直接取 pre/code 文本
    var pre = scope.querySelector('pre') || scope;
    return pre.textContent || '';
  }

  /** 复制文本到剪贴板（带回退方案） */
  function copyText(text, onDone) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { onDone(true); },
        function () { fallbackCopy(text, onDone); }
      );
    } else {
      fallbackCopy(text, onDone);
    }
  }

  function fallbackCopy(text, onDone) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      onDone(ok);
    } catch (err) {
      onDone(false);
    }
  }

  /** 构建头部栏（语言标签 + 复制按钮） */
  function buildHeader(lang, getCode) {
    var header = document.createElement('div');
    header.className = 'highlight-header';

    var label = document.createElement('span');
    label.className = 'highlight-lang';
    label.textContent = langLabel(lang);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'highlight-copy';
    btn.setAttribute('aria-label', '复制代码');
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>' +
      '<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>' +
      '</svg>' +
      '<span class="highlight-copy-text">复制</span>';

    btn.addEventListener('click', function () {
      var text = getCode();
      copyText(text, function (ok) {
        var textEl = btn.querySelector('.highlight-copy-text');
        if (textEl) {
          textEl.textContent = ok ? '已复制' : '复制失败';
        }
        btn.classList.add('copied');
        setTimeout(function () {
          if (textEl) textEl.textContent = '复制';
          btn.classList.remove('copied');
        }, 1600);
      });
    });

    header.appendChild(label);
    header.appendChild(btn);
    return header;
  }

  /** 包装一个 Hexo figure.highlight */
  function wrapFigure(figure) {
    if (figure.getAttribute('data-code-processed')) return;
    figure.setAttribute('data-code-processed', 'true');

    var lang = detectLang(figure);

    var wrapper = document.createElement('div');
    wrapper.className = 'highlight-figure';

    figure.parentNode.insertBefore(wrapper, figure);
    wrapper.appendChild(figure);

    var header = buildHeader(lang, function () {
      return extractCode(wrapper);
    });
    wrapper.insertBefore(header, figure);
  }

  /** 包装一个普通 <pre>（未被 Hexo 高亮包裹的） */
  function wrapPlainPre(pre) {
    if (pre.getAttribute('data-code-processed')) return;
    pre.setAttribute('data-code-processed', 'true');

    var wrapper = document.createElement('div');
    wrapper.className = 'highlight-figure plain-code';

    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    var header = buildHeader('', function () {
      return pre.textContent || '';
    });
    wrapper.insertBefore(header, pre);
  }

  function init() {
    // 1. Hexo 高亮代码块
    var figures = document.querySelectorAll('.article-content figure.highlight');
    figures.forEach(wrapFigure);

    // 2. 兜底：未被 figure 包裹的独立 pre（排除已在 figure 内的）
    var pres = document.querySelectorAll('.article-content pre');
    pres.forEach(function (pre) {
      if (pre.closest('figure.highlight')) return; // 已处理
      if (pre.closest('.highlight-figure')) return; // 已包裹
      wrapPlainPre(pre);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
