// 代码块语言识别

$(function () {
  var $highlight_lang = $('<div class="code_lang" title="代码语言"></div>');

  $('.code-area').prepend($highlight_lang);
  $('figure.highlight').each(function () {
    var code_language = $(this).attr('class').replace('highlight', '').trim();

    if (!code_language) {
      return true;
    };
    var lang_name = code_language.trim();

    $(this).siblings(".code_lang").text(lang_name);
  });
});
