/* Connect help bubble + "How it works" video. Shared by the hub and the member area.
   Bubble sits at the bottom. Tap it for: the video, ask a question, or reach a team member. X closes. */
(function () {
  'use strict';
  var base = (function () { var s = document.currentScript && document.currentScript.src || ''; return s.replace(/help\.js.*$/, ''); })();
  var VIDEO = base + 'how-it-works.mp4?v=1', POSTER = base + 'how-it-works.jpg?v=1', CAPS = base + 'how-it-works.vtt?v=1';
  var TEAM = { phone: '(248) 403-8982', digits: '2484038982', email: 'LmiraC@crispcleans.com' };
  var inMember = /\/member\//.test(location.pathname);
  var css = '' +
    '.hb-bubble{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:60;display:flex;align-items:center;gap:8px;border:0;border-radius:999px;background:#1B2951;color:#fff;font:700 15px Figtree,system-ui,sans-serif;padding:0 18px 0 8px;min-height:56px;box-shadow:0 8px 22px rgba(27,41,81,.35);cursor:pointer}' +
    'body.has-bottom-nav .hb-bubble{bottom:calc(84px + env(safe-area-inset-bottom))}body.feed-mode .hb-bubble{display:none}' +
    '.hb-bubble .hb-face{width:40px;height:40px;border-radius:50%;background:#C9A227;display:grid;place-items:center}' +
    '.hb-bubble .hb-face svg{width:24px;height:24px}' +
    '.hb-panel{position:fixed;right:12px;left:12px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:61;max-width:380px;margin-left:auto;background:#fff;border-radius:22px;box-shadow:0 14px 40px rgba(0,0,0,.28);padding:16px;font-family:Figtree,system-ui,sans-serif;color:#1B2951}' +
    'body.has-bottom-nav .hb-panel{bottom:calc(84px + env(safe-area-inset-bottom))}' +
    '.hb-panel h2{font:600 24px "Cormorant Garamond",Georgia,serif;margin:0 40px 10px 0}' +
    '.hb-x{position:absolute;top:10px;right:10px;width:44px;height:44px;border-radius:50%;border:0;background:#F1EDE4;font-size:22px;line-height:1;cursor:pointer;color:#1B2951}' +
    '.hb-row{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:1px solid #E6DDC8;background:#FFFDF8;border-radius:16px;padding:12px;margin:0 0 8px;font:600 16px Figtree,system-ui,sans-serif;color:#1B2951;text-decoration:none;cursor:pointer;min-height:56px;box-sizing:border-box}' +
    '.hb-row .hb-ic{width:40px;height:40px;flex:0 0 40px;border-radius:12px;display:grid;place-items:center;font-size:20px}' +
    '.hb-row small{display:block;font-weight:500;color:#5b6475;font-size:13px}' +
    '.hb-video{position:fixed;inset:0;z-index:80;background:rgba(10,16,34,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px}' +
    '.hb-video video{width:auto;max-width:100%;max-height:calc(100dvh - 90px);aspect-ratio:9/16;border-radius:18px;background:#000}' +
    '.hb-video .hb-x{position:static;margin-top:12px;width:auto;padding:0 22px;border-radius:999px;height:48px;font:700 16px Figtree,system-ui,sans-serif}' +
    '.hb-watch{display:flex;align-items:center;gap:14px;width:100%;border:0;border-radius:20px;background:#1B2951;color:#fff;padding:10px 16px 10px 10px;margin:14px 0;cursor:pointer;text-align:left;font:700 17px Figtree,system-ui,sans-serif;min-height:72px}' +
    '.hb-watch .hb-play{width:52px;height:52px;flex:0 0 52px;border-radius:14px;background:#C9A227;display:grid;place-items:center;font-size:22px;color:#1B2951}' +
    '.hb-watch small{display:block;font-weight:500;color:#E6DDC8;font-size:13px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var FACE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v10H9l-5 4z" fill="#1B2951"/><circle cx="9" cy="10" r="1.3" fill="#fff"/><circle cx="12.5" cy="10" r="1.3" fill="#fff"/><circle cx="16" cy="10" r="1.3" fill="#fff"/></svg>';

  function playVideo() {
    closePanel();
    var m = document.createElement('div'); m.className = 'hb-video'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'How Connect works');
    m.innerHTML = '<video controls playsinline autoplay preload="auto" poster="' + POSTER + '"><source src="' + VIDEO + '" type="video/mp4"><track kind="captions" srclang="en" label="English" src="' + CAPS + '" default></video><button type="button" class="hb-x">✕ Close video</button>';
    var v = m.querySelector('video');
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
    m.querySelector('.hb-x').onclick = function () { try { v.pause(); } catch (e) {} m.remove(); };
    m.addEventListener('click', function (e) { if (e.target === m) { try { v.pause(); } catch (er) {} m.remove(); } });
    document.body.appendChild(m);
    var p = v.play && v.play(); if (p && p.catch) p.catch(function () {});
  }
  window.ConnectHowItWorks = playVideo;

  var panel = null;
  function closePanel() { if (panel) { panel.remove(); panel = null; } bubble.hidden = false; }
  function openPanel() {
    if (panel) return closePanel();
    panel = document.createElement('div'); panel.className = 'hb-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Help');
    var ask = inMember ? '<button type="button" class="hb-row" data-hb="ask"><span class="hb-ic" style="background:#E8F0FE">💬</span><span>Ask a question<small>Get an answer in your language</small></span></button>'
      : '<a class="hb-row" href="' + base + 'member/#ask"><span class="hb-ic" style="background:#E8F0FE">💬</span><span>Ask a question<small>Get an answer in your language</small></span></a>';
    panel.innerHTML = '<button type="button" class="hb-x" aria-label="Close">✕</button><h2>How can we help?</h2>' +
      '<button type="button" class="hb-row" data-hb="video"><span class="hb-ic" style="background:#FFF3D1">▶</span><span>Watch how it works<small>A short video, about 90 seconds</small></span></button>' + ask +
      '<a class="hb-row" href="sms:+1' + TEAM.digits + '?&body=' + encodeURIComponent('Hi, I have a question about Connect.') + '"><span class="hb-ic" style="background:#E3F4EA">📱</span><span>Text a team member<small>A real person, ' + TEAM.phone + '</small></span></a>' +
      '<a class="hb-row" href="tel:+1' + TEAM.digits + '"><span class="hb-ic" style="background:#F6E7EE">📞</span><span>Call us<small>' + TEAM.phone + '</small></span></a>' +
      '<a class="hb-row" href="mailto:' + TEAM.email + '?subject=' + encodeURIComponent('Connect question') + '"><span class="hb-ic" style="background:#EFEAF8">✉️</span><span>Email the team<small>' + TEAM.email + '</small></span></a>';
    panel.querySelector('.hb-x').onclick = closePanel;
    panel.addEventListener('click', function (e) {
      var b = e.target.closest('[data-hb]'); if (!b) return;
      var k = b.getAttribute('data-hb');
      if (k === 'video') playVideo();
      if (k === 'ask') { closePanel(); var t = document.querySelector('[data-tab="ask"]'); if (t) t.click(); else location.hash = 'ask'; }
    });
    document.body.appendChild(panel); bubble.hidden = true;
    var first = panel.querySelector('.hb-row'); if (first) first.focus();
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var vv = document.querySelector('.hb-video'); if (vv) { vv.querySelector('.hb-x').click(); } else closePanel(); } });

  var bubble = document.createElement('button');
  bubble.type = 'button'; bubble.className = 'hb-bubble'; bubble.setAttribute('aria-label', 'Help: how it works, ask, or talk to a team member');
  bubble.innerHTML = '<span class="hb-face">' + FACE + '</span>Help';
  bubble.onclick = openPanel;
  function mount() { document.body.appendChild(bubble); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  // Big "How it works" button helper for screens that want one inline
  window.ConnectWatchButton = function () {
    return '<button type="button" class="hb-watch" onclick="ConnectHowItWorks()"><span class="hb-play">▶</span><span>Watch how it works<small>90 seconds · with sound and captions</small></span></button>';
  };
})();
