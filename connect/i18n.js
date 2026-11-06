/* Connect — language switcher (Google Translate). Put <span id="langSlot"></span> where the menu should go. */
(function () {
  var LANGS = [['en', 'English'], ['es', 'Español'], ['ar', 'العربية'], ['ur', 'اردو'], ['pa', 'ਪੰਜਾਬੀ'], ['hi', 'हिन्दी'], ['bn', 'বাংলা'], ['zh-CN', '中文'], ['tl', 'Tagalog'], ['vi', 'Tiếng Việt'], ['fr', 'Français'], ['ko', '한국어'], ['ru', 'Русский'], ['ht', 'Kreyòl'], ['pt', 'Português'], ['so', 'Soomaali']];
  var RTL = ['ar', 'ur'];
  function get() { try { return localStorage.getItem('connect_lang') || 'en'; } catch (e) { return 'en'; } }
  function setCookie(v) {
    var parts = location.hostname.split('.'), domain = parts.length > 1 ? '.' + parts.slice(-2).join('.') : '';
    var val = v === 'en' ? '' : '/en/' + v, exp = v === 'en' ? '; expires=Thu, 01 Jan 1970 00:00:00 GMT' : '';
    document.cookie = 'googtrans=' + val + '; path=/' + exp;
    if (domain) document.cookie = 'googtrans=' + val + '; path=/; domain=' + domain + exp;
  }
  var lang = get();
  window.CONNECT_LANG = lang === 'zh-CN' ? 'zh' : lang;
  if (RTL.indexOf(lang) > -1) document.documentElement.setAttribute('dir', 'rtl');
  document.documentElement.setAttribute('lang', lang);
  var css = document.createElement('style');
  css.textContent = '.goog-te-banner-frame,.skiptranslate iframe,#goog-gt-tt{display:none!important}body{top:0!important}#gtEl{display:none}.lang-select{min-height:36px;width:auto;max-width:140px;border-radius:8px;border:1px solid rgba(201,169,97,.6);background:transparent;color:inherit;font:600 13px Figtree,sans-serif;padding:0 6px}.lang-select option{color:#121C38}';
  document.head.appendChild(css);
  function mount() {
    var slot = document.getElementById('langSlot');
    if (slot && !slot.firstChild) {
      var lab = document.createElement('label'); lab.htmlFor = 'langSel'; lab.textContent = 'Language'; lab.style.cssText = 'position:absolute;left:-9999px';
      var sel = document.createElement('select'); sel.id = 'langSel'; sel.className = 'lang-select notranslate'; sel.setAttribute('translate', 'no');
      LANGS.forEach(function (l) { var o = document.createElement('option'); o.value = l[0]; o.textContent = l[1]; if (l[0] === lang) o.selected = true; sel.appendChild(o); });
      sel.addEventListener('change', function () { try { localStorage.setItem('connect_lang', sel.value); } catch (e) {} setCookie(sel.value); location.reload(); });
      slot.appendChild(lab); slot.appendChild(sel);
    }
    if (lang !== 'en') {
      setCookie(lang);
      var d = document.createElement('div'); d.id = 'gtEl'; document.body.appendChild(d);
      window.googleTranslateElementInit = function () { try { new google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: LANGS.map(function (l) { return l[0]; }).join(','), autoDisplay: false }, 'gtEl'); } catch (e) {} };
      var s = document.createElement('script'); s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'; s.async = true; document.body.appendChild(s);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
