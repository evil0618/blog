/**
 * ============================================
 * shadcn-hexo 主题 - 站内搜索（FlexSearch + 命令面板 UI）
 * ============================================
 * 功能：
 * - 基于 FlexSearch 的全文搜索（中文单字 + 二字词分词）
 * - 从 search.xml（hexo-generator-search 生成）构建索引，含分类/标签
 * - Spotlight 式交互：Ctrl/Cmd+K 打开、上下键选择、回车跳转、Esc 关闭
 * - 关键词 <mark> 高亮、命中计数、引导 / 加载 / 无结果 / 出错四种状态
 * - 输入法（IME）组词期间不触发搜索，避免拼音串干扰
 * 依赖：FlexSearch（window.FlexSearch）、search-dialog.ejs、search.css
 */
(function () {
  'use strict';

  // ========== 状态 ==========

  var searchIndex = null;       // FlexSearch Document 索引
  var searchData = [];          // 原始条目：title, url, content, category, tags
  var indexPromise = null;      // 索引构建 Promise（懒加载，只构建一次）
  var debounceTimer = 0;
  var DEBOUNCE_DELAY = 260;

  var resultNodes = [];         // 当前渲染出的结果 DOM
  var resultUrls = [];          // 与 resultNodes 对应的跳转地址
  var activeIndex = -1;         // 键盘导航选中项（-1 = 未选中）
  var composing = false;        // IME 组词中

  // ========== DOM ==========

  var searchDialog, searchOverlay, searchInput, searchResults;
  var stateIdle, stateLoading, stateEmpty, stateError, emptyQueryEl;
  var searchCount;

  // ========== 初始化 ==========

  function initSearch() {
    searchDialog = document.getElementById('search-dialog');
    if (!searchDialog) return;

    searchOverlay = document.getElementById('search-overlay');
    searchInput = document.getElementById('search-input');
    searchResults = document.getElementById('search-results');
    stateIdle = document.getElementById('search-idle');
    stateLoading = document.getElementById('search-loading');
    stateEmpty = document.getElementById('search-empty');
    stateError = document.getElementById('search-error');
    emptyQueryEl = document.getElementById('search-empty-query');
    searchCount = document.getElementById('search-count');

    var searchTrigger = document.getElementById('search-trigger');
    var searchClose = document.getElementById('search-close');

    if (searchTrigger) searchTrigger.addEventListener('click', openDialog);
    if (searchClose) searchClose.addEventListener('click', closeDialog);

    // 输入（防抖 + IME 兼容）
    searchInput.addEventListener('input', function () {
      if (composing) return;
      scheduleSearch();
    });
    searchInput.addEventListener('compositionstart', function () { composing = true; });
    searchInput.addEventListener('compositionend', function () {
      composing = false;
      scheduleSearch();
    });

    // 键盘导航（只在输入框聚焦时）
    searchInput.addEventListener('keydown', function (e) {
      if (e.isComposing) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); moveActive(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveActive(-1); }
      else if (e.key === 'Home' && resultNodes.length) { e.preventDefault(); setActive(0); }
      else if (e.key === 'End' && resultNodes.length) { e.preventDefault(); setActive(resultNodes.length - 1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        var i = activeIndex >= 0 ? activeIndex : 0;
        if (resultUrls[i]) window.location.href = resultUrls[i];
      }
    });

    // Ctrl/Cmd + K 切换
    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (searchDialog.classList.contains('hidden')) openDialog();
        else closeDialog();
      }
    });

    // Esc 关闭
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !searchDialog.classList.contains('hidden')) {
        closeDialog();
      }
    });

    // 点击遮罩 / 弹窗空白处关闭
    searchDialog.addEventListener('click', function (e) {
      if (e.target === searchDialog || e.target === searchOverlay) closeDialog();
    });
  }

  function scheduleSearch() {
    var query = searchInput.value.trim();
    clearTimeout(debounceTimer);
    if (!query) {
      clearResults();
      showState('idle');
      return;
    }
    debounceTimer = setTimeout(function () { doSearch(query); }, DEBOUNCE_DELAY);
  }

  // ========== 弹窗控制 ==========

  function openDialog() {
    searchDialog.classList.remove('hidden');
    searchDialog.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { searchInput.focus(); }, 40);
  }

  function closeDialog() {
    searchDialog.classList.add('hidden');
    searchDialog.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // 复位：下次打开回到引导态
    searchInput.value = '';
    composing = false;
    clearTimeout(debounceTimer);
    clearResults();
    showState('idle');
  }

  // ========== 状态切换 ==========

  function showState(name) {
    if (stateIdle) stateIdle.hidden = name !== 'idle';
    if (stateLoading) stateLoading.hidden = name !== 'loading';
    if (stateEmpty) stateEmpty.hidden = name !== 'empty';
    if (stateError) stateError.hidden = name !== 'error';
    if (searchResults) searchResults.style.display = name === 'results' ? '' : 'none';
    if (searchCount && name !== 'results') searchCount.textContent = '';
  }

  function clearResults() {
    if (searchResults) searchResults.innerHTML = '';
    resultNodes = [];
    resultUrls = [];
    activeIndex = -1;
    if (searchCount) searchCount.textContent = '';
  }

  // ========== 索引构建 ==========

  function buildIndex() {
    var rootMeta = document.querySelector('meta[name="site-root"]');
    var siteRoot = rootMeta ? rootMeta.getAttribute('content') : '/';

    return fetch(siteRoot + 'search.xml')
      .then(function (response) {
        if (!response.ok) throw new Error('搜索数据加载失败: ' + response.status);
        return response.text();
      })
      .then(function (xmlText) {
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        if (xmlDoc.querySelector('parsererror')) throw new Error('搜索数据 XML 解析失败');

        var entries = xmlDoc.querySelectorAll('entry');
        entries.forEach(function (entry) {
          var title = text(entry.querySelector('title'));
          var url = text(entry.querySelector('url'));
          var content = stripHtml(text(entry.querySelector('content')));
          var category = text(entry.querySelector('categories category'));
          var tags = [];
          entry.querySelectorAll('tags tag').forEach(function (t) {
            var v = t.textContent.trim();
            if (v) tags.push(v);
          });

          if (title && url) {
            searchData.push({
              id: searchData.length,
              title: title,
              url: url,
              content: content,
              category: category,
              tags: tags.join(' ')
            });
          }
        });

        if (!window.FlexSearch) throw new Error('FlexSearch 库未加载');

        // 自定义分词：中文按单字 + 二元词，英文按单词
        searchIndex = new window.FlexSearch.Document({
          encode: encodeTokens,
          cache: 100,
          document: {
            id: 'id',
            index: ['title', 'content', 'tags']
          }
        });

        searchData.forEach(function (item) {
          searchIndex.add({
            id: item.id,
            title: item.title,
            content: item.content,
            tags: item.tags
          });
        });
      });
  }

  function text(el) {
    return el ? el.textContent.trim() : '';
  }

  function stripHtml(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  /**
   * 自定义分词器（FlexSearch encode）
   * 中文：单字 + 相邻二字词；其它：小写后按非字母数字切分
   */
  function encodeTokens(str) {
    if (!str) return [];
    var CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
    var tokens = [];
    var parts = String(str).split(/([\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+)/);

    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      if (!part) continue;
      if (CJK.test(part)) {
        var len = part.length;
        if (len === 1) { tokens.push(part); continue; }
        for (var j = 0; j < len; j++) {
          tokens.push(part.charAt(j));
          if (j < len - 1) tokens.push(part.substring(j, j + 2));
        }
      } else {
        var words = part.toLowerCase().split(/[^a-z0-9]+/);
        for (var k = 0; k < words.length; k++) {
          if (words[k]) tokens.push(words[k]);
        }
      }
    }
    return tokens;
  }

  // ========== 搜索执行 ==========

  function doSearch(query) {
    if (!indexPromise) {
      showState('loading');
      indexPromise = buildIndex();
      indexPromise.catch(function () { indexPromise = null; }); // 失败后允许重试
    }
    indexPromise
      .then(function () { executeSearch(query); })
      .catch(function (error) {
        console.error('[shadcn-hexo] 搜索索引构建失败:', error);
        showState('error');
      });
  }

  /** AND 精确 → OR 宽松 的两级策略 */
  function executeSearch(query) {
    try {
      var results = searchIndex.search(query, { limit: 20, bool: 'and' });
      var matchedIds = collectIds(results);
      if (matchedIds.length === 0) {
        results = searchIndex.search(query, { limit: 20, bool: 'or' });
        matchedIds = collectIds(results);
      }
      renderResults(matchedIds, query);
    } catch (error) {
      console.error('[shadcn-hexo] 搜索执行失败:', error);
      showState('error');
    }
  }

  function collectIds(results) {
    var matchedIds = [];
    var seen = {};
    if (!results) return matchedIds;
    results.forEach(function (result) {
      if (result.result) {
        result.result.forEach(function (item) {
          var id = typeof item === 'object' ? item.id : item;
          if (!seen[id]) { seen[id] = true; matchedIds.push(id); }
        });
      }
    });
    return matchedIds;
  }

  // ========== 渲染 ==========

  function renderResults(matchedIds, query) {
    clearResults();

    if (matchedIds.length === 0) {
      if (emptyQueryEl) emptyQueryEl.textContent = query;
      showState('empty');
      return;
    }

    var html = '';
    matchedIds.forEach(function (id) {
      var item = searchData[id];
      if (!item) return;

      var snippet = getSnippet(item.content, query, 110);
      var chip = item.category
        ? '<span class="sri-chip">' + escapeHtml(item.category) + '</span>'
        : '';

      html +=
        '<div class="search-result-item" role="option" data-url="' + escapeHtml(item.url) + '">' +
          '<div class="sri-body">' +
            '<div class="sri-title">' + highlight(item.title, query) + '</div>' +
            (snippet ? '<div class="sri-snippet">' + highlight(snippet, query) + '</div>' : '') +
          '</div>' +
          chip +
        '</div>';
    });

    searchResults.innerHTML = html;
    resultNodes = Array.prototype.slice.call(searchResults.querySelectorAll('.search-result-item'));
    resultUrls = resultNodes.map(function (node) { return node.getAttribute('data-url'); });

    resultNodes.forEach(function (node, i) {
      node.addEventListener('mouseenter', function () { setActive(i); });
      node.addEventListener('click', function () {
        var url = node.getAttribute('data-url');
        if (url) window.location.href = url;
      });
    });

    if (searchCount) {
      searchCount.textContent = matchedIds.length + ' 条结果';
    }
    activeIndex = -1;
    showState('results');
  }

  // ========== 键盘导航 ==========

  function moveActive(delta) {
    if (!resultNodes.length) return;
    var next = activeIndex + delta;
    if (next < 0) next = resultNodes.length - 1;
    if (next >= resultNodes.length) next = 0;
    setActive(next);
  }

  function setActive(i) {
    if (i < 0 || i >= resultNodes.length || i === activeIndex) return;
    if (activeIndex >= 0 && resultNodes[activeIndex]) {
      resultNodes[activeIndex].classList.remove('is-active');
    }
    activeIndex = i;
    var node = resultNodes[i];
    node.classList.add('is-active');
    if (node.scrollIntoView) node.scrollIntoView({ block: 'nearest' });
  }

  // ========== 高亮与摘要 ==========

  /** 查询短语列表：按空白切分，长的在前（先匹配长词） */
  function queryPhrases(query) {
    var phrases = query.trim().split(/\s+/).filter(Boolean);
    var seen = {};
    var out = [];
    phrases.forEach(function (p) {
      var key = p.toLowerCase();
      if (!seen[key]) { seen[key] = true; out.push(p); }
    });
    out.sort(function (a, b) { return b.length - a.length; });
    return out;
  }

  /**
   * 把文本转义后，将所有命中片段包进 <mark>。
   * 先在原文上求出命中区间（合并重叠），再逐段转义拼接，杜绝 XSS。
   */
  function highlight(textStr, query) {
    if (!textStr) return '';
    var phrases = queryPhrases(query);
    if (!phrases.length) return escapeHtml(textStr);

    var lower = textStr.toLowerCase();
    var ranges = [];
    phrases.forEach(function (p) {
      var lp = p.toLowerCase();
      var idx = lower.indexOf(lp);
      while (idx !== -1) {
        ranges.push([idx, idx + lp.length]);
        idx = lower.indexOf(lp, idx + lp.length);
      }
    });
    if (!ranges.length) return escapeHtml(textStr);

    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [];
    ranges.forEach(function (r) {
      var last = merged[merged.length - 1];
      if (last && r[0] <= last[1]) {
        if (r[1] > last[1]) last[1] = r[1];
      } else {
        merged.push(r);
      }
    });

    var out = '';
    var pos = 0;
    merged.forEach(function (r) {
      out += escapeHtml(textStr.slice(pos, r[0]));
      out += '<mark>' + escapeHtml(textStr.slice(r[0], r[1])) + '</mark>';
      pos = r[1];
    });
    out += escapeHtml(textStr.slice(pos));
    return out;
  }

  /**
   * 生成摘要：优先围绕首个命中位置截取上下文，
   * 命中不了整词时退回首个查询短语，再退回开头。
   */
  function getSnippet(content, query, maxLen) {
    if (!content) return '';
    var lowerContent = content.toLowerCase();

    var anchor = -1;
    var phrases = queryPhrases(query);
    for (var i = 0; i < phrases.length; i++) {
      anchor = lowerContent.indexOf(phrases[i].toLowerCase());
      if (anchor !== -1) break;
    }

    if (anchor === -1) {
      return content.substring(0, maxLen) + (content.length > maxLen ? '…' : '');
    }

    var start = Math.max(0, anchor - Math.floor(maxLen / 3));
    var end = Math.min(content.length, start + maxLen);
    var snippet = content.substring(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < content.length) snippet = snippet + '…';
    return snippet;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ========== 启动 ==========

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearch);
  } else {
    initSearch();
  }
})();
