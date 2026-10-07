// ==UserScript==
// @name        IDU Skin
// @description Nowoczesny, mobilny wygląd dla IDU (s27.idu.edu.pl) w stylu aplikacji
// @version     5.0
// @match       https://s27.idu.edu.pl/*
// @run-at      document-end
// ==/UserScript==
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   *  Basics
   * ------------------------------------------------------------------ */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const CLASSIC = store.get('skClassic') === '1';

  // Hide the old page while we build the new one (max 4 s, just in case)
  let cloak = null;
  if (!CLASSIC) {
    cloak = document.createElement('style');
    cloak.textContent = 'html{background:#0f1115}body{visibility:hidden!important}' ;
    const put = () => { const t = document.head || document.documentElement; if (t && cloak) { t.appendChild(cloak); return true; } return false; };
    if (!put()) { const mo = new MutationObserver(() => { if (put()) mo.disconnect(); }); mo.observe(document, { childList: true, subtree: true }); }
    setTimeout(uncloak, 4000);
  }
  function uncloak() { if (cloak) { cloak.remove(); cloak = null; } }


  function start() {
    try { main(); }
    catch (e) {
      console.error('[IDU Skin]', e);
      document.documentElement.classList.remove('sk-full', 'sk-fb');
      const h = document.getElementById('sk-host'); if (h) h.remove();
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;left:10px;right:10px;top:10px;z-index:2147483647;background:#e0335a;color:#fff;' +
        'font:14px/1.4 -apple-system,sans-serif;padding:12px 14px;border-radius:12px;white-space:pre-wrap;word-break:break-word';
      box.textContent = 'IDU Skin – błąd (zrób screenshot):\n' + (e && e.message) + '\n' + String(e && e.stack || '').split('\n').slice(0, 3).join('\n');
      box.onclick = () => box.remove();
      document.body.appendChild(box);
    }
    finally {
      uncloak();
      const early = document.getElementById('sk-early'); if (early) early.remove();
      // the picture shown at launch fades into the live screen
      const snap = document.getElementById('sk-snap');
      if (snap) { snap.style.transition = 'opacity .18s ease'; requestAnimationFrame(() => { snap.style.opacity = '0'; }); setTimeout(() => snap.remove(), 260); }
    }
  }

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  const attr = (el, a) => el ? (el.getAttribute(a) || '') : '';
  const cleanTitle = s => s.replace(/zwiń|rozwiń/g, '').trim();

  /* ------------------------------------------------------------------ *
   *  Language of the app (IDU's own content stays as it is)
   * ------------------------------------------------------------------ */
  const LANG = (() => { try { return JSON.parse(localStorage.getItem('skSettings') || '{}').lang === 'en' ? 'en' : 'pl'; } catch (e) { return 'pl'; } })();
  const EN = LANG === 'en';
  const L = (pl, en) => EN ? en : pl;           // inline translation for sentences built in code

  /* ------------------------------------------------------------------ *
   *  Dates (IDU writes them in Polish – parsing always Polish, display in the app language)
   * ------------------------------------------------------------------ */
  const MONTHS = { sty: 0, lut: 1, mar: 2, kwi: 3, maj: 4, cze: 5, lip: 6, sie: 7, wrz: 8, 'paź': 9, paz: 9, lis: 10, gru: 11 };
  const MONTH_SHORT = EN ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    : ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  const DAY_SHORT = EN ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['Nd', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
  const DAY_FULL = EN ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    : ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  const TODAY = L('dziś', 'today'), TOMORROW = L('jutro', 'tomorrow');
  const ST = EN ? { ob: 'P', nb: 'A', sp: 'L', u: 'E' } : { ob: 'OB', nb: 'NB', sp: 'SP', u: 'U' };   // attendance codes
  const inDays = n => L('za ' + n + ' dni', 'in ' + n + ' days');

  function parseDate(s) {
    if (!s) return null;
    let m = s.match(/(\d{1,2})\s+([a-ząćęłńóśźż]{3})[a-ząćęłńóśźż]*\s+(\d{4})(?:,?\s*(\d{1,2}):(\d{2}))?/i);
    if (m && MONTHS[m[2].toLowerCase()] != null)
      return new Date(+m[3], MONTHS[m[2].toLowerCase()], +m[1], +(m[4] || 0), +(m[5] || 0));
    m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    return null;
  }
  const dayStart = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  function relTime(d) {
    if (!d) return '';
    const now = new Date();
    const diffMin = Math.round((now - d) / 60000);
    const dayDiff = Math.round((dayStart(now) - dayStart(d)) / 86400000);
    if (diffMin >= 0 && diffMin < 1) return L('przed chwilą', 'just now');
    if (diffMin >= 0 && diffMin < 60) return L(diffMin + ' min temu', diffMin + ' min ago');
    if (dayDiff === 0 && diffMin >= 0) return L(Math.round(diffMin / 60) + ' godz. temu', Math.round(diffMin / 60) + ' h ago');
    if (dayDiff === 0) return TODAY;
    if (dayDiff === 1) return L('wczoraj', 'yesterday');
    if (dayDiff === -1) return TOMORROW;
    if (dayDiff > 1 && dayDiff < 7) return L(dayDiff + ' dni temu', dayDiff + ' days ago');
    if (dayDiff < -1 && dayDiff > -7) return inDays(-dayDiff);
    return shortDate(d);
  }
  const shortDate = d => d ? d.getDate() + ' ' + MONTH_SHORT[d.getMonth()] : '';
  const hhmm = d => d ? d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0') : '';
  const mins = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

  /* ------------------------------------------------------------------ *
   *  Subjects: names + colours (same colour everywhere)
   * ------------------------------------------------------------------ */
  const PALETTE = ['#e53950', '#c2185b', '#9c27b0', '#673ab7', '#3f51b5', '#1e88e5', '#0097a7', '#00897b',
    '#43a047', '#7cb342', '#f4511e', '#fb8c00', '#8d6e63', '#546e7a', '#d81b60', '#5e35b1'];
  const normSubj = n => String(n || '').toLowerCase().replace(/\([^)]*\)/g, '').replace(/\s+\d+\s*$/, '').replace(/\s+/g, ' ').trim();
  const PALETTE_MUTED = ['#a8545f', '#9a4d6d', '#7e5a8f', '#675a91', '#56628f', '#4f709a', '#46788a', '#457a72',
    '#557d5a', '#6c7d4f', '#9c6249', '#a07548', '#7d6a60', '#5d6870', '#a0546f', '#6b5a92'];
  let SUBJ_MODE = 'vivid', SUBJ_MONO = '#3d9be9';
  function subjColor(name) {
    if (SUBJ_MODE === 'mono') return SUBJ_MONO;
    const n = normSubj(name);
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    return (SUBJ_MODE === 'muted' ? PALETTE_MUTED : PALETTE)[h % PALETTE.length];
  }
  const prettySubj = n => {
    const s = String(n || '').replace(/\([PR]\)\s*$/, '').replace(/\s+1\s*$/, '').trim();
    return s === s.toUpperCase() && s.length > 4 ? s.charAt(0) + s.slice(1).toLowerCase() : s.charAt(0).toUpperCase() + s.slice(1);
  };
  const PLURAL_EN = { ocena: ['grade', 'grades'], wynik: ['result', 'results'], lekcja: ['lesson', 'lessons'], plik: ['file', 'files'],
    pozycja: ['item', 'items'], 'uczeń': ['student', 'students'], przedmiotu: ['subject', 'subjects'] };
  const plural = (n, one, few, many) => {
    if (EN) { const e = PLURAL_EN[one]; return e ? e[n === 1 ? 0 : 1] : (n === 1 ? one : many); }
    return n === 1 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? few : many;
  };
  // "06 Piwnica Auerbacha" → "06", "27 (gabinet ps2)" → "27", "gimnastyczna" stays
  const shortRoom = r => { const m = String(r || '').trim().match(/^(\d+[a-z]?)(?=\s|\(|$)/i); return m ? m[1] : String(r || '').trim(); };
  const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  /* ------------------------------------------------------------------ *
   *  Icons (simple line icons)
   * ------------------------------------------------------------------ */
  const ICONS = {
    // shapes with class "f" get a soft tinted fill when active (bottom bar, highlighted chips)
    home: '<path class="f" d="M3.6 10.4 12 3.6l8.4 6.8v8.8a1.6 1.6 0 0 1-1.6 1.6h-4.1v-5.2a1.1 1.1 0 0 0-1.1-1.1h-3.2a1.1 1.1 0 0 0-1.1 1.1v5.2H5.2a1.6 1.6 0 0 1-1.6-1.6z"/>',
    grades: '<path class="f" d="M12 3.4l2.5 5.1 5.6.8-4.05 3.95.95 5.6L12 16.2l-5 2.65.95-5.6L3.9 9.3l5.6-.8z"/>',
    star: '<path class="f" d="M12 3.4l2.5 5.1 5.6.8-4.05 3.95.95 5.6L12 16.2l-5 2.65.95-5.6L3.9 9.3l5.6-.8z"/>',
    calendar: '<rect class="f" x="3.5" y="5" width="17" height="15.5" rx="3.2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M7.8 13.6h.01M12 13.6h.01M16.2 13.6h.01M7.8 17h.01M12 17h.01"/>',
    mail: '<rect class="f" x="3" y="5" width="18" height="14" rx="3.2"/><path d="m4 7.6 8 5.6 8-5.6"/>',
    pres: '<circle class="f" cx="10" cy="8" r="3.6"/><path d="M3.6 20a6.4 6.4 0 0 1 12.2-2.6"/><path d="m15.6 16.2 2.1 2.1 3.8-3.9"/>',
    chart: '<path d="M5 20v-6.5M10 20V6M15 20v-9.5M20 20V9"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h11"/>',
    back: '<path d="M15 5.5 8.5 12l6.5 6.5"/>',
    right: '<path d="m9 5.5 6.5 6.5L9 18.5"/>',
    down: '<path d="m5.5 9 6.5 6.5L18.5 9"/>',
    up: '<path d="m5.5 15 6.5-6.5 6.5 6.5"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.35-5.65"/><path d="M20.2 4.2v4.6h-4.6"/>',
    edit: '<path class="f" d="M4 20h4.2L19.1 9.1a2.85 2.85 0 0 0-4-4.05L4 16.1z"/><path d="m13.6 6.6 3.9 3.9"/>',
    compose: '<path d="M11 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V13"/><path class="f" d="M18.4 3.6a2 2 0 0 1 2.8 2.8L13 14.6l-3.6.9.9-3.6z"/>',
    check: '<path d="m5 12.6 4.4 4.4L19 7.4"/>',
    x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    bell: '<path class="f" d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 1.9H4.4z"/><path d="M10 21a2.2 2.2 0 0 0 4 0"/>',
    news: '<rect class="f" x="3.5" y="4" width="13" height="16" rx="2.6"/><path d="M16.5 8.5h2.4a1.6 1.6 0 0 1 1.6 1.6V18a2 2 0 0 1-4 0M7 8.5h6M7 12h6M7 15.5h3.6"/>',
    book: '<path class="f" d="M12 6.6C10.4 5.1 7.9 4.5 3.8 4.5v14c4.1 0 6.6.6 8.2 2.1 1.6-1.5 4.1-2.1 8.2-2.1v-14c-4.1 0-6.6.6-8.2 2.1z"/><path d="M12 6.6v14"/>',
    file: '<path class="f" d="M14 3H7.6A2.6 2.6 0 0 0 5 5.6v12.8A2.6 2.6 0 0 0 7.6 21h8.8a2.6 2.6 0 0 0 2.6-2.6V8z"/><path d="M14 3v5h5M9 13h6M9 16.6h4"/>',
    clip: '<path d="m20 11.6-7.7 7.7a5 5 0 0 1-7.1-7.1l8.1-8.1a3.3 3.3 0 0 1 4.7 4.7l-7.9 7.9a1.7 1.7 0 0 1-2.4-2.4l7.1-7.1"/>',
    download: '<path d="M12 4v11M7.4 10.6 12 15.2l4.6-4.6M5 20h14"/>',
    chat: '<path class="f" d="M5.2 4.5h13.6a2.2 2.2 0 0 1 2.2 2.2v8.8a2.2 2.2 0 0 1-2.2 2.2H11l-4.6 3.4v-3.4H5.2A2.2 2.2 0 0 1 3 15.5V6.7a2.2 2.2 0 0 1 2.2-2.2z"/>',
    send: '<path class="f" d="M20.6 3.4 3.6 10.3l6.9 3.2 3.2 6.9z"/><path d="m20.6 3.4-10.1 10.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.6"/><path d="m20 20-4.3-4.3"/>',
    user: '<circle class="f" cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
    users: '<circle class="f" cx="9" cy="8.4" r="3.6"/><path d="M2.6 20a6.4 6.4 0 0 1 12.8 0M15.8 5a3.6 3.6 0 0 1 0 6.8M18 14.2a6.4 6.4 0 0 1 3.4 5.8"/>',
    logout: '<path d="M10 4H6.6A2.6 2.6 0 0 0 4 6.6v10.8A2.6 2.6 0 0 0 6.6 20H10"/><path d="m15 8 4 4-4 4M19 12H9.5"/>',
    monitor: '<rect class="f" x="3" y="4" width="18" height="12.5" rx="2.6"/><path d="M8.5 20.5h7M12 16.5v4"/>',
    clock: '<circle class="f" cx="12" cy="12" r="8.6"/><path d="M12 7.6V12l3 2"/>',
    layers: '<path class="f" d="M12 3.6 3.2 8 12 12.4 20.8 8z"/><path d="m3.2 12.4 8.8 4.4 8.8-4.4M3.2 16.4 12 20.8l8.8-4.4"/>',
    pin: '<path class="f" d="M12 21s-6.4-5.6-6.4-11a6.4 6.4 0 0 1 12.8 0c0 5.4-6.4 11-6.4 11z"/><circle cx="12" cy="10" r="2.3"/>',
    door: '<path class="f" d="M6 20.5V5.2a1.7 1.7 0 0 1 1.7-1.7h8.6A1.7 1.7 0 0 1 18 5.2v15.3"/><path d="M3.5 20.5h17M14.4 12.4h.01"/>',
    alert: '<circle class="f" cx="12" cy="12" r="8.6"/><path d="M12 7.8v4.8M12 16.3h.01"/>',
    settings: '<path d="M4 7h8.6M17.4 7H20M4 17h2.6M11.4 17H20"/><circle class="f" cx="15" cy="7" r="2.4"/><circle class="f" cx="9" cy="17" r="2.4"/>',
    filter: '<path d="M4 6.5h16M7 12h10M10 17.5h4"/>',
    sort: '<path d="M8 4.5v15M4.6 8 8 4.5 11.4 8M16 19.5v-15M12.6 16l3.4 3.5 3.4-3.5"/>',
    timer: '<circle class="f" cx="12" cy="13.4" r="7.6"/><path d="M12 9.6v3.8l2.4 1.6M9.5 2.8h5M18.6 6.2l1.3-1.3"/>',
    exam: '<rect class="f" x="5" y="4.4" width="14" height="16.6" rx="2.6"/><path d="M9 4.4v-.6a1.3 1.3 0 0 1 1.3-1.3h3.4A1.3 1.3 0 0 1 15 3.8v.6M9 12.8l2 2 4-4"/>',
    sun: '<circle class="f" cx="12" cy="12" r="4"/><path d="M12 2.6v2.2M12 19.2v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
    image: '<rect class="f" x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m20.5 15.6-4.4-4.4-8.3 8.3"/>',
    trash: '<path d="M4.5 7h15M9.6 7V5.2a1.6 1.6 0 0 1 1.6-1.6h1.6a1.6 1.6 0 0 1 1.6 1.6V7"/><path class="f" d="m6.4 7 .9 12a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8l.9-12z"/>',
    link: '<path d="M10 14a4.4 4.4 0 0 0 6.3 0l3-3a4.4 4.4 0 0 0-6.3-6.3l-1 1"/><path d="M14 10a4.4 4.4 0 0 0-6.3 0l-3 3a4.4 4.4 0 0 0 6.3 6.3l1-1"/>',
    widget: '<rect class="f" x="3.5" y="3.5" width="7.2" height="7.2" rx="2.2"/><rect x="13.3" y="3.5" width="7.2" height="7.2" rx="2.2"/><rect x="3.5" y="13.3" width="7.2" height="7.2" rx="2.2"/><rect class="f" x="13.3" y="13.3" width="7.2" height="7.2" rx="2.2"/>',
    vibrate: '<rect class="f" x="7.5" y="3.5" width="9" height="17" rx="2.4"/><path d="M4.4 8.5v7M19.6 8.5v7M11 17.2h2"/>',
    inbox: '<path class="f" d="M4 13.5 6.2 5.6A2 2 0 0 1 8.1 4.2h7.8a2 2 0 0 1 1.9 1.4L20 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 13.5h4.4l1.4 2.4h4.4l1.4-2.4H20"/>',
    at: '<circle cx="12" cy="12" r="3.6"/><path d="M15.6 12v1.4a2.5 2.5 0 0 0 5 0V12a8.6 8.6 0 1 0-3.4 6.8"/>',
    group: '<circle class="f" cx="12" cy="7.6" r="3.2"/><path d="M6.4 20a5.6 5.6 0 0 1 11.2 0M4.6 10.6a2.4 2.4 0 1 0 0-.01M19.4 10.6a2.4 2.4 0 1 0 0-.01M2.4 17.6a3.8 3.8 0 0 1 3-3.4M21.6 17.6a3.8 3.8 0 0 0-3-3.4"/>',
    medal: '<circle class="f" cx="12" cy="9" r="5.5"/><path d="M8.8 13.5 7.5 21l4.5-2.5 4.5 2.5-1.3-7.5"/>',
    camera: '<path class="f" d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10.5H4z"/><circle cx="12" cy="13.5" r="3.4"/>',
    more: '<circle cx="5.5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18.5" cy="12" r="1.4" fill="currentColor"/>',
    palette: '<path class="f" d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 1.9-.8 1.9-1.7 0-1.2-1-1.6-1-2.6 0-1 .8-1.7 1.8-1.7h2.1a3.7 3.7 0 0 0 3.7-3.7C20.5 6.6 16.7 3.5 12 3.5z"/><circle cx="7.6" cy="11" r="1"/><circle cx="10" cy="7.4" r="1"/><circle cx="14.4" cy="7.4" r="1"/>'
  };
  const I = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  /* ------------------------------------------------------------------ *
   *  App styles (inside Shadow DOM, so IDU's CSS can't touch them)
   * ------------------------------------------------------------------ */
  const APP_CSS = `
  :host{all:initial;display:block;
    --bg:#0f1115;--card:#1b1e26;--card2:#252a34;--text:#f2f4f8;--muted:#9097a8;--line:#2b303b;
    --accent:#3d9be9;--good:#2fbf71;--bad:#f0506e;--warn:#f5a524;--shadow:0 1px 2px rgba(0,0,0,.4);
    color-scheme:dark}
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  .app{font:16px/1.4 -apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,sans-serif;color:var(--text);
    background:var(--bg);min-height:100vh;-webkit-text-size-adjust:100%;-webkit-font-smoothing:antialiased}
  a{color:inherit;text-decoration:none}
  button{font:inherit;color:inherit}
  .ic{width:22px;height:22px;flex:none;display:block}
  .ic.sm{width:18px;height:18px}.ic.xs{width:15px;height:15px}

  /* top bar */
  .top{position:fixed;top:0;left:0;right:0;z-index:20;display:flex;align-items:center;gap:6px;
    padding:calc(6px + env(safe-area-inset-top)) 8px 6px;min-height:52px;
    background:color-mix(in srgb,var(--bg) 82%,transparent);backdrop-filter:saturate(1.6) blur(18px);
    -webkit-backdrop-filter:saturate(1.6) blur(18px);border-bottom:.5px solid var(--line)}
  .top .btn{width:40px;height:40px;border:0;background:none;border-radius:12px;display:grid;place-items:center;color:var(--accent)}
  .top .btn:active{background:var(--card2)}
  .top .title{flex:1;min-width:0;font-weight:700;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-left:2px}
  main{padding:calc(64px + env(safe-area-inset-top)) 16px calc(92px + env(safe-area-inset-bottom));max-width:680px;margin:0 auto}

  /* bottom nav */
  .nav{position:fixed;left:0;right:0;bottom:0;z-index:20;display:flex;justify-content:space-around;
    padding:6px 4px calc(6px + env(safe-area-inset-bottom));background:color-mix(in srgb,var(--card) 88%,transparent);
    backdrop-filter:saturate(1.6) blur(18px);-webkit-backdrop-filter:saturate(1.6) blur(18px);border-top:.5px solid var(--line)}
  .nav a{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--muted);font-size:10.5px;font-weight:600;
    position:relative;padding:4px 0}
  .nav a .ic{width:24px;height:24px}
  .nav a.on{color:var(--accent)}
  .badge{position:absolute;top:0;left:calc(50% + 5px);min-width:18px;height:18px;padding:0 5px;border-radius:9px;
    background:var(--bad);color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;line-height:1}

  /* drawer */
  .scrim{position:fixed;inset:0;z-index:30;background:rgba(0,0,0,.45);opacity:0;pointer-events:none;transition:opacity .2s}
  .drawer{position:fixed;top:0;bottom:0;left:0;z-index:31;width:min(84vw,330px);background:var(--card);
    transform:translateX(-102%);transition:transform .25s ease;overflow-y:auto;
    padding:calc(18px + env(safe-area-inset-top)) 10px calc(18px + env(safe-area-inset-bottom));box-shadow:4px 0 24px rgba(0,0,0,.3)}
  .app.open .scrim{opacity:1;pointer-events:auto}
  .app.open .drawer{transform:none}
  .who{display:flex;gap:12px;align-items:center;padding:6px 10px 16px;border-bottom:.5px solid var(--line);margin-bottom:8px}
  .who .av{width:46px;height:46px;font-size:17px}
  .who b{display:block;font-size:17px}
  .who span{color:var(--muted);font-size:13px}
  .dl{display:flex;align-items:center;gap:14px;padding:12px 10px;border-radius:12px;font-size:16px;font-weight:500}
  .dl:active{background:var(--card2)}
  .dl .ic{color:var(--muted)}
  .dl.danger{color:var(--bad)}.dl.danger .ic{color:var(--bad)}
  .dsep{height:.5px;background:var(--line);margin:8px 10px}
  .dl .cnt{margin-left:auto;background:var(--bad);color:#fff;font-size:12px;font-weight:700;border-radius:10px;padding:1px 7px}

  /* text */
  h1{font-size:28px;line-height:1.15;font-weight:800;letter-spacing:-.4px;margin:10px 0 4px}
  .lead{color:var(--muted);font-size:15px;margin:0 0 14px}
  .sec{display:flex;justify-content:space-between;align-items:baseline;margin:26px 2px 10px}
  .sec h2{font-size:20px;font-weight:700;margin:0;letter-spacing:-.2px}
  .sec a{color:var(--accent);font-size:15px;font-weight:600}
  .muted{color:var(--muted)}
  .small{font-size:13px}
  .empty{color:var(--muted);text-align:center;padding:28px 10px;font-size:15px}

  /* cards */
  .card{display:block;background:var(--card);border-radius:16px;padding:14px;margin-bottom:10px;box-shadow:var(--shadow)}
  a.card:active,.tap:active{transform:scale(.985);opacity:.9}
  .row{display:flex;align-items:center;gap:12px}
  .grow{flex:1;min-width:0}
  .b{font-weight:700}
  .clip{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .two{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .chev{color:var(--muted)}
  .av{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:700;font-size:15px;flex:none}
  .pill{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;border-radius:8px;padding:3px 8px;
    background:var(--card2);color:var(--muted);white-space:nowrap}
  .pill.new{background:var(--accent);color:#fff}
  .pill.good{background:color-mix(in srgb,var(--good) 18%,transparent);color:var(--good)}
  .pill.bad{background:color-mix(in srgb,var(--bad) 18%,transparent);color:var(--bad)}
  .pill.warn{background:color-mix(in srgb,var(--warn) 18%,transparent);color:var(--warn)}

  /* feed (Librus-style timeline) */
  .upd{display:flex;align-items:center;justify-content:center;gap:8px;color:var(--muted);font-size:13px;margin:2px 0 6px;
    border:0;background:none;width:100%;padding:8px}
  .fi{display:flex;gap:12px;padding:14px 0;border-bottom:.5px solid var(--line)}
  .fi:last-child{border-bottom:0}
  .fi .dot{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;flex:none;background:var(--card2);color:var(--muted)}
  .fi .dot .ic{width:20px;height:20px}
  .fi .body{flex:1;min-width:0}
  .fi .hd{display:flex;align-items:center;gap:6px;font-size:14px;margin-bottom:8px}
  .fi .hd b{font-weight:700}
  .fi .hd .t{color:var(--muted)}
  .box{background:var(--card);border-radius:12px;overflow:hidden;box-shadow:var(--shadow);display:block}
  .box .in{padding:12px 14px}
  .box .ttl{font-weight:700}
  .box .sub{color:var(--muted);font-size:14px;margin-top:2px}
  .strip{display:flex;justify-content:space-between;gap:10px;padding:6px 14px;color:#fff;font-size:13px;font-weight:600;background:var(--c,#546e7a)}
  .strip span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .gbox{display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:12px;color:#fff;background:var(--c)}
  .gbox .v{font-size:30px;font-weight:300;min-width:40px;text-align:center;line-height:1}
  .gbox .v .ic{width:26px;height:26px;margin:0 auto}
  .gbox .meta{min-width:0;flex:1}
  .gbox .meta b{display:block}
  .gbox .meta span{opacity:.9;font-size:14px;display:block}
  .letter{font-size:28px;font-weight:300;color:var(--c);min-width:44px}
  details>summary{list-style:none;cursor:pointer}
  details>summary::-webkit-details-marker{display:none}
  .note{background:var(--card);border-radius:12px;padding:12px 14px;margin-top:8px;font-size:14px;line-height:1.5;box-shadow:var(--shadow)}
  .note p{margin:0 0 8px}
  .note p:last-child{margin:0}

  /* now/next card */
  .now{display:flex;align-items:stretch;gap:0;overflow:hidden;padding:0}
  .now .bar{width:6px;background:var(--c)}
  .now .in{padding:14px;flex:1;display:flex;align-items:center;gap:12px}
  .lbl{font-size:12px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:var(--c,var(--accent))}
  .room{font-weight:700;font-size:15px;background:var(--card2);border-radius:10px;padding:6px 10px;white-space:nowrap}

  /* events strip */
  .hs{display:flex;gap:10px;overflow-x:auto;margin:0 -16px;padding:0 16px 4px;scroll-snap-type:x mandatory;scrollbar-width:none}
  .hs::-webkit-scrollbar{display:none}
  .ev{flex:0 0 78%;scroll-snap-align:start;margin:0;display:flex;gap:12px;align-items:flex-start}
  .datebox{width:48px;flex:none;text-align:center;border-radius:12px;background:var(--card2);padding:6px 0}
  .datebox b{display:block;font-size:20px;line-height:1.1}
  .datebox span{font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:700}

  /* segmented + chips */
  .seg{display:flex;background:var(--card2);border-radius:12px;padding:3px;margin:4px 0 14px}
  .seg a,.seg button{flex:1;text-align:center;padding:8px 0;border-radius:10px;font-weight:600;font-size:14px;color:var(--muted);border:0;background:none}
  .seg .on{background:var(--card);color:var(--text);box-shadow:var(--shadow)}
  .days{display:flex;gap:6px;margin-bottom:12px}
  .days button{flex:1;border:0;background:var(--card);border-radius:12px;padding:8px 0;font-weight:700;font-size:14px;box-shadow:var(--shadow)}
  .days button small{display:block;font-weight:500;color:var(--muted);font-size:11px}
  .days button.on{background:var(--accent);color:#fff}
  .days button.on small{color:rgba(255,255,255,.85)}
  .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
  .chip{display:inline-flex;align-items:center;gap:6px;background:var(--card2);border-radius:10px;padding:8px 12px;font-size:14px;font-weight:600}
  .chip .ic{width:16px;height:16px;color:var(--muted)}

  /* lessons */
  .les{display:flex;gap:0;padding:0;overflow:hidden}
  .les .bar{width:5px;background:var(--c);flex:none}
  .les .in{display:flex;align-items:center;gap:12px;padding:12px 14px;flex:1;min-width:0}
  .les .tm{width:44px;font-size:13px;color:var(--muted);text-align:right;line-height:1.35;flex:none}
  .les.cur{outline:2px solid var(--good);outline-offset:-2px}
  .les.past{filter:saturate(.35) brightness(.6)}
  .brk{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:12px;margin:-2px 0 8px 66px}

  /* week grid (Librus-style) */
  .grid{display:grid;grid-template-columns:34px repeat(5,1fr);gap:3px;font-size:11px}
  .grid .h{text-align:center;font-weight:700;color:var(--muted);padding:4px 0;font-size:12px}
  .grid .h.today{color:var(--accent)}
  .grid .t{color:var(--muted);text-align:right;padding-right:3px;font-size:10px;line-height:1.2;padding-top:2px}
  .grid .c{background:var(--c);color:#fff;border-radius:6px;padding:4px 4px;line-height:1.15;font-weight:600;overflow:hidden;
    word-break:break-word;hyphens:auto;min-height:38px}
  .grid .c small{display:block;font-weight:500;opacity:.85;margin-top:2px}

  /* grades page */
  .gcard{display:block;border-radius:14px;overflow:hidden;margin-bottom:12px;color:#fff;background:var(--c);box-shadow:var(--shadow)}
  .gcard .top2{display:flex;align-items:center;gap:12px;padding:14px 16px 12px}
  .gcard .avg{font-size:34px;font-weight:300;line-height:1;min-width:70px}
  .gcard .avg small{font-size:13px;display:block;opacity:.85;font-weight:500;margin-top:4px}
  .gcard .marks{flex:1;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:4px 12px;font-size:22px;font-weight:400}
  .gcard .marks .ic{width:22px;height:22px;opacity:.9}
  .gcard .name{background:rgba(255,255,255,.18);padding:7px 16px;font-size:14px;font-weight:600;display:flex;justify-content:space-between}
  .mk{display:flex;gap:12px;align-items:flex-start;padding:12px 0;border-bottom:.5px solid var(--line)}
  .mk:last-child{border:0}
  .mk .v{min-width:46px;height:46px;border-radius:12px;background:var(--c);color:#fff;display:grid;place-items:center;font-weight:700;font-size:16px;padding:0 6px}
  .cat{font-size:12px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:var(--muted);margin:14px 0 2px}

  /* attendance */
  .ring{width:120px;height:120px;border-radius:50%;display:grid;place-items:center;flex:none;
    background:conic-gradient(var(--good) calc(var(--p)*1%),var(--card2) 0)}
  .ring>div{width:96px;height:96px;border-radius:50%;background:var(--card);display:grid;place-items:center;text-align:center}
  .ring b{font-size:24px;display:block;line-height:1}
  .ring span{font-size:11px;color:var(--muted)}
  .stats{display:grid;gap:8px;flex:1}
  .stat{display:flex;justify-content:space-between;gap:8px;font-size:15px}
  .meter{height:8px;border-radius:4px;background:var(--card2);overflow:hidden;margin-top:8px}
  .meter i{display:block;height:100%;background:var(--c)}
  .st{width:38px;height:30px;border-radius:8px;display:grid;place-items:center;font-weight:800;font-size:13px;flex:none}
  .st.ob{background:color-mix(in srgb,var(--good) 18%,transparent);color:var(--good)}
  .st.nb{background:color-mix(in srgb,var(--bad) 18%,transparent);color:var(--bad)}
  .st.sp{background:color-mix(in srgb,var(--warn) 18%,transparent);color:var(--warn)}
  .st.u{background:color-mix(in srgb,var(--accent) 18%,transparent);color:var(--accent)}
  .dayh{font-weight:700;margin:18px 2px 8px}.dayh::first-letter{text-transform:uppercase}

  /* messages */
  .msg{display:flex;gap:12px;padding:12px 2px;border-bottom:.5px solid var(--line);align-items:flex-start}
  .msg:last-child{border:0}
  .msg .from{display:flex;gap:8px;align-items:baseline}
  .msg .from .n{flex:1;min-width:0;font-weight:500}
  .msg .from .d{color:var(--muted);font-size:13px;flex:none}
  .msg .s{font-size:15px}
  .msg .p{color:var(--muted);font-size:14px;margin-top:2px}
  .msg.unread .n,.msg.unread .s{font-weight:800}
  .msg.unread .d{color:var(--accent);font-weight:700}
  .udot{width:9px;height:9px;border-radius:50%;background:var(--accent);flex:none;margin-top:16px}
  .search{display:flex;align-items:center;gap:8px;background:var(--card2);border-radius:12px;padding:0 12px;margin:2px 0 12px}
  .search input{flex:1;border:0;background:none;color:var(--text);font:inherit;font-size:16px;padding:10px 0;outline:none;min-width:0}
  .search .ic{color:var(--muted)}
  .fab{position:fixed;right:18px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:15;width:56px;height:56px;border-radius:50%;
    background:var(--accent);color:#fff;display:grid;place-items:center;box-shadow:0 6px 18px rgba(0,0,0,.35)}
  .fab .ic{width:26px;height:26px}
  .mhead{display:flex;gap:12px;align-items:center;margin:6px 0 16px}
  .mbody{font-size:16px;line-height:1.55;word-wrap:break-word;overflow-wrap:anywhere}
  .mbody p{margin:0 0 12px}
  .mbody a{color:var(--accent);text-decoration:underline}
  .mbody img{max-width:100%;height:auto}
  .mbody table{display:block;overflow-x:auto;max-width:100%}
  .reply{background:var(--card);border-radius:16px;padding:10px;box-shadow:var(--shadow);margin-top:16px}
  .reply textarea{width:100%;min-height:90px;border:0;background:var(--card2);color:var(--text);border-radius:10px;padding:10px;
    font:inherit;font-size:16px;resize:vertical;outline:none}
  .btn-p{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;background:var(--accent);color:#fff;
    font-weight:700;font-size:16px;border-radius:12px;padding:12px 18px;width:100%;margin-top:8px}
  .btn-p:disabled{opacity:.6}
  .btn-s{display:inline-flex;align-items:center;gap:8px;border:0;background:var(--card2);color:var(--text);font-weight:600;
    font-size:15px;border-radius:12px;padding:10px 14px}

  /* subject header */
  .hero{border-radius:18px;padding:18px;color:#fff;background:var(--c);margin:6px 0 4px;box-shadow:var(--shadow)}
  .hero h1{margin:0 0 4px;color:#fff}
  .hero a{color:#fff;opacity:.9}
  .alert{display:flex;gap:12px;align-items:center;background:color-mix(in srgb,var(--warn) 16%,var(--card));
    border-radius:14px;padding:12px 14px;margin:6px 0 10px}
  .alert .ic{color:var(--warn)}

  /* ---- motion ---- */
  @keyframes skIn{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:none}}
  @keyframes skFade{from{opacity:0}to{opacity:1}}
  @keyframes skGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
  @keyframes skPop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
  .anim{animation:skIn .45s cubic-bezier(.2,.85,.25,1) both}
  main{transition:opacity .14s ease,transform .14s ease}
  .app.leaving main{opacity:0;transform:translateY(-6px)}
  .top .title{animation:skFade .3s ease both}
  .card,.box,.gcard,.chip,.btn-p,.btn-s,.days button,.seg button,.seg a,.nav a,.dl,.les,.msg,.fab,.room{
    transition:transform .18s cubic-bezier(.2,.8,.2,1),background-color .2s,opacity .2s,box-shadow .2s}
  .card:active,.box:active,.gcard:active,.chip:active,.btn-p:active,.btn-s:active,.days button:active,.les:active,.msg:active,.dl:active{transform:scale(.97)}
  .nav a:active .ic{transform:scale(.85)}
  .nav a .ic{transition:transform .2s cubic-bezier(.2,.8,.2,1)}
  .nav a.on .ic{animation:skPop .4s cubic-bezier(.2,.8,.2,1)}
  .fab{animation:skPop .5s .25s cubic-bezier(.2,.8,.2,1) both}
  .fab:active{transform:scale(.9)}
  .badge{animation:skPop .45s .2s both}
  details[open]>*:not(summary){animation:skIn .3s cubic-bezier(.2,.85,.25,1) both}
  details>summary .ic{transition:transform .25s}
  details[open]>summary .ic.chev{transform:rotate(180deg)}
  .meter i{transform-origin:left;animation:skGrow .8s .15s cubic-bezier(.2,.85,.25,1) both}
  .les.cur{animation:skIn .45s both,skGlow 2.4s 1s ease-in-out infinite}
  @keyframes skGlow{0%,100%{box-shadow:0 0 0 0 rgba(47,191,113,.0)}50%{box-shadow:0 0 0 6px rgba(47,191,113,.18)}}
  .drawer .dl{opacity:0;transform:translateX(-12px);transition:opacity .25s,transform .3s cubic-bezier(.2,.85,.25,1),background-color .2s}
  .app.open .drawer .dl{opacity:1;transform:none}
  ${Array.from({length:18},(_,i)=>`.app.open .drawer .dl:nth-of-type(${i+1}){transition-delay:${40+i*22}ms}`).join('')}
  .scrim{backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}
  @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}


  /* ---- calendar ---- */
  .calhead{display:flex;align-items:center;gap:8px;margin:6px 0 10px}
  .calhead h1{flex:1;margin:0;font-size:22px;text-transform:capitalize;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .iconbtn{width:40px;height:40px;border-radius:12px;border:0;background:var(--card);color:var(--text);display:grid;place-items:center;box-shadow:var(--shadow)}
  .iconbtn:active{transform:scale(.92)}
  .today-btn{border:0;background:var(--card2);color:var(--accent);font-weight:700;font-size:14px;border-radius:12px;padding:10px 12px}
  .cal{background:var(--card);border-radius:18px;padding:10px 8px 8px;box-shadow:var(--shadow);touch-action:pan-y;overflow:hidden}
  .cal .wd{display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:4px}
  .cal .days7{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
  .cal .d{border:0;background:none;color:var(--text);border-radius:12px;padding:6px 0 5px;min-height:52px;display:flex;flex-direction:column;align-items:center;gap:3px;font:inherit}
  .cal .d .n{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:15px;font-weight:600}
  .cal .d.out{opacity:.35}
  .cal .d.wk .n{color:var(--muted)}
  .cal .d.today .n{color:var(--accent);box-shadow:inset 0 0 0 2px var(--accent)}
  .cal .d.sel .n{background:var(--accent);color:#fff;box-shadow:none}
  .cal .d:active{background:var(--card2)}
  .cal .dots{display:flex;gap:3px;height:6px}
  .cal .dots i{width:6px;height:6px;border-radius:50%;background:var(--c)}
  .slideL{animation:skSlideL .3s cubic-bezier(.2,.85,.25,1)}
  .slideR{animation:skSlideR .3s cubic-bezier(.2,.85,.25,1)}
  @keyframes skSlideL{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:none}}
  @keyframes skSlideR{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:none}}
  .evc{display:flex;gap:0;padding:0;overflow:hidden;cursor:pointer}
  .evc .bar{width:5px;background:var(--c);flex:none}
  .evc .in{padding:12px 14px;flex:1;min-width:0}
  .evc .when{font-size:13px;color:var(--muted);margin-top:3px}
  .kind{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;color:var(--c);margin-bottom:3px}
  /* ---- bottom sheet ---- */
  .sheet-scrim{position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.5);animation:skFade .2s both}
  .sheet{position:fixed;left:0;right:0;bottom:0;z-index:41;max-height:82vh;overflow:auto;background:var(--card);
    border-radius:22px 22px 0 0;padding:10px 18px calc(24px + env(safe-area-inset-bottom));animation:skUp .35s cubic-bezier(.2,.85,.25,1) both}
  .sheet .grab{width:40px;height:5px;border-radius:3px;background:var(--line);margin:0 auto 14px}
  .sheet h2{font-size:21px;margin:0 0 6px}
  @keyframes skUp{from{transform:translateY(100%)}to{transform:none}}
  .sheet.closing{animation:skDown .22s ease-in both}
  @keyframes skDown{to{transform:translateY(100%)}}
  /* ---- forum / posts ---- */
  .frow{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:.5px solid var(--line)}
  .frow:last-child{border:0}
  .newdot{width:9px;height:9px;border-radius:50%;background:var(--good);flex:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--good) 25%,transparent)}
  .post{display:flex;gap:10px;margin-bottom:14px}
  .post .av{width:36px;height:36px;font-size:13px}
  .bubble{flex:1;min-width:0;background:var(--card);border-radius:4px 18px 18px 18px;padding:10px 14px;box-shadow:var(--shadow)}
  .bubble .hd{display:flex;gap:8px;align-items:baseline;margin-bottom:4px}
  .bubble .hd b{font-size:14px}
  .bubble .hd span{color:var(--muted);font-size:12px}
  .bubble .mbody{font-size:15px}
  .article{background:var(--card);border-radius:18px;padding:16px;box-shadow:var(--shadow)}
  .article .mbody span[style*="font-size"]{font-size:inherit!important}
  /* ---- profile ---- */
  .phero{display:flex;flex-direction:column;align-items:center;text-align:center;padding:18px 0 6px}
  .phero .pav{width:96px;height:96px;margin-bottom:12px;box-shadow:0 8px 26px rgba(0,0,0,.35)}
  .phero h1{margin:0 0 6px}
  .kv{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:.5px solid var(--line);font-size:15px}
  .kv:last-child{border:0}
  .kv span:first-child{color:var(--muted)}
  .kv span:first-child{flex:1;min-width:0}
  .kv span:last-child{text-align:right;font-weight:600;overflow-wrap:break-word;max-width:62%}

  /* ---- settings / filters / typography ---- */
  .app.rounded,.app.rounded *{font-family:ui-rounded,"SF Pro Rounded",-apple-system,BlinkMacSystemFont,system-ui,sans-serif}
  .app[data-size="s"] main{zoom:.92}.app[data-size="l"] main{zoom:1.1}.app[data-size="xl"] main{zoom:1.22}
  .app.nomotion *,.app.nomotion *:before{animation:none!important;transition:none!important}
  .tm,.time,.room,.tm2,.datebox b,.avg,.gbox .v,.mk .v,.ring b,.stat b,.badge,.pill,.cal .n,.when{font-variant-numeric:tabular-nums}
  h1,.sec h2,.hero h1,.phero h1{letter-spacing:-.3px}
  .sheet .lbl{margin:16px 2px 6px}
  .sheet .seg{margin:0}
  .swatches{display:flex;gap:12px;flex-wrap:wrap}
  .swatches button{width:36px;height:36px;border-radius:50%;border:0;background:var(--c);box-shadow:0 0 0 0 var(--c);transition:box-shadow .2s,transform .2s}
  .swatches button.on{box-shadow:0 0 0 3px var(--card),0 0 0 5px var(--c)}
  .swatches button:active{transform:scale(.9)}
  .fchips{display:flex;gap:8px;overflow-x:auto;margin:0 -16px 12px;padding:2px 16px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
  .fchips::-webkit-scrollbar{display:none}
  .fchips button{flex:none;border:0;border-radius:20px;padding:8px 14px;font-size:14px;font-weight:600;background:var(--card);color:var(--muted);
    box-shadow:var(--shadow);display:flex;gap:6px;align-items:center;transition:background-color .2s,color .2s,transform .15s}
  .fchips button span{font-size:12px;background:var(--card2);border-radius:10px;padding:1px 7px;color:var(--muted)}
  .fchips button.on{background:var(--accent);color:#fff}
  .fchips button.on span{background:rgba(255,255,255,.25);color:#fff}
  .fchips button:active{transform:scale(.94)}
  .toolbar{display:flex;gap:8px;align-items:center;margin-bottom:10px}
  .toolbar .search{flex:1;margin:0}
  .sortbtn{border:0;background:var(--card2);color:var(--text);border-radius:12px;padding:10px 12px;font-size:14px;font-weight:600;display:flex;gap:6px;align-items:center;white-space:nowrap}
  .nores{color:var(--muted);text-align:center;padding:22px 10px}
  .prog{height:6px;border-radius:3px;background:var(--card2);overflow:hidden;margin-top:10px}
  .prog i{display:block;height:100%;background:var(--c,var(--accent));border-radius:3px;transition:width 1s linear}

  .weeknav{display:flex;align-items:center;gap:8px;margin:0 0 12px}
  .days button{position:relative}
  .mk2{display:flex;gap:3px;justify-content:center;height:6px;margin-top:3px}
  .mk2 i{width:6px;height:6px;border-radius:50%;background:var(--c)}
  .days button.on .mk2 i{box-shadow:0 0 0 1.5px #fff}
  .les.exam{box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--bad) 60%,transparent)}
  .grid .c.ex{box-shadow:inset 0 0 0 2px #fff}
  .grid .c .tst{display:block;font-size:9px;letter-spacing:.5px;background:rgba(0,0,0,.35);border-radius:4px;padding:0 3px;width:max-content;margin-bottom:2px}

  /* ---- more customisation ---- */
  .sgroup{margin:22px 2px 2px;font-size:20px;font-weight:800;letter-spacing:-.3px}
  .themes{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px}
  .themes button{border:0;border-radius:14px;background:var(--b);color:#fff;padding:10px 8px 8px;display:flex;flex-direction:column;align-items:center;gap:6px;
    font-size:12px;font-weight:600;box-shadow:inset 0 0 0 1.5px var(--line);transition:transform .15s,box-shadow .2s}
  .themes button i{width:100%;height:22px;border-radius:7px;background:var(--c2)}
  .themes button.on{box-shadow:inset 0 0 0 2.5px var(--accent)}
  .themes button:active{transform:scale(.95)}
  .tgl{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:.5px solid var(--line);font-size:15px;cursor:pointer}
  .tgl:last-child{border:0}
  .tgl span{flex:1}
  .tgl input{display:none}
  .tgl i{width:46px;height:28px;border-radius:14px;background:var(--card2);position:relative;transition:background-color .2s;flex:none;box-shadow:inset 0 0 0 1px var(--line)}
  .tgl i:after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;transition:transform .22s cubic-bezier(.2,.8,.2,1);box-shadow:0 1px 3px rgba(0,0,0,.4)}
  .tgl input:checked+i{background:var(--accent)}
  .tgl input:checked+i:after{transform:translateX(18px)}
  .sheet .search input{padding:12px 0}
  .app[data-radius="s"] :is(.card,.box,.gcard,.gbox,.hero,.alert,.article,.bubble,.les,.cal,.reply,.note,.search,.seg,.days button,.fchips button,.chip,.btn-p,.btn-s,.room,.pill,.datebox,.grid .c){border-radius:7px!important}
  .app[data-radius="l"] :is(.card,.box,.gcard,.hero,.alert,.article,.les,.cal,.reply){border-radius:26px!important}
  .app[data-radius="l"] :is(.gbox,.search,.seg,.btn-p,.chip,.fchips button,.days button){border-radius:20px!important}
  .app[data-density="compact"] .card{padding:10px 12px;margin-bottom:7px}
  .app[data-density="compact"] .les .in{padding:8px 12px}
  .app[data-density="compact"] .fi{padding:9px 0}
  .app[data-density="compact"] .msg{padding:8px 2px}
  .app[data-density="compact"] .sec{margin:18px 2px 8px}
  .app[data-density="compact"] h1{font-size:25px}
  .app.nolabels .nav a{font-size:0;gap:0;padding:8px 0}
  .app.nolabels .nav a .ic{width:27px;height:27px}
  .app.nolabels .badge{font-size:11px}
  .app.noglass .top,.app.noglass .nav{backdrop-filter:none;-webkit-backdrop-filter:none;background:var(--card)}
  .app.noglass .top{background:var(--bg)}
  /* loading bar while the next page is fetched */
  .top:after{content:"";position:absolute;left:0;bottom:-1px;height:2px;width:0;background:var(--accent);opacity:0}
  .app.loading .top:after{opacity:1;animation:skLoad 1.2s cubic-bezier(.2,.8,.2,1) forwards}
  @keyframes skLoad{0%{width:0}30%{width:45%}100%{width:85%}}
  /* ---- generic person avatar ---- */
  .pav{width:46px;height:46px;border-radius:50%;background:#3a3f4b;display:grid;place-items:center;overflow:hidden;flex:none}
  .pav svg{width:100%;height:100%;display:block}

  /* ---- topics ---- */
  .tl{position:relative;padding-left:18px}
  .tl:before{content:"";position:absolute;left:5px;top:6px;bottom:6px;width:2px;border-radius:2px;background:var(--line)}
  .tday{position:relative;margin:18px 0 8px;font-weight:700;color:var(--muted);font-size:14px}
  .tday:first-child{margin-top:4px}
  .tday:before{content:"";position:absolute;left:-17px;top:4px;width:10px;height:10px;border-radius:50%;background:var(--c,var(--accent));
    box-shadow:0 0 0 3px var(--bg)}
  .tday b{color:var(--text);font-size:16px;margin-right:6px}
  .topic{display:flex;gap:12px;align-items:center}
  .tm2{font-variant-numeric:tabular-nums;font-size:13px;font-weight:700;color:var(--muted);background:var(--card2);border-radius:8px;padding:4px 8px;white-space:nowrap}

  /* ---- v4: icons, pull-to-refresh, toasts, avatar ---- */
  .ic .f{fill:none}
  .nav a.on .ic .f,.ic.fill .f,.fi .dot .ic .f,.fab .ic .f,.ptr .ic .f{fill:currentColor;fill-opacity:.22}
  .nav a.on .ic{stroke-width:2.05}
  .empty .ic.big,.nores .ic.big{width:46px;height:46px;margin:0 auto 10px;color:var(--accent)}
  .empty .ic.big .f,.nores .ic.big .f{fill:currentColor;fill-opacity:.18}
  .ptr{position:fixed;left:50%;top:calc(40px + env(safe-area-inset-top));z-index:19;width:40px;height:40px;border-radius:50%;
    background:var(--card);color:var(--accent);display:grid;place-items:center;box-shadow:0 6px 18px rgba(0,0,0,.4);
    opacity:0;transform:translate(-50%,0) scale(.5);pointer-events:none;will-change:transform,opacity}
  .ptr .ic{width:20px;height:20px}
  .ptr.armed{background:var(--accent);color:#fff}
  .ptr.back{transition:transform .25s cubic-bezier(.2,.8,.2,1),opacity .2s}
  .ptr.spin{opacity:1!important;transform:translate(-50%,34px) scale(1)!important;transition:transform .25s cubic-bezier(.2,.8,.2,1),opacity .2s}
  .ptr.spin .ic{animation:skSpin .7s linear infinite}
  @keyframes skSpin{to{transform:rotate(360deg)}}
  .app.still .top .title,.app.still .nav a.on .ic,.app.still .badge,.app.still .fab,.app.still .les.cur{animation:none!important}
  .toast{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom));z-index:60;transform:translateX(-50%);
    background:color-mix(in srgb,var(--card2) 94%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
    color:var(--text);border-radius:14px;padding:11px 16px;font-size:14px;font-weight:600;display:flex;gap:8px;align-items:center;
    box-shadow:0 8px 26px rgba(0,0,0,.45);animation:skToast .35s cubic-bezier(.2,.85,.25,1) both;width:max-content;max-width:88vw}
  .toast .ic{width:18px;height:18px}
  .toast.bad .ic{color:var(--bad)}.toast.good .ic{color:var(--good)}
  .toast.out{opacity:0;transition:opacity .25s}
  @keyframes skToast{from{opacity:0;transform:translate(-50%,16px) scale(.96)}to{opacity:1;transform:translate(-50%,0)}}
  .pav img{width:100%;height:100%;object-fit:cover;display:block}
  .hello{display:flex;align-items:center;gap:12px}
  .hello .grow{min-width:0}
  .hello .me{flex:none}
  .hello .me .pav{width:50px;height:50px;box-shadow:0 0 0 2px var(--bg),0 0 0 3.5px color-mix(in srgb,var(--accent) 60%,transparent)}
  .avrow{display:flex;align-items:center;gap:14px}
  .avrow .pav{width:66px;height:66px}
  .avrow .btns{display:flex;flex-wrap:wrap;gap:8px}
  label.btn-s{cursor:pointer}
  label.btn-s input{display:none}
  .note2{font-size:13px;color:var(--muted);margin:8px 2px 0;line-height:1.45}
  .note2.warn{color:var(--warn)}
  .steps{margin:6px 0 0;padding-left:20px;font-size:14px;line-height:1.55;color:var(--muted)}
  .steps b{color:var(--text)}

  /* ---- compose ---- */
  .form{background:var(--card);border-radius:16px;box-shadow:var(--shadow);margin-bottom:12px}
  .frow2{display:flex;align-items:flex-start;gap:10px;padding:8px 14px;border-bottom:.5px solid var(--line)}
  .frow2>label{color:var(--muted);font-size:15px;padding-top:8px;min-width:46px}
  .tokens{flex:1;display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-width:0;padding:2px 0}
  .tok{display:inline-flex;align-items:center;gap:6px;background:color-mix(in srgb,var(--accent) 22%,var(--card2));
    border-radius:16px;padding:5px 5px 5px 11px;font-size:14px;font-weight:600;animation:skPop .3s both;max-width:100%}
  .tok span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .tok button{border:0;background:rgba(255,255,255,.14);width:22px;height:22px;border-radius:50%;display:grid;place-items:center;padding:0;flex:none}
  .tok button .ic{width:12px;height:12px}
  .finput{flex:1;min-width:110px;border:0;background:none;color:var(--text);font:inherit;font-size:16px;padding:7px 0;outline:none}
  .fta{width:100%;min-height:200px;border:0;background:none;color:var(--text);font:inherit;font-size:16px;line-height:1.5;padding:12px 14px;outline:none;resize:none;display:block}
  .sugg{margin:-6px 0 12px;background:var(--card2);border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.45);overflow:hidden;animation:skIn .2s both}
  .sugg button{display:flex;width:100%;align-items:center;gap:12px;border:0;background:none;padding:10px 14px;text-align:left;border-bottom:.5px solid var(--line)}
  .sugg button:last-child{border:0}
  .sugg button:active{background:var(--card)}
  .sugg .av,.plist .av{width:34px;height:34px;font-size:13px}
  .sugg .muted{padding:12px 14px;font-size:14px}
  .btnrow{display:flex;gap:10px;margin-top:4px}
  .btnrow .btn-p{flex:1;margin:0}
  .btnrow .btn-s{justify-content:center;padding:12px 16px}
  .tgl.inline{padding:12px 14px;border:0}

  /* ---- files, rooms, search ---- */
  .ftype{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;font-size:11px;font-weight:800;letter-spacing:.3px;color:#fff;background:var(--c,var(--accent));flex:none}
  mark{background:color-mix(in srgb,var(--warn) 38%,transparent);color:inherit;border-radius:3px;padding:0 1px}
  .kvcard{padding:4px 14px}
  .roomnow{display:flex;gap:12px;align-items:center}
  .klass{font-size:12px;color:var(--muted)}
  .plist .frow{gap:12px}
  .role{font-size:11px;font-weight:700;color:var(--muted);background:var(--card2);border-radius:7px;padding:2px 7px;white-space:nowrap}
  .meta{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;color:var(--muted);font-size:13px;margin-top:6px}
  .meta span{display:inline-flex;gap:5px;align-items:center}
  .meta .ic{width:15px;height:15px}
  `;

  /* ------------------------------------------------------------------ *
   *  Styles for the real IDU page (fallback pages + hiding)
   * ------------------------------------------------------------------ */
  const PAGE_CSS = `
  html.sk-full,html.sk-full body{background:var(--sk-bg,#0f1115)!important;margin:0!important;padding:0!important;min-width:0!important}
  html.sk-full body>*:not(#sk-host){display:none!important}
  #sk-host{display:block!important;position:static!important;width:auto!important;margin:0!important;padding:0!important;border:0!important;float:none!important}

  html.sk-fb{--fb-bg:#0f1115;--fb-card:#1b1e26;--fb-card2:#252a34;--fb-text:#f2f4f8;--fb-muted:#9097a8;--fb-line:#2b303b;--fb-accent:#3d9be9}
  html,body{background-color:var(--sk-bg,#0f1115)}
  html.sk-fb,html.sk-fb body{background:var(--fb-bg)!important;color:var(--fb-text)!important;min-width:0!important;margin:0!important;
    font:16px/1.45 -apple-system,BlinkMacSystemFont,sans-serif!important;-webkit-text-size-adjust:100%!important}
  html.sk-fb #top,html.sk-fb #top-selection,html.sk-fb #footer,html.sk-fb #breadcrumbs-section,html.sk-fb #tiptip_holder{display:none!important}
  html.sk-fb .container{width:auto!important;max-width:680px!important;margin:0 auto!important;
    padding:calc(66px + env(safe-area-inset-top)) 14px calc(100px + env(safe-area-inset-bottom))!important;background:none!important}
  html.sk-fb [class*="span-"],html.sk-fb .left-column,html.sk-fb .right-column,html.sk-fb .double-column,html.sk-fb #content,
  html.sk-fb #site-content,html.sk-fb .column{width:auto!important;float:none!important;margin:0!important;max-width:100%!important;
    background:none!important;border:0!important}
  html.sk-fb .module{background:var(--fb-card)!important;border:0!important;border-radius:16px!important;padding:14px!important;
    margin:0 0 12px!important;box-shadow:none!important;overflow:hidden}
  html.sk-fb .module h3,html.sk-fb h1,html.sk-fb h2,html.sk-fb h3,html.sk-fb h4{background:none!important;border:0!important;
    color:var(--fb-text)!important;font-size:18px!important;line-height:1.3!important;margin:0 0 8px!important;padding:0!important;height:auto!important}
  html.sk-fb .module h3 .toggle-switch{display:none!important}
  html.sk-fb .module *,html.sk-fb p,html.sk-fb label,html.sk-fb li,html.sk-fb span,html.sk-fb div{color:inherit}
  html.sk-fb .module{color:var(--fb-text)!important}
  html.sk-fb a{color:var(--fb-accent)!important}
  html.sk-fb table{display:block;overflow-x:auto;max-width:100%;border-collapse:collapse!important;background:none!important}
  html.sk-fb td,html.sk-fb th{background:transparent!important;color:var(--fb-text)!important;border-color:var(--fb-line)!important;padding:8px!important}
  html.sk-fb input[type=text],html.sk-fb input[type=password],html.sk-fb input[type=email],html.sk-fb input[type=file],
  html.sk-fb textarea,html.sk-fb select{font-size:16px!important;background:var(--fb-card2)!important;color:var(--fb-text)!important;
    border:1px solid var(--fb-line)!important;border-radius:10px!important;padding:8px 10px!important;max-width:100%!important;box-sizing:border-box}
  html.sk-fb input[type=submit],html.sk-fb input[type=button],html.sk-fb button,html.sk-fb .button,html.sk-fb #content#content a.sk-btn{
    -webkit-appearance:none;background:var(--fb-accent)!important;color:#fff!important;border:0!important;border-radius:12px!important;
    padding:12px 18px!important;font-size:16px!important;font-weight:700!important;text-decoration:none!important;display:inline-block}
  html.sk-fb a.sk-btn{display:block!important;text-align:center;margin:14px 0 4px}
  html.sk-fb img{max-width:100%;height:auto}
  html.sk-fb #flash-messages-section div,html.sk-fb .flash{border-radius:14px!important}
  html.sk-fb label{float:none!important;width:auto!important;display:block!important;margin:6px 0 4px!important}
  html.sk-fb .field{margin-bottom:10px!important}
  html.sk-fb .cke{max-width:100%!important}

  /* dark everything inside IDU's own pages */
  html.sk-fb #content *:not(img):not(.sk-btn):not(input[type=submit]):not(button):not([style*="background"]):not([class*="fc-event"]):not([class*="fc-day-grid-event"]){
    background-color:transparent!important;border-color:var(--fb-line)!important}
  html.sk-fb #content *:not(a):not([style*="color"]):not([class*="fc-event"]):not(.fc-title):not(.fc-time){color:inherit}
  html.sk-fb #content .module{color:var(--fb-text)!important}
  html.sk-fb #content#content tr:nth-child(even)>td{background-color:var(--fb-card2)!important}
  html.sk-fb #content .module input[type=text],html.sk-fb #content .module textarea,html.sk-fb #content .module select{background-color:var(--fb-card2)!important}
  html.sk-fb #content .cke_top,html.sk-fb #content .cke_bottom{background:#d9dce3!important;border-radius:10px!important}
  html.sk-fb #content .cke_top{display:flex!important;flex-wrap:wrap!important}
  html.sk-fb #content .cke,html.sk-fb #content .cke_inner,html.sk-fb #content .cke_contents{width:100%!important;max-width:100%!important;border-radius:10px!important}
  html.sk-fb #content .fc-button,html.sk-fb #content .fc button{background:var(--fb-card2)!important;color:var(--fb-text)!important;
    border:0!important;border-radius:10px!important;box-shadow:none!important;text-shadow:none!important;padding:8px 12px!important;font-size:14px!important;height:auto!important}
  html.sk-fb #content .fc-state-active,html.sk-fb #content .fc-button-active{background:var(--fb-accent)!important;color:#fff!important}
  html.sk-fb #content .fc-toolbar,html.sk-fb #content .fc-header{display:flex!important;flex-wrap:wrap!important;gap:8px!important;align-items:center}
  html.sk-fb #content .fc-toolbar h2,html.sk-fb #content .fc-header-title h2{font-size:18px!important;white-space:nowrap}
  html.sk-fb #content .fc-event,html.sk-fb #content [class*="fc-event"]{border-radius:6px!important;font-size:12px!important;overflow:hidden}
  html.sk-fb #content .fc table{display:table!important}
  html.sk-fb .module{animation:skPageIn .45s cubic-bezier(.2,.85,.25,1) both}
  html.sk-fb .module:nth-child(2){animation-delay:.05s}html.sk-fb .module:nth-child(3){animation-delay:.1s}html.sk-fb .module:nth-child(n+4){animation-delay:.15s}
  @keyframes skPageIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion: reduce){html.sk-fb .module{animation:none!important}}

  /* tables turned into cards */
  html.sk-fb .sk-cards{display:block!important}
  html.sk-fb .sk-cards>thead{display:none!important}
  html.sk-fb .sk-cards>tbody{display:grid!important;gap:10px}
  html.sk-fb #content#content .sk-cards tr{display:block!important;background:var(--fb-card2)!important;border-radius:14px!important;padding:12px 14px!important}
  html.sk-fb #content#content .sk-cards tr.sk-head{display:none!important}
  html.sk-fb #content#content .sk-cards tr>td{display:block!important;padding:2px 0!important;border:0!important;background:transparent!important;text-align:left!important}
  html.sk-fb #content#content .sk-cards td:empty{display:none!important}
  html.sk-fb .sk-cards td[data-l]:not(.sk-first):before{content:attr(data-l) ": ";color:var(--fb-muted);font-size:13px}
  html.sk-fb .sk-cards td.sk-first{font-weight:700;font-size:16px;margin-bottom:4px}
  html.sk-fb .sk-cards td.sk-acts{display:flex!important;flex-wrap:wrap;gap:8px;margin-top:8px}
  html.sk-fb #content#content .sk-cards td.sk-acts a{background:var(--fb-accent)!important;color:#fff!important;border-radius:10px;padding:7px 12px;text-decoration:none;font-weight:600;font-size:14px}
  html.sk-fb #content#content .sk-av{width:96px!important;height:96px!important;border-radius:50%;overflow:hidden;background:#3a3f4b!important;display:inline-block}
  html.sk-fb .sk-av svg{width:100%;height:100%;display:block}
  `;

  const LOGIN_CSS = `
  html.sk-loginmode,html.sk-loginmode body{background:#0f1115!important;margin:0!important;min-width:0!important}
  html.sk-loginmode body>*:not(#sk-login){display:none!important}
  #sk-login{min-height:100vh;box-sizing:border-box;padding:calc(48px + env(safe-area-inset-top)) 18px 40px;color:#f2f4f8;
    font:16px/1.45 -apple-system,BlinkMacSystemFont,sans-serif;-webkit-text-size-adjust:100%;animation:skLogin .5s cubic-bezier(.2,.85,.25,1) both}
  @keyframes skLogin{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  #sk-login .sk-brand{text-align:center;margin-bottom:22px}
  #sk-login .sk-logo{width:76px;height:76px;border-radius:22px;margin:0 auto 14px;display:grid;place-items:center;
    background:linear-gradient(180deg,#3d9be9,#1e5ac8);color:#fff;font:800 26px -apple-system,sans-serif;letter-spacing:.5px;
    box-shadow:0 10px 30px rgba(30,90,200,.35)}
  #sk-login h1{font-size:26px;margin:0 0 4px;font-weight:800}
  #sk-login .sk-sub{color:#9097a8;font-size:15px}
  #sk-login .sk-box{background:#1b1e26;border-radius:20px;padding:18px;max-width:440px;margin:0 auto}
  #sk-login .sk-box *{float:none!important;position:static!important;width:auto!important;max-width:100%!important;
    background-color:transparent!important;color:#f2f4f8!important;text-align:left!important;margin-left:0!important;margin-right:0!important;
    box-sizing:border-box!important;font-family:inherit!important}
  #sk-login .sk-box table,#sk-login .sk-box tbody,#sk-login .sk-box tr,#sk-login .sk-box td,#sk-login .sk-box th{display:block!important;padding:0!important;border:0!important}
  #sk-login .sk-box h1,#sk-login .sk-box h2,#sk-login .sk-box h3,#sk-login .sk-box #top,#sk-login .sk-box #visual,#sk-login .sk-box #logo,
    #sk-login .sk-box #change_language,#sk-login .sk-box .header,#sk-login .sk-box img[alt="IDU"]{display:none!important}
  #sk-login .sk-box label{display:block!important;font-size:14px!important;font-weight:600!important;color:#9097a8!important;margin:12px 0 6px!important}
  #sk-login .sk-box input[type=text],#sk-login .sk-box input[type=email],#sk-login .sk-box input[type=password]{
    display:block!important;width:100%!important;font-size:17px!important;padding:13px 14px!important;border-radius:12px!important;
    border:1px solid #2b303b!important;background-color:#252a34!important;color:#f2f4f8!important;-webkit-appearance:none;outline:none}
  #sk-login .sk-box input[type=text]:focus,#sk-login .sk-box input[type=password]:focus{border-color:#3d9be9!important}
  #sk-login .sk-box input[type=checkbox]{width:20px!important;height:20px!important;vertical-align:middle;margin:0 8px 0 0!important;accent-color:#3d9be9}
  #sk-login .sk-box input[type=submit],#sk-login .sk-box button{display:block!important;width:100%!important;margin-top:16px!important;
    background-color:#1e88e5!important;color:#fff!important;border:0!important;border-radius:14px!important;padding:14px!important;
    font-size:17px!important;font-weight:700!important;-webkit-appearance:none;text-align:center!important}
  #sk-login .sk-box input[type=submit]:active,#sk-login .sk-box button:active{transform:scale(.98)}
  #sk-login .sk-box a{color:#3d9be9!important;font-size:14px}
  #sk-login .sk-box iframe{max-width:100%!important}
  #sk-login .sk-box *:not(input):not(button):not(label):not(select){padding:0!important;margin-top:0!important;margin-bottom:0!important;
    box-shadow:none!important;height:auto!important;min-height:0!important;border-width:0!important}
  #sk-login .sk-box div,#sk-login .sk-box p{margin-top:6px!important}
  #sk-login .sk-box input[type=checkbox]+label,#sk-login .sk-box label:has(input[type=checkbox]){display:inline!important;margin:0!important;color:#f2f4f8!important;font-weight:500!important;font-size:15px!important}
  #sk-login .sk-box a{display:block;margin-top:10px!important;text-align:center!important}
  #sk-login .sk-flash{max-width:440px;margin:0 auto 14px;border-radius:14px;overflow:hidden;font-size:13px}
  #sk-login .sk-flash *{background-color:transparent!important;color:#ffb4c2!important;text-align:left!important;width:auto!important;float:none!important;margin:0!important}
  #sk-login .sk-flash>*{background-color:rgba(240,80,110,.12)!important;padding:10px 12px!important;border:0!important;margin-bottom:6px!important;border-radius:12px}
  #sk-login .sk-flash details summary{cursor:pointer;font-weight:700;list-style:none}
  `;

  /* ------------------------------------------------------------------ *
   *  Helpers: no-zoom, avatar, animations, fallback polish, login
   * ------------------------------------------------------------------ */
  const NO_ZOOM = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
  const PERSON_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="#3a3f4b"/>' +
    '<circle cx="32" cy="25" r="12" fill="#8a91a3"/><path d="M10 60c2-13 11-20 22-20s20 7 22 20z" fill="#8a91a3"/></svg>';
  const PERSON_AV = `<div class="pav">${PERSON_SVG}</div>`;

  const ANIM_SEL = '.fi,.card,.gcard,details,.les,.msg,.ev,.hero,.alert,.sec,h1,.lead,.seg,.days,.grid,.search,.chips,.upd,.box,.tday,.empty,.reply,.brk,.dayh';
  function animateIn(scope) {
    if (!scope) return;
    let i = 0;
    const vh = window.innerHeight || 800;
    scope.querySelectorAll(ANIM_SEL).forEach(el => {
      const parent = el.parentElement && el.parentElement.closest(ANIM_SEL);
      if (parent && scope.contains(parent)) return;            // only animate outermost blocks
      if (el.classList.contains('anim')) { el.classList.remove('anim'); void el.offsetWidth; }   // re-render of the same node
      if (i >= 18 || (i > 4 && el.getBoundingClientRect().top > vh * 1.15)) return;              // below the screen: no need
      el.style.animationDelay = Math.min(i++ * 35, 420) + 'ms';
      el.classList.add('anim');
    });
    scope.querySelectorAll('.ring').forEach(r => {           // count the attendance ring up
      const target = parseFloat(r.dataset.p || '0'); const t0 = performance.now();
      const step = t => { const k = Math.min(1, (t - t0) / 900); const e = 1 - Math.pow(1 - k, 3);
        r.style.setProperty('--p', (target * e).toFixed(2)); if (k < 1) requestAnimationFrame(step); };
      r.style.setProperty('--p', '0'); requestAnimationFrame(step);
    });
  }

  // Pages I haven't redesigned: dark colours, tables -> cards, no photos
  function improveFallback() {
    $$('#content a').forEach(a => { if (/^(Potwierdzam|Wyślij|Zapisz)/i.test(txt(a))) a.classList.add('sk-btn'); });
    // profile photos -> generic person
    if (/^\/(students|teachers)\/\d+$/.test(location.pathname)) {
      $$('#content img').forEach(img => {
        const w = img.naturalWidth || img.width;
        if (w >= 60 || /profile|avatar|photo|zdj/i.test(img.className + img.alt + (img.parentElement ? img.parentElement.className : ''))) {
          const d = document.createElement('span'); d.className = 'sk-av'; d.innerHTML = PERSON_SVG; img.replaceWith(d);
        }
      });
    }
    // simple data tables -> cards
    $$('#content table').forEach(t => {
      if (t.closest('.fc, .schedule, form, .cke, #calendar') || t.classList.contains('presences_table') || t.querySelector('table')) return;
      const rows = $$(':scope > tbody > tr, :scope > tr, :scope > thead > tr', t);
      const headRow = rows.find(r => $$(':scope > th', r).length >= 2);
      if (!headRow) return;
      const labels = $$(':scope > th', headRow).map(txt);
      if (labels.length > 7) return;
      headRow.classList.add('sk-head');
      rows.filter(r => r !== headRow).forEach(r => {
        const tds = $$(':scope > td', r);
        let first = true;
        tds.forEach((td, i) => {
          if (labels[i]) td.setAttribute('data-l', labels[i]);
          let rest = txt(td); $$('a', td).forEach(a => { rest = rest.split(txt(a)).join(''); });
          const onlyLinks = !!td.querySelector('a') && rest.replace(/[|\s]/g, '') === '';
          if (!labels[i] && onlyLinks) td.classList.add('sk-acts');
          else if (first && txt(td)) { td.classList.add('sk-first'); first = false; }
        });
      });
      t.classList.add('sk-cards');
    });
  }

  // Login page: rebuild it as a clean phone screen around IDU's real form
  function loginMode() {
    const pw = $('input[type="password"]');
    const form = pw ? pw.closest('form') : null;
    if (!form) return false;
    // the visible login box = the outermost block that contains the form but not the whole page
    let box = form;
    while (box.parentElement && box.parentElement !== document.body &&
           !box.parentElement.matches('.container, #site-content, #content, .span-24') &&
           box.parentElement.querySelectorAll('input[type="password"]').length === 1 &&
           box.parentElement.getBoundingClientRect().width < 760) box = box.parentElement;
    const flashes = $$('#flash-messages-section > *, .flash, .alert, .error, .notice, .security-notice, [class*="flash"]')
      .filter(f => !box.contains(f) && !f.contains(box) && txt(f));
    const wrap = document.createElement('div');
    wrap.id = 'sk-login';
    wrap.innerHTML = `<div class="sk-brand"><div class="sk-logo">IDU</div><h1>${L('Zaloguj się', 'Log in')}</h1>
      <div class="sk-sub">${esc(txt($('#school-name')) || L('Dziennik IDU', 'IDU school diary'))}</div></div><div class="sk-flash"></div><div class="sk-box"></div>`;
    const fl = wrap.querySelector('.sk-flash');
    flashes.forEach(f => {
      if (txt(f).length > 160) {       // long notices collapse
        const d = document.createElement('details');
        d.innerHTML = `<summary>${esc(txt(f).split(/[.!]/)[0].slice(0, 70))} (rozwiń)</summary>`;
        d.appendChild(f); fl.appendChild(d);
      } else fl.appendChild(f);
    });
    wrap.querySelector('.sk-box').appendChild(box);
    document.body.appendChild(wrap);
    document.documentElement.classList.add('sk-loginmode');
    return true;
  }

  /* ------------------------------------------------------------------ *
   *  Settings (text size, font, colour, motion) + small shared helpers
   * ------------------------------------------------------------------ */
  const ACCENTS = { blue: '#3d9be9', purple: '#8b6cf6', green: '#2fbf71', orange: '#f5862b', pink: '#ec5f9b', red: '#f0506e',
    teal: '#14b8a6', yellow: '#eab308', indigo: '#6366f1', white: '#e5e7eb', iosblue: '#0a84ff', navy: '#24407a' };
  const THEMES = {
    dark: { bg: '#0f1115', card: '#1b1e26', card2: '#252a34', line: '#2b303b', label: 'Ciemny' },
    amoled: { bg: '#000000', card: '#111214', card2: '#1c1d21', line: '#26272b', muted: '#a8acb5', label: 'Czarny (OLED)' },
    ios: { bg: '#000000', card: '#1c1c1e', card2: '#2c2c2e', line: '#38383a', muted: '#98989f', label: 'iOS' },
    mono: { bg: '#141414', card: '#1d1d1d', card2: '#272727', line: '#2e2e2e', muted: '#a3a3a3', label: 'Mono' },
    bento: { bg: '#0d0e11', card: '#1a1c21', card2: '#24272e', line: '#2a2d34', label: 'Bento' },
    glass: { bg: '#0f1114', card: '#1d2026', card2: '#2a2e36', line: '#2f333b', label: 'Szkło' },
    kolor: { bg: '#111216', card: '#1d1f25', card2: '#292c34', line: '#2c2f37', label: 'Kolor' },
    paper: { bg: '#f7f2e6', card: '#fffdf7', card2: '#efe7d6', line: '#e2d9c5', text: '#1e2a4a', muted: '#5d6476', light: true, label: 'Zeszyt' },
    navy: { bg: '#0b1220', card: '#131c2e', card2: '#1c2840', line: '#24314b', label: 'Granatowy' },
    graphite: { bg: '#18181b', card: '#232327', card2: '#2e2e33', line: '#36363c', label: 'Grafit' },
    plum: { bg: '#130f1a', card: '#1e1828', card2: '#2a2236', line: '#33293f', label: 'Śliwkowy' }
  };
  const DEFAULTS = { size: 'm', font: 'system', accent: 'blue', motion: true, theme: 'dark', radius: 'm', density: 'normal',
    subj: 'vivid', labels: false, startTab: 'start', preset: 'obecny', head: 'system', nav: 'pill', cards: 'cards', contrast: 'normal',
    tabs: ['start', 'plan', 'subjects', 'grades', 'mail'], startLayout: 'A', tiles: ['next', 'grades', 'mail', 'todo'], tilesWide: ['next'], subjView: 'page', wfMode: 'max', wfTarget: 95, showTodo: true, nick: '', showNow: true, showDue: true, showExams: true, showEvents: true, showFeed: true, glass: true,
    haptics: true, nLesson: 0, nExam: false, nHw: false, nHour: 18, lang: 'pl' };
  function loadSettings() {
    let o = {}; try { o = JSON.parse(store.get('skSettings') || '{}'); } catch (e) {}
    return Object.assign({}, DEFAULTS, o);
  }
  function applySettings(app) {
    const st = loadSettings();
    const acc = ACCENTS[st.accent] || ACCENTS.blue;
    const th = THEMES[st.theme] || THEMES.dark;
    SUBJ_MODE = st.subj; SUBJ_MONO = acc; HAPTICS = st.haptics !== false;
    if (app) {
      app.style.setProperty('--accent', acc);
      app.style.setProperty('--bg', th.bg); app.style.setProperty('--card', th.card);
      app.style.setProperty('--card2', th.card2); app.style.setProperty('--line', th.line);
      app.dataset.size = st.size; app.dataset.radius = st.radius; app.dataset.density = st.density;
      app.classList.toggle('rounded', st.font === 'rounded');
      app.classList.toggle('nomotion', !st.motion);
      const light = !!th.light;
      app.style.setProperty('--text', th.text || '#f2f4f8');
      app.style.setProperty('--muted', st.contrast === 'high' ? (light ? '#3a4256' : '#c5cad4') : (th.muted || '#9097a8'));
      app.style.colorScheme = light ? 'light' : 'dark';
      app.style.setProperty('--onacc', ['white', 'yellow'].includes(st.accent) ? '#111' : '#fff');
      Object.assign(app.dataset, { theme: st.theme, nav: st.nav || 'pill', cards: st.cards || 'cards', head: st.head || 'system', contrast: st.contrast || 'normal' });
      app.classList.toggle('subjbold', st.subj === 'bold');
      if (st.head === 'hand' || st.head === 'mono') loadFont(st.head);
      app.classList.toggle('nolabels', !st.labels || st.nav === 'pill');
      app.classList.toggle('noglass', !st.glass);
    }
    const de = document.documentElement.style;
    de.setProperty('--fb-accent', acc); de.setProperty('--sk-bg', th.bg);
    de.setProperty('--fb-bg', th.bg); de.setProperty('--fb-card', th.card); de.setProperty('--fb-card2', th.card2); de.setProperty('--fb-line', th.line);
    store.set('skSnapBg', th.bg);
    return st;
  }
  // settings the iPhone app needs for reminders
  const notifyPrefs = st => ({ type: 'notify', lessons: +st.nLesson || 0, exams: !!st.nExam, hw: !!st.nHw, hour: +st.nHour || 18, lang: st.lang === 'en' ? 'en' : 'pl' });

  function setStartKey(st) {
    const me = store.get('skMe') || '';
    store.set('skStartKey', st.startTab === 'plan' ? '/#plan' : st.startTab === 'grades' && me ? me + '/grades' : st.startTab === 'mail' ? '/internal_messages' : '/#start');
  }
  const newGrades = () => parseInt(store.get('skNewGrades') || '0', 10) || 0;

  // chip-style filter row: [{v, label, n}] → html; wire with wireChips(container, cb)
  const chipRow = (id, opts, cur) => `<div class="fchips" id="${id}">${opts.map(o =>
    `<button data-v="${esc(o.v)}" class="${o.v === cur ? 'on' : ''}">${esc(o.label)}${o.n != null ? `<span>${o.n}</span>` : ''}</button>`).join('')}</div>`;
  function wireChips(root, id, cb) {
    const row = root.getElementById(id); if (!row) return;
    row.querySelectorAll('button').forEach(b => b.onclick = () => {
      row.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      b.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      cb(b.dataset.v);
    });
  }
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

  /* ------------------------------------------------------------------ *
   *  v5: style presets, bottom bar, Ważne, search, own notes, to-dos
   * ------------------------------------------------------------------ */
  const PRESET_BASE = { theme: 'dark', accent: 'blue', font: 'system', head: 'system', nav: 'pill', labels: false, radius: 'm',
    density: 'normal', subj: 'vivid', cards: 'cards', contrast: 'normal', size: 'm', glass: true, startLayout: 'A' };
  const PRESETS = {
    obecny: { label: 'Obecny+' },
    ios: { label: 'iOS', theme: 'ios', accent: 'iosblue', nav: 'bar', labels: true },
    oled: { label: 'OLED', theme: 'amoled', accent: 'white', cards: 'lines', contrast: 'high', size: 'l' },
    mono: { label: 'Mono', theme: 'mono', accent: 'white', head: 'mono', subj: 'mono', radius: 's' },
    bento: { label: 'Bento', theme: 'bento', font: 'rounded', radius: 'l', startLayout: 'C' },
    glass: { label: 'Szkło', theme: 'glass', accent: 'iosblue', nav: 'float', labels: true, radius: 'l', cards: 'glass' },
    zeszyt: { label: 'Zeszyt', theme: 'paper', accent: 'navy', head: 'hand', nav: 'bar', labels: true, cards: 'paper' },
    kolor: { label: 'Kolor', theme: 'kolor', subj: 'bold', radius: 'l' }
  };
  const PRESET_KEYS = Object.keys(PRESET_BASE);
  const jget = (k, d) => { try { const v = JSON.parse(store.get(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } };
  const jset = (k, v) => store.set(k, JSON.stringify(v));
  const myPresets = () => jget('skMyPresets', []);
  const presetVals = k => PRESETS[k] ? Object.assign({}, PRESET_BASE, PRESETS[k]) : Object.assign({}, PRESET_BASE, (myPresets().find(p => p.id === k) || {}).v || {});
  const FONT_URLS = { hand: 'https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&display=swap',
    mono: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap' };
  function loadFont(k) {
    if (!FONT_URLS[k] || document.getElementById('sk-font-' + k)) return;
    const l = document.createElement('link'); l.id = 'sk-font-' + k; l.rel = 'stylesheet'; l.href = FONT_URLS[k];
    (document.head || document.documentElement).appendChild(l);
  }
  const txt2 = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  const closeSheet = sh => { const s = sh && sh.previousElementSibling; if (s && s.classList.contains('sheet-scrim')) s.click(); else if (sh) sh.remove(); };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const fmtWhen = ms => { const d = new Date(ms), t0 = dayStart(new Date()), dd = Math.round((dayStart(d) - t0) / 864e5);
    return (dd === 0 ? TODAY : dd === 1 ? TOMORROW : DAY_SHORT[d.getDay()] + ' ' + d.getDate() + ' ' + MONTH_SHORT[d.getMonth()]) + ' ' + hhmm(d); };
  let HOMEDATA = null;                     // filled by the start page: subjects, plan, feed …
  let CUR = { ctx: null, tab: '' };        // what the bottom bar shows

  /* ---------- bottom bar ---------- */
  const TABDEFS = {
    start: ['home', 'Start', () => '/#start'], plan: ['calendar', 'Plan', () => '/#plan'], subjects: ['book', 'Przedmioty', () => '/#przedmioty'],
    grades: ['medal', 'Oceny', c => c.student + '/grades'], mail: ['mail', 'Wiadomości', () => '/internal_messages'],
    pres: ['pres', 'Frekwencja', c => c.student + '/presences'], fav: ['star', 'Ważne', () => '/#wazne'], notes: ['edit', 'Notatki', () => '/#notatki'],
    search: ['search', 'Szukaj', () => '/#szukaj'], hw: ['clip', 'Zadania', c => c.student + '/homeworks'], cal: ['clock', 'Kalendarz', () => '/calendar']
  };
  const DEFAULT_TABS = ['start', 'plan', 'subjects', 'grades', 'mail'];
  function navTabs(st) {
    const t = (Array.isArray(st.tabs) ? st.tabs : DEFAULT_TABS).filter(k => TABDEFS[k]);
    return (t.length ? t : DEFAULT_TABS).slice(0, st.nav === 'plus' ? 4 : 5);
  }
  function navHTML(ctx, tab) {
    const st = loadSettings(), keys = navTabs(st);
    const a = k => {
      const [ic, label, href] = TABDEFS[k];
      const badge = k === 'mail' && ctx.unread ? ctx.unread : k === 'grades' && newGrades() && tab !== 'grades' ? newGrades() : 0;
      return `<a href="${esc(href(ctx))}" data-tab="${k}" class="${k === tab ? 'on' : ''}" aria-label="${label}">${I(TABDEFS[k][0])}<span class="lb">${label}</span>${badge ? `<span class="badge">${badge}</span>` : ''}</a>`;
    };
    const half = Math.ceil(keys.length / 2);
    return `<nav class="nav"><span class="ind"></span>${st.nav === 'plus'
      ? keys.slice(0, half).map(a).join('') + `<button class="plusb" id="navplus" aria-label="Dodaj">${I('plus')}</button>` + keys.slice(half).map(a).join('')
      : keys.map(a).join('')}</nav>`;
  }
  function moveInd(root) {
    const nav = root && root.querySelector('.nav'); if (!nav) return;
    const ind = nav.querySelector('.ind'), a = nav.querySelector('a.on'); if (!ind) return;
    if (!a) { ind.style.opacity = '0'; return; }
    ind.style.opacity = ''; ind.style.width = a.offsetWidth + 'px'; ind.style.transform = `translateX(${a.offsetLeft}px)`;
  }
  function wireNav(root) {
    root.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', e => {
      if (a.classList.contains('on') && (a.getAttribute('href').split('#')[0] === location.pathname || a.getAttribute('href') === '/#' + (location.hash.slice(1) || 'start'))) {
        e.preventDefault(); e.stopPropagation(); window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, true));
    const plus = root.getElementById('navplus'); if (plus) plus.onclick = () => openQuickAdd(root);
    requestAnimationFrame(() => { const nav = root.querySelector('.nav'); if (nav) nav.classList.add('noanim'); moveInd(root); requestAnimationFrame(() => nav && nav.classList.remove('noanim')); });
  }
  function renderNav(root) {
    const nav = root.querySelector('.nav'); if (!nav || !CUR.ctx) return;
    nav.outerHTML = navHTML(CUR.ctx, CUR.tab); wireNav(root);
  }
  function openQuickAdd(root) {
    const sh = openSheet(root, `<h2>Dodaj</h2><div class="menu">
      <button data-q="photo">${I('camera')}Zdjęcie do lekcji</button><button data-q="note">${I('edit')}Notatka</button>
      <button data-q="todo">${I('check')}Własne zadanie</button><a href="/internal_messages/new">${I('compose')}Nowa wiadomość</a>
      <a href="/#szukaj">${I('search')}Szukaj</a></div>`);
    sh.querySelectorAll('a').forEach(a => a.addEventListener('click', () => closeSheet(sh)));
    sh.querySelector('[data-q="todo"]').onclick = () => { closeSheet(sh); todoAddSheet(root, () => { const b = root.getElementById('todoblock'); if (b && window.__skTodoRedraw) window.__skTodoRedraw(); }); };
    sh.querySelector('[data-q="photo"]').onclick = () => { closeSheet(sh); goHome('dodaj'); };
    sh.querySelector('[data-q="note"]').onclick = () => { closeSheet(sh); goHome('dodaj:text'); };
  }
  function goHome(hash) { if (location.pathname === '/') location.hash = hash; else softGo('/#' + hash, true); }

  /* ---------- Ważne ★ ---------- */
  const FAV_KIND = h => /subject_announcements/.test(h) ? ['ann', 'Ogłoszenie'] : /internal_messages/.test(h) ? ['msg', 'Wiadomość']
    : /homeworks?\//.test(h) ? ['hw', 'Zadanie'] : /informations/.test(h) ? ['news', 'Aktualność'] : /attachment|download|documents/.test(h) ? ['file', 'Plik']
    : /callendar|calendar/.test(h) ? ['ev', 'Wydarzenie'] : ['link', 'Link'];
  const favList = () => jget('skFav', []);
  const favSave = a => jset('skFav', a.slice(0, 300));
  const favKey = h => { try { const u = new URL(h, location.origin); return u.pathname.replace(/\/confirm$/, '') + u.search; } catch (e) { return String(h); } };
  const favFind = h => favList().find(f => f.key === favKey(h));
  function favAdd(item) {
    const all = favList(), k = favKey(item.href);
    let f = all.find(x => x.key === k);
    if (!f) { f = Object.assign({ id: uid(), key: k, saved: Date.now(), kind: FAV_KIND(item.href)[0] }, item); all.unshift(f); favSave(all); }
    return f;
  }
  function favRemove(root, href) {
    const all = favList(), i = all.findIndex(f => f.key === favKey(href)); if (i < 0) return;
    const f = all.splice(i, 1)[0]; if (f.remind) native({ type: 'unremind', id: 'fav' + f.id });
    favSave(all); haptic('light'); toast(root, 'Usunięto z Ważnych');
  }
  function favRemind(root, item, when) {
    const all = favList(); let f = all.find(x => x.key === favKey(item.href));
    if (!f) { favAdd(item); return favRemind(root, item, when); }
    f.remind = +when; favSave(all);
    if (NATIVE_IDU) {
      native({ type: 'askNotify' });
      native({ type: 'remind', id: 'fav' + f.id, title: '★ ' + f.title.slice(0, 80), body: f.sub || 'Przypomnienie z Ważnych', at: Math.round(+when / 1000), path: f.href });
      toast(root, 'Przypomnę: ' + fmtWhen(+when), 'good');
    } else toast(root, 'Przypomnienia działają w aplikacji na iPhonie');
    haptic('success');
  }
  const remindOpts = () => {
    const d = new Date(), t = (dd, h, m) => { const x = new Date(d); x.setDate(x.getDate() + dd); x.setHours(h, m, 0, 0); return x; };
    return [['Dziś 18:00', t(0, 18, 0)], ['Dziś 20:00', t(0, 20, 0)], ['Jutro 7:30', t(1, 7, 30)], ['Jutro 18:00', t(1, 18, 0)], ['Za 3 dni', t(3, 18, 0)], ['Za tydzień', t(7, 18, 0)]].filter(([, x]) => x > d);
  };
  function itemMenu(root, it, after) {
    const fav = favFind(it.href);
    const sh = openSheet(root, `<div class="lbl">${esc(it.label || FAV_KIND(it.href)[1])}</div><h2 style="margin:2px 0 14px">${esc(it.title)}</h2>
      <div class="menu"><button data-a="fav">${I('star', fav ? 'fill' : '')}${fav ? 'Usuń z Ważnych' : 'Dodaj do Ważnych'}</button>
        <button data-a="rem">${I('bell')}${fav && fav.remind > Date.now() ? 'Przypomnienie: ' + esc(fmtWhen(fav.remind)) : 'Przypomnij mi…'}</button>
        <div class="remopts" hidden>${remindOpts().map(([l, d]) => `<button data-r="${+d}">${esc(l)}</button>`).join('')}${fav && fav.remind ? '<button data-r="0">Bez przypomnienia</button>' : ''}</div>
        <button data-a="todo">${I('check')}Dodaj do „Do zrobienia”</button>
        ${navigator.share ? `<button data-a="share">${I('send')}Udostępnij</button>` : ''}
        <button data-a="copy">${I('link')}Kopiuj link</button></div>`);
    const done = () => { closeSheet(sh); if (after) setTimeout(after, 240); };
    const abs = new URL(it.href, location.origin).href;
    sh.querySelector('[data-a="fav"]').onclick = () => { if (favFind(it.href)) favRemove(root, it.href); else { favAdd(it); haptic('success'); toast(root, 'Dodano do Ważnych ★', 'good'); } done(); };
    sh.querySelector('[data-a="rem"]').onclick = () => { haptic('selection'); sh.querySelector('.remopts').hidden = false; };
    sh.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
      if (b.dataset.r === '0') { const all = favList(), f = all.find(x => x.key === favKey(it.href)); if (f) { native({ type: 'unremind', id: 'fav' + f.id }); delete f.remind; favSave(all); } toast(root, 'Bez przypomnienia'); }
      else favRemind(root, it, +b.dataset.r);
      done();
    });
    sh.querySelector('[data-a="todo"]').onclick = () => { todoAdd(it.title, { href: it.href }); haptic('success'); toast(root, 'Dodano do „Do zrobienia”', 'good'); done(); };
    const s = sh.querySelector('[data-a="share"]'); if (s) s.onclick = () => { navigator.share({ title: it.title, url: abs }).catch(() => {}); closeSheet(sh); };
    sh.querySelector('[data-a="copy"]').onclick = () => { try { navigator.clipboard.writeText(abs); toast(root, 'Skopiowano link', 'good'); } catch (e) {} closeSheet(sh); };
  }
  // hold a finger on any link (announcement, message, file …) → menu
  function wireLongPress(root, scope) {
    let t = null, fired = false, sx = 0, sy = 0;
    scope.addEventListener('touchstart', e => {
      const a = e.target.closest && e.target.closest('a[href]'); fired = false;
      if (!a || a.closest('.nav,.top,.sheet') || /^(#|javascript|mailto|tel)|\/#/.test(a.getAttribute('href'))) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      t = setTimeout(() => {
        t = null; fired = true; haptic('medium');
        const title = (txt2(a.querySelector('.ttl,.b,.name,.subj')) || txt2(a)).slice(0, 140);
        itemMenu(root, { href: a.getAttribute('href'), title, sub: txt2(a.querySelector('.strip span,.sub,.when')).slice(0, 80), label: FAV_KIND(a.getAttribute('href'))[1] });
      }, 480);
    }, { passive: true });
    const cancel = () => { clearTimeout(t); t = null; };
    scope.addEventListener('touchmove', e => { if (t && (Math.abs(e.touches[0].clientX - sx) > 9 || Math.abs(e.touches[0].clientY - sy) > 9)) cancel(); }, { passive: true });
    scope.addEventListener('touchend', cancel, { passive: true });
    scope.addEventListener('click', e => { if (fired) { e.preventDefault(); e.stopPropagation(); fired = false; } }, true);
  }
  const FAV_PAGE_RE = /^\/(internal_messages\/\d+|subject_announcements\/\d+|informations\/\d+|documents\/attachments\/\d+|callendar_events\/\d+)|\/homeworks\/\d+$|\/lesson_instances\/\d+$/;
  function wireFavButton(root, mainEl) {
    const b = root.getElementById('favbtn'); if (!b || !FAV_PAGE_RE.test(location.pathname)) return;
    const href = location.pathname + location.search;
    const paint = () => { const on = !!favFind(href); b.innerHTML = I('star', on ? 'fill' : ''); b.classList.toggle('faved', on); };
    b.hidden = false; paint();
    b.onclick = () => {
      if (favFind(href)) favRemove(root, href);
      else {
        const title = txt2(mainEl.querySelector('h1,h2,.subj,.b')) || root.getElementById('title').textContent;
        favAdd({ href, title: title.slice(0, 140), sub: root.getElementById('title').textContent, text: (mainEl.innerText || '').replace(/\n{3,}/g, '\n\n').slice(0, 2500) });
        haptic('success'); toast(root, 'Dodano do Ważnych ★ (z kopią offline)', 'good');
      }
      paint();
    };
  }
  function favView(filter) {
    const all = favList(), now = Date.now();
    const K = [['all', 'Wszystko'], ['ann', 'Ogłoszenia'], ['msg', 'Wiadomości'], ['hw', 'Zadania'], ['file', 'Pliki'], ['link', 'Inne']];
    const list = filter === 'all' ? all : all.filter(f => filter === 'link' ? !['ann', 'msg', 'hw', 'file'].includes(f.kind) : f.kind === filter);
    const card = f => `<div class="card fav"><a class="tap" href="${esc(f.href)}"><div class="lbl">${esc(FAV_KIND(f.href)[1])}${f.sub && f.sub !== f.title ? ' · ' + esc(f.sub) : ''}</div>
      <div class="b">${esc(f.title)}</div></a>${f.text ? `<details><summary class="muted small">Kopia offline</summary><div class="note" data-raw>${esc(f.text)}</div></details>` : ''}
      <div class="favf">${f.remind > now ? `<span class="pill warn">${I('bell', 'xs')} ${esc(fmtWhen(f.remind))}</span>` : ''}<span class="muted small">zapisano ${esc(shortDate(new Date(f.saved)))}</span>
      <span class="grow"></span><button class="iconbtn" data-fav="${esc(f.id)}" aria-label="Opcje">${I('more')}</button></div></div>`;
    const rem = list.filter(f => f.remind > now), rest = list.filter(f => !(f.remind > now));
    return chipRow('fk', K.map(([v, label]) => ({ v, label, n: v === 'all' ? all.length : null })), filter) +
      (list.length ? (rem.length ? `<div class="sec"><h2>Z przypomnieniem</h2></div>${rem.map(card).join('')}` : '') + (rest.length ? `${rem.length ? '<div class="sec"><h2>Pozostałe</h2></div>' : ''}${rest.map(card).join('')}` : '')
        : `<div class="empty">${I('star', 'big')}<div>Nic tu jeszcze nie ma</div><div class="muted small" style="max-width:280px">Przytrzymaj palec na ogłoszeniu, wiadomości albo pliku i wybierz „Dodaj do Ważnych”. Na otwartej stronie możesz też kliknąć gwiazdkę u góry.</div></div>`);
  }

  /* ---------- own to-dos ---------- */
  const todoList = () => jget('skTodos', []);
  const todoSave = a => jset('skTodos', a.slice(0, 200));
  function todoAdd(t, extra) { const a = todoList(); a.unshift(Object.assign({ id: uid(), t: String(t).slice(0, 200), done: false, at: Date.now() }, extra || {})); todoSave(a); }
  function todoToggle(id, v) { const a = todoList(), x = a.find(y => y.id === id); if (x) { x.done = v; x.doneAt = Date.now(); } todoSave(a.filter(y => !y.done || Date.now() - (y.doneAt || 0) < 864e5)); }
  function todoAddSheet(root, after) {
    let due = null;
    const d = n => { const x = dayStart(new Date()); x.setDate(x.getDate() + n); x.setHours(20); return +x; };
    const sh = openSheet(root, `<h2>Własne zadanie</h2><div class="search" style="margin:0 0 12px"><input id="tt" placeholder="np. Powtórzyć kinematykę" maxlength="200" autocomplete="off"></div>
      <div class="lbl">Termin</div><div class="seg" id="td"><button class="on" data-d="">Brak</button><button data-d="${d(0)}">Dziś</button><button data-d="${d(1)}">Jutro</button><button data-d="${d(7)}">Za tydzień</button></div>
      <button class="btn-p" id="tsave" style="width:100%;margin-top:16px">Dodaj</button>`);
    const inp = sh.querySelector('#tt'); setTimeout(() => inp.focus(), 250);
    sh.querySelectorAll('#td button').forEach(b => b.onclick = () => { sh.querySelectorAll('#td button').forEach(x => x.classList.toggle('on', x === b)); due = b.dataset.d ? +b.dataset.d : null; });
    const go = () => { const v = inp.value.trim(); if (!v) return; todoAdd(v, due ? { due } : {}); haptic('success'); closeSheet(sh); if (after) after(); };
    sh.querySelector('#tsave').onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); };
  }

  /* ---------- own notes + photos (kept in this phone, IndexedDB) ---------- */
  const NOTES = (() => {
    let dbp = null;
    const db = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open('skNotes', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('notes', { keyPath: 'id' });
      r.onsuccess = () => res(r.result); r.onerror = () => { dbp = null; rej(r.error); };
    }));
    const run = (mode, fn) => db().then(d => new Promise((res, rej) => {
      const t = d.transaction('notes', mode), q = fn(t.objectStore('notes'));
      t.oncomplete = () => res(q && 'result' in q ? q.result : undefined); t.onerror = t.onabort = () => rej(t.error);
    }));
    return { all: () => run('readonly', s => s.getAll()).catch(() => []), put: n => run('readwrite', s => s.put(n)), del: id => run('readwrite', s => s.delete(id)) };
  })();
  const noteTabs = () => jget('skNoteTabs', {});
  const subjKey = n => normSubj(n);
  function shrinkImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1700 / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        const t = document.createElement('canvas'), k2 = 300 / Math.max(c.width, c.height);
        t.width = Math.round(c.width * k2); t.height = Math.round(c.height * k2); t.getContext('2d').drawImage(c, 0, 0, t.width, t.height);
        const thumb = t.toDataURL('image/jpeg', 0.72);
        c.toBlob(b => b ? res({ blob: b, thumb }) : rej(new Error('blob')), 'image/jpeg', 0.8);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
      img.src = url;
    });
  }
  // the lessons of a subject in the last 3 weeks (from the timetable) – a photo gets attached to one of them
  function recentLessons(key) {
    const plan = HOMEDATA ? HOMEDATA.plan : {}, out = [], now = new Date();
    for (let i = 0; i < 21; i++) {
      const d = dayStart(now); d.setDate(d.getDate() - i);
      const ls = (plan[d.getDay()] || []).filter(l => subjKey(l.raw) === key && (i > 0 || mins(l.start) <= now.getHours() * 60 + now.getMinutes() + 30));
      if (ls.length) out.push({ date: +d, nr: ls[0].nr, label: `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]} · lekcja ${ls[0].nr}${ls.length > 1 ? '–' + ls[ls.length - 1].nr : ''}` });
    }
    return out;
  }
  const lessonLabel = n => { if (!n.date) return 'Bez lekcji'; const d = new Date(n.date); return `${DAY_FULL[d.getDay()].replace(/^./, m => m.toUpperCase())}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}${n.nr ? ' · lekcja ' + n.nr : ''}`; };
  async function notesIndexHTML() {
    const all = await NOTES.all(), subs = HOMEDATA ? HOMEDATA.subjects : [];
    const cnt = {}; all.forEach(n => { const c = cnt[n.key] = cnt[n.key] || { p: 0, t: 0, last: 0 }; if (n.kind === 'photo') c.p++; else c.t++; c.last = Math.max(c.last, n.created || 0); });
    const seen = new Set(), rows = [];
    subs.forEach(s => { const k = subjKey(s.name); if (seen.has(k)) return; seen.add(k); rows.push({ k, name: prettySubj(s.name), raw: s.name }); });
    Object.keys(cnt).forEach(k => { if (!seen.has(k)) rows.push({ k, name: k.replace(/^./, m => m.toUpperCase()), raw: k }); });
    rows.sort((a, b) => ((cnt[b.k] || {}).last || 0) - ((cnt[a.k] || {}).last || 0) || a.name.localeCompare(b.name));
    return `<div class="muted small" style="margin:0 2px 12px">Twoje zdjęcia tablicy i notatki – zostają tylko w tym telefonie.</div>
      <div class="card" style="padding:2px 14px">${rows.map(r => { const c = cnt[r.k];
        return `<a class="row tap" href="#n:${encodeURIComponent(r.k)}" style="padding:11px 0;border-bottom:.5px solid var(--line)">
          <div class="av" style="background:${subjColor(r.raw)}">${esc(r.name.charAt(0))}</div><div class="grow"><div class="b clip">${esc(r.name)}</div>
          <div class="muted small">${c ? `${c.p} zdj. · ${c.t} notatek` : 'brak notatek'}</div></div>${I('right', 'sm chev')}</a>`; }).join('') || '<div class="nores">Brak przedmiotów</div>'}</div>`;
  }
  async function notesSubjectHTML(key, tab) {
    const all = (await NOTES.all()).filter(n => n.key === key && (tab === '*' || (n.tab || '') === tab));
    const tabs = noteTabs()[key] || [];
    const s = (HOMEDATA ? HOMEDATA.subjects : []).find(x => subjKey(x.name) === key);
    const name = s ? prettySubj(s.name) : key.replace(/^./, m => m.toUpperCase());
    const groups = {}; all.forEach(n => { const g = (n.date || 0) + ':' + (n.nr || 0); (groups[g] = groups[g] || []).push(n); });
    const order = Object.keys(groups).sort((a, b) => +b.split(':')[0] - +a.split(':')[0]);
    const body = order.map(g => {
      const ns = groups[g].sort((a, b) => (a.created || 0) - (b.created || 0)), ph = ns.filter(n => n.kind === 'photo');
      return `<div class="dayh">${esc(lessonLabel(ns[0]))}</div>
        ${ph.length ? `<div class="pgrid">${ph.map(n => `<button class="ph" data-ph="${esc(n.id)}" style="background-image:url(${n.thumb})" aria-label="Zdjęcie"></button>`).join('')}</div>` : ''}
        ${ns.filter(n => n.kind !== 'photo').map(n => n.kind === 'list'
          ? `<div class="card nlist" data-nid="${esc(n.id)}">${n.text ? `<div class="b" data-edit="${esc(n.id)}">${esc(n.text)}</div>` : ''}${(n.items || []).map((it, i) => `<label class="trow"><input type="checkbox" data-li="${esc(n.id)}:${i}" ${it.done ? 'checked' : ''}><span class="grow ${it.done ? 'done' : ''}">${esc(it.t)}</span></label>`).join('')}<button class="tadd" data-edit="${esc(n.id)}">Edytuj</button></div>`
          : `<button class="card ntext" data-edit="${esc(n.id)}"><div class="lbl">notatka${n.tab ? ' · ' + esc(n.tab) : ''}</div><div data-raw>${esc(n.text)}</div></button>`).join('')}`;
    }).join('');
    const nPh = all.filter(n => n.kind === 'photo').length;
    return `<div class="nhead"><div class="av" style="background:${subjColor(s ? s.name : key)}">${esc(name.charAt(0))}</div>
        <div class="grow"><h1 style="margin:0">${esc(name)}</h1><div class="muted small">${nPh} zdj. · ${all.length - nPh} notatek</div></div></div>
      <div class="fchips" id="ntabs"><button data-v="*" class="${tab === '*' ? 'on' : ''}">Wszystko</button>${tabs.map(t => `<button data-v="${esc(t)}" class="${tab === t ? 'on' : ''}">${esc(t)}</button>`).join('')}<button data-v="+">+ Nowa zakładka</button></div>
      <button class="btn-p" id="nadd" style="width:100%;margin:4px 0 6px">${I('camera')}Dodaj zdjęcie albo notatkę</button>
      ${body || `<div class="empty">${I('image', 'big')}<div>${tab === '*' ? 'Jeszcze nic tu nie ma' : 'Pusta zakładka'}</div><div class="muted small">Zrób zdjęcie tablicy albo zeszytu – trafi pod właściwą lekcję.</div></div>`}`;
  }
  function tabNameSheet(root, key, old, after) {
    const sh = openSheet(root, `<h2>${old ? 'Zakładka „' + esc(old) + '”' : 'Nowa zakładka'}</h2><div class="search" style="margin:0 0 12px"><input id="tn" maxlength="30" placeholder="np. Mity" value="${esc(old || '')}" autocomplete="off"></div>
      <button class="btn-p" id="tok" style="width:100%">${old ? 'Zmień nazwę' : 'Utwórz'}</button>${old ? `<button class="btn-s" id="tdel" style="width:100%;justify-content:center;margin-top:10px;color:var(--bad)">Usuń zakładkę (notatki zostaną)</button>` : ''}`);
    const inp = sh.querySelector('#tn'); setTimeout(() => inp.focus(), 250);
    sh.querySelector('#tok').onclick = async () => {
      const v = inp.value.trim(); if (!v) return; const all = noteTabs(), list = all[key] = all[key] || [];
      if (old) { const i = list.indexOf(old); if (i >= 0) list[i] = v; (await NOTES.all()).filter(n => n.key === key && n.tab === old).forEach(n => { n.tab = v; NOTES.put(n); }); }
      else if (!list.includes(v)) list.push(v);
      jset('skNoteTabs', all); closeSheet(sh); after(v);
    };
    const del = sh.querySelector('#tdel'); if (del) del.onclick = async () => {
      const all = noteTabs(); all[key] = (all[key] || []).filter(t => t !== old); jset('skNoteTabs', all);
      (await NOTES.all()).filter(n => n.key === key && n.tab === old).forEach(n => { n.tab = ''; NOTES.put(n); }); closeSheet(sh); after('*');
    };
  }
  function noteAddSheet(root, key, tab, mode, after) {
    const lessons = recentLessons(key), tabs = noteTabs()[key] || [];
    let kind = mode === 'text' ? 'text' : mode === 'list' ? 'list' : 'photo', files = [], selTab = tab === '*' ? '' : tab, lesson = lessons[0] || null;
    const sh = openSheet(root, `<h2>Dodaj do notatek</h2>
      <div class="addk"><label class="addb">${I('camera')}<span>Aparat</span><input type="file" accept="image/*" capture="environment"></label>
        <label class="addb">${I('image')}<span>Galeria</span><input type="file" accept="image/*" multiple></label>
        <button class="addb" data-k="text">${I('edit')}<span>Notatka</span></button><button class="addb" data-k="list">${I('check')}<span>Lista</span></button></div>
      <div class="pgrid" id="nprev"></div>
      <textarea id="ntext" class="fta card" style="min-height:140px;margin-top:10px" placeholder="Treść notatki" hidden></textarea>
      <div class="lbl">Zakładka</div><div class="fchips" id="ntab"><button data-v="" class="${selTab ? '' : 'on'}">Bez zakładki</button>${tabs.map(t => `<button data-v="${esc(t)}" class="${selTab === t ? 'on' : ''}">${esc(t)}</button>`).join('')}</div>
      <div class="lbl">Lekcja</div><div class="fchips" id="nles">${lessons.slice(0, 8).map((l, i) => `<button data-i="${i}" class="${i === 0 ? 'on' : ''}">${esc(l.label)}</button>`).join('')}<button data-i="-1" class="${lessons.length ? '' : 'on'}">Bez lekcji</button></div>
      <div class="search" style="margin:12px 0 0"><input id="ncap" placeholder="Podpis (opcjonalnie)" maxlength="120" autocomplete="off"></div>
      <button class="btn-p" id="nsave" style="width:100%;margin-top:14px">Zapisz</button>
      <div class="note2">Zdjęcia są zmniejszane i zostają tylko w tym telefonie. Kopię zrobisz w Ustawieniach → Notatki i kopia.</div>`);
    const prev = sh.querySelector('#nprev'), ta = sh.querySelector('#ntext');
    const setKind = k => { kind = k; ta.hidden = k === 'photo'; ta.placeholder = k === 'list' ? 'Każda linia to jeden punkt listy\n(pierwsza linia może być tytułem: zacznij ją od #)' : 'Treść notatki'; if (k !== 'photo') setTimeout(() => ta.focus(), 100); };
    setKind(kind);
    sh.querySelectorAll('.addb input').forEach(inp => inp.onchange = () => { files = files.concat([...inp.files]); setKind('photo');
      prev.innerHTML = files.map(f => `<div class="ph" style="background-image:url(${URL.createObjectURL(f)})"></div>`).join(''); });
    sh.querySelectorAll('.addb[data-k]').forEach(b => b.onclick = () => setKind(b.dataset.k));
    sh.querySelectorAll('#ntab button').forEach(b => b.onclick = () => { selTab = b.dataset.v; sh.querySelectorAll('#ntab button').forEach(x => x.classList.toggle('on', x === b)); });
    sh.querySelectorAll('#nles button').forEach(b => b.onclick = () => { lesson = +b.dataset.i >= 0 ? lessons[+b.dataset.i] : null; sh.querySelectorAll('#nles button').forEach(x => x.classList.toggle('on', x === b)); });
    if (mode === 'camera') setTimeout(() => { const i = sh.querySelector('.addb input'); try { i.click(); } catch (e) {} }, 350);
    sh.querySelector('#nsave').onclick = async () => {
      const base = { key, tab: selTab, date: lesson ? lesson.date : 0, nr: lesson ? lesson.nr : 0, caption: sh.querySelector('#ncap').value.trim() };
      const btn = sh.querySelector('#nsave'); btn.disabled = true; btn.textContent = 'Zapisuję…';
      try {
        if (kind === 'photo') {
          if (!files.length) { btn.disabled = false; btn.textContent = 'Zapisz'; toast(root, 'Najpierw wybierz zdjęcie'); return; }
          for (const f of files) { const im = await shrinkImage(f); await NOTES.put(Object.assign({ id: uid(), kind: 'photo', created: Date.now(), blob: im.blob, thumb: im.thumb }, base)); }
        } else {
          const v = ta.value.trim(); if (!v) { btn.disabled = false; btn.textContent = 'Zapisz'; return; }
          if (kind === 'list') { const lines = v.split('\n').map(s => s.trim()).filter(Boolean); const title = /^#/.test(lines[0]) ? lines.shift().replace(/^#\s*/, '') : '';
            await NOTES.put(Object.assign({ id: uid(), kind: 'list', created: Date.now(), text: title, items: lines.map(t => ({ t, done: false })) }, base)); }
          else await NOTES.put(Object.assign({ id: uid(), kind: 'text', created: Date.now(), text: v }, base));
        }
        haptic('success'); toast(root, 'Zapisano w notatkach', 'good'); closeSheet(sh); if (after) after();
      } catch (e) { btn.disabled = false; btn.textContent = 'Zapisz'; toast(root, 'Nie udało się zapisać (brak miejsca?)', 'bad'); }
    };
  }
  async function noteEditSheet(root, id, after) {
    const n = (await NOTES.all()).find(x => x.id === id); if (!n) return;
    const val = n.kind === 'list' ? (n.text ? '# ' + n.text + '\n' : '') + (n.items || []).map(i => i.t).join('\n') : n.text;
    const sh = openSheet(root, `<h2>${n.kind === 'list' ? 'Lista' : 'Notatka'}</h2><div class="muted small">${esc(lessonLabel(n))}</div>
      <textarea id="et" class="fta card" style="min-height:180px;margin-top:10px">${esc(val)}</textarea>
      <button class="btn-p" id="es" style="width:100%;margin-top:12px">Zapisz</button><button class="btn-s" id="ed" style="width:100%;justify-content:center;margin-top:10px;color:var(--bad)">${I('trash', 'sm')}Usuń</button>`);
    sh.querySelector('#es').onclick = async () => {
      const v = sh.querySelector('#et').value.trim();
      if (n.kind === 'list') { const lines = v.split('\n').map(s => s.trim()).filter(Boolean); n.text = /^#/.test(lines[0] || '') ? lines.shift().replace(/^#\s*/, '') : '';
        const old = n.items || []; n.items = lines.map(t => ({ t, done: !!(old.find(o => o.t === t) || {}).done })); } else n.text = v;
      await NOTES.put(n); closeSheet(sh); after();
    };
    sh.querySelector('#ed').onclick = async () => { await NOTES.del(id); haptic('light'); closeSheet(sh); after(); };
  }
  function openViewer(root, items, idx, after) {
    const app = root.getElementById('app'), v = document.createElement('div'); v.className = 'viewer'; let url = null, sx = null;
    const draw = () => { if (url) URL.revokeObjectURL(url); const n = items[idx]; url = URL.createObjectURL(n.blob);
      v.innerHTML = `<img src="${url}" alt=""><div class="vbar"><button data-v="x" aria-label="Zamknij">${I('x')}</button><span>${idx + 1} / ${items.length}${n.caption ? ' · ' + esc(n.caption) : ''}</span>
        ${navigator.share ? `<button data-v="share" aria-label="Udostępnij">${I('send')}</button>` : ''}<button data-v="del" aria-label="Usuń">${I('trash')}</button></div>`; };
    const close = () => { if (url) URL.revokeObjectURL(url); v.remove(); };
    v.addEventListener('click', async e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.v === 'x') close();
      if (b.dataset.v === 'share') { const n = items[idx]; navigator.share({ files: [new File([n.blob], 'notatka.jpg', { type: 'image/jpeg' })] }).catch(() => {}); }
      if (b.dataset.v === 'del') { await NOTES.del(items[idx].id); items.splice(idx, 1); haptic('light'); if (!items.length) { close(); after(); return; } idx = Math.min(idx, items.length - 1); draw(); after(); }
    });
    v.addEventListener('dblclick', () => v.classList.toggle('z'));
    v.addEventListener('touchstart', e => { sx = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
    v.addEventListener('touchend', e => { if (sx == null || v.classList.contains('z')) return; const dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 60) { idx = (idx + (dx < 0 ? 1 : -1) + items.length) % items.length; haptic('selection'); draw(); } });
    draw(); app.appendChild(v);
  }
  async function wireNotes(root, main, key, state, redraw) {
    const all = await NOTES.all();
    main.querySelectorAll('#ntabs button').forEach(b => {
      b.onclick = () => { if (b.dataset.v === '+') tabNameSheet(root, key, null, v => { state.tab = v; redraw(); }); else { state.tab = b.dataset.v; redraw(); } };
      if (b.dataset.v !== '*' && b.dataset.v !== '+') { let t = null; b.addEventListener('touchstart', () => { t = setTimeout(() => { haptic('medium'); tabNameSheet(root, key, b.dataset.v, v => { state.tab = v; redraw(); }); }, 520); }, { passive: true });
        b.addEventListener('touchend', () => clearTimeout(t), { passive: true }); }
    });
    const add = main.querySelector('#nadd'); if (add) add.onclick = () => noteAddSheet(root, key, state.tab, null, redraw);
    const photos = all.filter(n => n.key === key && n.kind === 'photo' && (state.tab === '*' || (n.tab || '') === state.tab)).sort((a, b) => (b.date || 0) - (a.date || 0) || (a.created || 0) - (b.created || 0));
    main.querySelectorAll('[data-ph]').forEach(b => b.onclick = () => openViewer(root, photos, Math.max(0, photos.findIndex(p => p.id === b.dataset.ph)), redraw));
    main.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => noteEditSheet(root, b.dataset.edit, redraw));
    main.querySelectorAll('[data-li]').forEach(c => c.onchange = () => { const [id, i] = c.dataset.li.split(':'); const n = all.find(x => x.id === id); if (!n) return;
      n.items[+i].done = c.checked; NOTES.put(n); c.nextElementSibling.classList.toggle('done', c.checked); haptic('selection'); });
  }
  async function notesExport(root) {
    toast(root, 'Przygotowuję kopię…');
    const all = await NOTES.all();
    const b64 = b => new Promise(r => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1] || ''); fr.readAsDataURL(b); });
    const notes = []; for (const n of all) { const o = Object.assign({}, n); if (n.blob) { o.blob = await b64(n.blob); o.type = n.blob.type; } notes.push(o); }
    const data = JSON.stringify({ app: 'IDU', kind: 'idu-notes', v: 1, at: Date.now(), tabs: noteTabs(), todos: todoList(), favs: favList(), notes });
    const name = `IDU-kopia-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([data], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    if (NATIVE_IDU) { native({ type: 'saveFile', name, text: data }); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  async function notesImport(root, file) {
    try {
      const j = JSON.parse(await file.text()); if (!j || j.kind !== 'idu-notes') throw new Error('format');
      for (const n of j.notes || []) {
        if (n.blob) { const bin = atob(n.blob), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); n.blob = new Blob([u], { type: n.type || 'image/jpeg' }); delete n.type; }
        await NOTES.put(n);
      }
      const tabs = noteTabs(); Object.entries(j.tabs || {}).forEach(([k, l]) => { tabs[k] = [...new Set([...(tabs[k] || []), ...l])]; }); jset('skNoteTabs', tabs);
      const fv = favList(); (j.favs || []).forEach(f => { if (!fv.some(x => x.key === f.key)) fv.push(f); }); favSave(fv);
      const td = todoList(); (j.todos || []).forEach(t => { if (!td.some(x => x.id === t.id)) td.push(t); }); todoSave(td);
      haptic('success'); toast(root, `Wczytano ${(j.notes || []).length} notatek`, 'good');
    } catch (e) { toast(root, 'To nie jest kopia notatek IDU', 'bad'); }
  }

  /* ---------- search everywhere ---------- */
  function searchSections(q, filter, notes) {
    const nq = norm(q); if (nq.length < 2) return [];
    const has = s => norm(s).includes(nq), H = HOMEDATA || { subjects: [], plan: {}, feed: [], teachers: {} }, out = [];
    const sec = (k, title, items) => { if ((filter === 'all' || filter === k) && items.length) out.push({ title, items: items.slice(0, filter === 'all' ? 6 : 50) }); };
    sec('subj', 'Przedmioty', H.subjects.filter(s => has(s.name)).map(s => ({ t: prettySubj(s.name), s: 'przedmiot', h: s.href, c: subjColor(s.name) })));
    const les = []; Object.keys(H.plan).forEach(wd => (H.plan[wd] || []).forEach(l => { if (has(l.name) || has(l.room || '') || has('sala ' + (l.room || ''))) les.push({ t: l.name, s: `${DAY_FULL[wd]} ${l.start}${l.room ? ' · sala ' + l.room : ''}`, h: '/#plan', c: subjColor(l.raw) }); }));
    sec('plan', 'Plan lekcji', les);
    sec('feed', 'Oceny, ogłoszenia, zadania', H.feed.filter(f => has([f.title, f.subject, f.desc, f.value, f.status].join(' '))).map(f => ({ t: f.title || [f.value, f.desc, f.status].filter(Boolean).join(' · ') || prettySubj(f.subject || ''), s: [prettySubj(f.subject || ''), shortDate(f.date)].filter(Boolean).join(' · '), h: f.href || '#start', c: f.subject ? subjColor(f.subject) : '' })));
    sec('mail', 'Wiadomości', jget('skMsgIdx', []).filter(m => has([m.s, m.w, m.p].join(' '))).reverse().map(m => ({ t: m.s || '(bez tematu)', s: [m.w, m.d].filter(Boolean).join(' · '), h: m.h })));
    sec('notes', 'Twoje notatki', notes.filter(n => has([n.text, n.caption, n.tab, (n.items || []).map(i => i.t).join(' ')].join(' '))).map(n => ({ t: n.caption || (n.text || (n.items || []).map(i => i.t).join(', ')).slice(0, 90) || 'Zdjęcie', s: n.key + (n.tab ? ' › ' + n.tab : '') + ' · ' + (n.kind === 'photo' ? 'zdjęcie' : 'notatka'), h: '#n:' + encodeURIComponent(n.key) })));
    sec('fav', 'Ważne', favList().filter(f => has([f.title, f.sub, f.text].join(' '))).map(f => ({ t: f.title, s: FAV_KIND(f.href)[1], h: f.href })));
    sec('todo', 'Do zrobienia', todoList().filter(t => has(t.t)).map(t => ({ t: t.t, s: t.done ? 'zrobione' : 'własne zadanie', h: t.href || '#start' })));
    const ppl = [...new Set(Object.values(H.teachers || {}).flat ? Object.values(H.teachers || {}).flat() : [])].filter(n => typeof n === 'string' && has(n));
    sec('people', 'Nauczyciele', ppl.map(n => ({ t: n, s: 'nauczyciel', h: '/teachers' })));
    return out;
  }
  const hl = (s, q) => { const t = esc(s), nq = esc(q).trim(); if (!nq) return t; const i = t.toLowerCase().indexOf(nq.toLowerCase()); return i < 0 ? t : t.slice(0, i) + '<mark>' + t.slice(i, i + nq.length) + '</mark>' + t.slice(i + nq.length); };
  function searchView() {
    const recent = jget('skRecentQ', []);
    return `<div class="search big">${I('search', 'sm')}<input id="sq" type="search" placeholder="Szukaj wszędzie" autocomplete="off" enterkeyhint="search"></div>
      ${chipRow('sf', [['all', 'Wszystko'], ['subj', 'Przedmioty'], ['plan', 'Plan'], ['feed', 'Oceny i ogłoszenia'], ['mail', 'Wiadomości'], ['notes', 'Notatki'], ['fav', 'Ważne'], ['people', 'Osoby']].map(([v, label]) => ({ v, label })), 'all')}
      <div id="sres">${recent.length ? `<div class="sec"><h2>Ostatnio szukane</h2></div><div class="chips">${recent.map(r => `<button class="chip" data-q="${esc(r)}">${I('clock')}${esc(r)}</button>`).join('')}</div>` : `<div class="muted small" style="margin:6px 2px">Szuka w przedmiotach, planie, ocenach, ogłoszeniach, wiadomościach, Twoich notatkach i Ważnych.</div>`}
      <button class="chip" id="speople" style="margin-top:14px">${I('users')}Szukaj osób w całym IDU</button></div>`;
  }
  async function wireSearch(root, main) {
    const inp = main.querySelector('#sq'), res = main.querySelector('#sres'); let filter = 'all', notes = [];
    NOTES.all().then(n => { notes = n; });
    const draw = () => {
      const q = inp.value.trim(); if (q.length < 2) return;
      const secs = searchSections(q, filter, notes);
      res.innerHTML = secs.length ? secs.map(s => `<div class="sec"><h2>${esc(s.title)}</h2></div><div class="card" style="padding:2px 14px">${s.items.map(it =>
        `<a class="row tap sres" href="${esc(it.h)}">${it.c ? `<span class="sdot" style="background:${it.c}"></span>` : ''}<div class="grow"><div class="clip">${hl(it.t, q)}</div><div class="muted small clip">${hl(it.s, q)}</div></div></a>`).join('')}</div>`).join('')
        : `<div class="nores">Nic nie znaleziono dla „${esc(q)}”</div>`;
    };
    let tm = null; inp.oninput = () => { clearTimeout(tm); tm = setTimeout(draw, 120); };
    inp.onkeydown = e => { if (e.key === 'Enter') { const q = inp.value.trim(); if (q.length > 1) jset('skRecentQ', [q, ...jget('skRecentQ', []).filter(x => x !== q)].slice(0, 8)); inp.blur(); } };
    res.addEventListener('click', e => { const c = e.target.closest('[data-q]'); if (c) { inp.value = c.dataset.q; draw(); }
      if (e.target.closest('.sres')) { const q = inp.value.trim(); if (q.length > 1) jset('skRecentQ', [q, ...jget('skRecentQ', []).filter(x => x !== q)].slice(0, 8)); }
      if (e.target.closest('#speople')) openPeople(root); });
    wireChips(root, 'sf', v => { filter = v; draw(); });
    setTimeout(() => inp.focus(), 300);
  }

  /* ---------- settings ---------- */
  const SET_PAGES = [['style', 'palette', 'Styl i wygląd', 'presety, kolory, czcionki, rogi'], ['bar', 'menu', 'Dolny pasek', 'kształt, napisy, zakładki'],
    ['screens', 'layers', 'Układy ekranów', 'Start, Plan, Przedmiot, Oceny, WF'], ['start', 'home', 'Ekran Start', 'sekcje i kafelki'],
    ['subjects', 'book', 'Przedmioty', 'ukryte i przypięte'], ['notes', 'image', 'Notatki i kopia', 'zdjęcia, eksport, import'],
    ['notify', 'bell', 'Powiadomienia', 'lekcje, sprawdziany, zadania'], ['widget', 'widget', 'Widget', 'jak dodać'], ['profile', 'user', 'Profil i język', 'zdjęcie, imię, język']];
  const TILES = { next: 'Następna lekcja', grades: 'Nowe oceny', mail: 'Wiadomości', todo: 'Do zrobienia', fav: 'Ważne', wf: 'WF – punkty', exam: 'Najbliższy sprawdzian', notes: 'Notatki' };
  function openSettings(root, app) {
    const st = loadSettings(), pr = PRESETS[st.preset] ? PRESETS[st.preset].label : (myPresets().find(p => p.id === st.preset) || {}).name || 'Własny';
    const sh = openSheet(root, `<h2>Ustawienia</h2><div class="muted small" style="margin-bottom:12px">Styl: <b style="color:var(--text)">${esc(pr)}</b> · wszystko zmienisz tutaj</div>
      <div class="card" style="padding:2px 14px">${SET_PAGES.map(([k, ic, t, s]) => `<button class="srow" data-p="${k}"><div class="sic">${I(ic)}</div><div class="grow"><div class="b">${t}</div><div class="muted small">${s}</div></div>${I('right', 'sm chev')}</button>`).join('')}</div>
      <button class="btn-s" id="sreset" style="margin-top:18px;width:100%;justify-content:center;color:var(--bad)">Przywróć domyślne</button>
      <div class="muted small" style="text-align:center;margin-top:14px">IDU Skin ${esc(SKIN_VERSION)}</div>`);
    sh.querySelectorAll('[data-p]').forEach(b => b.onclick = () => settingsPage(root, app, b.dataset.p));
    const obs = new MutationObserver(() => { if (!sh.isConnected) { obs.disconnect(); if (setDirty) { setDirty = false; softGo(location.href, false, { quiet: true }); } } });
    obs.observe(sh.parentNode, { childList: true });
    sh.querySelector('#sreset').onclick = () => { store.set('skSettings', '{}'); store.set('skPlanMode', 'day'); setStartKey(DEFAULTS); native(notifyPrefs(DEFAULTS)); location.reload(); };
  }
  function settingsPage(root, app, page) {
    let needsRedraw = false;
    const sh = openSheet(root, '<div id="sp"></div>');
    const body = sh.querySelector('#sp');
    const save = (k, v) => {
      if (k === 'plan') { store.set('skPlanMode', v); needsRedraw = true; return; }
      if (k === 'gview') { store.set('skGradeView', v); needsRedraw = true; return; }
      const cur = loadSettings(); cur[k] = v;
      if (PRESET_KEYS.includes(k)) cur.preset = 'custom';
      store.set('skSettings', JSON.stringify(cur)); applySettings(app);
      if (['nav', 'labels', 'tabs'].includes(k)) renderNav(root);
      if (['subj', 'nick', 'startLayout', 'tiles', 'tilesWide', 'subjView', 'wfMode', 'wfTarget', 'showNow', 'showTodo', 'showExams', 'showEvents', 'showFeed', 'accent', 'head', 'cards'].includes(k)) needsRedraw = true;
      if (k === 'startTab') setStartKey(cur);
      if (k === 'lang') { native(notifyPrefs(cur)); setTimeout(() => location.reload(), 150); return; }
      if (/^n[A-Z]/.test(k)) { if ((+cur.nLesson > 0) || cur.nExam || cur.nHw) native({ type: 'askNotify' }); native(notifyPrefs(cur)); }
    };
    const draw = () => {
      const st = loadSettings(), planNow = store.get('skPlanMode') || 'day', gNow = store.get('skGradeView') || 'subj';
      const val = k => k === 'plan' ? planNow : k === 'gview' ? gNow : String(st[k]);
      const seg = (key, opts) => `<div class="seg" data-k="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${val(key) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
      const tgl = (key, label) => `<label class="tgl"><span>${label}</span><input type="checkbox" data-t="${key}" ${st[key] ? 'checked' : ''}><i></i></label>`;
      const LB = t => `<div class="lbl" style="--c:var(--muted)">${t}</div>`;
      const orderList = (id, all, chosen, wideKey) => `<div class="card olist" id="${id}" style="padding:2px 12px">${[...chosen, ...Object.keys(all).filter(k => !chosen.includes(k))].map(k => {
        const on = chosen.includes(k), i = chosen.indexOf(k);
        return `<div class="orow ${on ? '' : 'off'}"><label class="grow ocheck"><input type="checkbox" data-o="${k}" ${on ? 'checked' : ''}><span>${esc(Array.isArray(all[k]) ? all[k][1] : all[k])}</span></label>
          ${on && wideKey ? `<button class="chip ${(st[wideKey] || []).includes(k) ? 'on' : ''}" data-w="${k}">szeroki</button>` : ''}
          ${on ? `<button class="iconbtn" data-up="${k}" ${i === 0 ? 'disabled' : ''} aria-label="W górę">${I('up', 'sm')}</button><button class="iconbtn" data-dn="${k}" ${i === chosen.length - 1 ? 'disabled' : ''} aria-label="W dół">${I('down', 'sm')}</button>` : ''}</div>`;
      }).join('')}</div>`;
      let h = '';
      if (page === 'style') {
        const mine = myPresets();
        const card = (id, label, v) => { const th = THEMES[v.theme] || THEMES.dark, acc = ACCENTS[v.accent] || ACCENTS.blue;
          return `<button class="pcard ${st.preset === id ? 'on' : ''}" data-preset="${esc(id)}" style="--pb:${th.bg};--pc:${th.card};--pa:${acc};--pt:${th.text || '#f2f4f8'}"><i><b></b><b></b><s></s></i><span>${esc(label)}</span>${PRESETS[id] ? '' : `<em data-delp="${esc(id)}" aria-label="Usuń">×</em>`}</button>`; };
        h = `<h2>Styl i wygląd</h2><div class="muted small">Preset to gotowy zestaw ustawień. Wybierz go, a potem zmień cokolwiek niżej.</div>
          <div class="pgridp">${Object.entries(PRESETS).map(([id, p]) => card(id, p.label, presetVals(id))).join('')}${mine.map(p => card(p.id, p.name, presetVals(p.id))).join('')}</div>
          <button class="btn-s" id="savep" style="width:100%;justify-content:center;margin-top:10px">${I('plus', 'sm')}Zapisz obecny wygląd jako mój styl</button>
          ${LB('Tło')}<div class="themes">${Object.entries(THEMES).map(([k, t]) => `<button data-theme="${k}" class="${st.theme === k ? 'on' : ''}" style="--b:${t.bg};--c2:${t.card}"><i></i><span>${t.label}</span></button>`).join('')}</div>
          ${LB('Kolor akcentu')}<div class="swatches">${Object.entries(ACCENTS).map(([k, c]) => `<button data-acc="${k}" class="${st.accent === k ? 'on' : ''}" style="--c:${c}" aria-label="${k}"></button>`).join('')}</div>
          ${LB('Kolory przedmiotów')}${seg('subj', [['vivid', 'Żywe'], ['muted', 'Stonowane'], ['bold', 'Pełne karty'], ['mono', 'Jeden']])}
          ${LB('Karty')}${seg('cards', [['cards', 'Karty'], ['lines', 'Linie'], ['glass', 'Szkło'], ['paper', 'Papier']])}
          ${LB('Czytelność')}${seg('contrast', [['normal', 'Normalna'], ['high', 'Wysoki kontrast']])}
          ${LB('Rozmiar tekstu')}${seg('size', [['s', 'A−'], ['m', 'A'], ['l', 'A+'], ['xl', 'A++']])}
          ${LB('Czcionka')}${seg('font', [['system', 'Standardowa'], ['rounded', 'Zaokrąglona']])}
          ${LB('Nagłówki')}${seg('head', [['system', 'Zwykłe'], ['mono', 'Mono'], ['hand', 'Odręczne']])}
          ${LB('Zaokrąglenie')}${seg('radius', [['s', 'Małe'], ['m', 'Średnie'], ['l', 'Duże']])}
          ${LB('Gęstość')}${seg('density', [['compact', 'Kompaktowa'], ['normal', 'Normalna']])}
          <div class="card" style="padding:2px 14px;margin-top:12px">${tgl('motion', 'Animacje')}${tgl('glass', 'Rozmycie pod paskami')}${tgl('haptics', 'Wibracje przy dotyku')}</div>`;
      } else if (page === 'bar') {
        const tabs = navTabs(st), max = st.nav === 'plus' ? 4 : 5;
        h = `<h2>Dolny pasek</h2>${LB('Kształt')}${seg('nav', [['pill', 'Zaokrąglony'], ['float', 'Pływający'], ['bar', 'Klasyczny'], ['plus', 'Z przyciskiem +']])}
          <div class="card" style="padding:2px 14px;margin-top:12px">${st.nav === 'pill' ? '<div class="muted small" style="padding:12px 0">Zaokrąglony pasek ma same ikony – aktywna przesuwa się w jasnej pigułce.</div>' : tgl('labels', 'Napisy pod ikonami')}${tgl('motion', 'Animacje')}</div>
          ${LB(`Zakładki (${tabs.length}/${max}) – zaznacz i ustaw kolejność`)}${orderList('otabs', TABDEFS, tabs)}
          ${LB('Po otwarciu apki pokaż')}${seg('startTab', [['start', 'Start'], ['plan', 'Plan'], ['grades', 'Oceny'], ['mail', 'Poczta']])}`;
      } else if (page === 'screens') {
        h = `<h2>Układy ekranów</h2>${LB('Start')}${seg('startLayout', [['A', 'Lista'], ['B', 'Nowości'], ['C', 'Kafelki'], ['E', 'Jedna karta']])}
          ${LB('Plan lekcji')}${seg('plan', [['day', 'Dzień'], ['timeline', 'Oś czasu'], ['week', 'Tydzień']])}
          ${LB('Przedmiot')}${seg('subjView', [['page', 'Jedna strona'], ['tiles', 'Kafle']])}
          ${LB('Oceny')}${seg('gview', [['subj', 'Karty'], ['list', 'Oś czasu'], ['table', 'Tabela']])}
          ${LB('WF – jak liczyć punkty')}${seg('wfMode', [['max', 'Największy wpis'], ['sum', 'Suma'], ['last', 'Ostatni']])}
          ${LB('WF – cel punktów')}<div class="search" style="margin:0"><input id="wft" type="number" inputmode="numeric" min="1" max="999" value="${esc(st.wfTarget || 95)}"></div>
          <div class="note2">Jeśli nie wiesz, jak nauczyciel liczy WF, zostaw „Największy wpis”. Zmiana działa od razu w Ocenach.</div>`;
      } else if (page === 'start') {
        h = `<h2>Ekran Start</h2>${LB('Układ')}${seg('startLayout', [['A', 'Lista'], ['B', 'Nowości'], ['C', 'Kafelki'], ['E', 'Jedna karta']])}
          ${LB('Kafelki (układ „Kafelki”)')}${orderList('otiles', TILES, (st.tiles || DEFAULTS.tiles).filter(k => TILES[k]), 'tilesWide')}
          ${LB('Sekcje (układ „Lista”)')}<div class="card" style="padding:2px 14px">${tgl('showNow', 'Następna lekcja')}${tgl('showTodo', 'Do zrobienia')}${tgl('showExams', 'Sprawdziany')}${tgl('showEvents', 'Nadchodzące wydarzenia')}${tgl('showFeed', 'Co nowego')}</div>`;
      } else if (page === 'subjects') {
        const names = jget('skSubjList', []), hid = jget('skSubjHide', []), pin = jget('skSubjPin', []);
        h = `<h2>Przedmioty</h2><div class="muted small">Ukryte znikną z listy przedmiotów i szukania. Przypięte są na górze.</div>
          <div class="card" style="padding:2px 14px;margin-top:10px">${names.map(n => { const k = subjKey(n); return `<div class="orow"><div class="av" style="background:${subjColor(n)};width:28px;height:28px;font-size:13px">${esc(prettySubj(n).charAt(0))}</div>
            <span class="grow clip">${esc(prettySubj(n))}</span><button class="chip ${pin.includes(k) ? 'on' : ''}" data-pin="${esc(k)}">${I('pin', 'xs')}Przypnij</button><button class="chip ${hid.includes(k) ? 'on' : ''}" data-hide="${esc(k)}">Ukryj</button></div>`; }).join('') || '<div class="nores">Otwórz raz Start, żeby wczytać przedmioty</div>'}</div>`;
      } else if (page === 'notes') {
        h = `<h2>Notatki i kopia</h2><div class="card" id="nstat">Liczę…</div>
          <button class="btn-p" id="nexp" style="width:100%;margin-top:12px">${I('download')}Eksportuj kopię</button>
          <label class="btn-s" style="width:100%;justify-content:center;margin-top:10px">${I('inbox', 'sm')}<span>Wczytaj kopię</span><input type="file" id="nimp" accept="application/json,.json"></label>
          <div class="note2">Kopia to jeden plik z notatkami, zdjęciami, Ważnymi i własnymi zadaniami. Zapisz go w Plikach albo na komputerze – przyda się, gdy usuniesz apkę. Odświeżanie apki co 7 dni niczego nie kasuje.</div>`;
      } else if (page === 'notify') {
        h = `<h2>Powiadomienia</h2>${LB('Przypomnienie przed lekcją')}${seg('nLesson', [['0', 'Wył.'], ['5', '5 min'], ['10', '10 min'], ['15', '15 min']])}
          <div class="card" style="padding:2px 14px;margin-top:12px">${tgl('nExam', 'Sprawdzian — dzień wcześniej')}${tgl('nHw', 'Termin zadania — dzień wcześniej')}</div>
          ${LB('Godzina przypomnień „dzień wcześniej”')}${seg('nHour', [['16', '16:00'], ['18', '18:00'], ['20', '20:00']])}
          <div class="note2 ${NATIVE_IDU ? '' : 'warn'}" id="nnote">${NATIVE_IDU ? 'Przypomnienia liczą się z Twojego planu i kalendarza, więc działają też przy zamkniętej apce. Przypomnienia z Ważnych ustawiasz, przytrzymując ogłoszenie albo wiadomość.' : 'Powiadomienia działają tylko w aplikacji IDU na iPhonie.'}</div>`;
      } else if (page === 'widget') {
        h = `<h2>Widget</h2><div class="card row" style="align-items:flex-start"><div style="color:var(--accent)">${I('widget', 'fill')}</div><div class="grow small">
          <b>Następna lekcja i sala</b><ol class="steps"><li>Przytrzymaj palec na ekranie głównym → <b>Edytuj</b> → <b>Dodaj widżet</b>.</li><li>Wyszukaj <b>IDU</b> i wybierz rozmiar.</li>
          <li>Na ekranie blokady: przytrzymaj go → <b>Dostosuj</b> → <b>Ekran blokady</b> → pole widżetów.</li></ol><div class="note2" style="margin-left:0">Widget odświeża się, gdy otworzysz Start w apce. Jeśli go nie ma na liście, uruchom ponownie telefon.</div></div></div>`;
      } else if (page === 'profile') {
        h = `<h2>Profil i język</h2>${LB('Język / Language')}${seg('lang', [['pl', 'Polski'], ['en', 'English']])}
          <div class="card avrow" style="margin-top:14px"><div id="avprev">${meAvatar()}</div><div class="grow"><div class="b">Twoje zdjęcie</div><div class="btns" style="margin-top:8px">
            <label class="btn-s">${I('image', 'sm')}<span>Wybierz</span><input type="file" id="avfile" accept="image/*"></label>
            <button class="btn-s" id="avdel" style="${store.get('skAvatar') ? '' : 'display:none'}">${I('trash', 'sm')}Usuń</button></div></div></div>
          <div class="note2">Zdjęcie zostaje tylko w tym telefonie — nie jest wysyłane do IDU.</div>
          ${LB('Imię w powitaniu')}<div class="search" style="margin:0"><input id="nick" placeholder="np. Janek" value="${esc(st.nick)}" maxlength="24" autocomplete="off"></div>`;
      }
      body.innerHTML = `<button class="sback" id="sback">${I('back', 'sm')}Ustawienia</button>` + h;
      wire();
    };
    const wire = () => {
      body.querySelector('#sback').onclick = () => closeSheet(sh);
      body.querySelectorAll('.seg[data-k] button').forEach(b => b.onclick = () => {
        const k = b.parentElement.dataset.k; b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        save(k, /^n[A-Z]/.test(k) ? +b.dataset.v : b.dataset.v); if (k === 'nav') draw();
      });
      body.querySelectorAll('input[data-t]').forEach(i => i.onchange = () => { haptic('light'); save(i.dataset.t, i.checked); });
      body.querySelectorAll('.swatches button').forEach(b => b.onclick = () => { body.querySelectorAll('.swatches button').forEach(x => x.classList.toggle('on', x === b)); save('accent', b.dataset.acc); });
      body.querySelectorAll('.themes button').forEach(b => b.onclick = () => { body.querySelectorAll('.themes button').forEach(x => x.classList.toggle('on', x === b)); save('theme', b.dataset.theme); });
      body.querySelectorAll('[data-preset]').forEach(b => b.onclick = e => {
        if (e.target.dataset.delp) { jset('skMyPresets', myPresets().filter(p => p.id !== e.target.dataset.delp)); draw(); return; }
        const cur = Object.assign(loadSettings(), presetVals(b.dataset.preset), { preset: b.dataset.preset });
        store.set('skSettings', JSON.stringify(cur)); applySettings(app); renderNav(root); needsRedraw = true; haptic('success'); draw();
      });
      const sp = body.querySelector('#savep'); if (sp) sp.onclick = () => {
        const v = {}, cur = loadSettings(); PRESET_KEYS.forEach(k => { v[k] = cur[k]; });
        const id = 'my' + uid(), list = myPresets(); list.push({ id, name: 'Mój styl ' + (list.length + 1), v }); jset('skMyPresets', list);
        cur.preset = id; store.set('skSettings', JSON.stringify(cur)); haptic('success'); toast(root, 'Zapisano jako „Mój styl ' + list.length + '”', 'good'); draw();
      };
      const order = (id, key, max) => {
        const box = body.querySelector('#' + id); if (!box) return;
        const get = () => { const st = loadSettings(); return key === 'tabs' ? navTabs(st) : (st.tiles || DEFAULTS.tiles).slice(); };
        box.querySelectorAll('[data-o]').forEach(c => c.onchange = () => {
          let l = get(); if (c.checked) { if (l.length >= max) { c.checked = false; toast(root, `Maksymalnie ${max}`); return; } l.push(c.dataset.o); } else { if (l.length <= 1) { c.checked = true; return; } l = l.filter(x => x !== c.dataset.o); }
          save(key, l); draw();
        });
        box.querySelectorAll('[data-up],[data-dn]').forEach(b => b.onclick = () => {
          const l = get(), k = b.dataset.up || b.dataset.dn, i = l.indexOf(k), j = b.dataset.up ? i - 1 : i + 1; if (i < 0 || j < 0 || j >= l.length) return;
          [l[i], l[j]] = [l[j], l[i]]; haptic('selection'); save(key, l); draw();
        });
        box.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { const st = loadSettings(); let w = st.tilesWide || []; w = w.includes(b.dataset.w) ? w.filter(x => x !== b.dataset.w) : w.concat(b.dataset.w); save('tilesWide', w); draw(); });
      };
      order('otabs', 'tabs', loadSettings().nav === 'plus' ? 4 : 5); order('otiles', 'tiles', 8);
      const wft = body.querySelector('#wft'); if (wft) wft.onchange = () => { const v = Math.max(1, Math.min(999, parseInt(wft.value, 10) || 95)); wft.value = v; save('wfTarget', v); };
      body.querySelectorAll('[data-pin],[data-hide]').forEach(b => b.onclick = () => {
        const key = b.dataset.pin ? 'skSubjPin' : 'skSubjHide', k = b.dataset.pin || b.dataset.hide, l = jget(key, []);
        jset(key, l.includes(k) ? l.filter(x => x !== k) : l.concat(k)); haptic('selection'); needsRedraw = true; draw();
      });
      const ns = body.querySelector('#nstat'); if (ns) NOTES.all().then(all => { const size = all.reduce((s, n) => s + (n.blob ? n.blob.size : 0) + (n.thumb ? n.thumb.length : 0), 0);
        ns.innerHTML = `<div class="b">${(size / 1048576).toFixed(1)} MB w telefonie</div><div class="muted small">${all.filter(n => n.kind === 'photo').length} zdjęć · ${all.filter(n => n.kind !== 'photo').length} notatek · ${favList().length} ważnych</div>`; });
      const ex = body.querySelector('#nexp'); if (ex) ex.onclick = () => notesExport(root);
      const im = body.querySelector('#nimp'); if (im) im.onchange = () => { if (im.files[0]) notesImport(root, im.files[0]).then(draw); };
      const nick = body.querySelector('#nick'); if (nick) nick.oninput = () => save('nick', nick.value.trim());
      const avfile = body.querySelector('#avfile'), avdel = body.querySelector('#avdel'), avprev = body.querySelector('#avprev');
      if (avfile) avfile.onchange = () => {
        const f = avfile.files && avfile.files[0]; if (!f) return;
        const url = URL.createObjectURL(f), img = new Image();
        img.onload = () => {
          try { const S = 320, c = document.createElement('canvas'); c.width = c.height = S;
            const k = Math.max(S / img.naturalWidth, S / img.naturalHeight), w = img.naturalWidth * k, hh = img.naturalHeight * k;
            c.getContext('2d').drawImage(img, (S - w) / 2, (S - hh) / 2, w, hh); store.set('skAvatar', c.toDataURL('image/jpeg', 0.86));
            avprev.innerHTML = meAvatar(); avdel.style.display = ''; needsRedraw = true; haptic('success'); toast(root, 'Zdjęcie zapisane', 'good');
          } catch (e) { toast(root, 'Nie udało się wczytać zdjęcia', 'bad'); }
          URL.revokeObjectURL(url);
        };
        img.onerror = () => { URL.revokeObjectURL(url); toast(root, 'Ten format zdjęcia nie jest obsługiwany', 'bad'); };
        img.src = url;
      };
      if (avdel) avdel.onclick = () => { try { localStorage.removeItem('skAvatar'); } catch (e) {} avprev.innerHTML = meAvatar(); avdel.style.display = 'none'; needsRedraw = true; };
    };
    onNative('notify', ok => { const n = body.querySelector('#nnote'); if (n && ok === false) { n.classList.add('warn'); n.textContent = 'iPhone blokuje powiadomienia dla IDU. Włącz je w Ustawieniach iPhone’a → Powiadomienia → IDU.'; } });
    draw();
    const obs = new MutationObserver(() => { if (!sh.isConnected) { obs.disconnect(); if (needsRedraw) { setDirty = true; if (!root.querySelector('.sheet')) { setDirty = false; softGo(location.href, false, { quiet: true }); } } } });
    obs.observe(sh.parentNode, { childList: true });
  }
  let setDirty = false;
  const V5_CSS = `
  .app a{-webkit-touch-callout:none}
  .nav .lb{display:block}
  .nav .ind{position:absolute;left:0;top:6px;bottom:calc(6px + env(safe-area-inset-bottom));opacity:0;pointer-events:none;border-radius:22px;
    transition:transform .42s cubic-bezier(.34,1.36,.5,1),width .3s ease,opacity .2s}
  .nav.noanim .ind,.app.nomotion .nav .ind{transition:none}
  .app[data-nav="bar"] .nav .ind,.app[data-nav="plus"] .nav .ind{display:none}
  .app:is([data-nav="pill"],[data-nav="float"]) .nav{left:14px;right:14px;bottom:calc(10px + env(safe-area-inset-bottom));padding:7px;border:0;border-radius:31px;
    box-shadow:0 12px 30px rgba(0,0,0,.42),inset 0 0 0 .5px var(--line);background:color-mix(in srgb,var(--card) 90%,transparent)}
  .app:is([data-nav="pill"],[data-nav="float"]) .nav .ind{top:7px;bottom:7px;opacity:1}
  .app:is([data-nav="pill"],[data-nav="float"]) main{padding-bottom:calc(112px + env(safe-area-inset-bottom))}
  .app[data-nav="pill"] .nav a{font-size:0;gap:0;padding:11px 0;z-index:1;transition:color .25s}
  .app[data-nav="pill"] .nav a .ic{width:25px;height:25px}
  .app[data-nav="pill"] .nav .ind{background:var(--text)}
  .app[data-nav="pill"] .nav a.on{color:var(--bg)}
  .app[data-nav="pill"] .nav a.on .ic .f{fill-opacity:.0}
  .app[data-nav="float"] .nav a{z-index:1;padding:6px 0}
  .app[data-nav="float"] .nav .ind{background:color-mix(in srgb,var(--accent) 20%,transparent)}
  .nav .plusb{flex:none;width:58px;height:58px;margin:-24px 4px 0;border-radius:29px;border:4px solid var(--bg);background:var(--accent);color:#fff;
    display:grid;place-items:center;box-shadow:0 8px 20px color-mix(in srgb,var(--accent) 45%,transparent)}
  .nav .plusb .ic{width:26px;height:26px;stroke-width:2.4}
  .top .btn.faved{color:var(--warn)}
  .top .btn[hidden]{display:none}
  .hello .grow{min-width:0}.hello .lead{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .app :is(.fchips button.on,.btn-p,.chip.on,.nav .plusb){color:var(--onacc,#fff)}
  .app .fchips button.on span{color:var(--onacc,#fff)}
  .ic.fill .f,.ic.fill path{fill:currentColor;fill-opacity:.9}
  .menu{display:flex;flex-direction:column;background:var(--card2);border-radius:16px;overflow:hidden}
  .menu>button,.menu>a{display:flex;gap:12px;align-items:center;border:0;background:none;padding:14px 16px;font-size:16px;text-align:left;border-bottom:.5px solid var(--line);color:var(--text)}
  .menu>:last-child{border-bottom:0}
  .remopts{display:flex;flex-wrap:wrap;gap:8px;padding:10px 14px;border-bottom:.5px solid var(--line)}
  .remopts[hidden]{display:none}
  .remopts button{background:var(--card);border-radius:10px;padding:8px 12px;font-size:14px;border:0;color:var(--text)}
  .fav .favf{display:flex;align-items:center;gap:8px;margin-top:10px}
  .fav details{margin-top:8px}.fav .note{white-space:pre-wrap;font-size:14px}
  .srow{display:flex;gap:12px;align-items:center;width:100%;border:0;background:none;padding:12px 0;border-bottom:.5px solid var(--line);text-align:left;color:var(--text)}
  .srow:last-child{border:0}.srow .sic{width:34px;height:34px;border-radius:10px;background:var(--card2);color:var(--accent);display:grid;place-items:center}
  .sback{display:flex;align-items:center;gap:4px;border:0;background:none;color:var(--accent);font-weight:600;padding:4px 0 10px}
  .pgridp{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}
  .pcard{border:0;background:none;color:var(--text);display:flex;flex-direction:column;align-items:center;gap:5px;font-size:12px;font-weight:600;position:relative;padding:0}
  .pcard i{width:100%;aspect-ratio:3/4;border-radius:14px;background:var(--pb);box-shadow:inset 0 0 0 1px var(--line);display:flex;flex-direction:column;gap:5px;padding:8px;box-sizing:border-box}
  .pcard i b{height:22%;border-radius:6px;background:var(--pc)}.pcard i s{margin-top:auto;height:12%;border-radius:8px;background:var(--pa)}
  .pcard.on i{box-shadow:0 0 0 2.5px var(--accent)}
  .pcard em{position:absolute;top:-6px;right:-4px;width:22px;height:22px;border-radius:11px;background:var(--bad);color:#fff;font-style:normal;display:grid;place-items:center;font-size:14px}
  .olist .orow,.orow{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:.5px solid var(--line)}
  .olist .orow:last-child{border:0}.orow.off{opacity:.6}.ocheck{display:flex;align-items:center;gap:10px}
  .orow .iconbtn{width:36px;height:36px}.orow .iconbtn[disabled]{opacity:.3}
  .orow .chip{margin:0}.chip.on{background:var(--accent);color:#fff}
  .app input[type=checkbox]:not(.tgl input){-webkit-appearance:none;appearance:none;width:23px;height:23px;margin:0;flex:none;border-radius:8px;
    border:2px solid color-mix(in srgb,var(--muted) 80%,transparent);display:inline-grid;place-items:center;background:none;transition:background-color .15s}
  .app input[type=checkbox]:not(.tgl input):checked{background:var(--accent);border-color:var(--accent)}
  .app input[type=checkbox]:not(.tgl input):checked::after{content:'';width:6px;height:11px;border:solid #fff;border-width:0 2.5px 2.5px 0;transform:translateY(-1px) rotate(45deg)}
  .trow{display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:.5px solid var(--line);color:var(--text)}
  .trow:last-of-type{border-bottom:0}.trow .done{text-decoration:line-through;opacity:.55}
  .tdot{width:9px;height:9px;border-radius:5px;background:var(--accent);flex:none;margin:0 7px}.tdot.bad{background:var(--bad)}
  .tadd{border:0;background:none;color:var(--accent);font-weight:600;padding:10px 0;display:flex;gap:6px;align-items:center}
  .hello .iconbtn{flex:none}
  .strip1{display:flex;align-items:center;gap:10px;padding:12px 14px}
  .strip1 .sdot,.sdot{width:9px;height:9px;border-radius:5px;flex:none}
  .bigc{min-height:330px;display:flex;flex-direction:column;padding:24px}
  .bigc .bign{font-size:36px;font-weight:800;letter-spacing:-.6px;line-height:1.1;margin-top:8px}
  .bigroom{align-self:flex-end;text-align:right;margin-top:auto}.bigroom b{display:block;font-size:104px;line-height:.85;font-weight:800;letter-spacing:-4px}
  .counters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0}
  .counters a{background:var(--card);border-radius:18px;padding:14px 8px;text-align:center}.counters b{display:block;font-size:28px;font-weight:800}
  .tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}
  .tile{background:var(--card);border-radius:22px;padding:16px;min-height:150px;display:flex;flex-direction:column;gap:4px;color:var(--text);border:0;text-align:left;font:inherit}
  .tile.wide{grid-column:span 2;min-height:120px}.tile .tlab{font-size:13px;font-weight:700;color:var(--muted)}.tile .tv{font-size:40px;font-weight:800;line-height:1;margin-top:auto}
  .tile .tn{font-size:19px;font-weight:800}.tile .ts{font-size:13px;color:var(--muted)}
  .meter.sm{height:6px;margin-top:6px}
  .tline{position:relative;margin:8px 0 12px}
  .tl-h{position:absolute;left:0;right:0;border-top:.5px solid var(--line)}
  .tl-h span{position:absolute;top:-9px;left:0;font-size:11px;color:var(--muted);background:var(--bg);padding-right:6px}
  .tl-b{position:absolute;left:48px;right:0;border-radius:14px;padding:8px 12px;display:flex;gap:10px;align-items:flex-start;overflow:hidden;
    background:color-mix(in srgb,var(--c) 24%,var(--card));color:var(--text)}
  .tl-b .small{color:color-mix(in srgb,var(--text) 72%,transparent)}
  .tl-b .room{margin-left:auto}
  .tl-now{position:absolute;left:44px;right:0;height:2px;background:var(--bad);z-index:2}
  .tl-now::before{content:'';position:absolute;left:-5px;top:-4px;width:10px;height:10px;border-radius:5px;background:var(--bad)}
  .gtable{padding:2px 12px}.gt{display:grid;grid-template-columns:110px minmax(0,1fr) auto;gap:8px;align-items:center;padding:11px 0;border-bottom:.5px solid var(--line)}
  .gt:last-child{border:0}.gt .gn{display:flex;gap:8px;align-items:center;font-weight:700;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .gt .gn i{width:8px;height:8px;border-radius:4px;background:var(--c);flex:none}.gt .gm{display:flex;gap:4px;flex-wrap:wrap}
  .gt .gm b{padding:3px 7px;border-radius:7px;background:color-mix(in srgb,var(--c) 22%,var(--card2));font-size:13px}.gt .gs{font-weight:800}
  .search.big{margin-bottom:12px}.search mark,.sres mark{background:color-mix(in srgb,var(--warn) 40%,transparent);color:inherit;border-radius:3px}
  .nhead{display:flex;gap:14px;align-items:center;margin:4px 0 14px}
  .pgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:6px 0 10px}
  .pgrid .ph{aspect-ratio:1;border:0;border-radius:12px;background:var(--card2) center/cover no-repeat;padding:0}
  .ntext{display:block;width:100%;text-align:left;color:var(--text);font:inherit;white-space:pre-wrap}
  .addk{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:8px 0}
  .addb{display:flex;flex-direction:column;align-items:center;gap:6px;border:0;background:var(--card2);color:var(--text);border-radius:14px;padding:12px 4px;font-size:13px;font-weight:600}
  .addb input{display:none}.addb .ic{color:var(--accent)}
  .viewer{position:fixed;inset:0;z-index:80;background:#000;display:grid;place-items:center;overflow:hidden}
  .viewer img{max-width:100%;max-height:100%;transition:transform .25s}.viewer.z img{transform:scale(2.3)}
  .vbar{position:absolute;top:calc(8px + env(safe-area-inset-top));left:8px;right:8px;display:flex;gap:8px;align-items:center;color:#fff}
  .vbar span{flex:1;text-align:center;font-size:14px}.vbar button{width:44px;height:44px;border-radius:22px;border:0;background:rgba(255,255,255,.16);color:#fff;display:grid;place-items:center}
  .app[data-cards="lines"] :is(.card,.box,.gcard):not(.bigc):not(.now){background:transparent;box-shadow:none;border-radius:0!important;border-bottom:1px solid var(--line);padding-left:2px;padding-right:2px}
  .app[data-cards="glass"]{background:radial-gradient(120% 60% at 50% 0%,#24272e 0%,var(--bg) 70%) fixed}
  .app[data-cards="glass"] :is(.card,.box,.gcard,.hero,.tile,.counters a,.alert){background:rgba(255,255,255,.075);border:1px solid rgba(255,255,255,.11);
    backdrop-filter:blur(22px) saturate(1.5);-webkit-backdrop-filter:blur(22px) saturate(1.5);box-shadow:none}
  .app[data-cards="paper"] :is(.card,.box,.gcard,.tile,.counters a){box-shadow:2px 3px 0 var(--line);border:1px solid var(--line)}
  .app[data-theme="paper"]{background-image:linear-gradient(rgba(30,42,74,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,74,.06) 1px,transparent 1px);background-size:22px 22px}
  .app[data-head="hand"] :is(h1,.sec h2,.top .title,.sheet h2){font-family:'Caveat',cursive!important;font-weight:700;letter-spacing:0}
  .app[data-head="hand"] h1{font-size:34px}.app[data-head="hand"] .sec h2,.app[data-head="hand"] .sheet h2{font-size:27px}.app[data-head="hand"] .top .title{font-size:24px}
  .app[data-head="mono"] :is(h1,.sec h2,.top .title,.sheet h2,.lbl,.room,.tv){font-family:'IBM Plex Mono',ui-monospace,monospace!important;letter-spacing:-.3px}
  .app[data-contrast="high"] .small{font-size:14px}.app[data-contrast="high"]{font-weight:500}
  .app.subjbold :is(.les,.now,.tl-b,.gcard){background:color-mix(in srgb,var(--c) 80%,#000)!important;color:#fff}
  .app.subjbold :is(.les,.now,.gcard) :is(.muted,.small){color:rgba(255,255,255,.82)!important}
  `;

  /* ------------------------------------------------------------------ *
   *  iPhone app bridge: vibrations, widget data, reminders
   * ------------------------------------------------------------------ */
  const SKIN_VERSION = '5.0';
  const HANDLERS = (() => { try { return (window.webkit && window.webkit.messageHandlers) || null; } catch (e) { return null; } })();
  const NATIVE_IDU = !!(HANDLERS && HANDLERS.idu);
  let HAPTICS = true;
  function haptic(kind) { if (!HAPTICS || !HANDLERS || !HANDLERS.haptic) return; try { HANDLERS.haptic.postMessage(kind || 'light'); } catch (e) {} }
  function native(msg) { if (!NATIVE_IDU) return; try { HANDLERS.idu.postMessage(msg); } catch (e) {} }
  const nativeCbs = {};
  function onNative(type, fn) { (nativeCbs[type] = nativeCbs[type] || []).push(fn); }
  window.__skNative = (type, val) => { (nativeCbs[type] || []).forEach(f => { try { f(val); } catch (e) {} }); };

  /* ---- English: the app's own words are swapped as they appear (IDU's content is left alone) ---- */
  const SKIP_TR = '.mbody,.note,.bubble,textarea,style,[data-raw],.tok,.who b';
  function trString(s) {
    const t = s.trim();
    if (!t || !/[a-ząćęłńóśźż]/i.test(t)) return s;
    let r = TR_EN[t];
    if (r == null) for (const [rx, rep] of TR_RX) { if (rx.test(t)) { r = t.replace(rx, rep); break; } }
    if (r == null) r = t;
    r = r.replace(MONTH_RX, (m, d, mo) => d + ' ' + MONTH_EN[mo]).replace(/ · waga (\d+)/, ' · weight $1');
    return r === t ? s : s.replace(t, () => r);
  }
  function trNode(n) {
    if (n.nodeType === 3) {
      const p = n.parentElement;
      if (p && !p.closest(SKIP_TR)) { const v = trString(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; }
      return;
    }
    if (n.nodeType !== 1 && n.nodeType !== 11) return;
    const attrs = el => { if (el.closest('.mbody,.note,.bubble,[data-raw]')) return;
      for (const a of ['placeholder', 'aria-label']) if (el.hasAttribute(a)) { const v = trString(el.getAttribute(a)); if (v !== el.getAttribute(a)) el.setAttribute(a, v); } };
    if (n.nodeType === 1) attrs(n);
    const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let c;
    while ((c = w.nextNode())) { if (c.nodeType === 1) attrs(c); else trNode(c); }
  }
  function watchTranslate(root) {
    if (!EN) return;
    new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'characterData') trNode(m.target);
        else m.addedNodes.forEach(trNode);
      }
    }).observe(root, { childList: true, subtree: true, characterData: true });
  }

  // short message at the bottom of the screen
  function toast(root, text, kind) {
    const app = root && root.getElementById ? root.getElementById('app') : null; if (!app) return;
    app.querySelectorAll('.toast').forEach(t => t.remove());
    const t = document.createElement('div'); t.className = 'toast ' + (kind || '');
    t.innerHTML = (kind === 'bad' ? I('alert') : kind === 'good' ? I('check') : '') + `<span>${esc(text)}</span>`;
    app.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 2600);
  }
  // your own profile photo (stored only on this phone)
  const meAvatar = () => { const a = store.get('skAvatar'); return a && /^data:image\//.test(a) ? `<div class="pav"><img src="${a}" alt=""></div>` : PERSON_AV; };

  /* ------------------------------------------------------------------ *
   *  MAIN
   * ------------------------------------------------------------------ */
  function main() {
    const accLink = $('#account a');

    // Fix the "tiny desktop page" problem
    let vp = $('meta[name="viewport"]');
    if (!vp) { vp = document.createElement('meta'); vp.name = 'viewport'; document.head.appendChild(vp); }
    vp.content = NO_ZOOM;

    let pageStyle = document.getElementById('sk-page-style');
    if (!pageStyle) {
      pageStyle = document.createElement('style'); pageStyle.id = 'sk-page-style';
      pageStyle.textContent = PAGE_CSS + LOGIN_CSS;
      document.head.appendChild(pageStyle);
    }

    // print-style pages (plans, class lists, calendar events) come without IDU's header
    const bare = !accLink && !$('input[type="password"]') && BARE_KINDS.includes(routeKind(document, location.pathname.replace(/\/+$/, '') || '/'));
    if (!accLink && !bare) {                    // login / logged-out pages
      try { localStorage.removeItem('skSnap'); } catch (e) {}
      if (!loginMode()) { vp.content = 'width=1000, user-scalable=yes'; pageStyle.remove(); }
      return;
    }

    const ctx = bare ? {
      student: store.get('skMe') || '/', name: store.get('skMeName') || '', unread: 0, timer: null, bare: true,
      path: location.pathname.replace(/\/+$/, '') || '/'
    } : {
      student: attr(accLink, 'href'),
      name: txt($('#login strong')),
      unread: parseInt(txt($('#messages strong')), 10) || 0,
      timer: $('.js-counter'),
      path: location.pathname.replace(/\/+$/, '') || '/'
    };
    if (!bare) { store.set('skMe', ctx.student); store.set('skMeName', ctx.name); }

    if (CLASSIC) { mountClassicSwitch(); return; }

    applySettings(null);
    // first screen of the day: open the tab chosen in settings
    const st0 = loadSettings();
    setStartKey(st0);
    if (ctx.path === '/' && !location.hash && st0.startTab !== 'start') {
      let first = false; try { first = !sessionStorage.getItem('skStarted'); sessionStorage.setItem('skStarted', '1'); } catch (e) {}
      if (first) {
        if (st0.startTab === 'plan') history.replaceState({ sk: 1 }, '', '/#plan');
        else { location.replace(st0.startTab === 'grades' ? ctx.student + '/grades' : '/internal_messages'); return; }
      }
    }
    try { sessionStorage.setItem('skStarted', '1'); } catch (e) {}
    initNav();
    const page = route(ctx);
    mount(ctx, page);
  }

  // [name, test(doc, path)] – first match wins; also used to decide whether a page can be opened instantly
  const ROUTES = [
    ['home', (d, p) => p === '/'],
    ['printplan', d => d.querySelector('.print_plan .schedule table')],
    ['calevent', (d, p) => /^\/callendar_events\/\d+$/.test(p) && d.querySelector('.module h3')],
    ['studentslist', (d, p) => /\/students_list$/.test(p) && d.querySelector('ul.students, .students_list')],
    ['upload', (d, p) => /\/homework_attachments\/new(\.html)?$/.test(p) && d.querySelector('form input[type="file"]')],
    ['compose', (d, p) => /^\/internal_messages\/(new|\d+\/edit)$/.test(p) && d.querySelector('#new_message_form')],
    ['grades', d => d.querySelector('table.marks-table')],
    ['presences', (d, p) => d.querySelector('table.presences_table') || /\/presences$/.test(p) && d.querySelector('.module table')],
    ['messages', d => d.querySelector('table.message-table')],
    ['message', d => d.querySelector('#message #message-body')],
    ['homeworks', (d, p) => /homeworks$/.test(p) && d.querySelector('table.object_list-table')],
    ['announcement', (d, p) => /^\/subject_announcements\/\d+\/confirm$/.test(p) && d.querySelector('#content .module h2')],
    ['klass', (d, p) => /^\/klasses\/\d+$/.test(p) && d.querySelector('#subject-card')],
    ['person', (d, p) => /^\/(teachers|parents)\/\d+$/.test(p) && d.querySelector('#student-card')],
    ['room', (d, p) => /^\/rooms\/\d+$/.test(p) && d.querySelector('#content .schedule table')],
    ['subject', d => d.querySelector('#subject-card')],
    ['calendar', d => d.querySelector('#calendar[data-events-url]')],
    ['profile', d => d.querySelector('#student-card')],
    ['forums', d => d.querySelector('#content table.forum-table')],
    ['forumsearch', (d, p) => /^\/forum\/search$/.test(p) && d.querySelector('#content form')],
    ['thread', d => d.querySelector('#content table.thread-table')],
    ['docs', (d, p) => /^\/documents\/attachments$/.test(p) && d.querySelector('#content table.object_list-table')],
    ['docdetail', (d, p) => /^\/documents\/attachments\/\d+$/.test(p) && d.querySelector('#content .module p b')],
    ['files', (d, p) => /\/subject_attachment_connections$/.test(p) && d.querySelector('#content table')],
    ['hwdetail', (d, p) => /\/homeworks\/\d+$/.test(p) && d.querySelector('#content .module h3')],
    ['lesson', (d, p) => /\/lesson_instances\/\d+$/.test(p) && d.querySelector('#content .module h3')],
    ['topics', (d, p) => /lesson_instances$/.test(p) && d.querySelector('#content table')],
    ['subjects', (d, p) => d.querySelector('#content table.subjects-table') && !/lesson_instances/.test(p)],
    ['events', d => d.querySelector('#content .profile-event') && !d.querySelector('#content textarea, #content form input[type=text]') && !d.querySelector('#content table')],
    ['events', (d, p) => /\/students_(grades|presences)$/.test(p) && d.querySelector('#content .module h3') && !d.querySelector('#content table')],
    ['table', d => d.querySelector('#content table.object_list-table') && !d.querySelector('#content textarea, #content input[type=file], #content input[type=password]')]
  ];
  const BARE_KINDS = ['printplan', 'calevent', 'studentslist', 'upload'];
  function routeKind(d, p) { for (const [k, f] of ROUTES) if (f(d, p)) return k; return null; }
  function route(ctx) {
    const PAGES = { home: homePage, grades: gradesPage, presences: presencesPage, messages: messagesPage, message: messagePage,
      homeworks: homeworksPage, announcement: announcementPage, klass: klassPage, person: personPage, subject: subjectPage,
      calendar: calendarPage, profile: profilePage, forums: forumListPage, thread: threadPage, docs: docsPage, hwdetail: hwDetailPage,
      topics: topicsPage, subjects: subjectsListPage, events: eventsPage, printplan: printPlanPage, calevent: calEventPage,
      studentslist: studentsListPage, compose: composePage, room: roomPage, forumsearch: forumSearchPage, docdetail: docDetailPage,
      files: filesPage, lesson: lessonPage, table: tablePage, upload: uploadPage };
    const k = routeKind(document, ctx.path);
    return k ? PAGES[k](ctx) : null;
  }

  /* ------------------------------------------------------------------ *
   *  Instant navigation: fetch the next IDU page in the background and swap it in
   *  (no full reload → no white flash, much faster). Unknown pages still load normally.
   * ------------------------------------------------------------------ */
  const FULL_LOAD_AT = Date.now();
  const SOFT_RE = new RegExp([
    '^/$',
    '^/students/\\d+(/(grades|presences|homeworks|subject_announcements|reviews|lesson_plan))?$',
    '^/internal_messages(/(sent|drafts|trash|new|\\d+/watek))?$',
    '^/subjects(/\\d+(/(lesson_instances(/\\d+)?|homeworks(/\\d+)?|students_grades|students_presences|subject_attachment_connections|students_list|lesson_plan))?)?$',
    '^/(calendar|forums|informations|documents/attachments|forum/search|klasses|rooms|teachers)$',
    '^/forums/[\\w-]+(/topics/[\\w-]+)?$',
    '^/(informations|callendar_events|forum/posts|documents/attachments)/\\d+$',
    '^/(klasses|teachers|parents|rooms)/\\d+(/lesson_plan)?$',
    '^/subject_announcements/\\d+/confirm$'
  ].join('|'));
  // pages that change something just by opening them (mark as read) are never fetched ahead of time
  const NO_PREFETCH_RE = /\/watek$|^\/informations\/\d+$|\/confirm$|\/download$/;
  const prefetchMap = new Map();
  let cleanups = [];
  const onWin = (t, fn, o) => { window.addEventListener(t, fn, o); cleanups.push(() => window.removeEventListener(t, fn, o)); };
  const every = (fn, ms) => { const id = setInterval(fn, ms); cleanups.push(() => clearInterval(id)); };
  function runCleanups() { cleanups.forEach(f => { try { f(); } catch (e) {} }); cleanups = []; }
  function fetchPage(url, fresh) {
    const hit = prefetchMap.get(url);
    if (!fresh && hit && Date.now() - hit.t < 20000) return hit.p;
    const p = fetch(url, { credentials: 'same-origin', cache: fresh ? 'no-store' : 'default' })
      .then(async r => ({ ok: r.ok, url: r.url, type: r.headers.get('content-type') || '', html: await r.text() }));
    prefetchMap.set(url, { t: Date.now(), p });
    p.catch(() => prefetchMap.delete(url));
    return p;
  }
  const softable = u => u.origin === location.origin && SOFT_RE.test(u.pathname.replace(/\/+$/, '') || '/') && Date.now() - FULL_LOAD_AT < 25 * 60e3;
  function prefetch(href) {
    try { const u = new URL(href, location.href); if (softable(u) && !NO_PREFETCH_RE.test(u.pathname)) fetchPage(u.origin + u.pathname + u.search); } catch (e) {}
  }
  const shellApp = () => { const h = document.getElementById('sk-host'); return h && h.shadowRoot ? h.shadowRoot.getElementById('app') : null; };
  let curKey = location.pathname + location.search, navBusy = false, QUIET = false, HEAD_TEXT = '';
  // opts.quiet: refresh in place (no page-leave animation, keeps what you see until the new data is ready)
  async function softGo(href, push, opts) {
    opts = opts || {};
    const u = new URL(href, location.href);
    if (!softable(u)) { location.href = u.href; return false; }
    if (navBusy) return null;
    navBusy = true;
    saveSnapshot();
    const app = shellApp();
    if (app && !opts.quiet) app.classList.add('leaving', 'loading');
    const y = window.scrollY;
    let pg = null;
    try { pg = await fetchPage(u.origin + u.pathname + u.search, opts.quiet); } catch (e) {}
    navBusy = false;
    if (!pg && opts.quiet) return false;                 // offline – keep the current screen
    const fin = pg ? new URL(pg.url) : u;
    const finPath = fin.pathname.replace(/\/+$/, '') || '/';
    const doc = pg && pg.ok && /html/.test(pg.type) ? new DOMParser().parseFromString(pg.html, 'text/html') : null;
    const kind = doc ? routeKind(doc, finPath) : null;
    const logged = doc && (doc.querySelector('#account a') || (BARE_KINDS.includes(kind) && !doc.querySelector('input[type="password"]')));
    if (!logged || !kind) { location.href = (pg ? pg.url : u.href) + (pg ? u.hash : ''); return true; }
    prefetchMap.clear();
    runCleanups();
    document.title = doc.title;
    HEAD_TEXT = Array.from(doc.querySelectorAll('head script')).map(s => s.textContent).join('\n');
    const tok = doc.querySelector('meta[name="csrf-token"]'), cur = $('meta[name="csrf-token"]');
    if (tok && cur) cur.setAttribute('content', tok.getAttribute('content'));
    document.body.replaceChildren(...Array.from(doc.body.childNodes).map(n => document.adoptNode(n)));
    document.documentElement.classList.remove('sk-full', 'sk-fb');
    const url = fin.pathname + fin.search + u.hash;
    if (push) history.pushState({ sk: 1 }, '', url); else if (location.pathname + location.search !== fin.pathname + fin.search) history.replaceState({ sk: 1 }, '', url);
    curKey = location.pathname + location.search;
    QUIET = !!opts.quiet;
    window.scrollTo(0, 0);
    main();
    if (opts.keepScroll) window.scrollTo(0, y);
    return true;
  }
  // pull-to-refresh / back from the background: reload the data of this screen without a white flash
  async function refreshPage(opts) {
    const u = new URL(location.href);
    if (!softable(u)) { location.reload(); return; }
    const ok = await softGo(location.href, false, Object.assign({ quiet: true }, opts || {}));
    const app = shellApp();
    if (app) app.querySelectorAll('.ptr').forEach(p => p.remove());
    if (ok === false && app) toast(app.getRootNode(), 'Brak połączenia z IDU', 'bad');
  }
  // nothing typed and no sheet open → safe to refresh by itself
  function canAutoRefresh() {
    const app = shellApp(); if (!app) return false;
    if (app.querySelector('.sheet') || app.classList.contains('open')) return false;
    return !Array.from(app.querySelectorAll('textarea, input:not([type=checkbox]):not([type=file])')).some(i => i.value && i.value.trim());
  }

  /* ---- instant start: the app shows the last picture of a screen before IDU even answers ---- */
  const snapKey = () => { const p = location.pathname.replace(/\/+$/, '') || '/'; return p === '/' ? '/' + (location.hash || '#start') : p; };
  function saveSnapshot() {
    try {
      const app = shellApp();
      if (!app || !document.documentElement.classList.contains('sk-full')) return;
      const c = app.cloneNode(true);
      c.classList.remove('open', 'leaving', 'loading');
      c.classList.add('still');
      c.querySelectorAll('.sheet,.sheet-scrim,.ptr,.toast,.sugg').forEach(e => e.remove());
      const dr = c.querySelector('.drawer'); if (dr) dr.innerHTML = '';
      c.querySelectorAll('.anim').forEach(e => { e.classList.remove('anim'); e.style.animationDelay = ''; });
      c.querySelectorAll('[style*="opacity"], [style*="transform"]').forEach(e => { e.style.opacity = ''; e.style.transform = ''; });
      const h = '<style>*{animation:none!important;transition:none!important}</style>' + c.outerHTML;
      if (h.length > 300000) return;
      let map = {}; try { map = JSON.parse(localStorage.getItem('skSnap') || '{}'); } catch (e) {}
      map[snapKey()] = { t: Date.now(), h };
      Object.keys(map).sort((a, b) => map[b].t - map[a].t).slice(8).forEach(k => delete map[k]);
      try { localStorage.setItem('skSnap', JSON.stringify(map)); }
      catch (e) { localStorage.setItem('skSnap', JSON.stringify({ [snapKey()]: map[snapKey()] })); }
      if (localStorage.getItem('skSnapCss') !== APP_CSS) localStorage.setItem('skSnapCss', APP_CSS);
    } catch (e) {}
  }
  let snapTimer = 0;
  const saveSnapshotSoon = () => { clearTimeout(snapTimer); snapTimer = setTimeout(saveSnapshot, 1500); };

  let navInit = false, hiddenAt = 0;
  function initNav() {
    if (navInit) return; navInit = true;
    try { history.replaceState({ sk: 1 }, '', location.href); } catch (e) {}
    window.addEventListener('popstate', () => {
      const k = location.pathname + location.search;
      if (k === curKey) return;            // only the #hash changed – the page handles it
      softGo(location.href, false);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { hiddenAt = Date.now(); saveSnapshot(); return; }
      if (hiddenAt && Date.now() - hiddenAt > 4 * 60e3 && canAutoRefresh()) refreshPage({ keepScroll: true });
      hiddenAt = 0;
    });
    window.addEventListener('pagehide', saveSnapshot);
  }

  /* ------------------------------------------------------------------ *
   *  Shell: top bar, bottom nav, drawer
   * ------------------------------------------------------------------ */
  // the app's stylesheet is parsed once and shared by every screen
  let SHEET_OBJ = null;
  function appStyles(root) {
    try {
      if (!SHEET_OBJ && 'adoptedStyleSheets' in Document.prototype && 'replaceSync' in CSSStyleSheet.prototype) { const sh = new CSSStyleSheet(); sh.replaceSync(APP_CSS + V5_CSS); SHEET_OBJ = sh; }
      if (SHEET_OBJ) { root.adoptedStyleSheets = [SHEET_OBJ]; return ''; }
    } catch (e) { SHEET_OBJ = null; }
    return `<style>${APP_CSS + V5_CSS}</style>`;
  }

  function mount(ctx, page) {
    const fallback = !page;
    const crumbs = txt($('#breadcrumbs')).replace(/^Jesteś tutaj:\s*/, '').split('>').map(s => s.trim()).filter(Boolean);
    const title = page ? page.title : (crumbs[crumbs.length - 1] || document.title.replace(/^IDU - /, '').split(' - ')[0]);
    const tab = page ? page.tab : '';
    const isTop = page && page.top;

    const host = document.createElement('div');
    host.id = 'sk-host';
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: 'open' });
    watchTranslate(root);

    root.innerHTML = `${appStyles(root)}
      <div class="app" id="app">
        <header class="top">
          ${isTop ? `<button class="btn" id="menu" aria-label="Menu">${I('menu')}</button>`
                  : `<button class="btn" id="back" aria-label="Wstecz">${I('back')}</button>`}
          <div class="title" id="title">${esc(title)}</div>
          <button class="btn" id="favbtn" hidden aria-label="Ważne">${I('star')}</button>
          ${isTop ? '' : `<button class="btn" id="menu" aria-label="Menu">${I('menu')}</button>`}
        </header>
        ${fallback ? '' : `<main id="main"></main>`}
        ${navHTML(ctx, tab)}
        <div class="scrim" id="scrim"></div>
        <aside class="drawer">${drawerHTML(ctx)}</aside>
      </div>`;

    const app = root.getElementById('app');
    applySettings(app);
    const toggle = open => { if (open !== app.classList.contains('open')) haptic('soft'); app.classList.toggle('open', open); };
    // little vibrations for switches, tabs and filters
    root.addEventListener('click', e => {
      const t = e.target.closest && e.target.closest('.nav a, .seg button, .seg a, .fchips button, .days button, .swatches button, .themes button, .iconbtn, .today-btn, summary, .tok button, .sugg button');
      if (t) haptic(t.matches('summary') ? 'soft' : 'selection');
    }, true);
    CUR.ctx = ctx; CUR.tab = tab;
    wireNav(root);
    onWin('resize', () => moveInd(root));
    root.getElementById('settings').onclick = e => { e.preventDefault(); toggle(false); openSettings(root, app); };
    root.getElementById('people').onclick = e => { e.preventDefault(); toggle(false); openPeople(root); };
    if (tab === 'grades') store.set('skNewGrades', '0');
    root.getElementById('menu').onclick = () => toggle(true);
    root.getElementById('scrim').onclick = () => toggle(false);
    const back = root.getElementById('back');
    if (back) back.onclick = () => { if (history.length > 1) history.back(); else softGo('/', true); };
    root.getElementById('classic').onclick = e => { e.preventDefault(); store.set('skClassic', '1'); location.reload(); };
    if (ctx.timer) {
      const t = root.getElementById('timer');
      const upd = () => { t.textContent = L('Wylogowanie za ', 'Logout in ') + txt(ctx.timer); };
      upd();
      const mo = new MutationObserver(upd); mo.observe(ctx.timer, { childList: true, characterData: true, subtree: true });
      cleanups.push(() => mo.disconnect());
    }

    // links: IDU pages open instantly, files download without leaving the screen
    root.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || /^(javascript|mailto|tel):/i.test(href)) return;
      const u = new URL(href, location.href);
      if (u.origin !== location.origin) return;
      if (/\/download$/.test(u.pathname)) { e.preventDefault(); haptic('light'); toast(root, 'Otwieram plik…'); location.href = u.href; return; }
      if (/^\/users\/sign_out/.test(u.pathname)) { try { localStorage.removeItem('skSnap'); } catch (err) {} return; }
      if (a.target === '_blank') return;
      if (u.pathname === location.pathname && u.search === location.search && u.hash) return; // same page (#plan)
      e.preventDefault();
      if (softable(u)) { softGo(u.href, true); return; }
      saveSnapshot();
      app.classList.add('leaving');
      setTimeout(() => { location.href = u.href; }, 140);
    });
    // start loading a page the moment a finger touches its link
    root.addEventListener('touchstart', e => { const a = e.target.closest && e.target.closest('a[href]'); if (a && !a.getAttribute('href').startsWith('#')) prefetch(a.getAttribute('href')); }, { passive: true });
    root.addEventListener('mouseover', e => { const a = e.target.closest && e.target.closest('a[href]'); if (a && !a.getAttribute('href').startsWith('#')) prefetch(a.getAttribute('href')); }, { passive: true });
    onWin('pageshow', ev => { if (ev.persisted) { app.classList.remove('leaving', 'loading'); const m = root.getElementById('main'); if (m) { m.style.transform = ''; m.style.opacity = ''; } } });

    // swipe from the left edge: back on inner pages, opens the menu on main tabs (and on the first screen)
    (() => {
      const drawer = root.querySelector('.drawer'), scrim = root.getElementById('scrim');
      let x0 = null, y0 = null, dx = 0, active = false, mode = '', past = false;
      const target = () => root.getElementById('main') || document.querySelector('#content') || document.body;
      const W = () => drawer.getBoundingClientRect().width || 300;
      onWin('touchstart', e => {
        const t = e.touches[0]; x0 = null;
        if (e.touches.length !== 1 || root.querySelector('.sheet')) return;
        if (app.classList.contains('open')) { mode = 'close'; x0 = t.clientX; y0 = t.clientY; dx = 0; active = false; past = false; return; }
        if (t.clientX > 28) return;
        mode = isTop || history.length <= 1 ? 'menu' : 'back';
        x0 = t.clientX; y0 = t.clientY; dx = 0; active = false; past = false;
      }, { passive: true });
      onWin('touchmove', e => {
        if (x0 == null) return;
        const t = e.touches[0]; dx = t.clientX - x0;
        if (!active && Math.abs(t.clientY - y0) > 30 && Math.abs(t.clientY - y0) > Math.abs(dx)) { x0 = null; return; }
        if (Math.abs(dx) > 10) active = true;
        if (!active) return;
        const over = mode === 'back' ? dx > 90 : mode === 'menu' ? dx > 70 : dx < -70;
        if (over !== past) { past = over; if (over) haptic('light'); }
        if (mode === 'back') { const el = target(); el.style.transition = 'none'; el.style.transform = `translateX(${Math.max(0, dx) * 0.6}px)`; el.style.opacity = String(1 - Math.min(Math.max(dx, 0), 300) / 600); }
        else {
          const w = W(); const pos = mode === 'menu' ? Math.min(0, -w + Math.max(0, dx)) : Math.min(0, Math.max(-w, dx));
          drawer.style.transition = 'none'; drawer.style.transform = `translateX(${pos}px)`;
          scrim.style.transition = 'none'; scrim.style.pointerEvents = 'none'; scrim.style.opacity = String(1 + pos / w);
        }
      }, { passive: true });
      onWin('touchend', () => {
        if (x0 == null) return; x0 = null;
        if (mode === 'back') {
          const el = target(); el.style.transition = 'transform .2s ease, opacity .2s ease';
          if (active && dx > 90) {
            el.style.transform = 'translateX(60%)'; el.style.opacity = '0';
            setTimeout(() => { if (history.length > 1) history.back(); else softGo('/', true); }, 150);
            setTimeout(() => { el.style.transform = ''; el.style.opacity = ''; }, 1500);
          } else { el.style.transform = ''; el.style.opacity = ''; }
        } else if (active) {
          const open = mode === 'menu' ? dx > 70 : dx > -70;
          drawer.style.transition = ''; drawer.style.transform = ''; scrim.style.transition = ''; scrim.style.opacity = ''; scrim.style.pointerEvents = '';
          app.classList.toggle('open', open);
        }
        active = false;
      });
    })();

    // pull down at the top of a screen to refresh it (in place, no white flash)
    (() => {
      const ind = document.createElement('div'); ind.className = 'ptr'; ind.innerHTML = I('refresh');
      app.appendChild(ind);
      const TH = 78;
      let y0 = null, x0 = 0, pull = 0, armed = false, busy = false;
      const reset = () => { ind.classList.add('back'); ind.classList.remove('armed'); ind.style.opacity = '0'; ind.style.transform = ''; setTimeout(() => ind.classList.remove('back'), 260); };
      onWin('touchstart', e => {
        y0 = null;
        if (busy || e.touches.length !== 1 || window.scrollY > 2 || root.querySelector('.sheet') || app.classList.contains('open')) return;
        if (e.touches[0].clientX <= 28) return;                    // edge swipe has priority
        y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; pull = 0; armed = false;
      }, { passive: true });
      onWin('touchmove', e => {
        if (y0 == null) return;
        const t = e.touches[0]; pull = t.clientY - y0;
        if (Math.abs(t.clientX - x0) > 14 && Math.abs(t.clientX - x0) > Math.abs(pull)) { y0 = null; reset(); return; }
        if (pull <= 0 || window.scrollY > 4) { if (armed || ind.style.opacity) reset(); armed = false; return; }
        const p = Math.min(1, pull / TH);
        ind.style.opacity = String(Math.min(1, p * 1.3));
        ind.style.transform = `translate(-50%, ${Math.min(pull, 130) * 0.42}px) scale(${0.5 + 0.5 * p}) rotate(${pull * 2.6}deg)`;
        if (pull >= TH && !armed) { armed = true; ind.classList.add('armed'); haptic('medium'); }
        else if (pull < TH && armed) { armed = false; ind.classList.remove('armed'); }
      }, { passive: true });
      onWin('touchend', () => {
        if (y0 == null) return; y0 = null;
        if (!armed) { reset(); return; }
        busy = true; ind.classList.remove('armed'); ind.style.transform = ''; ind.classList.add('spin');
        refreshPage().then(() => { busy = false; if (ind.isConnected) { ind.classList.remove('spin'); reset(); } });
      });
    })();

    if (fallback) {
      document.documentElement.classList.add('sk-fb');
      improveFallback();
      return;
    }

    // after a quiet refresh or an instant-start picture the content is already on screen → no entrance animation
    const hadSnap = !!document.getElementById('sk-snap');
    let skipAnim = hadSnap || QUIET;
    const mainEl = root.getElementById('main');
    document.documentElement.classList.add('sk-full');
    page.render(mainEl, root, { setTitle: s => { root.getElementById('title').textContent = s; }, setTab: k => {
      CUR.tab = k; root.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.dataset.tab === k)); moveInd(root);
    }, animate: () => { if (!skipAnim) animateIn(mainEl); }, ctx });
    wireLongPress(root, mainEl);
    wireFavButton(root, mainEl);
    if (skipAnim) app.classList.add('still');      // same content as a moment ago → no pop-in effects
    else animateIn(mainEl);
    QUIET = false;
    skipAnim = false;
    saveSnapshotSoon();
  }

  function drawerHTML(ctx) {
    const item = (href, ic, label, extra = '') => `<a class="dl" href="${esc(href)}">${I(ic)}<span>${label}</span>${extra}</a>`;
    return `
      <a class="who" href="${esc(ctx.student)}">${meAvatar()}
        <div><b>${esc(ctx.name)}</b><span id="timer"></span></div></a>
      ${item('/#start', 'home', 'Start')}
      ${item(ctx.student + '/grades', 'grades', 'Oceny')}
      ${item('/#plan', 'calendar', 'Plan lekcji')}
      ${item(ctx.student + '/homeworks', 'edit', 'Zadania domowe')}
      ${item(ctx.student + '/presences', 'pres', 'Frekwencja')}
      ${item('/internal_messages', 'mail', 'Wiadomości', ctx.unread ? `<span class="cnt">${ctx.unread}</span>` : '')}
      <div class="dsep"></div>
      ${item('/#przedmioty', 'book', 'Przedmioty')}
      ${item(ctx.student + '/subject_announcements', 'bell', 'Ogłoszenia')}
      ${item('/informations', 'news', 'Aktualności')}
      ${item('/calendar', 'clock', 'Kalendarz')}
      ${item('/forums', 'chat', 'Forum')}
      ${item('/documents/attachments', 'file', 'Dokumenty')}
      <a class="dl" href="#" id="people">${I('search')}<span>Szukaj osób</span></a>
      <div class="dsep"></div>
      <a class="dl" href="#" id="settings">${I('settings')}<span>Ustawienia</span></a>
      <a class="dl" href="#" id="classic">${I('monitor')}<span>Klasyczny widok IDU</span></a>
      ${'<a class="dl danger" href="/users/sign_out">' + I('logout') + '<span>Wyloguj</span></a>'}`;
  }

  function mountClassicSwitch() {
    const host = document.createElement('div');
    host.id = 'sk-host';
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      button{position:fixed;right:14px;bottom:14px;z-index:2147483647;border:0;border-radius:22px;padding:10px 16px;
      background:#1e88e5;color:#fff;font:700 15px -apple-system,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35)}</style>
      <button>${L('Nowy wygląd', 'New look')}</button>`;
    root.querySelector('button').onclick = () => { store.set('skClassic', '0'); location.reload(); };
  }

  /* ------------------------------------------------------------------ *
   *  Shared bits
   * ------------------------------------------------------------------ */
  const moduleBy = (title, scope = document) => $$('.module', scope).find(m => cleanTitle(txt($('h3', m))).startsWith(title));
  const seeMore = m => m ? attr($('.see-more a', m), 'href') : '';

  function gradeNotes() {
    const map = {};
    $$('div[id^="description_for_grade_"]').forEach(d => { map['#' + d.id] = d.innerHTML; });
    return map;
  }
  // Short display for a grade value; long text grades become a comment icon
  const gradeShort = v => (v && v.length <= 6) ? esc(v) : I('chat');

  function parseSchedule(table) {
    const days = {};
    if (!table) return days;
    $$('tr', table).forEach(tr => {
      const cells = $$(':scope > td', tr);
      if (cells.length < 2) return;
      const m = txt(cells[0]).match(/\((\d+)\)\s*(\d{1,2}:\d{2})(?:\s*-\s*(\d{1,2}:\d{2}))?/);
      if (!m) return;
      const nr = +m[1], startT = m[2];
      const endT = m[3] || (() => { const x = mins(startT) + 40; return Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0'); })();
      cells.slice(1).forEach((td, i) => {
        const a = $('.subject a', td);
        if (!a) return;
        (days[i + 1] = days[i + 1] || []).push({
          nr, start: startT, end: endT, raw: txt(a), name: prettySubj(txt(a)), href: attr(a, 'href'),
          sid: (attr(a, 'href').match(/\/subjects\/(\d+)/) || [])[1] || '',
          room: txt($('.location > a[href^="/rooms"]', td)) || txt($('.location', td)).split(' ')[0] || '',
          roomHref: attr($('.location > a[href^="/rooms"]', td), 'href'),
          teacher: $$('.lesson-cell > a[href^="/teachers"], .teacher a', td).map(txt).join(', ') || attr($('.subject', td), 'title').replace(/^prowadzący:\s*/i, ''),
          klass: txt($('.klass', td)).replace(/^Klasa:\s*/i, '').replace(/\s*\([^()]*\(\d+\)\)\s*$/, ''),
          note: $$('.lesson-cell > div', td).map(txt).filter(Boolean).join(' · '),
          links: $$('.location a', td).filter(x => $('img', x) && attr(x, 'href')).map(x => ({ t: attr($('img', x), 'alt').replace(/^link do\s*/i, ''), h: attr(x, 'href') }))
        });
      });
    });
    return days;
  }

  /* ------------------------------------------------------------------ *
   *  HOME  (Start feed, Plan, Przedmioty)
   * ------------------------------------------------------------------ */
  function homePage(ctx) {
    const plan = parseSchedule($('.schedule table'));
    const notes = gradeNotes();
    const firstName = ctx.name.split(' ')[0];

    // subjects + their quick links
    const subjMod = moduleBy('Twoja klasa i przedmioty');
    const subjects = [];
    const subjById = {};
    if (subjMod) {
      $$('b > a[href^="/subjects/"]', subjMod).forEach(a => {
        const links = [];
        let n = a.parentElement.nextSibling;
        while (n && n.nodeName !== 'BR' && !(n.nodeName === 'B')) {
          if (n.nodeName === 'A') links.push({ t: txt(n), h: attr(n, 'href') });
          n = n.nextSibling;
        }
        const s = { name: attr(a, 'title') || txt(a), href: attr(a, 'href'), links };
        subjects.push(s);
        subjById[s.href.split('/')[2]] = s.name;
      });
    }
    const klass = subjMod ? $('a[href^="/klasses/"]', subjMod) : null;
    const klassForum = subjMod ? $('a[href^="/forums"]', subjMod) : null;
    let teachers = {}; try { teachers = JSON.parse(store.get('skTeachers') || '{}'); } catch (e) {}
    const teacherFor = l => { const t = l.teacher || teachers[l.sid] || ''; return t.length > 38 ? t.split(',')[0] + ' i in.' : t; };
    async function refreshTeachers(after) {
      if (teachers._t && Date.now() - teachers._t < 3 * 864e5) return;
      try {
        const d = new DOMParser().parseFromString(await (await fetch('/subjects', { credentials: 'same-origin' })).text(), 'text/html');
        const map = { _t: Date.now() };
        $$('table.subjects-table tr', d).forEach(tr => {
          const tds = $$(':scope > td', tr); const a = $('a[href^="/subjects/"]', tr);
          if (tds.length >= 2 && a) map[(attr(a, 'href').match(/\/subjects\/(\d+)/) || [])[1]] = txt(tds[1]);
        });
        teachers = map; store.set('skTeachers', JSON.stringify(map)); if (after) after();
      } catch (e) {}
    }

    // feed sources
    const feed = [];
    const gm = moduleBy('Oceny');
    if (gm) $$('.profile-event.mark', gm).forEach(e => {
      const link = $('.name a', e);
      const date = parseDate(txt($('.date', e)));
      feed.push({ kind: 'grade', date, subject: txt($('.subject', e)), value: txt($('.name', e)),
        desc: txt($('.description', e)).replace(/^\(|\)$/g, ''), isNew: e.classList.contains('unseen'),
        note: link ? notes[attr(link, 'href')] : '' });
    });
    const hm = moduleBy('Ostatnie zadania domowe');
    if (hm) $$('.profile-event', hm).forEach(e => {
      const a = $('.name a', e);
      const dates = $$('.date', e).map(txt);
      const sid = (attr(a, 'href').match(/\/subjects\/(\d+)/) || [])[1];
      feed.push({ kind: 'hw', date: parseDate(dates[0]), title: txt($('.name', e)), href: attr(a, 'href'),
        due: (dates[1] || '').replace(/aktywne do:?/i, '').trim(), subject: subjById[sid] || '' });
    });
    const pm = moduleBy('Obecności');
    if (pm) {
      const groups = [];
      $$('.profile-event', pm).forEach(e => {
        const ok = e.classList.contains('presence');
        const late = /spóźn/i.test(txt($('.name', e)));
        const g = { subject: txt($('.subject', e)), ok, late, status: txt($('.name', e)), dateS: txt($('.date', e)) };
        const last = groups[groups.length - 1];
        if (last && last.subject === g.subject && last.dateS === g.dateS && last.status === g.status) last.n++;
        else groups.push(Object.assign(g, { n: 1 }));
      });
      groups.forEach(g => {
        const d = parseDate(g.dateS);
        if (d) d.setHours(12);
        feed.push(Object.assign({ kind: 'pres', date: d }, g));
      });
    }
    const am = moduleBy('Ogłoszenia przedmiotowe');
    const pendingAnn = [];
    if (am) $$('.profile-event', am).forEach(e => {
      const item = { kind: 'ann', date: parseDate(txt($('.date', e))), subject: txt($('.subject', e)), title: txt($('.name', e)),
        href: attr($('.name a', e), 'href'), unread: !e.classList.contains('read') };
      feed.push(item);
      if (item.unread) pendingAnn.push(item);
    });
    const nm = moduleBy('Aktualności');
    if (nm) $$('.profile-event', nm).forEach(e => {
      feed.push({ kind: 'news', date: parseDate(txt($('.date', e))), title: txt($('.name', e)),
        href: attr($('.name a', e), 'href'), unread: !e.classList.contains('read') });
    });
    feed.sort((a, b) => (b.date || 0) - (a.date || 0));
    store.set('skNewGrades', String(feed.filter(f => f.kind === 'grade' && f.isNew).length));
    const nowD = new Date();
    const dueSoon = feed.filter(f => f.kind === 'hw').map(f => Object.assign({ dueD: parseDate(f.due) }, f))
      .filter(f => f.dueD && f.dueD > nowD && f.dueD - nowD < 48 * 3600e3).sort((a, b) => a.dueD - b.dueD);
    let feedFilter = 'all';

    const events = [];
    const em = moduleBy('Najbliższe wydarzenia');
    if (em) $$('.profile-event', em).forEach(e => {
      events.push({ title: txt($('.name', e)), date: parseDate(txt($('.date', e))), dateS: txt($('.date', e)),
        href: attr($$('a', e).pop(), 'href').replace('?layout=none', '') });
    });

    /* ---------- renderers ---------- */
    const today = new Date().getDay();
    const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
    function nextDayWithLessons(from) {
      for (let i = 1; i <= 7; i++) { const d = (from + i) % 7; if (plan[d] && plan[d].length) return d; }
      return from;
    }
    function nowNextCard() {
      const ls = plan[today] || [];
      const n = nowMin();
      const cur = ls.find(l => n >= mins(l.start) && n <= mins(l.end));
      const nxt = ls.find(l => mins(l.start) > n);
      let label, l, extra = '', prog = null, after = null;
      if (cur) {
        l = cur; const left = mins(cur.end) - n;
        let more = 0; for (const x of ls) if (mins(x.start) >= mins(cur.end) && x.raw === cur.raw && x.nr === cur.nr + more + 1) more++;
        label = L(`Teraz · zostało ${left} min${more ? ' (+' + more + ' lekcja)' : ''}`, `Now · ${left} min left${more ? ' (+' + more + ' lesson)' : ''}`); extra = `${cur.start} – ${cur.end}`;
        prog = Math.min(100, Math.max(0, 100 * (n - mins(cur.start)) / (mins(cur.end) - mins(cur.start))));
        after = ls.find(x => mins(x.start) >= mins(cur.end) && x.nr > cur.nr + more);
      } else if (nxt) {
        l = nxt; const inMin = mins(nxt.start) - n;
        const started = ls.some(x => mins(x.end) <= n);
        label = started ? L(`Przerwa · lekcja za ${inMin} min`, `Break · lesson in ${inMin} min`) : inMin <= 90 ? L(`Pierwsza lekcja za ${inMin} min`, `First lesson in ${inMin} min`) : L('Pierwsza lekcja', 'First lesson');
        extra = `${nxt.start} – ${nxt.end}`;
      } else {
        const d = nextDayWithLessons(today);
        if (!plan[d]) return '<div id="nowcard"></div>';
        l = plan[d][0]; label = EN ? 'First lesson ' + (d === (today + 1) % 7 ? 'tomorrow' : 'on ' + DAY_FULL[d]) : (d === (today + 1) % 7 ? 'Jutro' : DAY_FULL[d]) + ' na start'; extra = `${l.start} – ${l.end}`;
      }
      const c = subjColor(l.raw); const t = teacherFor(l);
      return `<div id="nowcard"><a class="card now tap" href="#plan" style="--c:${c}"><div class="bar"></div><div class="in" style="display:block">
        <div class="row"><div class="grow"><div class="lbl">${esc(label)}</div><div class="b clip" style="font-size:19px">${esc(l.name)}</div>
        <div class="muted small clip">${esc(extra)}${t ? ' · ' + esc(t) : ''}</div></div>
        ${l.room ? `<div class="room" title="${esc(l.room)}">${esc(shortRoom(l.room))}</div>` : ''}</div>
        ${l.note ? `<div class="pill warn" style="margin-top:8px">${I('exam', 'xs')} ${esc(l.note)}</div>` : ''}
        ${prog != null ? `<div class="prog"><i style="width:${prog.toFixed(1)}%"></i></div>` : ''}
        ${after ? `<div class="muted small" style="margin-top:8px">${L('Potem', 'Then')}: <b style="color:var(--text)">${esc(after.name)}</b> · ${esc(after.start)}${after.room ? L(' · sala ', ' · room ') + esc(after.room) : ''}</div>` : ''}
      </div></a></div>`;
    }
    function feedItem(it) {
      const when = relTime(it.date);
      const head = (icon, label) => `<div class="hd"><b>${label}</b><span class="t">· ${esc(when)}</span></div>`;
      const strip = (subj, right = '') => `<div class="strip" style="--c:${subjColor(subj)}"><span>${esc(prettySubj(subj))}</span>${right ? `<span>${right}</span>` : ''}</div>`;
      switch (it.kind) {
        case 'grade': {
          const c = subjColor(it.subject);
          const box = `<div class="gbox" style="--c:${c}"><div class="v">${gradeShort(it.value)}</div>
            <div class="meta"><b>${esc(shortDate(it.date))} · ${esc(prettySubj(it.subject))}</b><span class="two">${esc(it.desc || it.value)}</span></div>
            ${it.note ? I('down', 'sm') : ''}</div>`;
          return `<div class="fi"><div class="dot" style="color:${c}">${I('star')}</div><div class="body">
            ${head('star', 'Dodano ocenę')}${it.isNew ? '' : ''}
            ${it.note ? `<details><summary>${box}</summary><div class="note">${it.note}</div></details>` : box}</div></div>`;
        }
        case 'hw': {
          const due = parseDate(it.due);
          return `<div class="fi"><div class="dot">${I('edit')}</div><div class="body">${head('edit', 'Zadanie domowe')}
            <a class="box tap" href="${esc(it.href)}"><div class="in"><div class="ttl">${esc(it.title)}</div></div>
            ${strip(it.subject || L('Zadanie', 'Homework'), due ? L('Termin: ', 'Due: ') + esc(shortDate(due) + ', ' + hhmm(due)) : L('bez terminu', 'no deadline'))}</a></div></div>`;
        }
        case 'pres': {
          const code = it.ok ? ST.ob : it.late ? ST.sp : ST.nb;
          return `<div class="fi"><div class="dot">${I('pres')}</div><div class="body">${head('pres', 'Frekwencja')}
            <div class="box"><div class="in row"><div class="letter" style="--c:${it.ok ? 'var(--good)' : it.late ? 'var(--warn)' : 'var(--bad)'}">${code}</div>
            <div class="grow"><div class="ttl">${esc(it.status)}${it.n > 1 ? ' ×' + it.n : ''}</div><div class="sub">${esc(it.dateS)}</div></div></div>
            ${strip(it.subject)}</div></div></div>`;
        }
        case 'ann':
          return `<div class="fi"><div class="dot">${I('bell')}</div><div class="body">${head('bell', 'Ogłoszenie')}
            <a class="box tap" href="${esc(it.href)}"><div class="in"><div class="ttl">${esc(it.title)} ${it.unread ? '<span class="pill new">NOWE</span>' : ''}</div></div>
            ${strip(it.subject)}</a></div></div>`;
        case 'news':
          return `<div class="fi"><div class="dot">${I('news')}</div><div class="body">${head('news', 'Aktualność')}
            <a class="box tap" href="${esc(it.href)}"><div class="in"><div class="ttl">${esc(it.title)} ${it.unread ? '<span class="pill new">NOWE</span>' : ''}</div>
            <div class="sub">${esc(shortDate(it.date))}${it.date && (it.date.getHours() || it.date.getMinutes()) ? ', ' + hhmm(it.date) : ''}</div></div></a></div></div>`;
      }
      return '';
    }

    const feedKinds = () => [['all', 'Wszystko'], ['grade', 'Oceny'], ['hw', 'Zadania'], ['pres', 'Frekwencja'], ['ann', 'Ogłoszenia'], ['news', 'Aktualności']];
    function feedHTML() {
      const list = feedFilter === 'all' ? feed : feed.filter(f => f.kind === feedFilter);
      return list.length ? list.map(feedItem).join('') : '<div class="nores">Nic tutaj</div>';
    }
    // upcoming tests + days off from the calendar: shown at once from the last visit, refreshed in the background
    let exams = null, freeDays = [], examsFresh = false;
    try { const c = JSON.parse(store.get('skExams2') || 'null'); if (c && Date.now() - c.t < 3 * 864e5) { exams = c.list; freeDays = c.free || []; examsFresh = Date.now() - c.t < 15 * 60e3; } } catch (e) {}
    const ymdS = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    async function loadExams(after) {
      if (examsFresh) return;
      try {
        const s0 = new Date(); s0.setHours(0, 0, 0, 0); const e0 = new Date(s0); e0.setDate(e0.getDate() + 35);
        const list = await (await fetch(`/calendar_events.json?start_at=${Math.floor(s0 / 1000)}&stop_at=${Math.floor(e0 / 1000)}`, { credentials: 'same-origin' })).json();
        const ex = list.filter(x => /grade_event/.test(x.className || '')).map(x => ({ title: x.title, start: x.start, url: (x.url || '').replace(/^https?:\/\/[^/]+/, '') }));
        const fr = list.filter(x => /free/.test(x.className || '')).map(x => {
          const a = String(x.start).slice(0, 10); let b = a;
          if (x.end) { const m = String(x.end).match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) { const d = new Date(+m[1], m[2] - 1, +m[3]); if (x.allDay !== false) d.setDate(d.getDate() - 1); b = ymdS(d) < a ? a : ymdS(d); } }
          return { from: a, to: b, title: x.title };
        });
        const changed = JSON.stringify(ex) !== JSON.stringify(exams) || JSON.stringify(fr) !== JSON.stringify(freeDays);
        exams = ex; freeDays = fr; examsFresh = true;
        store.set('skExams2', JSON.stringify({ t: Date.now(), list: exams, free: freeDays }));
        if (after && changed) after();
      } catch (e) { if (!exams) exams = []; }
    }
    function examsHTML() {
      if (!exams || !exams.length) return '';
      const t0 = dayStart(new Date());
      const list = exams.map(x => { const m = String(x.start).match(/(\d{4})-(\d{2})-(\d{2})/); return Object.assign({ d: m ? new Date(+m[1], m[2] - 1, +m[3]) : null }, x); })
        .filter(x => x.d && x.d >= t0).sort((a, b) => a.d - b.d).slice(0, 6);
      if (!list.length) return '';
      return `<div class="sec"><h2>Sprawdziany</h2><a href="/calendar">Kalendarz</a></div>` + list.map(x => {
        const subj = (x.title.match(/\(([^()]+)\)\s*$/) || [])[1] || '';
        const days = Math.round((x.d - t0) / 864e5);
        return `<a class="card row tap" href="${esc(x.url || '/calendar')}" style="--c:${subjColor(subj)}">
          <div class="datebox" style="background:color-mix(in srgb,var(--c) 22%,var(--card2))"><b>${x.d.getDate()}</b><span>${MONTH_SHORT[x.d.getMonth()]}</span></div>
          <div class="grow"><div class="b clip">${esc(x.title.replace(/\s*\([^()]+\)\s*$/, ''))}</div><div class="muted small">${esc(prettySubj(subj))}</div></div>
          <span class="pill ${days <= 2 ? 'bad' : days <= 6 ? 'warn' : ''}">${days === 0 ? TODAY : days === 1 ? TOMORROW : inDays(days)}</span></a>`;
      }).join('');
    }

    function nextInfo() {
      const ls = plan[today] || [], n = nowMin();
      const cur = ls.find(l => n >= mins(l.start) && n <= mins(l.end)); if (cur) return { l: cur, when: L('Teraz', 'Now') };
      const nx = ls.find(l => mins(l.start) > n); if (nx) return { l: nx, when: L('Dziś ', 'Today ') + nx.start };
      const d = nextDayWithLessons(today); if (!plan[d] || !plan[d].length) return null;
      const l = plan[d][0]; return { l, when: (d === (today + 1) % 7 ? L('Jutro ', 'Tomorrow ') : DAY_FULL[d] + ' ') + l.start };
    }
    function todoItems() {
      const own = todoList().filter(t => !t.done);
      return [].concat(
        pendingAnn.map(a => ({ kind: 'ann', t: L('Potwierdź: ', 'Confirm: ') + a.title, href: a.href, tag: 'IDU', bad: true })),
        dueSoon.map(h => ({ kind: 'hw', t: h.title, href: h.href, tag: relTime(h.dueD) + ', ' + hhmm(h.dueD), bad: h.dueD - Date.now() < 864e5 })),
        own.sort((a, b) => (a.due || 9e15) - (b.due || 9e15)).map(t => ({ kind: 'own', id: t.id, t: t.t, href: t.href, tag: t.due ? relTime(new Date(t.due)) : '', bad: t.due && t.due - Date.now() < 864e5 })));
    }
    function todoRows(items) {
      return items.map(x => x.kind === 'own'
        ? `<label class="trow"><input type="checkbox" data-todo="${esc(x.id)}"><span class="grow">${x.href ? `<a href="${esc(x.href)}">${esc(x.t)}</a>` : esc(x.t)}</span><span class="muted small">${esc(x.tag)}</span></label>`
        : `<a class="trow tap" href="${esc(x.href)}"><span class="tdot ${x.bad ? 'bad' : ''}"></span><span class="grow clip">${esc(x.t)}</span><span class="muted small" style="${x.bad ? 'color:var(--bad)' : ''}">${esc(x.tag)}</span></a>`).join('');
    }
    function todoBlock() {
      const items = todoItems(), more = items.length > 3 && !todoOpen;
      return `<div id="todoblock"><div class="sec"><h2>Do zrobienia</h2>${items.length ? `<span class="muted">${items.length}</span>` : ''}</div>
        <div class="card" style="padding:2px 14px">${todoRows(more ? items.slice(0, 3) : items)}
        ${more ? `<button class="tadd" data-act="todomore">Pokaż wszystkie (${items.length})</button>` : ''}<button class="tadd" data-act="todoadd">${I('plus', 'sm')}Dodaj zadanie</button></div></div>`;
    }
    function feedBlock() {
      return `<div class="sec"><h2>Co nowego</h2><a href="#" id="reload" style="display:flex;gap:5px;align-items:center;font-size:14px">${I('refresh', 'xs')}Odśwież</a></div>
        ${chipRow('ff', feedKinds().map(([v, label]) => ({ v, label, n: v === 'all' ? null : feed.filter(f => f.kind === v).length })).filter(o => o.n !== 0), feedFilter)}
        <div id="feed">${feedHTML()}</div>
        <div class="muted small" style="text-align:center;margin-top:10px">${L('Zaktualizowano', 'Updated')}: ${esc(hhmm(new Date()))}</div>`;
    }
    function nextExam() {
      if (!exams) return null; const t0 = dayStart(new Date());
      return exams.map(x => { const m = String(x.start).match(/(\d{4})-(\d{2})-(\d{2})/); return Object.assign({ d: m ? new Date(+m[1], m[2] - 1, +m[3]) : null }, x); })
        .filter(x => x.d && x.d >= t0).sort((a, b) => a.d - b.d)[0] || null;
    }
    function tileHTML(k, wide) {
      const cls = `tile tap${wide ? ' wide' : ''}`;
      if (k === 'next') { const ni = nextInfo(); if (!ni) return '';
        return `<a class="${cls}" href="#plan" style="background:color-mix(in srgb,${subjColor(ni.l.raw)} 26%,var(--card))"><div class="tlab">${esc(ni.when)}</div><div class="tn">${esc(ni.l.name)}</div>
          <div class="row" style="margin-top:auto;align-items:flex-end"><div class="grow ts">${esc(ni.l.start)} – ${esc(ni.l.end)}</div>${ni.l.room ? `<div class="tv">${esc(shortRoom(ni.l.room))}</div>` : ''}</div></a>`; }
      if (k === 'grades') { const g = feed.filter(f => f.kind === 'grade').slice(0, 3);
        return `<a class="${cls}" href="${esc(ctx.student)}/grades"><div class="tlab">${L('Nowe oceny', 'New grades')}</div><div class="tv">${newGrades() || g.length ? (newGrades() || '') : '0'}</div>
          <div class="row" style="gap:5px;flex-wrap:wrap">${g.map(x => `<span class="pill" style="background:color-mix(in srgb,${subjColor(x.subject)} 30%,var(--card2))">${gradeShort(x.value)}</span>`).join('')}</div></a>`; }
      if (k === 'mail') return `<a class="${cls}" href="/internal_messages"><div class="tlab">${L('Wiadomości', 'Messages')}</div><div class="tv" style="color:var(--accent)">${ctx.unread || 0}</div><div class="ts">${L('nieprzeczytane', 'unread')}</div></a>`;
      if (k === 'todo') { const it = todoItems();
        return `<button class="${cls}" data-act="todosheet"><div class="tlab">${L('Do zrobienia', 'To do')}</div><div class="tv" style="${it.some(x => x.bad) ? 'color:var(--bad)' : ''}">${it.length}</div><div class="ts clip">${esc(it[0] ? it[0].t : L('nic na teraz', 'all clear'))}</div></button>`; }
      if (k === 'fav') { const f = favList();
        return `<a class="${cls}" href="#wazne"><div class="tlab">${L('Ważne', 'Starred')} ★</div><div class="tv">${f.length}</div><div class="ts clip">${esc(f[0] ? f[0].title : '')}</div></a>`; }
      if (k === 'wf') { const w = jget('skWF', null); if (!w) return `<a class="${cls}" href="${esc(ctx.student)}/grades"><div class="tlab">WF</div><div class="ts" style="margin-top:auto">${L('Otwórz Oceny, żeby wczytać punkty', 'Open Grades to load points')}</div></a>`;
        return `<a class="${cls}" href="${esc(ctx.student)}/grades"><div class="tlab">WF – ${L('punkty', 'points')}</div><div class="tv">${esc(w.pts)}<small style="font-size:16px;color:var(--muted)"> / ${esc(w.target)}</small></div>
          <div class="meter sm"><i style="width:${Math.min(100, 100 * w.pts / w.target)}%"></i></div></a>`; }
      if (k === 'exam') { const x = nextExam(); if (!x) return `<a class="${cls}" href="/calendar"><div class="tlab">${L('Sprawdziany', 'Tests')}</div><div class="ts" style="margin-top:auto">${L('brak zapowiedzianych', 'none announced')}</div></a>`;
        const days = Math.round((x.d - dayStart(new Date())) / 864e5), subj = (x.title.match(/\(([^()]+)\)\s*$/) || [])[1] || '';
        return `<a class="${cls}" href="${esc(x.url || '/calendar')}"><div class="tlab">${L('Sprawdzian', 'Test')}</div><div class="tn clip">${esc(prettySubj(subj) || x.title)}</div>
          <div class="tv" style="color:${days <= 2 ? 'var(--bad)' : 'var(--text)'}">${days === 0 ? TODAY : days === 1 ? TOMORROW : inDays(days)}</div></a>`; }
      if (k === 'notes') return `<a class="${cls}" href="#notatki"><div class="tlab">${L('Notatki', 'Notes')}</div><div class="tv" id="tnotes">…</div><div class="ts">${L('zdjęcia i notatki', 'photos and notes')}</div></a>`;
      return '';
    }
    let todoOpen = false;
    function startView() {
      const h = new Date().getHours();
      const hello = EN ? (h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Hi' : 'Good evening') : h < 5 ? 'Dobranoc' : h < 12 ? 'Dzień dobry' : h < 18 ? 'Cześć' : 'Dobry wieczór';
      const SS = loadSettings(), lay = SS.startLayout || 'A';
      const dateS = new Date().toLocaleDateString(EN ? 'en-GB' : 'pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
      const head = `<div class="hello"><div class="grow"><h1>${esc(hello)}, ${esc(SS.nick || firstName)}</h1>
          <p class="lead">${esc(dateS)}${klass ? ' · ' + esc(txt(klass)) : ''}</p></div>
          <a class="iconbtn" href="#szukaj" aria-label="Szukaj">${I('search', 'sm')}</a><a class="iconbtn" href="#wazne" aria-label="Ważne" style="color:var(--warn)">${I('star', 'sm')}</a>
          <a class="me tap" href="${esc(ctx.student)}" aria-label="Mój profil">${meAvatar()}</a></div>`;
      const ni = nextInfo();
      if (lay === 'B') {
        const items = todoItems();
        return head + (ni ? `<a class="card strip1 tap" href="#plan"><span class="sdot" style="background:${subjColor(ni.l.raw)}"></span><span class="grow clip"><b>${esc(ni.when)}</b> · ${esc(ni.l.name)}</span>${ni.l.room ? `<b>s. ${esc(shortRoom(ni.l.room))}</b>` : ''}</a>` : '')
          + feedBlock() + `<button class="card strip1 tap" data-act="todosheet" style="width:100%;border:0;color:var(--text);margin-top:12px"><b class="grow" style="text-align:left">${L('Do zrobienia', 'To do')}</b>${items.length ? `<span class="pill ${items.some(x => x.bad) ? 'bad' : ''}">${items.length}</span>` : ''}${I('right', 'sm chev')}</button>`;
      }
      if (lay === 'E') {
        const items = todoItems(), dl = items.find(x => x.bad);
        return head + (ni ? `<a class="card bigc tap" href="#plan" style="--c:${subjColor(ni.l.raw)}"><div class="lbl" style="--c:var(--muted)"><span class="sdot" style="display:inline-block;background:${subjColor(ni.l.raw)};margin-right:6px"></span>${esc(ni.when)}</div>
            <div class="bign">${esc(ni.l.name)}</div><div class="muted">${esc(ni.l.start)} – ${esc(ni.l.end)}</div>
            ${ni.l.room ? `<div class="bigroom"><span class="muted small">${L('sala', 'room')}</span><b>${esc(shortRoom(ni.l.room))}</b></div>` : ''}</a>` : `<div class="empty">${I('sun', 'big')}<div>Brak lekcji</div></div>`)
          + `<div class="counters"><a href="${esc(ctx.student)}/grades"><b>${newGrades()}</b><span class="muted small">${L('nowe oceny', 'new grades')}</span></a>
            <a href="/internal_messages"><b style="color:var(--accent)">${ctx.unread || 0}</b><span class="muted small">${L('wiadomości', 'messages')}</span></a>
            <a href="#" data-act="todosheet"><b style="${dl ? 'color:var(--bad)' : ''}">${items.length}</b><span class="muted small">${L('do zrobienia', 'to do')}</span></a></div>
          ${dl ? `<a class="trow tap" href="${esc(dl.href || '#')}" style="color:var(--bad);font-weight:600">${I('timer', 'sm')}<span class="grow clip">${esc(dl.t)}</span><span class="small">${esc(dl.tag)}</span></a>` : ''}`;
      }
      if (lay === 'C') {
        const wide = SS.tilesWide || [];
        return head + `<div class="tiles">${(SS.tiles || DEFAULTS.tiles).map(k => tileHTML(k, wide.includes(k))).join('')}</div>`
          + (SS.showFeed ? feedBlock() : '');
      }
      return head
        + (SS.showNow ? nowNextCard() : '')
        + (SS.showTodo !== false ? todoBlock() : '')
        + (SS.showExams ? `<div id="exams">${examsHTML()}</div>` : '')
        + (SS.showEvents && events.length ? `<div class="sec"><h2>Nadchodzące</h2><a href="/calendar">Kalendarz</a></div>
          <div class="hs">${events.map(e => `<a class="card ev tap" href="${esc(e.href)}">
            <div class="datebox"><b>${e.date ? e.date.getDate() : '?'}</b><span>${e.date ? MONTH_SHORT[e.date.getMonth()] : ''}</span></div>
            <div class="grow"><div class="b two">${esc(e.title)}</div><div class="muted small">${e.date ? esc(DAY_FULL[e.date.getDay()]) + (e.date.getHours() ? ', ' + hhmm(e.date) : '') : esc(e.dateS)}</div></div></a>`).join('')}</div>` : '')
        + (SS.showFeed ? feedBlock() : '');
    }
    function openTodoSheet(root, redraw) {
      const draw = () => `<h2>${L('Do zrobienia', 'To do')}</h2><div class="card" style="padding:2px 14px" id="tsl">${todoRows(todoItems()) || `<div class="nores">${L('Nic na teraz', 'All clear')}</div>`}</div>
        <button class="btn-p" id="tsa" style="width:100%;margin-top:12px">${I('plus', 'sm')}${L('Dodaj zadanie', 'Add a task')}</button>`;
      const sh = openSheet(root, draw());
      const wireS = () => {
        sh.querySelectorAll('[data-todo]').forEach(c => c.onchange = () => { todoToggle(c.dataset.todo, c.checked); haptic('success'); c.closest('.trow').querySelector('.grow').classList.toggle('done', c.checked); redraw(); });
        sh.querySelector('#tsa').onclick = () => todoAddSheet(root, () => { sh.innerHTML = '<div class="grab"></div>' + draw(); wireS(); redraw(); });
      };
      wireS();
    }

    // ---------- plan ----------
    const planDays = [1, 2, 3, 4, 5];
    let planDay = (plan[today] && plan[today].length && nowMin() <= mins(plan[today][plan[today].length - 1].end))
      ? today : nextDayWithLessons(today);
    if (!planDays.includes(planDay)) planDay = 1;
    let planMode = store.get('skPlanMode') || 'day';
    // week navigation: 0 = this week (next week on weekends), ±n = other weeks
    let weekOff = 0;
    const weekCache = {};
    function weekMonday(off) {
      const d = new Date(); d.setHours(0, 0, 0, 0); const cur = d.getDay() || 7;
      d.setDate(d.getDate() - cur + 1 + (cur >= 6 ? 7 : 0) + off * 7); return d;
    }
    function dateFor(wd) { const d = new Date(weekMonday(weekOff)); d.setDate(d.getDate() + wd - 1); return d; }
    const ymd2 = s => { const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/); return m ? new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : null; };
    async function loadWeek(off, after) {
      if (weekCache[off]) return;
      const s0 = weekMonday(off), e0 = new Date(s0); e0.setDate(e0.getDate() + 7);
      try {
        const list = await (await fetch(`/calendar_events.json?start_at=${Math.floor(s0 / 1000)}&stop_at=${Math.floor(e0 / 1000)}`, { credentials: 'same-origin' })).json();
        weekCache[off] = list.map(ev => {
          const start = ymd2(ev.start); let end = ev.end ? ymd2(ev.end) : null;
          if (ev.allDay && end) end.setDate(end.getDate() - 1);
          const subj = (String(ev.title).match(/\(([^()]+)\)\s*$/) || [])[1] || '';
          const cls = ev.className || '';
          return { title: ev.title, start, end: end && end > start ? end : null, timed: !ev.allDay, subj,
            exam: /grade_event/.test(cls), free: /free/.test(cls), color: ev.color || '#3d9be9',
            href: (ev.url || '').replace(/^https?:\/\/[^/]+/, '') || '/calendar' };
        }).filter(e => e.start);
      } catch (e) { weekCache[off] = []; }
      if (after) after();
    }
    function dayInfo(date) {
      const list = weekCache[weekOff]; if (!list) return null;
      const on = list.filter(e => { const a = dayStart(e.start), b = e.end ? dayStart(e.end) : a; return date >= a && date <= b; });
      return { exams: on.filter(e => e.exam), events: on.filter(e => !e.exam && !e.free), free: on.filter(e => e.free) };
    }
    const examFor = (info, l) => info ? info.exams.find(e => e.subj && normSubj(e.subj) === normSubj(l.raw)) : null;
    function weekLabel() {
      const m = weekMonday(weekOff), f = new Date(m); f.setDate(f.getDate() + 4);
      const range = m.getMonth() === f.getMonth() ? `${m.getDate()}–${f.getDate()} ${MONTH_SHORT[m.getMonth()]}` : `${shortDate(m)} – ${shortDate(f)}`;
      const base = (new Date().getDay() || 7) >= 6 ? 1 : 0;   // on weekends "this week" means next week
      const NEXT = L('Następny tydzień', 'Next week'), THIS = L('Ten tydzień', 'This week');
      const rel = weekOff === 0 ? (base ? NEXT : THIS) : weekOff === 1 ? (base ? L('Za 2 tygodnie', 'In 2 weeks') : NEXT) : weekOff === -1 ? (base ? THIS : L('Poprzedni tydzień', 'Last week'))
        : weekOff > 0 ? L(`Za ${weekOff + base} tyg.`, `In ${weekOff + base} weeks`) : L(`${-weekOff - base} tyg. temu`, `${-weekOff - base} weeks ago`);
      return { range, rel };
    }
    function dayList(wd) {
      const ls = plan[wd] || [];
      const date = dateFor(wd);
      const isToday = +date === +dayStart(new Date());
      const info = dayInfo(date);
      let top = '';
      if (info) {
        top += info.free.map(e => `<div class="card evc" style="--c:var(--good)"><div class="bar"></div><div class="in"><div class="kind">Dzień wolny</div><div class="b">${esc(e.title)}</div></div></div>`).join('');
        top += info.events.map(e => `<a class="card evc tap" href="/calendar" style="--c:${e.color}"><div class="bar"></div><div class="in"><div class="kind">Wydarzenie</div>
          <div class="b">${esc(e.title)}</div><div class="when">${e.timed ? esc(hhmm(e.start) + (e.end ? '–' + hhmm(e.end) : '')) : e.end ? esc(shortDate(e.start) + ' – ' + shortDate(e.end)) : L('cały dzień', 'all day')}</div></div></a>`).join('');
        const unmatched = info.exams.filter(e => !ls.some(l => e.subj && normSubj(e.subj) === normSubj(l.raw)));
        top += unmatched.map(e => `<a class="card evc tap" href="${esc(e.href)}" style="--c:var(--bad)"><div class="bar"></div><div class="in"><div class="kind">Sprawdzian</div>
          <div class="b">${esc(e.title.replace(/\s*\([^()]+\)\s*$/, ''))}</div><div class="when">${esc(prettySubj(e.subj))}</div></div></a>`).join('');
      }
      if (info && info.free.length) return top + (ls.length ? `<div class="nores">Według kalendarza to dzień wolny — lekcje niżej mogą się nie odbyć.</div>` : '') + lessonsHTML(ls, wd, isToday, info, true);
      if (!ls.length) return top + `<div class="empty">${I('sun', 'big')}<div>Brak lekcji</div></div>`;
      return top + lessonsHTML(ls, wd, isToday, info, false);
    }
    function lessonsHTML(ls, wd, isToday, info, dim) {
      const n = nowMin();
      return ls.map((l, i) => {
        let st = dim ? 'past' : '';
        if (isToday && !dim) { if (n >= mins(l.start) && n <= mins(l.end)) st = 'cur'; else if (n > mins(l.end)) st = 'past'; }
        const prev = ls[i - 1];
        const gap = prev ? mins(l.start) - mins(prev.end) : 0;
        const ex = examFor(info, l);
        const note = ex ? ex.title.replace(/\s*\([^()]+\)\s*$/, '') : weekOff === 0 ? l.note : '';
        return `${gap >= 15 ? `<div class="brk">${L('przerwa', 'break')} ${gap} min</div>` : ''}
          <a class="card les tap ${st} ${note ? 'exam' : ''}" href="${esc(l.href)}" data-les="${wd}:${i}" style="--c:${subjColor(l.raw)}"><div class="bar"></div><div class="in">
          <div class="tm">${esc(l.start)}<br>${esc(l.end)}</div>
          <div class="grow"><div class="b clip">${esc(l.name)} ${st === 'cur' ? '<span class="pill good">TERAZ</span>' : ''}</div>
          <div class="muted small clip">${L('Lekcja', 'Lesson')} ${l.nr}${teacherFor(l) ? ' · ' + esc(teacherFor(l)) : ''}</div>
          ${note ? `<div class="pill bad" style="margin-top:5px">${I('exam', 'xs')} Sprawdzian: ${esc(note)}</div>` : ''}</div>
          ${l.room ? `<div class="room" title="${esc(l.room)}">${esc(shortRoom(l.room))}</div>` : ''}</div></a>`;
      }).join('');
    }
    function dayMarks(wd) {
      const info = dayInfo(dateFor(wd)); if (!info) return '';
      return `<span class="mk2">${info.free.length ? '<i style="--c:var(--good)"></i>' : ''}${info.exams.length ? '<i style="--c:var(--bad)"></i>' : ''}${info.events.length ? '<i style="--c:var(--accent)"></i>' : ''}</span>`;
    }
    function weekGrid() {
      const nrs = [].concat(...planDays.map(d => (plan[d] || []).map(l => l.nr)));
      if (!nrs.length) return '<div class="empty">Brak planu</div>';
      const minNr = Math.min(...nrs), maxNr = Math.max(...nrs);
      const times = {};
      planDays.forEach(d => (plan[d] || []).forEach(l => { times[l.nr] = l.start; }));
      const todayD = +dayStart(new Date());
      let cells = `<div></div>` + planDays.map(d => { const info = dayInfo(dateFor(d));
        return `<div class="h ${+dateFor(d) === todayD ? 'today' : ''}">${DAY_SHORT[d]}<small style="display:block;font-weight:500">${info && info.free.length ? L('wolne', 'off') : dateFor(d).getDate()}</small></div>`; }).join('');
      const items = [];
      planDays.forEach((d, ci) => {
        const ls = (plan[d] || []).slice().sort((a, b) => a.nr - b.nr);
        for (let i = 0; i < ls.length; i++) {
          let span = 1;
          while (ls[i + span] && ls[i + span].raw === ls[i].raw && ls[i + span].nr === ls[i].nr + span) span++;
          items.push({ col: ci + 2, row: ls[i].nr - minNr + 2, span, l: ls[i], d });
          i += span - 1;
        }
      });
      for (let nr = minNr; nr <= maxNr; nr++)
        cells += `<div class="t" style="grid-column:1;grid-row:${nr - minNr + 2}">${esc(times[nr] || '')}</div>`;
      cells += items.map(it => { const info = dayInfo(dateFor(it.d)); const ex = examFor(info, it.l) || (weekOff === 0 && it.l.note);
        const free = info && info.free.length;
        return `<a class="c tap ${ex ? 'ex' : ''}" href="${esc(it.l.href)}" data-les="${it.d}:${(plan[it.d] || []).indexOf(it.l)}" style="--c:${subjColor(it.l.raw)};grid-column:${it.col};grid-row:${it.row} / span ${it.span};${free ? 'opacity:.35' : ''}">
        ${ex ? '<b class="tst">TEST</b>' : ''}${esc(it.l.name)}<small>${esc(shortRoom(it.l.room))}</small></a>`; }).join('');
      return `<div class="grid" style="grid-template-rows:auto repeat(${maxNr - minNr + 1},minmax(42px,auto))">${cells}</div>`;
    }
    const dayBody = wd => planMode === 'timeline' ? timeline(wd) : dayList(wd);
    function timeline(wd) {
      const ls = (plan[wd] || []).slice().sort((a, b) => a.nr - b.nr);
      if (!ls.length) return `<div class="empty">${I('sun', 'big')}<div>Brak lekcji</div></div>`;
      const blocks = [];
      ls.forEach((l, i) => { const b = blocks[blocks.length - 1]; if (b && b.l.raw === l.raw && mins(l.start) - mins(b.end) <= 15) { b.end = l.end; b.n++; } else blocks.push({ l, i, start: l.start, end: l.end, n: 1 }); });
      const t0 = Math.floor(mins(blocks[0].start) / 60) * 60, t1 = Math.ceil(mins(blocks[blocks.length - 1].end) / 60) * 60, K = 1.3;
      const isToday = +dateFor(wd) === +dayStart(new Date()), n = nowMin();
      let h = ''; for (let t = t0; t <= t1; t += 60) h += `<div class="tl-h" style="top:${(t - t0) * K}px"><span>${t / 60}:00</span></div>`;
      h += blocks.map((b, j) => { const prev = blocks[j - 1], gap = prev ? mins(b.start) - mins(prev.end) : 0;
        return `${gap >= 15 ? `<div class="muted" style="position:absolute;left:58px;top:${(mins(prev.end) - t0) * K + 1}px;font-size:11px">${L('przerwa', 'break')} ${gap} min</div>` : ''}
        <a class="tl-b tap" href="${esc(b.l.href)}" data-les="${wd}:${b.i}" style="top:${(mins(b.start) - t0) * K}px;height:${Math.max(46, (mins(b.end) - mins(b.start)) * K - 3)}px;--c:${subjColor(b.l.raw)}">
          <div class="grow" style="min-width:0"><div class="b clip">${esc(b.l.name)}</div><div class="small">${esc(b.start)} – ${esc(b.end)}${b.n > 1 ? ' · ' + b.n + L(' lekcje', ' lessons') : ''}</div></div>
          ${b.l.room ? `<div class="room">${esc(shortRoom(b.l.room))}</div>` : ''}</a>`; }).join('');
      if (isToday && n >= t0 && n <= t1) h += `<div class="tl-now" style="top:${(n - t0) * K}px"></div>`;
      return `<div class="tline" style="height:${(t1 - t0) * K + 12}px">${h}</div>`;
    }
    function planView() {
      const wl = weekLabel();
      return `<div class="seg"><button data-mode="day" class="${planMode === 'day' ? 'on' : ''}">Dzień</button>
        <button data-mode="timeline" class="${planMode === 'timeline' ? 'on' : ''}">Oś czasu</button>
        <button data-mode="week" class="${planMode === 'week' ? 'on' : ''}">Tydzień</button></div>
        <div class="weeknav"><button class="iconbtn" id="wp" aria-label="Poprzedni tydzień">${I('back', 'sm')}</button>
          <div class="grow" style="text-align:center"><div class="b">${esc(wl.range)}</div><div class="muted small">${esc(wl.rel)}</div></div>
          ${weekOff !== 0 ? `<button class="today-btn" id="wt">Dziś</button>` : ''}
          <button class="iconbtn" id="wn" aria-label="Następny tydzień">${I('right', 'sm')}</button></div>
        <div id="planbody">${planMode !== 'week'
          ? `<div class="days">${planDays.map(d => `<button data-d="${d}" class="${d === planDay ? 'on' : ''}">${DAY_SHORT[d]}<small>${dateFor(d).getDate()}</small>${dayMarks(d)}</button>`).join('')}</div>
             <div id="daylist">${dayBody(planDay)}</div>`
          : weekGrid()}</div>
        ${weekCache[weekOff] ? '' : '<div class="muted small" style="text-align:center;margin-top:8px" id="wload">Sprawdzam sprawdziany i wydarzenia…</div>'}`;
    }

    // ---------- subjects ----------
    const LINK_LABEL = { 'zadania domowe': ['edit', 'Zadania'], 'oceny': ['grades', 'Oceny'], 'obecności': ['pres', 'Obecności'],
      'tematy lekcji': ['book', 'Tematy'], 'forum': ['chat', 'Forum'] };
    function nextFor(raw) {
      const k = normSubj(raw), n = nowMin();
      for (let i = 0; i < 8; i++) { const wd = (today + i) % 7, ls = (plan[wd] || []).filter(l => normSubj(l.raw) === k && (i > 0 || mins(l.start) > n)); if (ls.length) return { l: ls[0], i, wd }; }
      return null;
    }
    function subjectsView() {
      const hid = jget('skSubjHide', []), pin = jget('skSubjPin', []);
      const list = subjects.filter(s => !hid.includes(subjKey(s.name))).sort((a, b) => pin.includes(subjKey(b.name)) - pin.includes(subjKey(a.name)));
      const when = x => !x ? '' : (x.i === 0 ? TODAY : x.i === 1 ? TOMORROW : DAY_SHORT[x.wd]) + ' ' + x.l.start + (x.l.room ? ' · s. ' + shortRoom(x.l.room) : '');
      return `<div class="search">${I('search', 'sm')}<input id="filter" placeholder="Szukaj przedmiotu" autocomplete="off"></div>
        ${klass ? `<div class="chips" style="margin:0 0 14px">
          <a class="chip" href="${esc(attr(klass, 'href'))}">${I('users')}${L('Klasa', 'Class')} ${esc(txt(klass))}</a>
          ${klassForum ? `<a class="chip" href="${esc(attr(klassForum, 'href'))}">${I('chat')}Forum klasowe</a>` : ''}<a class="chip" href="#notatki">${I('image')}Notatki</a></div>` : ''}
        <div id="subjlist">${list.map(s => { const k = subjKey(s.name), nx = nextFor(s.name); return `<details class="card" data-n="${esc(s.name.toLowerCase())}">
          <summary class="row"><div class="av" style="background:${subjColor(s.name)}">${esc(prettySubj(s.name).charAt(0))}</div>
          <div class="grow" style="min-width:0"><div class="b clip">${esc(prettySubj(s.name))}${pin.includes(k) ? ` <span style="color:var(--muted)">${I('pin', 'xs')}</span>` : ''}</div>${nx ? `<div class="muted small clip">${esc(when(nx))}</div>` : ''}</div>${I('down', 'sm chev')}</summary>
          <div class="chips"><a class="chip" href="${esc(s.href)}">${I('layers')}Otwórz</a><a class="chip" href="#n:${esc(encodeURIComponent(k))}">${I('image')}Notatki</a>${s.links.map(l => {
            const [ic, lab] = LINK_LABEL[l.t] || ['right', l.t];
            return `<a class="chip" href="${esc(l.h)}">${I(ic)}${esc(lab)}</a>`;
          }).join('')}</div></details>`; }).join('')}</div>
        ${hid.length ? `<div class="muted small" style="text-align:center;margin-top:12px">Ukryte: ${hid.length} · zmienisz w Ustawieniach → Przedmioty</div>` : ''}`;
    }

    function openLesson(root, wd, i) {
      const l = (plan[wd] || [])[i]; if (!l) return;
      const subj = subjects.find(x => x.href === '/subjects/' + l.sid);
      const LL = { 'zadania domowe': ['edit', 'Zadania'], 'oceny': ['grades', 'Oceny'], 'obecności': ['pres', 'Obecności'], 'tematy lekcji': ['book', 'Tematy'], 'forum': ['chat', 'Forum'] };
      const t = teacherFor(l);
      openSheet(root, `<div class="hero" style="--c:${subjColor(l.raw)};margin:0 0 14px">
          <div style="opacity:.85;font-size:13px;font-weight:700">${esc(DAY_FULL[wd].replace(/^./, m => m.toUpperCase()))} · ${L('lekcja', 'lesson')} ${l.nr}</div>
          <h1 style="margin:4px 0 2px">${esc(l.name)}</h1><div style="font-weight:600">${esc(l.start)} – ${esc(l.end)}${l.room ? L(' · sala ', ' · room ') + esc(l.room) : ''}</div></div>
        ${t ? `<div class="kv"><span>Nauczyciel</span><span>${esc(t)}</span></div>` : ''}
        ${l.note ? `<div class="kv"><span>Sprawdzian / notatka</span><span style="color:var(--warn)">${esc(l.note)}</span></div>` : ''}
        <div class="chips" style="margin-top:14px"><a class="chip" href="#n:${esc(encodeURIComponent(subjKey(l.raw)))}:add">${I('camera')}Dodaj zdjęcie</a>
          <a class="chip" href="#n:${esc(encodeURIComponent(subjKey(l.raw)))}">${I('image')}Notatki</a><a class="chip" href="${esc(l.href)}">${I('layers')}Strona przedmiotu</a>
          ${l.roomHref ? `<a class="chip" href="${esc(l.roomHref)}">${I('pin')}Sala ${esc(l.room)}</a>` : ''}
          ${subj ? subj.links.filter(x => LL[x.t]).map(x => `<a class="chip" href="${esc(x.h)}">${I(LL[x.t][0])}${LL[x.t][1]}</a>`).join('') : ''}
          ${l.links.map(x => `<a class="chip" href="${esc(x.h)}" target="_blank">${I('right')}${esc(x.t || 'Link')}</a>`).join('')}</div>`);
    }

    // the iPhone app keeps a copy of the timetable for the widget and the reminders
    let syncT = 0;
    const syncNative = () => { if (!NATIVE_IDU) return; clearTimeout(syncT); syncT = setTimeout(syncNow, 400); };
    function syncNow() {
      const two = n => String(n).padStart(2, '0');
      const days = {};
      Object.keys(plan).forEach(k => { days[k] = plan[k].map(l => ({ nr: l.nr, start: l.start, end: l.end, name: l.name, room: l.room || '',
        teacher: teacherFor(l) || '', color: subjColor(l.raw), subj: normSubj(l.raw) })); });
      const ex = (exams || []).map(x => {
        const m = String(x.start).match(/^(\d{4}-\d{2}-\d{2})/); const subj = (String(x.title).match(/\(([^()]+)\)\s*$/) || [])[1] || '';
        return m ? { date: m[1], subj: normSubj(subj), name: prettySubj(subj), title: String(x.title).replace(/\s*\([^()]+\)\s*$/, '') } : null;
      }).filter(Boolean);
      const hw = feed.filter(f => f.kind === 'hw').map(f => { const d = parseDate(f.due);
        return d && d > new Date() ? { title: f.title, subject: prettySubj(f.subject || ''), due: ymdS(d) + 'T' + two(d.getHours()) + ':' + two(d.getMinutes()) } : null; }).filter(Boolean);
      native({ type: 'plan', v: 1, days, exams: ex, free: freeDays || [], hw, me: loadSettings().nick || firstName, lang: LANG, updated: Date.now() });
      native(notifyPrefs(loadSettings()));
    }

    return {
      title: 'Start', tab: 'start', top: true,
      render(main, root, api) {
        function show() {
          let v = (location.hash || '#start').slice(1); try { v = decodeURIComponent(v); } catch (e) {}
          root.querySelectorAll('.sheet,.sheet-scrim').forEach(x => x.remove());
          HOMEDATA = { subjects, plan, feed, get teachers() { return teachers; } };
          if (v === 'notatki' || v.startsWith('n:') || v.startsWith('dodaj')) { notesShow(v); return; }
          if (v === 'plan') { api.setTitle('Plan lekcji'); api.setTab('plan'); main.innerHTML = planView(); }
          else if (v === 'przedmioty') { api.setTitle('Przedmioty'); api.setTab('subjects'); main.innerHTML = subjectsView(); }
          else if (v === 'wazne') { api.setTitle('Ważne'); api.setTab('fav'); main.innerHTML = favView(favFilter); }
          else if (v === 'szukaj') { api.setTitle('Szukaj'); api.setTab('search'); main.innerHTML = searchView(); }
          else { api.setTitle('Start'); api.setTab('start'); main.innerHTML = startView(); }
          root.getElementById('app').classList.remove('open');
          window.scrollTo(0, 0);
          wire();
          if (api.animate) api.animate();
        }
        let favFilter = 'all';
        const nstate = { tab: '*', key: null };
        function addKey() {
          const ls = plan[today] || [], n = nowMin();
          const cur = ls.find(l => n >= mins(l.start) - 10 && n <= mins(l.end) + 10) || ls.filter(l => mins(l.start) <= n).pop();
          if (cur) return subjKey(cur.raw);
          const ni = nextInfo(); return ni ? subjKey(ni.l.raw) : subjects[0] ? subjKey(subjects[0].name) : 'inne';
        }
        async function notesShow(v) {
          api.setTab('notes'); api.setTitle('Notatki'); root.getElementById('app').classList.remove('open');
          let key = null, mode = null;
          if (v.startsWith('n:')) { const parts = v.slice(2).split(':'); key = parts[0]; mode = parts[1] || null; }
          if (v.startsWith('dodaj')) { key = addKey(); mode = v.split(':')[1] || 'camera'; }
          if (!key) { main.innerHTML = await notesIndexHTML(); window.scrollTo(0, 0); if (api.animate) api.animate(); return; }
          if (nstate.key !== key) { nstate.key = key; nstate.tab = '*'; }
          const redraw = async () => { main.innerHTML = await notesSubjectHTML(key, nstate.tab); wireNotes(root, main, key, nstate, redraw); };
          await redraw(); window.scrollTo(0, 0); if (api.animate) api.animate();
          if (mode) { try { history.replaceState(history.state, '', '/#n:' + encodeURIComponent(key)); } catch (e) {} noteAddSheet(root, key, nstate.tab, mode === 'add' ? null : mode, redraw); }
        }
        const redrawStart = () => { if ((location.hash || '#start') === '#start' || location.hash === '') { main.innerHTML = startView(); wire(); } };
        const redrawTodo = () => { const tb = root.getElementById('todoblock'); if (tb) { tb.outerHTML = todoBlock(); wire(); } else redrawStart(); };
        window.__skTodoRedraw = redrawStart;
        function wire() {
          main.querySelectorAll('[data-todo]').forEach(c => c.onchange = () => { todoToggle(c.dataset.todo, c.checked); haptic('success');
            c.closest('.trow').querySelector('.grow').classList.toggle('done', c.checked); setTimeout(redrawTodo, 700); });
          main.querySelectorAll('[data-act]').forEach(b => b.onclick = e => { e.preventDefault(); const a = b.dataset.act;
            if (a === 'todoadd') todoAddSheet(root, redrawTodo); else if (a === 'todomore') { todoOpen = true; redrawTodo(); } else if (a === 'todosheet') openTodoSheet(root, redrawStart); });
          wireChips(root, 'fk', v => { favFilter = v; main.innerHTML = favView(v); wire(); });
          main.querySelectorAll('[data-fav]').forEach(b => b.onclick = () => { const f = favList().find(x => x.id === b.dataset.fav); if (f) itemMenu(root, f, () => { main.innerHTML = favView(favFilter); wire(); }); });
          if (main.querySelector('#sq')) wireSearch(root, main);
          const tn = main.querySelector('#tnotes'); if (tn) NOTES.all().then(a => { tn.textContent = a.length; });
          const r = root.getElementById('reload');
          if (r) r.onclick = e => { e.preventDefault(); haptic('light'); r.style.opacity = '.5'; refreshPage({ keepScroll: true }); };
          wireChips(root, 'ff', v => { feedFilter = v; const f = root.getElementById('feed'); f.innerHTML = feedHTML(); animateIn(f); });
          main.querySelectorAll('[data-les]').forEach(el => el.onclick = e => {
            e.preventDefault(); e.stopPropagation(); const [wd, i] = el.dataset.les.split(':').map(Number); openLesson(root, wd, i);
          });
          main.querySelectorAll('.seg button').forEach(b => b.onclick = () => {
            planMode = b.dataset.mode; store.set('skPlanMode', planMode); main.innerHTML = planView(); wire(); if (api.animate) api.animate();
          });
          main.querySelectorAll('.days button').forEach(b => b.onclick = () => {
            planDay = +b.dataset.d;
            main.querySelectorAll('.days button').forEach(x => x.classList.toggle('on', x === b));
            const dl = root.getElementById('daylist');
            dl.innerHTML = dayBody(planDay);
            animateIn(dl);
          });
          const rerenderPlan = anim => {
            main.innerHTML = planView(); wire(); if (anim) { const b2 = root.getElementById('planbody'); if (b2) { b2.classList.add(anim); } }
          };
          const goWeek = d => {
            haptic('selection');
            weekOff += d; rerenderPlan(d > 0 ? 'slideL' : 'slideR');
            loadWeek(weekOff, () => { if ((location.hash || '').slice(1) === 'plan') rerenderPlan(); });
          };
          const wp = root.getElementById('wp'), wn = root.getElementById('wn'), wt = root.getElementById('wt');
          if (wp) wp.onclick = () => goWeek(-1);
          if (wn) wn.onclick = () => goWeek(1);
          if (wt) wt.onclick = () => { weekOff = 0; const t = new Date().getDay(); planDay = t >= 1 && t <= 5 ? t : 1; rerenderPlan('slideR'); };
          if (root.getElementById('wload')) loadWeek(weekOff, () => { if ((location.hash || '').slice(1) === 'plan') rerenderPlan(); });
          const dlist = root.getElementById('daylist');
          if (dlist) {
            let sx = null, sy = null;
            dlist.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; }, { passive: true });
            dlist.addEventListener('touchend', e => {
              if (sx == null || sx < 30) { sx = null; return; }
              const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; sx = null;
              if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
              if (dx < 0) { if (planDay < 5) planDay++; else { planDay = 1; goWeek(1); return; } }
              else { if (planDay > 1) planDay--; else { planDay = 5; goWeek(-1); return; } }
              haptic('selection');
              rerenderPlan(dx < 0 ? 'slideL' : 'slideR');
            });
          }
          const f = root.getElementById('filter');
          if (f) f.oninput = () => {
            const q = f.value.toLowerCase().trim();
            root.querySelectorAll('#subjlist details').forEach(d => { d.style.display = !q || d.dataset.n.includes(q) ? '' : 'none'; });
          };
        }
        onWin('hashchange', show);
        jset('skSubjList', subjects.map(s => s.name));
        show();
        syncNative();
        const view = () => (location.hash || '#start').slice(1);
        loadExams(() => { const ex = root.getElementById('exams'); if (ex && view() === 'start') { ex.innerHTML = examsHTML(); animateIn(ex); wire(); } syncNative(); saveSnapshotSoon(); });
        refreshTeachers(() => { if (view() === 'plan') { main.innerHTML = planView(); wire(); } else if (view() === 'start') {
          const nc = root.getElementById('nowcard'); if (nc) nc.outerHTML = nowNextCard(); } syncNative(); saveSnapshotSoon(); });
        every(() => {
          if (view() === 'start') { const nc = root.getElementById('nowcard'); if (nc) nc.outerHTML = nowNextCard(); }
          else if (view() === 'plan' && planMode === 'day' && planDay === today) { const dl = root.getElementById('daylist'); if (dl) { dl.innerHTML = dayList(planDay); wire(); } }
        }, 30000);
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  GRADES
   * ------------------------------------------------------------------ */
  function gradeNumber(v) {
    const m = String(v).trim().match(/^([0-6])([+-]?)$/);
    if (m) return +m[1] + (m[2] === '+' ? 0.5 : m[2] === '-' ? -0.25 : 0);
    const n = parseFloat(String(v).replace(',', '.'));
    return isNaN(n) || n > 6 ? null : n;
  }
  const fmtAvg = n => n.toFixed(2).replace(/0$/, '').replace(/\.$/, '').replace('.', ',');

  function gradesPage(ctx) {
    const notes = gradeNotes();
    const rows = $$('table.marks-table > tbody > tr').map(tr => {
      const a = $('td:first-child a', tr);
      const cats = [];
      $$(':scope > td.averages-container > div:not(.calculated-mean)', tr).forEach(div => {
        const name = txt($(':scope > strong', div));
        const marks = $$('.single-mark', div).map(sm => {
          const vEl = $(':scope > .value', sm);
          const link = $('a', vEl);
          const descEl = $('.desc', sm);
          const date = txt($('.date', descEl));
          return {
            value: txt(vEl), type: attr(sm, 'data-type'), weight: parseFloat(attr(sm, 'data-weight')) || 1,
            dataValue: attr(vEl, 'data-value'), points: attr(vEl, 'data-data-cumulative-points'),
            max: attr(sm, 'data-cumulative-max-points'),
            desc: txt(descEl).replace(/^\(|\)$/g, '').replace(date, '').trim(), date,
            note: link ? notes[attr(link, 'href')] : ''
          };
        });
        if (marks.length) cats.push({ name, marks });
      });
      return { name: txt(a), href: attr(a, 'href'), cats };
    });

    function summary(r) {
      const all = [].concat(...r.cats.map(c => c.marks));
      let sum = 0, w = 0, pct = [];
      const cum = [];
      all.forEach(m => {
        if (m.type === 'cumulative' && m.max) { cum.push(m); return; }
        if (/%$/.test(m.value)) { pct.push(parseFloat(m.value)); return; }
        const n = gradeNumber(m.value);
        if (n != null && (m.type === 'numeric' || /^[0-6][+-]?$/.test(m.value))) { sum += n * m.weight; w += m.weight; }
      });
      if (w) return { big: fmtAvg(sum / w), small: 'średnia' };
      if (pct.length) return { big: Math.round(pct.reduce((a, b) => a + b, 0) / pct.length) + '%', small: 'średnio' };
      if (cum.length) {
        // the teacher keeps a running total – by default show the biggest entry (setting: sum / last)
        const S = loadSettings(), target = +S.wfTarget || 95, vals = cum.map(m => parseFloat(m.points) || 0);
        let pts = S.wfMode === 'sum' ? vals.reduce((a, b) => a + b, 0)
          : S.wfMode === 'last' ? (parseFloat(cum.slice().sort((a, b) => (parseDate(a.date) || 0) - (parseDate(b.date) || 0)).pop().points) || 0) : Math.max(...vals);
        pts = Math.round(pts * 10) / 10;
        if (/\bwf\b|wychowanie fiz/i.test(r.name)) jset('skWF', { pts, target });
        return { big: pts + '/' + target, small: L('punkty', 'points'), pts, target };
      }
      return { big: '–', small: 'bez średniej' };
    }

    const withMarks = rows.filter(r => r.cats.length);
    const without = rows.filter(r => !r.cats.length);
    withMarks.forEach(r => {
      const all = [].concat(...r.cats.map(c => c.marks.map(m => Object.assign({ cat: c.name, d: parseDate(m.date) }, m))));
      r.all = all;
      r.latest = Math.max(0, ...all.map(m => m.d ? +m.d : 0));
      r.sum = summary(r);
      const num = parseFloat(String(r.sum.big).replace(',', '.'));
      r.score = /%$/.test(r.sum.big) ? num / 100 * 5 + 1 : /\//.test(r.sum.big) ? null : isNaN(num) ? null : num;
    });
    let sort = store.get('skGradeSort') || 'new', view = store.get('skGradeView') || 'subj', q = '';
    const SORTS = [['new', 'Najnowsze'], ['az', 'A–Z'], ['best', 'Najlepsze'], ['worst', 'Najsłabsze']];

    function subjCard(r) {
      const s = r.sum, all = r.all;
      return `<details style="margin-bottom:12px"><summary class="gcard tap" style="--c:${subjColor(r.name)};margin:0">
        <div class="top2"><div class="avg">${esc(s.big)}<small>${esc(s.small)}</small></div>
        <div class="marks">${all.slice(-8).map(m => `<span>${gradeShort(m.value)}</span>`).join('')}</div></div>
        <div class="name"><span>${esc(prettySubj(r.name))}</span><span>${all.length} ${plural(all.length, 'ocena', 'oceny', 'ocen')}</span></div>
        ${s.pts != null ? `<div class="meter sm"><i style="width:${Math.min(100, 100 * s.pts / s.target)}%"></i></div>` : ''}</summary>
        <div class="card" style="margin-top:8px">${r.cats.map(c => `<div class="cat">${esc(c.name)}</div>${c.marks.map(m => markRow(m, r.name, c.name)).join('')}`).join('')}
        <div class="chips"><a class="chip" href="${esc(r.href)}">${I('layers')}Strona przedmiotu</a></div></div></details>`;
    }
    function markRow(m, subj, cat, showSubj) {
      const row = `<div class="mk" style="--c:${subjColor(subj)}"><div class="v">${gradeShort(m.value)}</div>
        <div class="grow"><div class="b">${esc(showSubj ? prettySubj(subj) : m.value.length > 6 ? m.value : m.desc || cat)}</div>
        <div class="muted small">${showSubj ? esc((m.desc || cat) + ' · ') : m.value.length > 6 ? esc(m.desc) + ' · ' : ''}${esc(m.date)}${m.weight !== 1 ? ' · waga ' + m.weight : ''}</div></div>
        ${m.note ? I('down', 'sm chev') : ''}</div>`;
      return m.note ? `<details><summary>${row}</summary><div class="note" style="margin:0 0 10px">${m.note}</div></details>` : row;
    }
    function listHTML() {
      const nq = norm(q);
      if (view === 'list') {
        const marks = [].concat(...withMarks.map(r => r.all.map(m => ({ m, r }))))
          .filter(x => !nq || norm(x.r.name + ' ' + x.m.desc + ' ' + x.m.cat + ' ' + x.m.value).includes(nq))
          .sort((a, b) => (b.m.d || 0) - (a.m.d || 0));
        if (!marks.length) return '<div class="nores">Brak wyników</div>';
        const groups = []; marks.forEach(x => { const k = x.m.d ? shortDate(x.m.d) : x.m.date || '–'; const g = groups[groups.length - 1]; if (g && g.k === k) g.l.push(x); else groups.push({ k, l: [x] }); });
        return groups.map(g => `<div class="dayh">${esc(g.k)}</div><div class="card">${g.l.map(x => markRow(x.m, x.r.name, x.m.cat, true)).join('')}</div>`).join('');
      }
      if (view === 'table') {
        const tl = withMarks.filter(r => !nq || norm(r.name).includes(nq)).slice().sort((a, b) => norm(a.name).localeCompare(norm(b.name)));
        return tl.length ? `<div class="card gtable">${tl.map(r => `<a class="gt" href="${esc(r.href)}" style="--c:${subjColor(r.name)}"><span class="gn"><i></i>${esc(prettySubj(r.name))}</span>
          <span class="gm">${r.all.slice(-6).map(m => `<b>${gradeShort(m.value)}</b>`).join('')}</span><span class="gs">${esc(r.sum.big)}</span></a>`).join('')}</div>` : '<div class="nores">Brak wyników</div>';
      }
      let list = withMarks.filter(r => !nq || norm(r.name).includes(nq));
      const cmp = { new: (a, b) => b.latest - a.latest, az: (a, b) => norm(a.name).localeCompare(norm(b.name)),
        best: (a, b) => (b.score ?? -9) - (a.score ?? -9), worst: (a, b) => (a.score ?? 99) - (b.score ?? 99) }[sort];
      list = list.slice().sort(cmp);
      const wo = without.filter(r => !nq || norm(r.name).includes(nq));
      return (list.length ? list.map(subjCard).join('') : '<div class="nores">Brak wyników</div>') +
        (wo.length ? `<div class="sec"><h2>Bez ocen</h2></div><div class="card">${wo.map(r =>
          `<a class="row" href="${esc(r.href)}" style="padding:8px 0"><div class="av" style="width:12px;height:12px;background:${subjColor(r.name)}"></div>
          <div class="grow clip">${esc(prettySubj(r.name))}</div>${I('right', 'sm chev')}</a>`).join('')}</div>` : '');
    }

    return {
      title: 'Oceny', tab: 'grades', top: true,
      render(main, root) {
        const total = withMarks.reduce((n, r) => n + r.all.length, 0);
        const nums = withMarks.filter(r => r.score != null && /średnia/.test(r.sum.small));
        const overall = nums.length ? fmtAvg(nums.reduce((a, r) => a + r.score, 0) / nums.length) : null;
        main.innerHTML = `
          ${withMarks.length ? `<div class="card row" style="gap:14px;margin-bottom:14px">
            <div class="grow"><div class="lbl">Podsumowanie</div><div class="b" style="font-size:17px">${total} ${plural(total, 'ocena', 'oceny', 'ocen')} ${L('z', 'in')} ${withMarks.length} ${plural(withMarks.length, 'przedmiotu', 'przedmiotów', 'przedmiotów')}</div></div>
            ${overall ? `<div style="text-align:right"><div class="b" style="font-size:24px">${overall}</div><div class="muted small">średnia ogólna</div></div>` : ''}</div>` : ''}
          <div class="seg" id="gv"><button data-v="subj" class="${view === 'subj' ? 'on' : ''}">Karty</button><button data-v="list" class="${view === 'list' ? 'on' : ''}">Oś czasu</button><button data-v="table" class="${view === 'table' ? 'on' : ''}">Tabela</button></div>
          <div class="search">${I('search', 'sm')}<input id="gq" type="search" placeholder="Szukaj przedmiotu lub oceny" autocomplete="off"></div>
          <div id="gsortwrap" style="${view !== 'subj' ? 'display:none' : ''}">${chipRow('gs', SORTS.map(([v, label]) => ({ v, label })), sort)}</div>
          <div id="glist">${withMarks.length || without.length ? listHTML() : '<div class="empty">Brak ocen</div>'}</div>`;
        const redraw = () => { const g = root.getElementById('glist'); g.innerHTML = listHTML(); animateIn(g); };
        wireChips(root, 'gs', v => { sort = v; store.set('skGradeSort', v); redraw(); });
        root.querySelectorAll('#gv button').forEach(b => b.onclick = () => {
          view = b.dataset.v; store.set('skGradeView', view);
          root.querySelectorAll('#gv button').forEach(x => x.classList.toggle('on', x === b));
          root.getElementById('gsortwrap').style.display = view !== 'subj' ? 'none' : '';
          redraw();
        });
        root.getElementById('gq').oninput = e => { q = e.target.value; redraw(); };
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  ATTENDANCE
   * ------------------------------------------------------------------ */
  function presencesPage(ctx) {
    const parseCell = td => {
      const m = txt(td).match(/(\d+)\s*\/\s*(\d+)\s*\(([\d,]+)%\)/);
      const just = txt(td).match(/usprawiedliwione:\s*(\d+)/);
      return m ? { n: +m[1], of: +m[2], pct: parseFloat(m[3].replace(',', '.')), just: just ? +just[1] : 0 } : { n: parseInt(txt(td), 10) || 0 };
    };
    const sumTable = $$('.module table').find(t => !t.classList.contains('presences_table'));
    let total = null;
    const subj = [];
    if (sumTable) $$('tbody tr', sumTable).forEach(tr => {
      const tds = $$(':scope > td', tr);
      if (tds.length < 4) return;
      const rec = { name: txt(tds[0]), href: attr($('a', tds[0]), 'href'), ob: parseCell(tds[1]), nb: parseCell(tds[2]), sp: parseCell(tds[3]) };
      if (/^razem$/i.test(rec.name)) total = rec; else subj.push(rec);
    });
    subj.sort((a, b) => (a.ob.pct ?? 100) - (b.ob.pct ?? 100));

    // per-day details
    const days = {};
    $$('table.presences_table').forEach(t => {
      const heads = $$('tr:first-child th', t).slice(1).map(th => (txt(th).match(/\d{4}-\d{2}-\d{2}/) || [''])[0]);
      $$('tr', t).slice(1).forEach(tr => {
        const tds = $$(':scope > td', tr);
        const nr = (txt(tds[0]).match(/\((\d+)\)/) || [])[1];
        tds.slice(1).forEach((td, i) => {
          if (!td.classList.contains('lesson')) return;
          const date = heads[i];
          $$(':scope > div', td).forEach(div => {
            const img = $('img', div);
            const st = attr(img, 'alt') || attr(img, 'title') || txt(div);
            (days[date] = days[date] || []).push({ nr: +nr, subject: attr(div, 'title') || attr(td, 'title'), status: st });
          });
        });
      });
    });
    const code = s => /uspraw/i.test(s) ? ['u', ST.u] : /nieobec/i.test(s) ? ['nb', ST.nb] : /spóź/i.test(s) ? ['sp', ST.sp] : /obec/i.test(s) ? ['ob', ST.ob] : ['', s.slice(0, 2).toUpperCase()];
    const dayKeys = Object.keys(days).filter(Boolean).sort().reverse();

    let psort = store.get('skPresSort') || 'worst', pday = 'all';
    const unexc = []; dayKeys.forEach(d => { const it = days[d].filter(x => code(x.status)[0] === 'nb').sort((a, b) => a.nr - b.nr); if (it.length) unexc.push({ d, it }); });
    const unexcN = unexc.reduce((n, g) => n + g.it.length, 0);
    function parentText() {
      return 'Dzień dobry,\nproszę o usprawiedliwienie moich nieobecności:\n' + unexc.slice().reverse().map(g => {
        const dt = parseDate(g.d), nrs = [...new Set(g.it.map(x => x.nr))].join(', '), ss = [...new Set(g.it.map(x => prettySubj(x.subject)))].join(', ');
        return `• ${DAY_SHORT[dt.getDay()]} ${dt.getDate()}.${String(dt.getMonth() + 1).padStart(2, '0')} – lekcje ${nrs} (${ss})`;
      }).join('\n') + '\n\nDziękuję i pozdrawiam';
    }
    function openUnexc(root) {
      const t = parentText();
      const sh = openSheet(root, `<h2>Do usprawiedliwienia</h2><div class="muted small">${unexcN} lekcji z ${unexc.length} dni</div>
        <textarea class="fta card" style="min-height:220px;margin-top:12px" readonly>${esc(t)}</textarea>
        <div class="btns" style="margin-top:12px;display:flex;gap:8px"><button class="btn-p" id="ucopy" style="flex:1">${I('clip', 'sm')}Kopiuj</button>${navigator.share ? `<button class="btn-s" id="ushare" style="flex:1;justify-content:center">${I('send', 'sm')}Wyślij…</button>` : ''}</div>
        <div class="note2">Tekst wysyłasz sam (SMS, WhatsApp, mail) – apka nic nie wysyła do IDU.</div>`);
      sh.querySelector('#ucopy').onclick = () => { try { navigator.clipboard.writeText(t); haptic('success'); toast(root, 'Skopiowano', 'good'); } catch (e) {} };
      const us = sh.querySelector('#ushare'); if (us) us.onclick = () => navigator.share({ text: t }).catch(() => {});
    }
    const cnt = k => dayKeys.reduce((n, d) => n + days[d].filter(x => code(x.status)[0] === k).length, 0);
    function subjHTML() {
      const cmp = { worst: (a, b) => (a.ob.pct ?? 100) - (b.ob.pct ?? 100), best: (a, b) => (b.ob.pct ?? 0) - (a.ob.pct ?? 0),
        az: (a, b) => norm(a.name).localeCompare(norm(b.name)) }[psort];
      return subj.slice().sort(cmp).map(s => `<a class="card tap" href="${esc(s.href)}" style="--c:${subjColor(s.name)}">
        <div class="row"><div class="grow b clip">${esc(prettySubj(s.name))}</div>
        <span class="pill ${s.ob.pct >= 85 ? 'good' : s.ob.pct >= 70 ? 'warn' : 'bad'}">${s.ob.pct != null ? Math.round(s.ob.pct) + '%' : '–'}</span></div>
        <div class="meter"><i style="width:${s.ob.pct || 0}%"></i></div>
        <div class="muted small" style="margin-top:6px">${s.ob.n}/${s.ob.of || 0} ${L('obecności', 'present')}${s.nb.n ? ` · ${s.nb.n} ${L('nb', 'absent')}` : ''}${s.nb.just ? ` (${s.nb.just} ${L('uspr.', 'excused')})` : ''}${s.sp.n ? ` · ${s.sp.n} ${L('spóźn.', 'late')}` : ''}${
          s.ob.of && s.ob.pct != null && s.ob.pct < 50 ? ` · <b style="color:var(--bad)">${L('uwaga: poniżej 50%', 'warning: below 50%')}</b>` : ''}</div></a>`).join('');
    }
    function daysHTML() {
      const keys = pday === 'all' ? dayKeys.slice(0, 14) : dayKeys;
      const out = keys.map(d => {
        const items = days[d].filter(x => pday === 'all' || code(x.status)[0] === pday).sort((a, b) => a.nr - b.nr);
        if (!items.length) return '';
        const dt = parseDate(d);
        return `<div class="dayh">${esc(DAY_FULL[dt.getDay()])}, ${esc(shortDate(dt))}</div><div class="card" style="padding:4px 14px">${
          items.map(x => { const [cl, lab] = code(x.status);
            return `<div class="row" style="padding:9px 0"><div class="st ${cl}">${esc(lab)}</div><div class="grow clip">${esc(prettySubj(x.subject))}</div>
            <span class="muted small">lekcja ${x.nr}</span></div>`; }).join('')}</div>`;
      }).join('');
      return out || '<div class="nores">Brak wpisów</div>';
    }
    return {
      title: 'Frekwencja', tab: 'pres', top: true,
      render(main, root) {
        const p = total && total.ob.pct != null ? total.ob.pct : null;
        main.innerHTML = `
          ${total ? `<div class="card row" style="gap:18px;padding:18px">
            <div class="ring" data-p="${p || 0}" style="--p:${p || 0}"><div><div><b>${p != null ? Math.round(p) + '%' : '–'}</b><span>${L('obecności', 'present')}</span></div></div></div>
            <div class="stats">
              <div class="stat"><span class="muted">${L('Obecności', 'Present')}</span><b>${total.ob.n}</b></div>
              <div class="stat"><span class="muted">${L('Nieobecności', 'Absent')}</span><b style="color:var(--bad)">${total.nb.n}</b></div>
              ${total.nb.just ? `<div class="stat"><span class="muted">${L('usprawiedl.', 'excused')}</span><b>${total.nb.just}</b></div>` : ''}
              <div class="stat"><span class="muted">${L('Spóźnienia', 'Late')}</span><b style="color:var(--warn)">${total.sp.n}</b></div>
            </div></div>` : ''}
          ${unexcN ? `<button class="card row tap" id="unexc" style="width:100%;border:0;color:var(--text);text-align:left;background:color-mix(in srgb,var(--bad) 15%,var(--card))">
            <div class="grow"><div class="b">${unexcN} ${plural(unexcN, 'nieusprawiedliwiona', 'nieusprawiedliwione', 'nieusprawiedliwionych')}</div>
            <div class="muted small">najstarsza ${esc(shortDate(parseDate(unexc[unexc.length - 1].d)))} · gotowy tekst dla rodzica</div></div>${I('right', 'sm chev')}</button>` : ''}
          ${subj.length ? `<div class="sec"><h2>Przedmioty</h2></div>${chipRow('ps', [{ v: 'worst', label: 'Najniższa' }, { v: 'best', label: 'Najwyższa' }, { v: 'az', label: 'A–Z' }], psort)}<div id="plist">${subjHTML()}</div>` : ''}
          ${dayKeys.length ? `<div class="sec"><h2>Ostatnie dni</h2></div>${chipRow('pd', [{ v: 'all', label: 'Wszystko' }, { v: 'nb', label: 'Nieobecności', n: cnt('nb') }, { v: 'sp', label: 'Spóźnienia', n: cnt('sp') }, { v: 'u', label: 'Usprawiedliwione', n: cnt('u') }].filter(o => o.n !== 0), pday)}<div id="pdays">${daysHTML()}</div>` : ''}`;
        const ub = root.getElementById('unexc'); if (ub) ub.onclick = () => openUnexc(root);
        wireChips(root, 'ps', v => { psort = v; store.set('skPresSort', v); const l = root.getElementById('plist'); l.innerHTML = subjHTML(); animateIn(l); });
        wireChips(root, 'pd', v => { pday = v; const l = root.getElementById('pdays'); l.innerHTML = daysHTML(); animateIn(l); });
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  MESSAGES (list)
   * ------------------------------------------------------------------ */
  function messagesPage(ctx) {
    const folders = $$('#message-folders .folder').map(f => ({ label: txt(f), href: attr($('a', f), 'href'), on: f.classList.contains('current') }));
    const current = (folders.find(f => f.on) || { label: 'Wiadomości' }).label;
    const rows = $$('table.message-table tr').filter(tr => $('td.user', tr)).map(tr => {
      const tds = $$(':scope > td', tr);
      const link = $$('a[href*="/internal_messages/"]', tr).pop();
      const cell = link ? link.closest('td') : null;
      return {
        who: txt($('.name', tr)),
        subject: txt(link), href: attr(link, 'href'),
        preview: attr(link, 'title').replace(/&#13;|&amp;#13;|&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(),
        unread: !!(cell && cell.classList.contains('unread')),
        dateS: txt(tds[tds.length - 1])
      };
    });
    try { const idx = new Map(jget('skMsgIdx', []).map(x => [x.h, x])); rows.forEach(r => { if (r.href) { idx.delete(r.href); idx.set(r.href, { s: r.subject, w: r.who, h: r.href, d: r.dateS, p: (r.preview || '').slice(0, 160) }); } });
      jset('skMsgIdx', [...idx.values()].slice(-400)); } catch (e) {}
    const pag = $('.pagination');
    const prev = pag ? $('a.previous_page, a[rel="prev"]', pag) : null;
    const next = pag ? $('a.next_page, a[rel="next"]', pag) : null;
    const q = new URLSearchParams(location.search).get('search[with_phrase]') || '';

    rows.forEach(m => { m.d = parseDate(m.dateS); });
    let mf = 'all', mq = '';
    const unreadN = rows.filter(m => m.unread).length;
    function rowHTML(m) {
      const d = m.d;
      return `<a class="msg ${m.unread ? 'unread' : ''}" href="${esc(m.href)}">
        <div class="av" style="background:${subjColor(m.who)}">${esc(initials(m.who))}</div>
        <div class="grow"><div class="from"><span class="n clip">${esc(m.who)}</span><span class="d">${esc(d ? (dayStart(d) - dayStart(new Date()) === 0 ? hhmm(d) : shortDate(d)) : m.dateS)}</span></div>
        <div class="s clip">${esc(m.subject)}</div>${m.preview ? `<div class="p two">${esc(m.preview)}</div>` : ''}</div>
        ${m.unread ? '<div class="udot"></div>' : ''}</a>`;
    }
    function listHTML() {
      const nq = norm(mq);
      const list = rows.filter(m => (mf === 'all' || m.unread) && (!nq || norm(m.who + ' ' + m.subject + ' ' + m.preview).includes(nq)))
        .slice().sort((a, b) => (b.d || 0) - (a.d || 0));
      if (!list.length) return `<div class="nores">${mq ? 'Brak wyników na tej stronie — naciśnij Enter, aby szukać we wszystkich wiadomościach' : 'Brak wiadomości'}</div>`;
      const t0 = dayStart(new Date());
      const groups = [];
      list.forEach(m => {
        const age = m.d ? (t0 - dayStart(m.d)) / 864e5 : 99;
        const g = age <= 0 ? 'Dziś' : age <= 1 ? 'Wczoraj' : age < 7 ? 'Ostatni tydzień' : age < 31 ? 'Ten miesiąc' : 'Starsze';
        const last = groups[groups.length - 1];
        if (last && last.g === g) last.items.push(m); else groups.push({ g, items: [m] });
      });
      return groups.map(g => `<div class="cat" style="margin:16px 4px 6px">${g.g}</div><div class="card" style="padding:2px 14px">${g.items.map(rowHTML).join('')}</div>`).join('');
    }
    return {
      title: current === 'Odebrane' ? 'Wiadomości' : current, tab: 'mail', top: true,
      render(main, root) {
        main.innerHTML = `
          <div class="seg">${folders.filter(f => !/nowa/i.test(f.label)).map(f =>
            f.on ? `<button class="on">${esc(f.label)}</button>` : `<a href="${esc(f.href)}">${esc(f.label)}</a>`).join('')}</div>
          <form class="search" id="sf">${I('search', 'sm')}<input id="sq" type="search" placeholder="Szukaj (Enter = we wszystkich)" value="${esc(q)}" autocomplete="off"></form>
          ${unreadN ? chipRow('mfc', [{ v: 'all', label: 'Wszystkie', n: rows.length }, { v: 'unread', label: 'Nieprzeczytane', n: unreadN }], mf) : ''}
          <div id="mlist">${listHTML()}</div>
          ${prev || next ? `<div class="row" style="justify-content:space-between;margin-top:6px">
            ${prev ? `<a class="btn-s" href="${esc(attr(prev, 'href'))}">${I('back', 'sm')}Nowsze</a>` : '<span></span>'}
            ${next ? `<a class="btn-s" href="${esc(attr(next, 'href'))}">Starsze${I('right', 'sm')}</a>` : ''}</div>` : ''}
          <a class="fab" href="/internal_messages/new" aria-label="Nowa wiadomość">${I('compose')}</a>`;
        const redraw = () => { const l = root.getElementById('mlist'); l.innerHTML = listHTML(); };
        wireChips(root, 'mfc', v => { mf = v; redraw(); animateIn(root.getElementById('mlist')); });
        root.getElementById('sq').oninput = e => { mq = e.target.value; redraw(); };
        root.getElementById('sf').onsubmit = e => {
          e.preventDefault();
          const v = root.getElementById('sq').value.trim();
          location.href = location.pathname + (v ? '?search%5Bwith_phrase%5D=' + encodeURIComponent(v) : '');
        };
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  MESSAGE (thread view + reply)
   * ------------------------------------------------------------------ */
  function messagePage(ctx) {
    const msgs = $$('[id="message"]').map(m => {
      const body = $('#message-body', m) || $('[id="message-body"]', m);
      const clone = body ? body.cloneNode(true) : document.createElement('div');
      const h4 = $('h4', clone);
      const subject = txt(h4);
      if (h4) h4.remove();
      return { who: txt($('.message-author', m)), whoHref: attr($('.message-author a', m), 'href'),
        dateS: txt($('.message-date', m)), subject, html: clone.innerHTML };
    });
    const subject = (msgs.find(m => m.subject) || {}).subject || 'Wiadomość';
    const form = $('#new_message_form');

    return {
      title: 'Wiadomość', tab: 'mail', top: false,
      render(main, root) {
        main.innerHTML = `<h1 style="font-size:24px">${esc(subject)}</h1>
          ${msgs.map(m => `<div class="card" style="padding:16px">
            <div class="mhead"><div class="av" style="background:${subjColor(m.who)}">${esc(initials(m.who))}</div>
            <div class="grow"><div class="b">${esc(m.who)}</div><div class="muted small">${esc(m.dateS)}</div></div></div>
            <div class="mbody">${m.html}</div></div>`).join('')}
          ${form ? `<div class="reply"><textarea id="rt" placeholder="Napisz odpowiedź…"></textarea>
            <button class="btn-p" id="rs">${I('send', 'sm')}<span>Wyślij</span></button></div>` : ''}`;
        if (!form) return;
        const btn = root.getElementById('rs');
        btn.onclick = async () => {
          const text = root.getElementById('rt').value.trim();
          if (!text) return;
          btn.disabled = true; btn.lastChild.textContent = 'Wysyłanie…';
          try {
            const fd = new FormData(form);
            fd.set('message[body]', text.split(/\n{2,}/).map(p => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join(''));
            fd.set('send', 'Wyślij');
            const r = await fetch(form.action, { method: 'POST', body: fd, credentials: 'same-origin' });
            if (!r.ok) throw new Error(r.status);
            haptic('success'); toast(root, 'Wysłano', 'good');
            refreshPage();
          } catch (e) {
            haptic('error');
            btn.disabled = false; btn.lastChild.textContent = 'Nie udało się – spróbuj ponownie';
          }
        };
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  HOMEWORK
   * ------------------------------------------------------------------ */
  function homeworksPage(ctx) {
    const t = $('table.object_list-table');
    const heads = $$('tr th', t).map(th => txt(th).toLowerCase());
    const col = re => heads.findIndex(h => re.test(h));
    const ci = { name: col(/nazwa/), subj: col(/subject|przedmiot/), due: col(/wysyłać|termin/), created: col(/utworzono/) };
    const now = new Date();
    const items = $$('tr', t).filter(tr => $('td', tr)).map(tr => {
      const tds = $$(':scope > td', tr);
      const g = i => i >= 0 && tds[i] ? tds[i] : null;
      const due = parseDate(txt(g(ci.due)));
      return { title: txt(g(ci.name)), subject: txt(g(ci.subj)), subjHref: attr($('a', g(ci.subj)), 'href'),
        due, created: parseDate(txt(g(ci.created))), href: attr($('td.actions a', tr) || $$('a', tr).pop(), 'href') };
    });
    const open = items.filter(i => i.due && i.due >= now).sort((a, b) => a.due - b.due);
    const rest = items.filter(i => !(i.due && i.due >= now));
    const card = i => {
      let pill = '<span class="pill">bez terminu</span>';
      if (i.due) {
        const hours = (i.due - now) / 3600000;
        pill = hours < 0 ? '<span class="pill">zakończone</span>'
          : `<span class="pill ${hours < 48 ? 'bad' : hours < 120 ? 'warn' : 'good'}">${esc(relTime(i.due) === TODAY ? TODAY + ' ' + hhmm(i.due) : relTime(i.due))}</span>`;
      }
      return `<a class="box tap" href="${esc(i.href)}" style="margin-bottom:10px"><div class="in">
        <div class="row" style="align-items:flex-start"><div class="grow ttl">${esc(i.title)}</div>${pill}</div>
        <div class="sub">${i.due ? L('Termin: ', 'Due: ') + esc(shortDate(i.due) + ', ' + hhmm(i.due)) : L('Dodano ', 'Added ') + esc(shortDate(i.created))}</div></div>
        <div class="strip" style="--c:${subjColor(i.subject)}"><span>${esc(prettySubj(i.subject))}</span></div></a>`;
    };
    const ended = items.filter(i => i.due && i.due < now);
    const nodue = items.filter(i => !i.due);
    let hf = open.length ? 'open' : 'all', hq = '';
    function hwHTML() {
      const nq = norm(hq);
      const pick = { open, ended, nodue, all: open.concat(nodue, ended.slice().sort((a, b) => b.due - a.due)) }[hf] || items;
      const list = pick.filter(i => !nq || norm(i.title + ' ' + i.subject).includes(nq));
      return list.length ? list.map(card).join('') : `<div class="nores">${hf === 'open' ? I('check', 'big') + '<div>Nic do zrobienia</div>' : 'Brak zadań'}</div>`;
    }
    return {
      title: 'Zadania domowe', tab: '', top: false,
      render(main, root) {
        main.innerHTML = items.length ? `
          <div class="search">${I('search', 'sm')}<input id="hq" type="search" placeholder="Szukaj zadania lub przedmiotu" autocomplete="off"></div>
          ${chipRow('hf', [{ v: 'open', label: 'Do zrobienia', n: open.length }, { v: 'all', label: 'Wszystkie', n: items.length },
            { v: 'nodue', label: 'Bez terminu', n: nodue.length }, { v: 'ended', label: 'Zakończone', n: ended.length }].filter(o => o.n || o.v === 'open' || o.v === 'all'), hf)}
          <div id="hl">${hwHTML()}</div>` : '<div class="empty">Brak zadań domowych</div>';
        if (!items.length) return;
        const redraw = () => { const l = root.getElementById('hl'); l.innerHTML = hwHTML(); animateIn(l); };
        wireChips(root, 'hf', v => { hf = v; redraw(); });
        root.getElementById('hq').oninput = e => { hq = e.target.value; const l = root.getElementById('hl'); l.innerHTML = hwHTML(); };
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  SUBJECT PAGE
   * ------------------------------------------------------------------ */
  function subjectPage(ctx) {
    const card = $('#subject-card');
    const name = txt($('h1', card));
    const teachers = $$('.teacher a', card).map(a => ({ n: txt(a), h: attr(a, 'href') }));
    const c = subjColor(name);
    const sid = (location.pathname.match(/\/subjects\/(\d+)/) || [])[1];
    const mod = t => moduleBy(t);
    const notes = gradeNotes();

    const gm = mod('Twoje oceny');
    const grades = gm ? $$('.profile-event.mark', gm).map(e => ({ v: txt($('.name', e)), d: txt($('.description', e)).replace(/^\(|\)$/g, ''),
      date: txt($('.date', e)), note: notes[attr($('.name a', e), 'href')] || '' })) : [];
    const pm = mod('Twoje obecności');
    const pres = pm ? $$('.profile-event', pm) : [];
    const presOk = pres.filter(e => e.classList.contains('presence')).length;
    const em = mod('Sprawdziany');
    const exams = em ? $$('.profile-event', em).map(e => ({ n: txt($('.name', e)), d: txt($('.description', e)), date: parseDate(txt($('.date', e))) })) : [];
    const am = mod('Ogłoszenia przedmiotowe');
    const anns = am ? $$('.profile-event', am).map(e => ({ n: txt($('.name', e)), h: attr($('.name a', e), 'href'), date: txt($('.date', e)), unread: !e.classList.contains('read') })) : [];
    const hm = mod('Zadania domowe');
    const hws = hm ? $$('.profile-event', hm).map(e => ({ n: txt($('.name', e)), h: attr($('.name a', e), 'href'), date: txt($('.date', e)) })) : [];
    const tm = mod('Tematy lekcji');
    const topics = [];
    if (tm) $$('.profile-event', tm).forEach(e => {
      const t = { n: txt($('.name', e)), h: attr($('.name a', e), 'href'), date: txt($('.date', e)), x: 1 };
      const last = topics[topics.length - 1];
      if (last && last.n === t.n && last.date === t.date) last.x++; else topics.push(t);
    });
    const fm = mod('Pliki');
    const files = fm ? $$('.profile-event.file', fm).map(e => ({ n: txt($('.name', e)), h: attr($('.name a', e), 'href'), size: txt($('.description', e)), date: txt($('.date', e)) })) : [];
    const forum = $('a[href^="/forums/"]', document.getElementById('content') || document);

    const list = (items, fn) => `<div class="card" style="padding:4px 14px">${items.map(fn).join('')}</div>`;
    const line = (ic, title, sub, href, right = '') => `<a class="row" href="${esc(href || '#')}" style="padding:11px 0;border-bottom:.5px solid var(--line)">
      <div style="color:var(--muted)">${I(ic, 'sm')}</div><div class="grow"><div class="clip">${esc(title)}</div>${sub ? `<div class="muted small">${esc(sub)}</div>` : ''}</div>${right}</a>`;

    return {
      title: prettySubj(name), tab: '', top: false,
      render(main) {
        main.innerHTML = `
          <div class="hero" style="--c:${c}"><h1>${esc(prettySubj(name))}</h1>
            <div>${teachers.map(t => `<a href="${esc(t.h)}">${esc(t.n)}</a>`).join(', ')}</div></div>
          <div class="card row" style="gap:10px"><div style="color:${c}">${I('image')}</div><a class="grow tap" href="/#n:${esc(encodeURIComponent(subjKey(name)))}"><div class="b">Twoje notatki</div><div class="muted small" id="snc">…</div></a>
            <a class="chip" style="margin:0" href="/#n:${esc(encodeURIComponent(subjKey(name)))}:add">${I('camera')}Zdjęcie</a></div>
          ${loadSettings().subjView === 'tiles' ? `<div class="tiles">${[
            [seeMore(gm), 'medal', 'Oceny', grades.length ? grades.length + ' · ostatnia ' + esc(grades[0].v) : 'brak'], [seeMore(pm), 'pres', 'Obecności', pres.length ? presOk + '/' + pres.length : '–'],
            [seeMore(hm), 'edit', 'Zadania', hws.length + ''], [seeMore(tm), 'book', 'Tematy', topics[0] ? esc(topics[0].n) : '–'],
            [seeMore(fm), 'file', 'Pliki', files.length + ''], [forum ? attr(forum, 'href') : '', 'chat', 'Forum', '']
          ].filter(t => t[0]).map(([h, ic, lab, v]) => `<a class="tile tap" href="${esc(h)}" style="min-height:112px"><div style="color:${c}">${I(ic)}</div><div class="tn" style="margin-top:auto">${lab}</div><div class="ts clip">${v}</div></a>`).join('')}</div>` : ''}
          <div class="chips" style="${loadSettings().subjView === 'tiles' ? 'display:none' : ''}">
            ${seeMore(gm) ? `<a class="chip" href="${esc(seeMore(gm))}">${I('grades')}Oceny</a>` : ''}
            ${seeMore(pm) ? `<a class="chip" href="${esc(seeMore(pm))}">${I('pres')}Obecności</a>` : ''}
            ${seeMore(hm) ? `<a class="chip" href="${esc(seeMore(hm))}">${I('edit')}Zadania</a>` : ''}
            ${seeMore(tm) ? `<a class="chip" href="${esc(seeMore(tm))}">${I('book')}Tematy</a>` : ''}
            ${seeMore(fm) ? `<a class="chip" href="${esc(seeMore(fm))}">${I('file')}Pliki</a>` : ''}
            ${forum ? `<a class="chip" href="${esc(attr(forum, 'href'))}">${I('chat')}Forum</a>` : ''}
          </div>
          ${exams.length ? `<div class="sec"><h2>Sprawdziany</h2></div>` + exams.map(x => `<div class="card row">
            <div class="datebox"><b>${x.date ? x.date.getDate() : '?'}</b><span>${x.date ? MONTH_SHORT[x.date.getMonth()] : ''}</span></div>
            <div class="grow"><div class="b">${esc(x.n)}</div><div class="muted small">${esc(x.d)}</div></div>
            ${x.date ? `<span class="pill ${x.date < dayStart(new Date()) ? '' : 'warn'}">${esc(relTime(x.date))}</span>` : ''}</div>`).join('') : ''}
          <div class="sec"><h2>Oceny</h2>${seeMore(gm) ? `<a href="${esc(seeMore(gm))}">Wszystkie</a>` : ''}</div>
          ${grades.length ? grades.map(g => {
            const box = `<div class="gbox" style="--c:${c};margin-bottom:8px"><div class="v">${gradeShort(g.v)}</div>
              <div class="meta"><b>${esc(g.d || g.v)}</b><span>${esc(g.date)}</span></div>${g.note ? I('down', 'sm') : ''}</div>`;
            return g.note ? `<details><summary>${box}</summary><div class="note" style="margin:0 0 10px">${g.note}</div></details>` : box;
          }).join('') : '<div class="card muted">Brak ocen</div>'}
          ${pres.length ? `<div class="sec"><h2>Obecności</h2>${seeMore(pm) ? `<a href="${esc(seeMore(pm))}">Wszystkie</a>` : ''}</div>
            <div class="card row"><div class="grow">${L(`Ostatnie ${pres.length} lekcji`, `Last ${pres.length} lessons`)}</div>
            <span class="pill good">${presOk} ${L('ob.', 'present')}</span>${pres.length - presOk ? `<span class="pill bad">${pres.length - presOk} ${L('nb.', 'absent')}</span>` : ''}</div>` : ''}
          ${anns.length ? `<div class="sec"><h2>Ogłoszenia</h2></div>` + list(anns, a => line('bell', a.n, a.date, a.h, a.unread ? '<span class="pill new">NOWE</span>' : I('right', 'sm chev'))) : ''}
          ${hws.length ? `<div class="sec"><h2>Zadania domowe</h2></div>` + list(hws, h => line('edit', h.n, h.date, h.h, I('right', 'sm chev'))) : ''}
          ${topics.length ? `<div class="sec"><h2>Tematy lekcji</h2>${seeMore(tm) ? `<a href="${esc(seeMore(tm))}">Wszystkie</a>` : ''}</div>` +
            list(topics, t => line('book', t.n, t.date + (t.x > 1 ? ' · ×' + t.x : ''), t.h)) : ''}
          ${files.length ? `<div class="sec"><h2>Pliki</h2>${seeMore(fm) ? `<a href="${esc(seeMore(fm))}">Wszystkie</a>` : ''}</div>` +
            list(files, f => line('file', f.n, f.size + ' · ' + f.date, f.h)) : ''}`;
        NOTES.all().then(a => { const k = subjKey(name), n = a.filter(x => x.key === k), el = main.querySelector('#snc');
          if (el) el.textContent = n.length ? `${n.filter(x => x.kind === 'photo').length} zdj. · ${n.filter(x => x.kind !== 'photo').length} notatek` : 'zdjęcia tablicy, notatki, listy'; });
      }
    };
  }
  /* ------------------------------------------------------------------ *
   *  LESSON TOPICS (Tematy lekcji)
   * ------------------------------------------------------------------ */
  function topicsPage(ctx) {
    const crumbs = $$('#breadcrumbs a').map(txt);
    const subj = (txt($('#breadcrumbs')).match(/>\s*([^>]+?)\s*>\s*[^>]*$/) || [])[1] || crumbs[crumbs.length - 1] || '';
    const subjName = /hol szkolny|lista/i.test(subj) ? '' : subj;
    const xls = $$('#content a').find(a => /xls|excel/i.test(txt(a)));
    const rows = [];
    $$('#content table tr').forEach(tr => {
      const tds = $$(':scope > td', tr);
      if (!tds.length) return;
      const all = tds.map(txt);
      const link = $('a', tr);
      const dateS = all.find(t => /\d{1,2}\s+[a-ząćęłńóśźż]{3}\w*\s+\d{4}/i.test(t) || /\d{4}-\d{2}-\d{2}/.test(t)) || '';
      const timeS = (all.join(' ').match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/) || []);
      const topic = link ? txt(link) : all.find(t => t && t !== dateS && !/^\d{1,2}:\d{2}/.test(t)) || '';
      if (!topic && !dateS) return;
      rows.push({ topic, href: link ? attr(link, 'href') : '', date: parseDate(dateS), dateS,
        start: timeS[1] || '', end: timeS[2] || '' });
    });
    // group by day, merge double lessons with the same topic
    const days = [];
    rows.forEach(r => {
      const key = r.date ? dayStart(r.date).getTime() : r.dateS;
      let d = days.find(x => x.key === key);
      if (!d) { d = { key, date: r.date, dateS: r.dateS, items: [] }; days.push(d); }
      const same = d.items.find(i => i.topic === r.topic);
      if (same) {
        if (r.start && (!same.start || mins(r.start) < mins(same.start))) same.start = r.start;
        if (r.end && (!same.end || mins(r.end) > mins(same.end))) same.end = r.end;
        same.n++;
      } else d.items.push(Object.assign({ n: 1 }, r));
    });
    days.forEach(d => d.items.sort((a, b) => (a.start ? mins(a.start) : 0) - (b.start ? mins(b.start) : 0)));
    const c = subjColor(subjName || 'temat');
    return {
      title: subjName ? prettySubj(subjName) : 'Tematy lekcji', tab: '', top: false,
      render(main) {
        main.innerHTML = `
          <h1>Tematy lekcji</h1>
          <p class="lead">${rows.length} ${plural(rows.length, 'lekcja', 'lekcje', 'lekcji')}${subjName ? ' · ' + esc(prettySubj(subjName)) : ''}</p>
          ${xls ? `<div class="chips" style="margin:0 0 6px"><a class="chip" href="${esc(attr(xls, 'href'))}">${I('file')}Pobierz Excel</a></div>` : ''}
          ${rows.length > 6 ? `<div class="search" style="margin-top:10px">${I('search', 'sm')}<input id="tq" type="search" placeholder="Szukaj tematu" autocomplete="off"></div>` : ''}
          ${days.length ? `<div class="tl" id="tl" style="--c:${c}">${days.map(d => `
            <div class="tday" data-k="${esc(String(d.key))}"><b>${d.date ? esc(DAY_FULL[d.date.getDay()].replace(/^./, m => m.toUpperCase())) : ''}</b>${esc(d.date ? shortDate(d.date) + ' ' + d.date.getFullYear() : d.dateS)}</div>
            ${d.items.map(i => `<a class="card topic" data-k="${esc(String(d.key))}" data-t="${esc(norm(i.topic))}" href="${esc(i.href || '#')}">
              <div class="grow"><div class="b">${esc(i.topic)}</div>${i.n > 1 ? `<div class="muted small">${i.n} lekcje</div>` : ''}</div>
              ${i.start ? `<span class="tm2">${esc(i.start)}${i.end ? '–' + esc(i.end) : ''}</span>` : ''}</a>`).join('')}`).join('')}</div>`
          : '<div class="empty">Brak tematów</div>'}`;
        const tq = main.querySelector('#tq');
        if (tq) tq.oninput = () => {
          const q = norm(tq.value.trim()); const keep = new Set();
          main.querySelectorAll('.topic').forEach(a => { const ok = !q || a.dataset.t.includes(q); a.style.display = ok ? '' : 'none'; if (ok) keep.add(a.dataset.k); });
          main.querySelectorAll('.tday').forEach(h => { h.style.display = keep.has(h.dataset.k) ? '' : 'none'; });
        };
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  LIST PAGES built from IDU "events" (announcements, attendance, …)
   * ------------------------------------------------------------------ */
  function eventsPage(ctx) {
    const crumbs = txt($('#breadcrumbs')).replace(/^Jesteś tutaj:\s*/, '').split('>').map(x => x.trim()).filter(Boolean);
    const title = crumbs[crumbs.length - 1] || 'IDU';
    const subjFromCrumbs = crumbs.length >= 3 && !/^(I |II |III |IV )/.test(crumbs[crumbs.length - 2]) ? crumbs[crumbs.length - 2] : '';
    const statusOf = s => /uspraw/i.test(s) ? ['u', ST.u, 'Usprawiedliwione'] : /nieobec/i.test(s) ? ['nb', ST.nb, 'Nieobecność']
      : /spóź/i.test(s) ? ['sp', ST.sp, 'Spóźnienie'] : /^obec/i.test(s) ? ['ob', ST.ob, 'Obecność'] : null;

    const sections = $$('#content .module').map((m, mi) => {
      const h = cleanTitle(txt($('h3', m))).replace(/:$/, '') || (mi ? 'Wszystkie' : '');
      const evs = $$('.profile-event', m).map(e => {
        const nameEl = $('.name', e);
        const link = $('.name a', e) || $('a', e);
        let nm = txt(nameEl) || txt(e), upd = '';
        const um = nm.match(/^Aktualizacja:\s*(.+?\d{1,2}:\d{2})\s+(.*)$/);
        if (um) { upd = um[1]; nm = um[2]; }
        return {
          cls: e.className, subject: txt($('.subject', e)), name: nm, upd,
          href: attr(link, 'href'), desc: txt($('.description', e)).replace(/^\(|\)$/g, ''),
          dateS: txt($('.date', e)), date: parseDate(txt($('.date', e))),
          unread: (e.classList.contains('announcement') || e.classList.contains('news')) && !e.classList.contains('read')
        };
      });
      const more = $$('.see-more a, .pagination a', m).map(a => ({ t: txt(a), h: attr(a, 'href') }));
      return { h, evs, more };
    }).filter(s => s.evs.length);

    const allStatus = sections.length > 0 && sections.every(s => s.evs.every(e => statusOf(e.name)));
    const counts = { ob: 0, nb: 0, sp: 0, u: 0 };
    if (allStatus) sections.forEach(s => s.evs.forEach(e => { counts[statusOf(e.name)[0]]++; }));
    const total = counts.ob + counts.nb + counts.sp + counts.u;

    function evHTML(e) {
      const st = statusOf(e.name);
      if (st) return `<div class="row" style="padding:10px 0;border-bottom:.5px solid var(--line)"><div class="st ${st[0]}">${st[1]}</div>
        <div class="grow"><div>${esc(st[2])}</div>${e.subject ? `<div class="muted small">${esc(prettySubj(e.subject))}</div>` : ''}</div>
        <span class="muted small">${esc(e.date ? shortDate(e.date) : e.dateS)}</span></div>`;
      const subj = e.subject || subjFromCrumbs;
      return `<a class="box tap" href="${esc(e.href || '#')}" style="margin-bottom:10px"><div class="in">
          <div class="row" style="align-items:flex-start"><div class="grow ttl">${esc(e.name)}</div>${e.unread ? '<span class="pill new">NOWE</span>' : ''}</div>
          <div class="sub">${e.desc ? esc(e.desc) + ' · ' : ''}${esc(e.date ? relTime(e.date) + (e.date.getHours() || e.date.getMinutes() ? ', ' + hhmm(e.date) : '') : e.dateS)}</div></div>
        ${subj ? `<div class="strip" style="--c:${subjColor(subj)}"><span>${esc(prettySubj(subj))}</span></div>` : ''}</a>`;
    }
    let ef = 'all', eq = '';
    const allEvs = [].concat(...sections.map(x => x.evs));
    const unreadN = allEvs.filter(e => e.unread).length;
    const subjList = [...new Set(allEvs.map(e => e.subject).filter(Boolean))];
    function passes(e) {
      if (allStatus) { if (ef !== 'all' && statusOf(e.name)[0] !== ef) return false; }
      else if (ef === 'unread') { if (!e.unread) return false; }
      else if (ef !== 'all' && e.subject !== ef) return false;
      return !eq || norm(e.name + ' ' + e.subject + ' ' + e.desc).includes(norm(eq));
    }
    function secsHTML() {
      const out = sections.map(sec => {
        const evs = sec.evs.filter(passes);
        if (!evs.length) return '';
        return `${sections.length > 1 || allStatus ? `<div class="sec"><h2>${esc(sec.h)}</h2></div>` : ''}
          ${allStatus ? `<div class="card" style="padding:2px 14px">${evs.map(evHTML).join('')}</div>` : evs.map(evHTML).join('')}
          ${sec.more.length ? `<div class="chips">${sec.more.map(m => `<a class="chip" href="${esc(m.h)}">${esc(m.t)}</a>`).join('')}</div>` : ''}`;
      }).join('');
      return out || (sections.length ? '<div class="nores">Brak wyników</div>' : `<div class="empty">${I('inbox', 'big')}<div>Nic tu jeszcze nie ma</div></div>`);
    }
    const filterOpts = allStatus
      ? [{ v: 'all', label: 'Wszystko' }, { v: 'nb', label: 'Nieobecności', n: counts.nb }, { v: 'sp', label: 'Spóźnienia', n: counts.sp }, { v: 'u', label: 'Usprawiedliwione', n: counts.u }].filter(o => o.n !== 0)
      : [{ v: 'all', label: 'Wszystko', n: allEvs.length }].concat(unreadN ? [{ v: 'unread', label: 'Nowe', n: unreadN }] : [],
          subjList.length > 1 ? subjList.map(x => ({ v: x, label: prettySubj(x), n: allEvs.filter(e => e.subject === x).length })) : []);
    return {
      title, tab: allStatus ? 'pres' : '', top: false,
      render(main, root) {
        main.innerHTML = `
          ${allStatus && total ? `<div class="card row" style="gap:18px;padding:18px">
            <div class="ring" data-p="${Math.round(100 * (counts.ob + counts.sp) / total)}"><div><div><b>${Math.round(100 * (counts.ob + counts.sp) / total)}%</b><span>${L('obecności', 'present')}</span></div></div></div>
            <div class="stats">
              <div class="stat"><span class="muted">${L('Obecności', 'Present')}</span><b>${counts.ob}</b></div>
              <div class="stat"><span class="muted">${L('Nieobecności', 'Absent')}</span><b style="color:var(--bad)">${counts.nb}</b></div>
              ${counts.u ? `<div class="stat"><span class="muted">${L('Usprawiedl.', 'Excused')}</span><b style="color:var(--accent)">${counts.u}</b></div>` : ''}
              <div class="stat"><span class="muted">${L('Spóźnienia', 'Late')}</span><b style="color:var(--warn)">${counts.sp}</b></div>
            </div></div>` : ''}
          ${!allStatus && allEvs.length > 5 ? `<div class="search">${I('search', 'sm')}<input id="eq" type="search" placeholder="Szukaj" autocomplete="off"></div>` : ''}
          ${filterOpts.length > 1 ? `<div style="margin-top:${allStatus ? 14 : 0}px">${chipRow('ef', filterOpts, ef)}</div>` : ''}
          <div id="el">${secsHTML()}</div>`;
        const redraw = anim => { const l = root.getElementById('el'); l.innerHTML = secsHTML(); if (anim) animateIn(l); };
        wireChips(root, 'ef', v => { ef = v; redraw(true); });
        const qi = root.getElementById('eq'); if (qi) qi.oninput = () => { eq = qi.value.trim(); redraw(false); };
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  Bottom sheet (used by calendar event details)
   * ------------------------------------------------------------------ */
  function openSheet(root, html) {
    const app = root.getElementById('app');
    const scrim = document.createElement('div'); scrim.className = 'sheet-scrim';
    const sh = document.createElement('div'); sh.className = 'sheet';
    sh.innerHTML = '<div class="grab"></div>' + html;
    haptic('soft');
    const close = () => { sh.classList.add('closing'); scrim.style.opacity = '0'; scrim.style.transition = 'opacity .2s';
      setTimeout(() => { sh.remove(); scrim.remove(); }, 220); };
    scrim.onclick = close;
    let y0 = null;
    sh.addEventListener('touchstart', e => { y0 = sh.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
    sh.addEventListener('touchend', e => { if (y0 != null && e.changedTouches[0].clientY - y0 > 70) close(); y0 = null; });
    app.appendChild(scrim); app.appendChild(sh);
    return sh;
  }

  /* ------------------------------------------------------------------ *
   *  CALENDAR
   * ------------------------------------------------------------------ */
  function calendarPage(ctx) {
    const url = attr($('#calendar'), 'data-events-url') || '/calendar_events.json';
    const MONTHS_FULL = EN ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      : ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
    const ymd = s => { const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/); return m ? new Date(+m[1], m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : null; };
    const key = d => d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
    const cache = {};
    let month = new Date(); month = new Date(month.getFullYear(), month.getMonth(), 1);
    let sel = dayStart(new Date());

    function gridStart(m) { const d = new Date(m); const wd = (d.getDay() + 6) % 7; d.setDate(d.getDate() - wd); return d; }
    async function load(m) {
      const k = m.getFullYear() + '-' + m.getMonth();
      if (cache[k]) return cache[k];
      const s = gridStart(m); const e = new Date(s); e.setDate(e.getDate() + 42);
      let list = [];
      try {
        const r = await fetch(`${url}?start_at=${Math.floor(s / 1000)}&stop_at=${Math.floor(e / 1000)}`, { credentials: 'same-origin' });
        list = await r.json();
      } catch (err) { list = []; }
      cache[k] = list.map(ev => {
        const start = ymd(ev.start); let end = ev.end ? ymd(ev.end) : null;
        if (ev.allDay && end) end.setDate(end.getDate() - 1);         // end date is exclusive
        const subj = (String(ev.title).match(/\(([^()]+)\)\s*$/) || [])[1];
        const exam = /grade_event/.test(ev.className || '');
        return { title: ev.title, start, end: end && end > start ? end : null, allDay: ev.allDay !== false,
          timed: !ev.allDay, exam, subj, color: exam ? subjColor(subj || ev.title) : (ev.color || '#3d9be9'),
          href: ev.url ? ev.url.replace(/^https?:\/\/[^/]+/, '') : '', detail: ev.fancybox_url || '' };
      }).filter(e => e.start);
      return cache[k];
    }
    const onDay = (list, d) => list.filter(e => { const a = dayStart(e.start), b = e.end ? dayStart(e.end) : a; return d >= a && d <= b; });
    function when(e) {
      if (e.timed) return `${shortDate(e.start)}, ${hhmm(e.start)}${e.end ? '–' + hhmm(e.end) : ''}`;
      if (e.end && dayStart(e.end) > dayStart(e.start)) return `${shortDate(e.start)} – ${shortDate(e.end)}`;
      return shortDate(e.start) + L(' · cały dzień', ' · all day');
    }
    function evCard(e, i) {
      return `<div class="card evc tap" data-i="${i}" style="--c:${e.color}"><div class="bar"></div><div class="in">
        ${e.exam ? '<div class="kind">Sprawdzian</div>' : ''}<div class="b">${esc(e.exam && e.subj ? e.title.replace(/\s*\([^()]+\)\s*$/, '') : e.title)}</div>
        <div class="when">${esc(when(e))}${e.exam && e.subj ? ' · ' + esc(prettySubj(e.subj)) : ''}</div></div></div>`;
    }

    return {
      title: 'Kalendarz', tab: '', top: false,
      render(main, root, api) {
        let shown = [], cf = 'all';
        const okF = e => cf === 'all' || (cf === 'exam' ? e.exam : !e.exam);
        async function draw(dir) {
          const list = (await load(month)).filter(okF);
          const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
          const listNext = (await load(next)).filter(okF);
          const s = gridStart(month);
          const today = dayStart(new Date());
          let cells = '';
          for (let i = 0; i < 42; i++) {
            const d = new Date(s); d.setDate(s.getDate() + i);
            const evs = onDay(list, d);
            const cls = [d.getMonth() !== month.getMonth() ? 'out' : '', d.getDay() === 0 || d.getDay() === 6 ? 'wk' : '',
              +d === +today ? 'today' : '', +d === +sel ? 'sel' : ''].join(' ');
            cells += `<button class="d ${cls}" data-d="${+d}"><span class="n">${d.getDate()}</span>
              <span class="dots">${evs.slice(0, 3).map(e => `<i style="--c:${e.color}"></i>`).join('')}</span></button>`;
          }
          const selEvs = onDay(list.concat(listNext.filter(e => !list.some(x => x.title === e.title && +x.start === +e.start))), sel);
          const all = list.concat(listNext.filter(e => !list.some(x => x.title === e.title && +x.start === +e.start)));
          const upcoming = all.filter(e => (e.end || e.start) >= today).sort((a, b) => a.start - b.start).slice(0, 8);
          shown = selEvs.concat(upcoming);
          main.innerHTML = `
            <div class="calhead"><h1>${MONTHS_FULL[month.getMonth()]} ${month.getFullYear()}</h1>
              <button class="today-btn" id="ct">Dziś</button>
              <button class="iconbtn" id="cp" aria-label="Poprzedni">${I('back', 'sm')}</button>
              <button class="iconbtn" id="cn" aria-label="Następny">${I('right', 'sm')}</button></div>
            <div class="cal" id="cal"><div class="wd">${(EN ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] : ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']).map(x => `<span>${x}</span>`).join('')}</div>
              <div class="days7 ${dir === 1 ? 'slideL' : dir === -1 ? 'slideR' : ''}">${cells}</div></div>
            <div style="margin-top:12px">${chipRow('cf', [{ v: 'all', label: 'Wszystko' }, { v: 'exam', label: 'Sprawdziany' }, { v: 'event', label: 'Wydarzenia' }], cf)}</div>
            <div class="sec"><h2>${esc(+sel === +today ? 'Dziś' : DAY_FULL[sel.getDay()].replace(/^./, m => m.toUpperCase()) + ', ' + shortDate(sel))}</h2></div>
            ${selEvs.length ? selEvs.map((e, i) => evCard(e, i)).join('') : '<div class="card muted" style="text-align:center">Brak wydarzeń</div>'}
            ${upcoming.length ? `<div class="sec"><h2>Nadchodzące</h2></div>` + upcoming.map((e, i) => evCard(e, selEvs.length + i)).join('') : ''}`;
          wire();
          if (dir === 0) api.animate();
        }
        function wire() {
          root.getElementById('cp').onclick = () => { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); draw(-1); };
          root.getElementById('cn').onclick = () => { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); draw(1); };
          root.getElementById('ct').onclick = () => { const t = new Date(); month = new Date(t.getFullYear(), t.getMonth(), 1); sel = dayStart(t); draw(0); };
          main.querySelectorAll('.cal .d').forEach(b => b.onclick = () => {
            const d = new Date(+b.dataset.d);
            if (d.getMonth() !== month.getMonth()) { const dir = d > month ? 1 : -1; month = new Date(d.getFullYear(), d.getMonth(), 1); sel = d; draw(dir); return; }
            sel = d; draw(2);
          });
          main.querySelectorAll('.evc').forEach(c => c.onclick = () => showEvent(shown[+c.dataset.i]));
          wireChips(root, 'cf', v => { cf = v; draw(2); });
          const cal = root.getElementById('cal'); let x0 = null;
          cal.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
          cal.addEventListener('touchend', e => {
            if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
            if (Math.abs(dx) > 50) root.getElementById(dx < 0 ? 'cn' : 'cp').click();
          });
        }
        async function showEvent(e) {
          if (!e) return;
          if (!e.detail) { if (e.href) location.href = e.href; return; }
          const sh = openSheet(root, `<div class="kind" style="--c:${e.color}">${e.exam ? 'Sprawdzian' : 'Wydarzenie'}</div>
            <h2>${esc(e.title)}</h2><div class="muted">${esc(when(e))}</div><div class="mbody" id="evbody" style="margin-top:14px"><div class="muted small">Ładowanie…</div></div>`);
          try {
            const html = await (await fetch(e.detail, { credentials: 'same-origin' })).text();
            const d = new DOMParser().parseFromString(html, 'text/html');
            const m = d.querySelector('.module') || d.body;
            const h = m.querySelector('h3'); if (h) h.remove();
            const by = m.querySelector('div[style*="float: right"] a, div[style*="float:right"] a');
            if (by) by.closest('div').remove();
            m.querySelectorAll('strong').forEach(st => { if (/\d{1,2}:\d{2}/.test(st.textContent)) { const p = st.closest('p') || st; p.remove(); } });
            sh.querySelector('#evbody').innerHTML = (m.innerHTML.trim() || '') +
              (by ? `<div class="muted small" style="margin-top:12px">Dodane przez <a href="${esc(attr(by, 'href'))}">${esc(txt(by))}</a></div>` : '');
          } catch (err) { sh.querySelector('#evbody').innerHTML = '<div class="muted">Nie udało się wczytać szczegółów.</div>'; }
        }
        main.innerHTML = '<div class="empty">Ładowanie kalendarza…</div>';
        draw(0);
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  FORUM LIST / SUBFORUM
   * ------------------------------------------------------------------ */
  function forumListPage(ctx) {
    const h1 = cleanTitle(txt($('#content h1')));
    const actions = $$('#content .action-button a').map(a => ({ t: txt(a), h: attr(a, 'href') }));
    const sections = $$('#content table.forum-table').map(t => {
      const head = txt($('.forum-header h4, .forum-header', t));
      const rows = $$('tr', t).filter(tr => !$('.forum-header', tr)).map(tr => {
        const isNew = /^nowe/i.test(attr($('td.icon img', tr), 'alt'));
        const th = $('.thread-title', tr);
        if (th) {
          const a = $('.title a', th);
          return { kind: 'thread', title: txt(a), href: attr(a, 'href'), last: txt($('.last-post a', th)),
            date: parseDate(txt($('.post-date', tr))), author: txt($('.post-author', tr)),
            replies: (txt($('.thread-data', tr)).match(/(\d+)\s+odpowied/) || [])[1] || '', isNew };
        }
        const sf = $('.subforum-title', tr);
        if (sf) { const a = $('.title a', sf); return { kind: 'sub', title: txt(a), href: attr(a, 'href'), count: txt($('.post-count', tr)), isNew }; }
        const a = $('a', tr);
        return a ? { kind: 'more', title: txt(a), href: attr(a, 'href') } : { kind: 'empty', title: txt(tr) };
      }).filter(r => r.title);
      return { head, rows };
    }).filter(s => s.rows.length);
    const threadCard = r => `<a class="card tap" data-t="${esc(norm(r.title + ' ' + r.last + ' ' + r.author))}" href="${esc(r.href)}">
        <div class="row" style="align-items:flex-start"><div class="grow b">${esc(r.title)}</div>${r.isNew ? '<span class="pill new">NOWE</span>' : ''}</div>
        ${r.last ? `<div class="muted two" style="font-size:14px;margin-top:4px">${esc(r.last)}</div>` : ''}
        <div class="muted small" style="margin-top:8px;display:flex;gap:6px;align-items:center">${I('user', 'xs')}${esc(r.author)} · ${esc(relTime(r.date))}
          ${r.replies ? `<span style="margin-left:auto;display:flex;gap:4px;align-items:center">${I('chat', 'xs')}${esc(r.replies)}</span>` : ''}</div></a>`;
    return {
      title: h1 && !/twoje fora/i.test(h1) ? h1 : 'Forum', tab: '', top: false,
      render(main) {
        main.innerHTML = `<div class="search">${I('search', 'sm')}<input id="fq" type="search" placeholder="Szukaj na forum" autocomplete="off"></div>
          ${actions.length ? `<div class="chips" style="margin:4px 0 4px">${actions.map(a => `<a class="chip" href="${esc(a.h)}">${I(/szuk|wyszuk/i.test(a.t) ? 'search' : /nowy/i.test(a.t) ? 'plus' : 'right')}${esc(a.t)}</a>`).join('')}</div>` : ''}
          ${sections.map(sec => {
            const subs = sec.rows.filter(r => r.kind === 'sub');
            const threads = sec.rows.filter(r => r.kind === 'thread');
            const more = sec.rows.filter(r => r.kind === 'more');
            const empty = sec.rows.filter(r => r.kind === 'empty');
            return `<div class="sec"><h2>${esc(sec.head || 'Wątki')}</h2></div>
              ${threads.map(threadCard).join('')}
              ${subs.length ? `<div class="card" style="padding:2px 14px">${subs.map(r => `<a class="frow" data-t="${esc(norm(r.title))}" href="${esc(r.href)}">
                <div class="av" style="width:34px;height:34px;font-size:14px;background:${subjColor(r.title)}">${esc(prettySubj(r.title).charAt(0))}</div>
                <div class="grow"><div class="b clip">${esc(prettySubj(r.title))}</div><div class="muted small">${esc(r.count)}</div></div>
                ${r.isNew ? '<span class="newdot"></span>' : ''}${I('right', 'sm chev')}</a>`).join('')}</div>` : ''}
              ${empty.map(r => `<div class="card muted">${esc(r.title)}</div>`).join('')}
              ${more.map(r => `<div class="chips" style="margin-top:2px"><a class="chip" href="${esc(r.href)}">${esc(r.title)}${I('right')}</a></div>`).join('')}`;
          }).join('')}`;
        const fq = main.querySelector('#fq');
        fq.oninput = () => {
          const q = norm(fq.value.trim());
          main.querySelectorAll('[data-t]').forEach(el => { el.style.display = !q || el.dataset.t.includes(q) ? '' : 'none'; });
        };
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  THREAD (forum topic) and ARTICLE with comments (Aktualności)
   * ------------------------------------------------------------------ */
  function threadPage(ctx) {
    const h1el = $('#content h1');
    const owner = $('#go_to_forum_owner a');
    const ownerBox = $('#go_to_forum_owner');
    const title = h1el ? txt(h1el).replace(ownerBox ? txt(ownerBox) : '', '').trim() : 'Wątek';
    // article body (Aktualności): the module with the h1 that has no posts table
    const artMod = h1el ? h1el.closest('.module') : null;
    let article = '';
    if (artMod && !$('table.thread-table', artMod)) {
      const c = artMod.cloneNode(true); const h = $('h1', c); if (h) h.remove(); article = c.innerHTML;
    }
    const posts = $$('table.thread-table tr').filter(tr => $('td.author', tr)).map(tr => ({
      who: txt($('.author-name', tr)), whoHref: attr($('.author-name a', tr), 'href'), cls: txt($('.author-class', tr)),
      date: parseDate(txt($('.post-data', tr))), dateS: txt($('.post-data', tr)), html: ($('.post-body', tr) || {}).innerHTML || ''
    }));
    const form = $('form.thread-reply, form#new_comment_form, form.new_comment');
    const ta = form ? $('textarea', form) : null;
    const submit = form ? $('input[type=submit]', form) : null;
    const actions = $$('#content .action-button a').map(a => ({ t: txt(a), h: attr(a, 'href') }));
    const isComments = !!$('#comments');
    return {
      title: isComments ? 'Aktualność' : 'Forum', tab: '', top: false,
      render(main, root) {
        main.innerHTML = `<h1 style="font-size:24px">${esc(title)}</h1>
          ${owner || actions.length ? `<div class="chips" style="margin:6px 0 10px">
            ${owner ? `<a class="chip" href="${esc(attr(owner, 'href'))}">${I('layers')}${esc(txt(owner))}</a>` : ''}
            ${actions.map(a => `<a class="chip" href="${esc(a.h)}">${I('file')}${esc(a.t.replace(/Pokaż wszystkie załączniki do tego tematu/i, 'Załączniki'))}</a>`).join('')}</div>` : ''}
          ${article ? `<div class="article"><div class="mbody">${article}</div></div>` : ''}
          ${isComments || posts.length ? `<div class="sec"><h2>${isComments ? 'Komentarze' : 'Posty'}${posts.length ? ' · ' + posts.length : ''}</h2></div>` : ''}
          ${posts.length ? posts.map(p => `<div class="post"><div class="av" style="background:${subjColor(p.who)}">${esc(initials(p.who))}</div>
            <div class="bubble"><div class="hd"><b>${esc(p.who)}</b><span>${esc(p.cls ? p.cls + ' · ' : '')}${esc(p.date ? relTime(p.date) : p.dateS)}</span></div>
            <div class="mbody">${p.html}</div></div></div>`).join('')
            : `<div class="card muted" style="text-align:center">${isComments ? 'Brak komentarzy' : 'Brak postów. Napisz pierwszy!'}</div>`}
          ${form && ta ? `<div class="reply"><textarea id="rt" placeholder="${isComments ? 'Dodaj komentarz…' : 'Napisz odpowiedź…'}"></textarea>
            <button class="btn-p" id="rs">${I('send', 'sm')}<span>${isComments ? 'Dodaj komentarz' : 'Odpowiedz'}</span></button></div>` : ''}`;
        const btn = root.getElementById('rs');
        if (!btn) return;
        btn.onclick = async () => {
          const text = root.getElementById('rt').value.trim();
          if (!text) return;
          btn.disabled = true; btn.lastChild.textContent = 'Wysyłanie…';
          try {
            const fd = new FormData(form);
            fd.set(ta.name, text);
            if (submit && submit.name) fd.set(submit.name, submit.value);
            const r = await fetch(form.action, { method: 'POST', body: fd, credentials: 'same-origin' });
            if (!r.ok) throw new Error(r.status);
            haptic('success'); toast(root, isComments ? 'Dodano komentarz' : 'Opublikowano', 'good');
            refreshPage();
          } catch (e) { haptic('error'); btn.disabled = false; btn.lastChild.textContent = 'Nie udało się – spróbuj ponownie'; }
        };
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  DOCUMENTS
   * ------------------------------------------------------------------ */
  function docsPage(ctx) {
    const rows = []; let cat = '';
    $$('#content table.object_list-table tr').forEach(tr => {
      const tds = $$(':scope > td', tr);
      if (!tds.length) return;
      let i = 0;
      if (tds.length >= 4 || tds[0].hasAttribute('rowspan')) { cat = txt(tds[0]); i = 1; }
      const acts = $$('td.actions a', tr).map(a => ({ t: txt(a), h: attr(a, 'href') }));
      rows.push({ cat: cat || 'Inne', name: txt(tds[i]), date: txt(tds[i + 1]), acts });
    });
    const groups = {};
    rows.forEach(r => { (groups[r.cat] = groups[r.cat] || []).push(r); });
    const q = new URLSearchParams(location.search).get('school_search[name_like]') || '';
    return {
      title: 'Dokumenty', tab: '', top: false,
      render(main, root) {
        main.innerHTML = `<form class="search" id="ds">${I('search', 'sm')}<input id="dq" type="search" placeholder="Szukaj dokumentu" value="${esc(q)}"></form>
          ${rows.length ? Object.entries(groups).map(([c, list]) => `<div class="sec"><h2>${esc(c)}</h2><span class="muted small">${list.length}</span></div>
            ${list.map(r => `<div class="card"><div class="row" style="align-items:flex-start"><div class="icon" style="width:40px;height:40px;border-radius:12px;background:var(--card2);display:grid;place-items:center;color:var(--accent)">${I('file')}</div>
              <div class="grow"><div class="b">${esc(r.name)}</div><div class="muted small">${esc(r.date)}</div></div></div>
              <div class="chips">${r.acts.map(a => `<a class="chip" href="${esc(a.h)}" ${/pobierz/i.test(a.t) ? 'style="background:var(--accent);color:#fff"' : ''}>${I(/pobierz/i.test(a.t) ? 'down' : 'right')}${esc(a.t)}</a>`).join('')}</div></div>`).join('')}`).join('')
            : '<div class="empty">Brak dokumentów</div>'}`;
        root.getElementById('ds').onsubmit = e => {
          e.preventDefault();
          const v = root.getElementById('dq').value.trim();
          location.href = '/documents/attachments' + (v ? '?school_search%5Bname_like%5D=' + encodeURIComponent(v) : '');
        };
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  HOMEWORK DETAIL
   * ------------------------------------------------------------------ */
  function hwDetailPage(ctx) {
    const mods = $$('#content .module');
    const main0 = mods[0];
    const title = txt($('h3', main0));
    const crumbs = $$('#breadcrumbs a');
    const subjA = crumbs.find(a => /^\/subjects\/\d+$/.test(attr(a, 'href')));
    const subj = subjA ? txt(subjA) : '';
    let desc = '', due = null, created = '';
    const c = main0.cloneNode(true);
    $$('p', c).forEach(p => {
      const t = txt(p);
      if (/wysyłać do/i.test(t)) { due = parseDate(t); p.remove(); }
      else if (/^utworzono/i.test(t)) { created = t.replace(/^utworzono:?\s*/i, ''); p.remove(); }
    });
    const h = $('h3', c); if (h) h.remove();
    $$('strong', c).forEach(st => { if (/^opis:?$/i.test(txt(st))) { const br = st.nextElementSibling; if (br && br.tagName === 'BR') br.remove(); st.remove(); } });
    desc = c.innerHTML.trim();
    const filesMod = mods.find(m => /wysłane pliki/i.test(txt($('h3', m))));
    const files = filesMod ? $$('a', filesMod).map(a => ({ t: txt(a), h: attr(a, 'href') })) : [];
    const add = $$('#content .action-button a').find(a => /dodaj plik/i.test(txt(a)));
    const now = new Date();
    return {
      title: 'Zadanie domowe', tab: '', top: false,
      render(main) {
        const hours = due ? (due - now) / 3600000 : null;
        main.innerHTML = `<div class="hero" style="--c:${subjColor(subj || title)}"><div style="opacity:.85;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px">${esc(prettySubj(subj) || 'Zadanie')}</div>
            <h1 style="margin-top:4px">${esc(title)}</h1>
            ${due ? `<div style="font-weight:600">${L('Termin', 'Due')}: ${esc(shortDate(due) + ', ' + hhmm(due))} · ${esc(hours < 0 ? L('zakończone', 'closed') : relTime(due))}</div>` : ''}</div>
          ${desc ? `<div class="sec"><h2>Opis</h2></div><div class="article"><div class="mbody">${desc}</div></div>` : ''}
          <div class="sec"><h2>Twoje pliki</h2></div>
          <div class="card" style="padding:4px 14px">${files.length ? files.map(f => `<a class="frow" href="${esc(f.h)}"><div style="color:var(--accent)">${I('file', 'sm')}</div><div class="grow clip">${esc(f.t)}</div>${I('down', 'sm chev')}</a>`).join('')
            : '<div class="muted" style="padding:10px 0">Nie wysłano jeszcze plików</div>'}</div>
          ${add && (hours == null || hours >= 0) ? `<a class="btn-p" href="${esc(attr(add, 'href'))}">${I('plus', 'sm')}Dodaj plik</a>` : ''}
          ${created ? `<div class="muted small" style="text-align:center;margin-top:14px">${L('Utworzono', 'Created')} ${esc(created)}</div>` : ''}`;
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  SUBJECT LIST
   * ------------------------------------------------------------------ */
  function subjectsListPage(ctx) {
    const rows = $$('#content table.subjects-table tr').map(tr => {
      const tds = $$(':scope > td', tr); if (tds.length < 2) return null;
      const name = txt(tds[0]).split(' / ')[0];
      const a = $('td.actions a', tr) || $('a', tr);
      return { name, teacher: txt(tds[1]), href: attr(a, 'href') };
    }).filter(Boolean);
    return {
      title: 'Przedmioty', tab: '', top: false,
      render(main) {
        main.innerHTML = rows.map(r => `<a class="card row tap" href="${esc(r.href)}"><div class="av" style="background:${subjColor(r.name)}">${esc(prettySubj(r.name).charAt(0))}</div>
          <div class="grow"><div class="b clip">${esc(prettySubj(r.name))}</div><div class="muted small two">${esc(r.teacher)}</div></div>${I('right', 'sm chev')}</a>`).join('');
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  PROFILE
   * ------------------------------------------------------------------ */
  function profilePage(ctx) {
    const card = $('#student-card');
    const name = txt($('#student-data h3', card)) || ctx.name;
    const h6 = $('#student-data h6', card);
    const klass = h6 ? $('a[href^="/klasses"]', h6) : null;
    const tutor = h6 ? $('a[href^="/teachers"]', h6) : null;
    const year = h6 ? (txt(h6).match(/rocznik:\s*([^\s].*?)\s+Klasa/i) || [])[1] : '';
    const parents = $$('#parents .data a', card).map(a => ({ n: txt(a), h: attr(a, 'href') }));
    const edit = $('a.edit', card);
    const isMe = location.pathname === ctx.student;
    // personal data: label (<p>) followed by value (.data)
    const fields = [];
    $$('#contact-data p, #messengers p', card).forEach(p => {
      const label = txt(p).replace(/:$/, '');
      const v = p.nextElementSibling;
      if (!v || !v.classList.contains('data')) return;
      const val = v.innerText ? v.innerText.replace(/\s*\n\s*/g, ', ').trim() : txt(v);
      if (label && val && !/^dane kontaktowe$/i.test(label)) fields.push({ label, val });
    });
    const marks = $$('.module').filter(m => /oceny/i.test(txt($('h3', m)))).flatMap(m => $$('.profile-event.mark', m)).slice(0, 5).map(e => ({
      subject: txt($('.subject', e)), v: txt($('.name', e)), d: txt($('.description', e)).replace(/^\(|\)$/g, ''), date: txt($('.date', e)) }));
    const pres = $$('.module').filter(m => /obecno/i.test(txt($('h3', m)))).flatMap(m => $$('.profile-event', m)).slice(0, 6).map(e => ({
      subject: txt($('.subject', e)), name: txt($('.name', e)), date: txt($('.date', e)), ok: e.classList.contains('presence') }));
    return {
      title: isMe ? 'Mój profil' : name, tab: '', top: false,
      render(main) {
        main.innerHTML = `<div class="phero">${PERSON_AV}<h1>${esc(name)}</h1>
            <div class="chips" style="justify-content:center;margin-top:6px">
              ${klass ? `<a class="chip" href="${esc(attr(klass, 'href'))}">${I('users')}${L('Klasa', 'Class')} ${esc(txt(klass))}</a>` : ''}
              ${year ? `<span class="chip">${I('clock')}${esc(year)}</span>` : ''}</div></div>
          ${tutor ? `<div class="sec"><h2>Wychowawca</h2></div><a class="card row tap" href="${esc(attr(tutor, 'href'))}">
            <div class="av" style="background:${subjColor(txt(tutor))}">${esc(initials(txt(tutor)))}</div><div class="grow b">${esc(txt(tutor))}</div>${I('right', 'sm chev')}</a>` : ''}
          ${isMe ? `<div class="chips"><a class="chip" href="${esc(ctx.student)}/grades">${I('grades')}Oceny</a><a class="chip" href="${esc(ctx.student)}/presences">${I('pres')}Frekwencja</a>
            <a class="chip" href="${esc(ctx.student)}/homeworks">${I('edit')}Zadania</a><a class="chip" href="/#plan">${I('calendar')}Plan</a></div>` : ''}
          ${parents.length ? `<div class="sec"><h2>Rodzice / opiekunowie</h2></div><div class="card" style="padding:2px 14px">${parents.map(p => `<a class="frow" href="${esc(p.h)}">
            <div class="av" style="width:34px;height:34px;font-size:13px;background:${subjColor(p.n)}">${esc(initials(p.n))}</div><div class="grow">${esc(p.n)}</div>${I('right', 'sm chev')}</a>`).join('')}</div>` : ''}
          ${fields.length ? `<div class="sec"><h2>Dane osobowe</h2></div><details class="card"><summary class="row"><div style="color:var(--muted)">${I('user', 'sm')}</div>
            <div class="grow">Pokaż dane (adres, PESEL, telefon…)</div>${I('down', 'sm chev')}</summary>
            <div style="margin-top:8px">${fields.map(f => `<div class="kv"><span>${esc(f.label)}</span><span>${esc(f.val)}</span></div>`).join('')}</div></details>` : ''}
          ${marks.length ? `<div class="sec"><h2>Ostatnie oceny</h2><a href="${esc(ctx.student)}/grades">Wszystkie</a></div>` + marks.map(m =>
            `<div class="gbox" style="--c:${subjColor(m.subject)};margin-bottom:8px"><div class="v">${gradeShort(m.v)}</div><div class="meta"><b>${esc(prettySubj(m.subject))}</b><span class="two">${esc(m.d)} · ${esc(m.date)}</span></div></div>`).join('') : ''}
          ${pres.length ? `<div class="sec"><h2>Ostatnie obecności</h2><a href="${esc(ctx.student)}/presences">Wszystkie</a></div><div class="card" style="padding:2px 14px">${pres.map(p =>
            `<div class="frow"><div class="st ${p.ok ? 'ob' : /spóź/i.test(p.name) ? 'sp' : /uspraw/i.test(p.name) ? 'u' : 'nb'}">${p.ok ? ST.ob : /spóź/i.test(p.name) ? ST.sp : /uspraw/i.test(p.name) ? ST.u : ST.nb}</div>
            <div class="grow clip">${esc(prettySubj(p.subject))}</div><span class="muted small">${esc(p.date)}</span></div>`).join('')}</div>` : ''}
          ${isMe && edit ? `<div class="chips" style="justify-content:center;margin-top:16px"><a class="chip" href="${esc(attr(edit, 'href'))}">${I('edit')}Edytuj profil</a></div>` : ''}`;
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  CLASS PAGE
   * ------------------------------------------------------------------ */
  function klassPage(ctx) {
    const card = $('#subject-card');
    const name = txt($('h1', card)).replace(/^Klasa:\s*/i, '');
    const year = txt($('span', card));
    const tutors = $$('.teacher a', card).map(a => ({ n: txt(a), h: attr(a, 'href') }));
    const forum = $$('#content a').find(a => /forum klasy/i.test(txt(a)));
    const students = $$('ul.students li .name a').map(a => ({ n: txt(a), h: attr(a, 'href'), me: attr(a, 'href') === ctx.student }));
    const plan = $$('#content a').find(a => /lesson_plan/.test(attr(a, 'href')));
    return {
      title: L('Klasa ', 'Class ') + name, tab: '', top: false,
      render(main) {
        main.innerHTML = `<div class="hero" style="--c:${subjColor(name)}"><div style="opacity:.85;font-size:13px;font-weight:700">KLASA</div>
            <h1 style="margin:2px 0 4px">${esc(name)}</h1><div style="font-weight:600">${esc(year)} · ${students.length} ${plural(students.length, 'uczeń', 'uczniów', 'uczniów')}</div></div>
          <div class="chips">${forum ? `<a class="chip" href="${esc(attr(forum, 'href'))}">${I('chat')}Forum klasy</a>` : ''}
            ${plan ? `<a class="chip" href="${esc(attr(plan, 'href'))}">${I('calendar')}Plan do druku</a>` : ''}</div>
          ${tutors.length ? `<div class="sec"><h2>${tutors.length > 1 ? 'Wychowawcy' : 'Wychowawca'}</h2></div>` + tutors.map(t => `<a class="card row tap" href="${esc(t.h)}">
            <div class="av" style="background:${subjColor(t.n)}">${esc(initials(t.n))}</div><div class="grow b">${esc(t.n)}</div>${I('right', 'sm chev')}</a>`).join('') : ''}
          ${students.length ? `<div class="sec"><h2>Uczniowie</h2><span class="muted small">${students.length}</span></div>
            <div class="search">${I('search', 'sm')}<input id="kq" type="search" placeholder="Szukaj ucznia" autocomplete="off"></div>
            <div class="card" style="padding:2px 14px" id="kl">${students.map((st, i) => `<a class="frow" data-t="${esc(norm(st.n))}" href="${esc(st.h)}">
              <span class="muted small" style="width:20px;text-align:right">${i + 1}</span>
              <div class="av" style="width:34px;height:34px;font-size:13px;background:${subjColor(st.n)}">${esc(initials(st.n))}</div>
              <div class="grow clip ${st.me ? 'b' : ''}">${esc(st.n)}${st.me ? ' <span class="pill new">TY</span>' : ''}</div></a>`).join('')}</div>` : ''}`;
        const kq = main.querySelector('#kq');
        if (kq) kq.oninput = () => { const q = norm(kq.value.trim()); main.querySelectorAll('#kl [data-t]').forEach(el => { el.style.display = !q || el.dataset.t.includes(q) ? '' : 'none'; }); };
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  TEACHER / PARENT PAGE
   * ------------------------------------------------------------------ */
  function personPage(ctx) {
    const card = $('#student-card');
    const h3 = $('#student-data h3', card);
    const send = $('.send-message a', card);
    const name = h3 ? txt(h3).replace(send ? txt(send) : '', '').trim() : 'Profil';
    const isTeacher = /^\/teachers\//.test(location.pathname);
    const fields = [];
    $$('#messengers p, #contact-data p, #social-media p', card).forEach(p => {
      const v = p.nextElementSibling; if (!v || !v.classList.contains('data')) return;
      const val = txt(v); if (val) fields.push({ label: txt(p).replace(/:$/, ''), val, link: $('a', v) ? attr($('a', v), 'href') : '' });
    });
    const groups = $$('.module').filter(m => m !== card.closest('.module')).map(m => ({
      h: cleanTitle(txt($('h3', m))), links: $$('.foldable strong a, .foldable > div > a', m).map(a => ({ t: txt(a), h: attr(a, 'href') }))
    })).filter(g => g.links.length);
    return {
      title: isTeacher ? 'Nauczyciel' : 'Profil', tab: '', top: false,
      render(main) {
        main.innerHTML = `<div class="phero">${PERSON_AV}<h1>${esc(name)}</h1><div class="muted">${isTeacher ? 'Nauczyciel' : 'Rodzic / opiekun'}</div></div>
          ${send ? `<a class="btn-p" href="${esc(attr(send, 'href'))}">${I('mail', 'sm')}Wyślij wiadomość</a>` : ''}
          ${fields.length ? `<div class="sec"><h2>Kontakt</h2></div><div class="card">${fields.map(f => `<div class="kv"><span>${esc(f.label)}</span><span>${f.link ? `<a href="${esc(f.link)}" style="color:var(--accent)">${esc(f.val)}</a>` : esc(f.val)}</span></div>`).join('')}</div>` : ''}
          ${groups.map(g => `<div class="sec"><h2>${esc(g.h)}</h2></div><div class="card" style="padding:2px 14px">${g.links.map(l => `<a class="frow" href="${esc(l.h)}">
            <div class="av" style="width:34px;height:34px;font-size:13px;background:${subjColor(l.t)}">${esc(l.t.charAt(0).toUpperCase())}</div><div class="grow clip">${esc(l.t)}</div>${I('right', 'sm chev')}</a>`).join('')}</div>`).join('')}`;
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  SUBJECT ANNOUNCEMENT (IDU requires confirming it before anything else)
   * ------------------------------------------------------------------ */
  function announcementPage(ctx) {
    const mod = $('#content .module');
    const h2 = $('h2', mod);
    const subjA = $('a', h2);
    const subj = subjA ? txt(subjA) : '';
    const title = (txt(h2).match(/"([^"]+)"/) || [])[1] || txt(h2).replace(/^Ogłoszenie:\s*/, '');
    const confirm = $$('a', mod).find(a => /potwierdzam/i.test(txt(a)));
    const c = mod.cloneNode(true);
    c.querySelector('h2').remove();
    $$('a', c).forEach(a => { if (/potwierdzam/i.test(txt(a))) a.remove(); });
    $$('br', c).forEach(b => { if (!b.previousSibling || /^\s*$/.test(b.previousSibling.textContent || '')) b.remove(); });
    const required = /wymagane jest potwierdzenie/i.test(txt($('#flash-messages-section')));
    return {
      title: 'Ogłoszenie', tab: '', top: !!required,
      render(main, root) {
        main.innerHTML = `${required ? `<div class="alert">${I('alert')}<div class="grow small"><b>Nowe ogłoszenie do potwierdzenia.</b><br>IDU pokaże resztę dopiero po jego przeczytaniu.</div></div>` : ''}
          <div class="box" style="margin-top:8px"><div class="in" style="padding:16px">
            <div class="kind" style="--c:${subjColor(subj)}">Ogłoszenie</div><h1 style="font-size:24px;margin:2px 0 10px">${esc(title)}</h1>
            <div class="mbody">${c.innerHTML}</div></div>
            ${subj ? `<a class="strip" href="${esc(attr(subjA, 'href'))}" style="--c:${subjColor(subj)}"><span>${esc(prettySubj(subj))}</span>${I('right', 'xs')}</a>` : ''}</div>
          ${confirm ? `<button class="btn-p" id="conf" style="margin-top:16px">${I('check', 'sm')}<span>Potwierdzam przeczytanie</span></button>` : ''}`;
        const b = root.getElementById('conf');
        if (b) b.onclick = () => { b.disabled = true; b.lastChild.textContent = 'Potwierdzanie…'; 
          // same request IDU's own link sends (POST with the page's CSRF token)
          const f = document.createElement('form'); f.method = 'post'; f.action = confirm.href; f.style.display = 'none';
          const t = document.createElement('input'); t.type = 'hidden';
          t.name = attr($('meta[name="csrf-param"]'), 'content') || 'authenticity_token'; t.value = attr($('meta[name="csrf-token"]'), 'content');
          f.appendChild(t); document.body.appendChild(f); f.submit();
          setTimeout(() => { b.disabled = false; b.lastChild.textContent = 'Potwierdzam przeczytanie'; }, 6000); };
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  Timetable view used by printable plans and room pages
   * ------------------------------------------------------------------ */
  function scheduleView(el, root, plan, opts) {
    const days = [1, 2, 3, 4, 5];
    const today = new Date().getDay();
    let day = today >= 1 && today <= 5 ? today : 1;
    let mode = store.get('skPlanMode') === 'week' ? 'week' : 'day';
    const nowM = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
    const short = t => t && t.length > 40 ? t.split(',')[0] + ' i in.' : t;
    const meta = l => [opts.teacher !== false ? short(l.teacher) : '', opts.klass ? l.klass : ''].filter(Boolean).map(esc).join(' · ');
    function list(wd) {
      const ls = (plan[wd] || []).slice().sort((a, b) => a.nr - b.nr);
      if (!ls.length) return `<div class="empty">${I('sun', 'big')}<div>Brak lekcji</div></div>`;
      const n = nowM(), isToday = wd === today;
      return ls.map(l => {
        let st = '';
        if (isToday) { if (n >= mins(l.start) && n <= mins(l.end)) st = 'cur'; else if (n > mins(l.end)) st = 'past'; }
        return `<a class="card les tap ${st}" href="${esc(l.href)}" style="--c:${subjColor(l.raw)}"><div class="bar"></div><div class="in">
          <div class="tm">${esc(l.start)}<br>${esc(l.end)}</div>
          <div class="grow"><div class="b clip">${esc(l.name)} ${st === 'cur' ? '<span class="pill good">TERAZ</span>' : ''}</div>
          <div class="muted small clip">${L('Lekcja', 'Lesson')} ${l.nr}${meta(l) ? ' · ' + meta(l) : ''}</div></div>
          ${opts.room && l.room ? `<div class="room" title="${esc(l.room)}">${esc(shortRoom(l.room))}</div>` : ''}</div></a>`;
      }).join('');
    }
    function grid() {
      const nrs = [].concat(...days.map(d => (plan[d] || []).map(l => l.nr)));
      if (!nrs.length) return '<div class="empty">Brak planu</div>';
      const minNr = Math.min(...nrs), maxNr = Math.max(...nrs), times = {};
      days.forEach(d => (plan[d] || []).forEach(l => { times[l.nr] = l.start; }));
      let cells = '<div></div>' + days.map(d => `<div class="h ${d === today ? 'today' : ''}">${DAY_SHORT[d]}</div>`).join('');
      for (let nr = minNr; nr <= maxNr; nr++) cells += `<div class="t" style="grid-column:1;grid-row:${nr - minNr + 2}">${esc(times[nr] || '')}</div>`;
      days.forEach((d, ci) => {
        const ls = (plan[d] || []).slice().sort((a, b) => a.nr - b.nr);
        for (let i = 0; i < ls.length; i++) {
          let span = 1;
          while (ls[i + span] && ls[i + span].raw === ls[i].raw && ls[i + span].nr === ls[i].nr + span) span++;
          const l = ls[i];
          cells += `<a class="c tap" href="${esc(l.href)}" style="--c:${subjColor(l.raw)};grid-column:${ci + 2};grid-row:${l.nr - minNr + 2} / span ${span}">
            ${esc(l.name)}<small>${esc(opts.room ? shortRoom(l.room) : opts.klass ? l.klass : '')}</small></a>`;
          i += span - 1;
        }
      });
      return `<div class="grid" style="grid-template-rows:auto repeat(${maxNr - minNr + 1},minmax(42px,auto))">${cells}</div>`;
    }
    function draw(anim) {
      el.innerHTML = `<div class="seg" data-sm="1"><button data-m="day" class="${mode === 'day' ? 'on' : ''}">Dzień</button><button data-m="week" class="${mode === 'week' ? 'on' : ''}">Tydzień</button></div>
        ${mode === 'day' ? `<div class="days">${days.map(d => `<button data-d="${d}" class="${d === day ? 'on' : ''}">${DAY_SHORT[d]}<small>${(plan[d] || []).length || '–'}</small></button>`).join('')}</div>
        <div class="sl ${anim || ''}">${list(day)}</div>` : grid()}`;
      el.querySelectorAll('[data-sm] button').forEach(b => b.onclick = () => { mode = b.dataset.m; draw(); animateIn(el); });
      el.querySelectorAll('.days button').forEach(b => b.onclick = () => { day = +b.dataset.d; draw(); animateIn(el.querySelector('.sl')); });
      const sl = el.querySelector('.sl');
      if (sl) {
        let sx = null, sy = 0;
        sl.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
        sl.addEventListener('touchend', e => {
          if (sx == null || sx < 30) { sx = null; return; }
          const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; sx = null;
          if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
          const nd = dx < 0 ? Math.min(5, day + 1) : Math.max(1, day - 1);
          if (nd === day) return;
          day = nd; haptic('selection'); draw(dx < 0 ? 'slideL' : 'slideR');
        });
      }
    }
    draw();
  }

  /* printable plans: /students/N/lesson_plan, /klasses/N/lesson_plan, /rooms/N/lesson_plan … */
  function printPlanPage(ctx) {
    const box = $('.print_plan');
    const mod = box.closest('.module') || document.body;
    const who = txt($('h3', mod));
    const plan = parseSchedule($('.print_plan .schedule table'));
    const p = location.pathname;
    const kind = /^\/students\//.test(p) ? 'Plan ucznia' : /^\/teachers\//.test(p) ? 'Plan nauczyciela' : /^\/rooms\//.test(p) ? 'Plan sali'
      : /^\/klasses\//.test(p) ? 'Plan klasy' : /^\/subjects\//.test(p) ? 'Plan przedmiotu' : 'Plan lekcji';
    return {
      title: kind, tab: p === ctx.student + '/lesson_plan' ? 'plan' : '', top: false,
      render(main, root) {
        main.innerHTML = `<h1>${esc(who || kind)}</h1><p class="lead">${esc(kind)}</p><div id="sched"></div>`;
        scheduleView(root.getElementById('sched'), root, plan, { room: !/^\/rooms\//.test(p), klass: !/^\/(students|klasses)\//.test(p) });
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  ROOM
   * ------------------------------------------------------------------ */
  function roomPage(ctx) {
    const mods = $$('#content .module');
    const info = mods[0];
    const name = txt($('h3', info));
    const fields = $$('p', info).map(p => { const b = $('b', p); if (!b) return null;
      return { k: txt(b).replace(/[:?]\s*$/, ''), v: txt(p).replace(txt(b), '').trim() }; }).filter(f => f && f.v && !/^szkoły/i.test(f.k));
    const plan = parseSchedule($('#content .schedule table'));
    const printA = $$('#content a').find(a => /lesson_plan$/.test(attr(a, 'href')));
    return {
      title: 'Sala ' + name, tab: '', top: false,
      render(main, root) {
        const d = new Date(), n = d.getHours() * 60 + d.getMinutes(), ls = (plan[d.getDay()] || []).slice().sort((a, b) => a.nr - b.nr);
        const cur = ls.find(l => n >= mins(l.start) && n <= mins(l.end)), nxt = ls.find(l => mins(l.start) > n);
        const status = cur ? `${L('Teraz', 'Now')}: ${esc(cur.name)}${cur.klass ? ' · ' + esc(cur.klass) : ''} (${L('do', 'until')} ${esc(cur.end)})`
          : nxt ? `${L('Następna lekcja', 'Next lesson')}: ${esc(nxt.name)} ${L('o', 'at')} ${esc(nxt.start)}` : ls.length ? L('Na dziś już wolna', 'Free for the rest of today') : L('Dziś bez zajęć', 'No lessons today');
        main.innerHTML = `<div class="hero" style="--c:${subjColor('sala ' + name)}"><div style="opacity:.85;font-size:13px;font-weight:700;letter-spacing:.4px">SALA</div>
            <h1 style="margin:2px 0 6px">${esc(name)}</h1><div class="row" style="gap:8px;font-weight:600">${I(cur || nxt ? 'clock' : 'check', 'sm')}<span>${status}</span></div></div>
          ${fields.length ? `<div class="card kvcard" style="margin-top:10px">${fields.map(f => `<div class="kv"><span>${esc(f.k)}</span><span>${esc(f.v)}</span></div>`).join('')}</div>` : ''}
          <div class="sec"><h2>Plan sali</h2>${printA ? `<a href="${esc(attr(printA, 'href'))}">Pełny plan</a>` : ''}</div><div id="sched"></div>`;
        scheduleView(root.getElementById('sched'), root, plan, { room: false, klass: true });
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  CALENDAR EVENT (opened from Start / links)
   * ------------------------------------------------------------------ */
  function calEventPage(ctx) {
    const mod = $('.module');
    const title = txt($('h3', mod));
    const c = mod.cloneNode(true);
    const h = $('h3', c); if (h) h.remove();
    const by = $('div[style*="float"] a', c);
    const byInfo = by ? { n: txt(by), h: attr(by, 'href') } : null;
    if (by) by.closest('div').remove();
    let when = '';
    const st = $$('strong', c).find(x => /\d{4}/.test(txt(x)));
    if (st) { when = txt(st); (st.closest('p') || st).remove(); }
    $$('.clear', c).forEach(x => x.remove());
    const body = txt(c) ? c.innerHTML : '';
    const d = parseDate(when);
    return {
      title: 'Wydarzenie', tab: '', top: false,
      render(main) {
        main.innerHTML = `<div class="hero" style="--c:${subjColor(title)}"><div style="opacity:.85;font-size:13px;font-weight:700;letter-spacing:.4px">WYDARZENIE</div>
            <h1 style="margin:4px 0 8px;font-size:24px">${esc(title)}</h1>
            ${when ? `<div class="row" style="gap:8px;font-weight:600">${I('clock', 'sm')}<span>${esc(when)}${d && relTime(d) !== shortDate(d) ? ' · ' + esc(relTime(d)) : ''}</span></div>` : ''}</div>
          ${body ? `<div class="article" style="margin-top:12px"><div class="mbody">${body}</div></div>` : ''}
          ${byInfo ? `<div class="sec"><h2>Dodane przez</h2></div><a class="card row tap" href="${esc(byInfo.h)}">
            <div class="av" style="background:${subjColor(byInfo.n)}">${esc(initials(byInfo.n))}</div><div class="grow b">${esc(byInfo.n)}</div>${I('right', 'sm chev')}</a>` : ''}
          <div class="chips"><a class="chip" href="/calendar">${I('calendar')}Kalendarz</a></div>`;
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  STUDENTS OF A SUBJECT GROUP
   * ------------------------------------------------------------------ */
  function studentsListPage(ctx) {
    const head = txt($('.h3 strong')) || txt($('.h3'));
    const left = head.replace(/\s*-\s*Lista uczniów\s*$/i, '');
    const subj = left.split(' / ')[0] || 'Przedmiot', grp = left.split(' / ').slice(1).join(' / ');
    const teachers = $$('.teachers a').map(a => ({ n: txt(a), h: attr(a, 'href') }));
    const person = li => { const a = $('.name a', li); return a ? { n: txt(a), h: attr(a, 'href'), k: txt($('.klass', li)).replace(/^\/\s*/, '') } : null; };
    const groups = [];
    $$('.students_list').forEach(sl => {
      let label = '';
      Array.from(sl.children).forEach(ch => {
        if (ch.tagName === 'SPAN') label = txt(ch);
        else if (ch.matches('ul.students')) groups.push({ label, items: $$(':scope > li', ch).map(person).filter(Boolean) });
      });
    });
    if (!groups.length) groups.push({ label: '', items: $$('ul.students li').map(person).filter(Boolean) });
    const total = groups.reduce((n, g) => n + g.items.length, 0);
    const showLabels = groups.length > 1 || (groups[0] && groups[0].label && !/bez aspektu/i.test(groups[0].label));
    return {
      title: prettySubj(subj), tab: '', top: false,
      render(main) {
        let i = 0;
        main.innerHTML = `<div class="hero" style="--c:${subjColor(subj)}"><div style="opacity:.85;font-size:13px;font-weight:700;letter-spacing:.4px">LISTA UCZNIÓW</div>
            <h1 style="margin:2px 0 4px">${esc(prettySubj(subj))}</h1><div style="font-weight:600">${grp ? esc(grp) + ' · ' : ''}${total} ${plural(total, 'uczeń', 'uczniów', 'uczniów')}</div></div>
          ${teachers.length ? `<div class="sec"><h2>${teachers.length > 1 ? 'Prowadzący' : 'Prowadzi'}</h2></div>` + teachers.map(t => `<a class="card row tap" href="${esc(t.h)}">
            <div class="av" style="background:${subjColor(t.n)}">${esc(initials(t.n))}</div><div class="grow b">${esc(t.n)}</div>${I('right', 'sm chev')}</a>`).join('') : ''}
          <div class="sec"><h2>Uczniowie</h2><span class="muted small">${total}</span></div>
          ${total > 8 ? `<div class="search">${I('search', 'sm')}<input id="kq" type="search" placeholder="Szukaj ucznia" autocomplete="off"></div>` : ''}
          ${groups.map(g => `${showLabels && g.label ? `<div class="cat">${esc(g.label)}</div>` : ''}<div class="card" style="padding:2px 14px">${g.items.map(st => { const me = st.h === ctx.student; return `<a class="frow" data-t="${esc(norm(st.n))}" href="${esc(st.h)}">
              <span class="muted small" style="width:20px;text-align:right">${++i}</span>
              <div class="av" style="width:34px;height:34px;font-size:13px;background:${subjColor(st.n)}">${esc(initials(st.n))}</div>
              <div class="grow"><div class="clip ${me ? 'b' : ''}">${esc(st.n)}${me ? ' <span class="pill new">TY</span>' : ''}</div>${st.k ? `<div class="klass">${esc(st.k)}</div>` : ''}</div></a>`; }).join('')}</div>`).join('')}`;
        const kq = main.querySelector('#kq');
        if (kq) kq.oninput = () => { const q = norm(kq.value.trim()); main.querySelectorAll('[data-t]').forEach(el => { el.style.display = !q || el.dataset.t.includes(q) ? '' : 'none'; }); };
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  NEW MESSAGE
   * ------------------------------------------------------------------ */
  const htmlToText = h => {
    const d = new DOMParser().parseFromString(String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n'), 'text/html');
    return (d.body.textContent || '').replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  };
  function composePage(ctx) {
    const form = $('#new_message_form');
    const scripts = HEAD_TEXT + '\n' + $$('script').map(s => s.textContent).join('\n');
    let recips = [];
    const m = scripts.match(/initial_json_for_user_search\s*=\s*\$\.parseJSON\('((?:[^'\\]|\\.)*)'\)/);
    if (m) { try { recips = JSON.parse(m[1].replace(/\\(["'\/])/g, '$1')).filter(r => r && r.id); } catch (e) { recips = []; } }
    const titleIn = $('#message_title', form), bodyIn = $('#message_body', form), copyIn = $('#message_send_copy_to_email', form);
    const title0 = titleIn ? titleIn.value : '', body0 = bodyIn ? htmlToText(bodyIn.value) : '', copy0 = !!(copyIn && copyIn.checked);
    const isDraft = !!(($('#message_draft_id', form) || {}).value);
    const splitName = n => { const mm = String(n).match(/^(.*?)\s*\(([^()]+)\)\s*$/); return mm ? { n: mm[1], role: mm[2] } : { n: String(n), role: '' }; };
    return {
      title: isDraft ? 'Szkic' : 'Nowa wiadomość', tab: 'mail', top: false,
      render(main, root) {
        main.innerHTML = `<div class="form">
            <div class="frow2"><label for="to">Do</label><div class="tokens" id="toks"></div></div>
            <div id="sugg"></div>
            <div class="frow2"><label for="subj">Temat</label><input class="finput" id="subj" maxlength="200" value="${esc(title0)}" autocomplete="off"></div>
            <textarea class="fta" id="body" placeholder="Treść wiadomości">${esc(body0)}</textarea></div>
          <div class="card" style="padding:0"><label class="tgl inline"><span>Wyślij kopię na mój e-mail</span><input type="checkbox" id="copy" ${copy0 ? 'checked' : ''}><i></i></label></div>
          <div class="btnrow"><button class="btn-s" id="draft">${I('inbox', 'sm')}<span>Zapisz</span></button><button class="btn-p" id="send">${I('send', 'sm')}<span>Wyślij</span></button></div>
          <div class="note2">Wpisz co najmniej 3 litery imienia lub nazwiska, aby znaleźć odbiorcę.</div>`;
        const toks = root.getElementById('toks'), sugg = root.getElementById('sugg');
        const subj = root.getElementById('subj'), body = root.getElementById('body'), copy = root.getElementById('copy');
        let input = null, seq = 0, tm = 0;
        function drawTokens() {
          toks.innerHTML = recips.map((r, i) => { const s = splitName(r.name); return `<span class="tok"><span>${esc(s.n)}</span><button data-i="${i}" aria-label="Usuń">${I('x')}</button></span>`; }).join('') +
            `<input class="finput" id="to" placeholder="${recips.length ? 'Dodaj…' : 'Wpisz imię lub nazwisko'}" autocomplete="off" autocapitalize="words">`;
          toks.querySelectorAll('.tok button').forEach(b => b.onclick = () => { recips.splice(+b.dataset.i, 1); drawTokens(); input.focus(); });
          input = root.getElementById('to');
          input.oninput = () => {
            clearTimeout(tm); const q = input.value.trim();
            if (q.length < 3) { sugg.innerHTML = ''; return; }
            tm = setTimeout(async () => {
              const my = ++seq;
              sugg.innerHTML = '<div class="sugg"><div class="muted">Szukam…</div></div>';
              try {
                const r = await fetch('/internal_messages/search_users?q=' + encodeURIComponent(q), { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json, text/javascript, */*' } });
                const list = JSON.parse(await r.text());
                if (my !== seq) return;
                const fresh = (Array.isArray(list) ? list : []).filter(p => p && p.id && !recips.some(x => String(x.id) === String(p.id))).slice(0, 12);
                sugg.innerHTML = `<div class="sugg">${fresh.length ? fresh.map((p, i) => { const s = splitName(p.name); return `<button data-i="${i}">
                  <div class="av" style="background:${subjColor(s.n)}">${esc(initials(s.n))}</div><div class="grow clip">${esc(s.n)}</div>${s.role ? `<span class="role">${esc(s.role)}</span>` : ''}</button>`; }).join('')
                  : '<div class="muted">Nikogo nie znaleziono</div>'}</div>`;
                sugg.querySelectorAll('button').forEach(b => b.onclick = () => { recips.push(fresh[+b.dataset.i]); sugg.innerHTML = ''; drawTokens(); input.focus(); });
              } catch (e) { if (my === seq) sugg.innerHTML = '<div class="sugg"><div class="muted">Nie udało się wyszukać</div></div>'; }
            }, 260);
          };
          input.onkeydown = e => {
            if (e.key === 'Backspace' && !input.value && recips.length) { recips.pop(); drawTokens(); input.focus(); }
            if (e.key === 'Enter') { e.preventDefault(); const b = sugg.querySelector('button'); if (b) b.click(); }
          };
        }
        drawTokens();
        const grow = () => { body.style.height = 'auto'; body.style.height = Math.max(200, body.scrollHeight) + 'px'; };
        body.addEventListener('input', grow); grow();
        if (!recips.length) setTimeout(() => input && input.focus(), 400); else if (!title0) setTimeout(() => subj.focus(), 400);
        const sendB = root.getElementById('send'), draftB = root.getElementById('draft');
        async function submit(kind) {
          const text = body.value.trim();
          if (kind === 'send' && !recips.length) { haptic('error'); toast(root, 'Dodaj odbiorcę', 'bad'); input.focus(); return; }
          if (kind === 'send' && !text) { haptic('error'); toast(root, 'Napisz treść wiadomości', 'bad'); body.focus(); return; }
          const btn = kind === 'send' ? sendB : draftB, label = btn.lastChild.textContent;
          sendB.disabled = draftB.disabled = true; btn.lastChild.textContent = kind === 'send' ? 'Wysyłanie…' : 'Zapisywanie…';
          try {
            const fd = new FormData(form);
            fd.set('receiver_ids', recips.map(r => r.id).join(','));
            fd.set('message[title]', subj.value.trim());
            fd.set('message[body]', text ? text.split(/\n{2,}/).map(p => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join('') : '');
            fd.delete('message[send_copy_to_email]'); fd.append('message[send_copy_to_email]', '0'); if (copy.checked) fd.append('message[send_copy_to_email]', '1');
            fd.delete('send'); fd.delete('save'); fd.set(kind === 'send' ? 'send' : 'save', kind === 'send' ? 'Wyślij' : 'Zapisz');
            const r = await fetch(form.action, { method: 'POST', body: fd, credentials: 'same-origin' });
            const d = new DOMParser().parseFromString(await r.text(), 'text/html');
            const err = d.querySelector('#errorExplanation, #error_explanation, .errorExplanation, .field_with_errors');
            const stillForm = kind === 'send' && d.querySelector('#new_message_form') && !d.querySelector('#message, table.message-table');
            if (!r.ok || err || stillForm) {
              const why = txt(d.querySelector('#errorExplanation, #error_explanation, .errorExplanation')) || txt(d.querySelector('#flash-messages-section'));
              throw new Error(why || 'IDU nie przyjęło wiadomości');
            }
            haptic('success'); toast(root, kind === 'send' ? 'Wiadomość wysłana' : 'Zapisano w szkicach', 'good');
            setTimeout(() => softGo(kind === 'send' ? '/internal_messages/sent' : '/internal_messages/drafts', false), 700);
          } catch (e) {
            haptic('error'); toast(root, (e && e.message && e.message.length < 120 ? e.message : 'Nie udało się — spróbuj ponownie'), 'bad');
            sendB.disabled = draftB.disabled = false; btn.lastChild.textContent = label;
          }
        }
        sendB.onclick = () => submit('send');
        draftB.onclick = () => submit('save');
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  FORUM SEARCH
   * ------------------------------------------------------------------ */
  function forumSearchPage(ctx) {
    const q = new URLSearchParams(location.search).get('search[with_phrase]') || '';
    const results = $$('#content table.thread-table tr').filter(tr => $('td.author', tr)).map(tr => ({
      who: txt($('.author-name', tr)), cls: txt($('.author-class', tr)), date: parseDate(txt($('.post-data', tr))), dateS: txt($('.post-data', tr)),
      text: txt($('.post-body', tr)), href: attr($$('a', tr).filter(a => /\/forum\/posts\/\d+/.test(attr(a, 'href'))).pop(), 'href')
    }));
    const snippet = t => {
      const nq = norm(q.trim()); const i = nq ? norm(t).indexOf(nq) : -1;
      if (i < 0) return esc(t.slice(0, 220)) + (t.length > 220 ? '…' : '');
      const a = Math.max(0, i - 70), b = Math.min(t.length, i + nq.length + 170);
      return (a ? '…' : '') + esc(t.slice(a, i)) + '<mark>' + esc(t.slice(i, i + nq.length)) + '</mark>' + esc(t.slice(i + nq.length, b)) + (b < t.length ? '…' : '');
    };
    return {
      title: 'Szukaj na forum', tab: '', top: false,
      render(main, root) {
        main.innerHTML = `<form class="search" id="fs">${I('search', 'sm')}<input id="fq" type="search" enterkeyhint="search" placeholder="Szukane wyrażenie" value="${esc(q)}" autocomplete="off"></form>
          ${q ? `<p class="lead">${results.length ? `${results.length} ${plural(results.length, 'wynik', 'wyniki', 'wyników')} ${L('dla', 'for')} „${esc(q)}”` : `${L('Brak wyników dla', 'No results for')} „${esc(q)}”`}</p>` : '<div class="empty">' + I('chat', 'big') + '<div>Wpisz słowo i naciśnij Enter</div></div>'}
          ${results.map(r => `<a class="card tap" href="${esc(r.href || '#')}">
            <div class="row" style="gap:10px"><div class="av" style="width:34px;height:34px;font-size:13px;background:${subjColor(r.who)}">${esc(initials(r.who))}</div>
              <div class="grow"><div class="b clip">${esc(r.who)}</div><div class="muted small clip">${esc(r.cls ? r.cls + ' · ' : '')}${esc(r.date ? shortDate(r.date) + ' ' + r.date.getFullYear() : r.dateS)}</div></div>${I('right', 'sm chev')}</div>
            <div style="font-size:15px;line-height:1.45;margin-top:8px">${snippet(r.text)}</div></a>`).join('')}`;
        const f = root.getElementById('fs');
        f.onsubmit = e => { e.preventDefault(); const v = root.getElementById('fq').value.trim(); if (v) softGo('/forum/search?search%5Bwith_phrase%5D=' + encodeURIComponent(v), true); };
        if (!q) setTimeout(() => root.getElementById('fq').focus(), 350);
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  FILES (subject attachments, document details)
   * ------------------------------------------------------------------ */
  const fileExt = n => ((String(n).match(/\.([a-z0-9]{2,5})$/i) || [])[1] || '').toLowerCase();
  const extColor = e => /pdf/.test(e) ? '#e5484d' : /docx?|odt|rtf|pages/.test(e) ? '#2f7de1' : /xlsx?|ods|csv|numbers/.test(e) ? '#2fa36b'
    : /pptx?|odp|key/.test(e) ? '#f07a2b' : /png|jpe?g|gif|heic|webp/.test(e) ? '#8b5cf6' : /zip|rar|7z/.test(e) ? '#a1887f' : '#5d6878';
  const extBadge = name => { const e = fileExt(name); return `<div class="ftype" style="--c:${extColor(e)}">${e ? esc(e.toUpperCase().slice(0, 4)) : I('file', 'sm')}</div>`; };

  function filesPage(ctx) {
    const rows = $$('#content table tr').map(tr => {
      const tds = $$(':scope > td', tr); if (tds.length < 4) return null;
      const a = $('a', tds[0]) || $('a', tr);
      return { file: attr(a, 'title') || attr($('img', a), 'alt'), href: attr(a, 'href'), name: txt(tds[1]) || attr(a, 'title'), size: txt(tds[2]), date: txt(tds[3]), d: parseDate(txt(tds[3])) };
    }).filter(r => r && r.href);
    const subjA = $$('#breadcrumbs a').find(a => /^\/subjects\/\d+$/.test(attr(a, 'href')));
    const subj = subjA ? txt(subjA) : '';
    let fq = '', fs = 'new';
    function listHTML() {
      const nq = norm(fq);
      const list = rows.filter(r => !nq || norm(r.name + ' ' + r.file).includes(nq))
        .sort(fs === 'az' ? (a, b) => norm(a.name).localeCompare(norm(b.name)) : (a, b) => (b.d || 0) - (a.d || 0));
      return list.length ? list.map(r => `<a class="card row tap" href="${esc(r.href)}">${extBadge(r.file)}
          <div class="grow"><div class="b two">${esc(r.name)}</div><div class="muted small">${esc(r.size)}${r.size && r.date ? ' · ' : ''}${esc(r.d ? shortDate(r.d) + ' ' + r.d.getFullYear() : r.date)}</div></div>
          <div style="color:var(--accent)">${I('download', 'sm')}</div></a>`).join('') : '<div class="nores">Brak plików</div>';
    }
    return {
      title: subj ? prettySubj(subj) : 'Pliki', tab: '', top: false,
      render(main, root) {
        main.innerHTML = `<h1>Pliki</h1><p class="lead">${rows.length} ${plural(rows.length, 'plik', 'pliki', 'plików')}${subj ? ' · ' + esc(prettySubj(subj)) : ''}</p>
          ${rows.length > 5 ? `<div class="search">${I('search', 'sm')}<input id="fq" type="search" placeholder="Szukaj pliku" autocomplete="off"></div>
            ${chipRow('fsrt', [{ v: 'new', label: 'Najnowsze' }, { v: 'az', label: 'A–Z' }], fs)}` : ''}
          <div id="fl">${rows.length ? listHTML() : `<div class="empty">${I('file', 'big')}<div>Brak plików</div></div>`}</div>`;
        const redraw = () => { root.getElementById('fl').innerHTML = listHTML(); };
        const fi = root.getElementById('fq'); if (fi) fi.oninput = () => { fq = fi.value.trim(); redraw(); };
        wireChips(root, 'fsrt', v => { fs = v; redraw(); animateIn(root.getElementById('fl')); });
      }
    };
  }

  function docDetailPage(ctx) {
    const mod = $('#content .module');
    const f = {}; let fileA = null;
    $$('p', mod).forEach(p => {
      const b = $('b', p); if (!b) return;
      const k = txt(b).replace(/:$/, ''); const a = $('a', p);
      if (a && /download/.test(attr(a, 'href'))) fileA = a;
      f[k] = a ? txt(a) : txt(p).replace(txt(b), '').trim();
    });
    const opisDiv = $$(':scope > div', mod).find(d => /^opis/i.test(txt($('b', d))));
    let opis = '';
    if (opisDiv) { const c = opisDiv.cloneNode(true); const b = $('b', c); if (b) b.remove(); opis = txt(c) ? c.innerHTML : ''; }
    const name = f['Nazwa'] || txt($('#breadcrumbs')).split('>').pop().trim() || 'Dokument';
    const fileName = fileA ? txt(fileA) : '';
    return {
      title: 'Dokument', tab: '', top: false,
      render(main) {
        main.innerHTML = `<div class="card" style="padding:18px;text-align:center">
            <div style="display:flex;justify-content:center;margin-bottom:12px">${extBadge(fileName).replace('class="ftype"', 'class="ftype" style="width:64px;height:64px;font-size:15px;border-radius:16px"')}</div>
            <h1 style="font-size:22px;margin:0 0 6px">${esc(name)}</h1>
            <div class="meta" style="justify-content:center">${f['Kategoria'] ? `<span class="pill">${esc(f['Kategoria'])}</span>` : ''}${f['Utworzono'] ? `<span>${I('clock')}${esc(f['Utworzono'])}</span>` : ''}</div>
            ${fileName ? `<div class="muted small" style="margin-top:10px;word-break:break-all">${esc(fileName)}</div>` : ''}</div>
          ${fileA ? `<a class="btn-p" href="${esc(attr(fileA, 'href'))}">${I('download', 'sm')}Otwórz plik</a>` : ''}
          ${opis ? `<div class="sec"><h2>Opis</h2></div><div class="article"><div class="mbody">${opis}</div></div>` : ''}
          <div class="chips" style="justify-content:center;margin-top:16px"><a class="chip" href="/documents/attachments">${I('file')}Wszystkie dokumenty</a></div>`;
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  ONE LESSON (topic + description)
   * ------------------------------------------------------------------ */
  function lessonPage(ctx) {
    const mod = $('#content .module');
    const head = txt($('h3', mod)).replace(/^Temat:\s*/i, '');
    const m = head.match(/^(.*?),\s*(\d{1,2}\s+\S+\s+\d{4}),\s*\((\d+)\)\s*([\d:]+\s*-\s*[\d:]+)\s*$/);
    const topic = m ? m[1] : head, d = m ? parseDate(m[2]) : null, nr = m ? m[3] : '', time = m ? m[4].replace(/\s+/g, '') : '';
    const h4 = $$('h4', mod).find(x => /opis/i.test(txt(x)));
    const descEl = h4 ? h4.nextElementSibling : null;
    const desc = descEl && txt(descEl) ? descEl.innerHTML : '';
    const subjA = $$('#breadcrumbs a').find(a => /^\/subjects\/\d+$/.test(attr(a, 'href')));
    const allA = $$('#breadcrumbs a').find(a => /lesson_instances$/.test(attr(a, 'href')));
    const subj = subjA ? txt(subjA) : '';
    return {
      title: subj ? prettySubj(subj) : 'Lekcja', tab: '', top: false,
      render(main) {
        main.innerHTML = `<div class="hero" style="--c:${subjColor(subj || topic)}"><div style="opacity:.85;font-size:13px;font-weight:700;letter-spacing:.4px">${esc((prettySubj(subj) || 'Lekcja').toUpperCase())}</div>
            <h1 style="margin:4px 0 8px;font-size:24px">${esc(topic)}</h1>
            <div class="row" style="gap:8px;font-weight:600">${I('clock', 'sm')}<span>${d ? esc(DAY_FULL[d.getDay()].replace(/^./, c => c.toUpperCase()) + ', ' + shortDate(d) + ' ' + d.getFullYear()) : ''}${nr ? L(' · lekcja ', ' · lesson ') + esc(nr) : ''}${time ? ' · ' + esc(time) : ''}</span></div></div>
          <div class="sec"><h2>Opis</h2></div>
          ${desc ? `<div class="article"><div class="mbody">${desc}</div></div>` : '<div class="card muted" style="text-align:center">Nauczyciel nie dodał opisu</div>'}
          <div class="chips">${allA ? `<a class="chip" href="${esc(attr(allA, 'href'))}">${I('book')}Wszystkie tematy</a>` : ''}
            ${subjA ? `<a class="chip" href="${esc(attr(subjA, 'href'))}">${I('layers')}Strona przedmiotu</a>` : ''}</div>`;
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  Any other IDU list (e.g. Recenzje): rows become cards
   * ------------------------------------------------------------------ */
  function tablePage(ctx) {
    const crumbs = txt($('#breadcrumbs')).replace(/^Jesteś tutaj:\s*/, '').split('>').map(x => x.trim()).filter(Boolean);
    const title = crumbs[crumbs.length - 1] || txt($('#content h1, #content h3')) || document.title.replace(/^IDU - /, '');
    const t = $('#content table.object_list-table');
    const heads = $$('th', t).map(th => txt(th).replace(/[▲▼]/g, '').trim());
    const iFirst = heads.findIndex(h => /^imię$/i.test(h)), iLast = heads.findIndex(h => /^nazwisko$/i.test(h));
    const rows = $$('tr', t).filter(tr => $('td', tr)).map(tr => {
      const cells = $$(':scope > td', tr).map((td, i) => ({ l: heads[i] || '', t: txt(td), links: $$('a', td).map(a => ({ t: txt(a), h: attr(a, 'href') })).filter(a => a.h && a.h !== '#') }));
      let name, rest;
      if (iFirst >= 0 && iLast >= 0) { name = (cells[iFirst].t + ' ' + cells[iLast].t).trim(); rest = cells.filter((c, i) => i !== iFirst && i !== iLast); }
      else { const m = cells.find(c => c.t) || { t: '' }; name = m.t; rest = cells.filter(c => c !== m); }
      const allLinks = [].concat(...cells.map(c => c.links));
      const main = allLinks.find(a => /^(pokaż|szczegóły|otwórz)?$/i.test(a.t) || a.t === name) || allLinks[0];
      const meta = rest.filter(c => c.t && !(c.links.length && c.links.every(a => a.t === c.t)));
      const acts = allLinks.filter(a => a !== main && !(main && a.h === main.h));
      return { name, href: main ? main.h : '', meta, acts };
    });
    const pag = $$('#content .pagination a').map(a => ({ t: txt(a), h: attr(a, 'href') })).filter(a => /poprzed|następ|prev|next|«|»|‹|›/i.test(a.t));
    const people = iFirst >= 0 && iLast >= 0;
    let q = '';
    function card(r) {
      const body = `${people ? `<div class="av" style="background:${subjColor(r.name)}">${esc(initials(r.name))}</div>` : ''}<div class="grow"><div class="b">${esc(r.name)}</div>
        ${r.meta.length ? `<div class="meta">${r.meta.map(c => `<span>${c.l ? esc(c.l) + ': ' : ''}<b style="color:var(--text);font-weight:600">${esc(c.t)}</b></span>`).join('')}</div>` : ''}
        ${r.acts.length ? `<div class="chips">${r.acts.map(a => `<a class="chip" href="${esc(a.h)}">${I(/download|pobierz/i.test(a.h + a.t) ? 'download' : 'right')}${esc(a.t || 'Otwórz')}</a>`).join('')}</div>` : ''}</div>`;
      return r.href && !r.acts.length ? `<a class="card row tap" data-t="${esc(norm(r.name + ' ' + r.meta.map(c => c.t).join(' ')))}" href="${esc(r.href)}">${body}${I('right', 'sm chev')}</a>`
        : `<div class="card row" data-t="${esc(norm(r.name))}">${body}</div>`;
    }
    return {
      title, tab: '', top: false,
      render(main, root) {
        main.innerHTML = `<h1>${esc(title)}</h1>${rows.length ? `<p class="lead">${rows.length} ${plural(rows.length, 'pozycja', 'pozycje', 'pozycji')}</p>` : ''}
          ${rows.length > 8 ? `<div class="search">${I('search', 'sm')}<input id="tq" type="search" placeholder="Szukaj" autocomplete="off"></div>` : ''}
          <div id="tl">${rows.length ? rows.map(card).join('') : `<div class="empty">${I('inbox', 'big')}<div>Nic tu jeszcze nie ma</div></div>`}</div>
          ${pag.length ? `<div class="row" style="justify-content:space-between;margin-top:6px">${pag.map(a => `<a class="btn-s" href="${esc(a.h)}">${esc(a.t)}</a>`).join('')}</div>` : ''}`;
        const tq = root.getElementById('tq');
        if (tq) tq.oninput = () => { q = norm(tq.value.trim()); main.querySelectorAll('#tl [data-t]').forEach(el => { el.style.display = !q || el.dataset.t.includes(q) ? '' : 'none'; }); };
      }
    };
  }

  /* homework: upload a file (IDU shows this form without its header) */
  function uploadPage(ctx) {
    const form = $('form input[type="file"]').closest('form');
    const fileIn = $('input[type="file"]', form);
    const back = location.pathname.replace(/\/homework_attachments\/new(\.html)?$/, '');
    return {
      title: 'Dodaj plik', tab: '', top: false,
      render(main, root) {
        main.innerHTML = `<div class="hero" style="--c:var(--accent)"><div style="opacity:.85;font-size:13px;font-weight:700;letter-spacing:.4px">ZADANIE DOMOWE</div>
            <h1 style="margin:4px 0 4px;font-size:24px">Wyślij plik</h1><div style="font-weight:600;opacity:.9">Zdjęcie, PDF, dokument… Nauczyciel zobaczy go przy zadaniu.</div></div>
          <label class="card row tap" style="margin-top:12px;cursor:pointer" id="pick">${extBadge('')}<div class="grow"><div class="b clip" id="fname">Wybierz plik</div>
            <div class="muted small" id="fsize">Dotknij, aby wybrać z telefonu</div></div>${I('clip', 'sm')}<input type="file" id="ufile" style="display:none"></label>
          <button class="btn-p" id="usend" disabled>${I('send', 'sm')}<span>Wyślij plik</span></button>
          <div class="chips" style="justify-content:center;margin-top:14px"><a class="chip" href="${esc(back)}">${I('back')}Wróć do zadania</a></div>`;
        const inp = root.getElementById('ufile'), send = root.getElementById('usend');
        const size = n => n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
        inp.onchange = () => {
          const f = inp.files && inp.files[0]; if (!f) return;
          root.getElementById('fname').textContent = f.name;
          root.getElementById('fsize').textContent = size(f.size);
          root.querySelector('#pick .ftype').outerHTML = extBadge(f.name);
          send.disabled = false; haptic('selection');
        };
        send.onclick = async () => {
          const f = inp.files && inp.files[0]; if (!f) return;
          send.disabled = true; send.lastChild.textContent = 'Wysyłanie…';
          try {
            const fd = new FormData(form);
            fd.set(fileIn.name, f, f.name);
            const sub = $('input[type="submit"]', form); if (sub && sub.name) fd.set(sub.name, sub.value);
            const r = await fetch(form.action, { method: 'POST', body: fd, credentials: 'same-origin' });
            const d = new DOMParser().parseFromString(await r.text(), 'text/html');
            if (!r.ok || d.querySelector('#errorExplanation, #error_explanation, .errorExplanation, .field_with_errors') || d.querySelector('form input[type="file"]')) throw new Error();
            haptic('success'); toast(root, 'Plik wysłany', 'good');
            setTimeout(() => softGo(back, false), 800);
          } catch (e) {
            haptic('error'); toast(root, 'Nie udało się wysłać pliku', 'bad');
            send.disabled = false; send.lastChild.textContent = 'Wyślij plik';
          }
        };
      }
    };
  }

  /* ------------------------------------------------------------------ *
   *  People search (sheet from the menu)
   * ------------------------------------------------------------------ */
  function openPeople(root) {
    const sh = openSheet(root, `<h2>Szukaj osób</h2><div class="muted small" style="margin-bottom:10px">Uczniowie, nauczyciele i rodzice w IDU</div>
      <div class="search">${I('search', 'sm')}<input id="pq" type="search" placeholder="Imię lub nazwisko (min. 3 litery)" autocomplete="off" autocapitalize="words"></div><div id="pres" class="plist"></div>`);
    const q = sh.querySelector('#pq'), out = sh.querySelector('#pres');
    let seq = 0, tm = 0;
    setTimeout(() => q.focus(), 380);
    q.oninput = () => {
      clearTimeout(tm); const v = q.value.trim();
      if (v.length < 3) { seq++; out.innerHTML = ''; return; }
      tm = setTimeout(async () => {
        const my = ++seq;
        out.innerHTML = '<div class="muted small" style="padding:10px 2px">Szukam…</div>';
        try {
          const r = await fetch('/idu_users/search?search%5Bprofile_by_name%5D=' + encodeURIComponent(v), { credentials: 'same-origin',
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'text/javascript, application/javascript, */*' } });
          const t = await r.text(); if (my !== seq) return;
          const mm = t.match(/\.html\("([\s\S]*)"\)\s*;?\s*$/);
          const html = mm ? mm[1].replace(/\\(.)/g, (x, c) => c === 'n' ? '\n' : c === 't' ? '\t' : c) : t;
          const d = new DOMParser().parseFromString(html, 'text/html');
          const people = $$('.single_user', d).map(u => { const a = $('.user_name a', u); return a ? { n: txt(a), h: attr(a, 'href') } : null; }).filter(Boolean);
          const role = h => /^\/teachers/.test(h) ? 'nauczyciel' : /^\/parents/.test(h) ? 'rodzic' : /^\/students/.test(h) ? 'uczeń' : '';
          out.innerHTML = people.length ? `<div class="card" style="padding:2px 14px;margin-top:4px">${people.map(p => `<a class="frow" href="${esc(p.h)}">
              <div class="av" style="background:${subjColor(p.n)}">${esc(initials(p.n))}</div><div class="grow clip">${esc(p.n)}</div>${role(p.h) ? `<span class="role">${role(p.h)}</span>` : ''}</a>`).join('')}</div>`
            : '<div class="nores">Nikogo nie znaleziono</div>';
        } catch (e) { if (my === seq) out.innerHTML = '<div class="nores">Nie udało się wyszukać</div>'; }
      }, 280);
    };
  }

  /* ------------------------------------------------------------------ *
   *  English words for the app (Polish → English)
   * ------------------------------------------------------------------ */
  const TR_EN = {
    // bottom bar, menu, titles
    'Start': 'Home', 'Oceny': 'Grades', 'Plan': 'Timetable', 'Wiadomości': 'Messages', 'Frekwencja': 'Attendance', 'Plan lekcji': 'Timetable',
    'Zadania domowe': 'Homework', 'Zadania': 'Homework', 'Przedmioty': 'Subjects', 'Ogłoszenia': 'Announcements', 'Aktualności': 'News',
    'Kalendarz': 'Calendar', 'Dokumenty': 'Documents', 'Szukaj osób': 'Find people', 'Ustawienia': 'Settings', 'Klasyczny widok IDU': 'Classic IDU view',
    'Wyloguj': 'Log out', 'Mój profil': 'My profile', 'Wstecz': 'Back', 'Profil': 'Profile', 'Hol szkolny': 'Home',
    // start
    'Co nowego': "What's new", 'Odśwież': 'Refresh', 'Nadchodzące': 'Upcoming', 'Sprawdziany': 'Tests', 'Do potwierdzenia': 'Needs your confirmation',
    'Wszystko': 'All', 'Dodano ocenę': 'New grade', 'Zadanie domowe': 'Homework', 'Ogłoszenie': 'Announcement', 'Aktualność': 'News', 'NOWE': 'NEW',
    'Nic tutaj': 'Nothing here', 'TERAZ': 'NOW', 'Teraz': 'Now', 'Dziś': 'Today', 'Wczoraj': 'Yesterday', 'Jutro': 'Tomorrow',
    // timetable
    'Dzień': 'Day', 'Tydzień': 'Week', 'Brak lekcji': 'No lessons', 'Brak planu': 'No timetable', 'Dzień wolny': 'Day off', 'Wydarzenie': 'Event',
    'Sprawdzian': 'Test', 'Wydarzenia': 'Events', 'Sprawdzam sprawdziany i wydarzenia…': 'Checking tests and events…',
    'Według kalendarza to dzień wolny — lekcje niżej mogą się nie odbyć.': 'The calendar says this is a day off — the lessons below may not take place.',
    'Nauczyciel': 'Teacher', 'Sprawdzian / notatka': 'Test / note', 'Strona przedmiotu': 'Subject page', 'Otwórz': 'Open', 'Tematy': 'Topics',
    'Obecności': 'Attendance', 'Forum klasowe': 'Class forum', 'Szukaj przedmiotu': 'Search subjects', 'Poprzedni tydzień': 'Previous week',
    'Następny tydzień': 'Next week', 'Poprzedni': 'Previous', 'Następny': 'Next', 'Plan sali': 'Room timetable', 'Pełny plan': 'Full timetable',
    'Plan ucznia': 'Student timetable', 'Plan nauczyciela': 'Teacher timetable', 'Plan klasy': 'Class timetable', 'Plan przedmiotu': 'Subject timetable',
    'SALA': 'ROOM', 'Plan do druku': 'Printable timetable',
    // grades
    'Podsumowanie': 'Summary', 'średnia ogólna': 'overall average', 'Wszystkie oceny': 'All grades', 'Szukaj przedmiotu lub oceny': 'Search subject or grade',
    'Najnowsze': 'Newest', 'Najlepsze': 'Best', 'Najsłabsze': 'Weakest', 'Bez ocen': 'No grades', 'średnia': 'average', 'średnio': 'average',
    'punkty': 'points', 'bez średniej': 'no average', 'Brak wyników': 'No results', 'Brak ocen': 'No grades', 'Twoje oceny': 'Your grades',
    // attendance
    'Nieobecności': 'Absences', 'Spóźnienia': 'Late', 'Najniższa': 'Lowest', 'Najwyższa': 'Highest', 'Ostatnie dni': 'Recent days',
    'Nieobecność': 'Absence', 'Obecność': 'Present', 'Spóźnienie': 'Late', 'Usprawiedliwione': 'Excused', 'Brak wpisów': 'No entries',
    // messages
    'Odebrane': 'Inbox', 'Wysłane': 'Sent', 'Robocze': 'Drafts', 'Kosz': 'Trash', 'Szukaj (Enter = we wszystkich)': 'Search (Enter = all messages)',
    'Wszystkie': 'All', 'Nieprzeczytane': 'Unread', 'Ostatni tydzień': 'Last week', 'Ten miesiąc': 'This month', 'Starsze': 'Older', 'Nowsze': 'Newer',
    'Brak wiadomości': 'No messages', 'Brak wyników na tej stronie — naciśnij Enter, aby szukać we wszystkich wiadomościach': 'Nothing on this page — press Enter to search all messages',
    'Nowa wiadomość': 'New message', 'Wiadomość': 'Message', 'Napisz odpowiedź…': 'Write a reply…', 'Wyślij': 'Send', 'Wysyłanie…': 'Sending…',
    'Nie udało się – spróbuj ponownie': 'Failed – try again', 'Nie udało się — spróbuj ponownie': 'Failed — try again', 'Wysłano': 'Sent',
    'Wiadomości wysłane': 'Sent messages', 'Skrzynka robocza': 'Drafts', 'Wiadomości usunięte': 'Deleted messages',
    // compose
    'Do': 'To', 'Temat': 'Subject', 'Treść wiadomości': 'Message', 'Wyślij kopię na mój e-mail': 'Send a copy to my e-mail', 'Zapisz': 'Save',
    'Wpisz co najmniej 3 litery imienia lub nazwiska, aby znaleźć odbiorcę.': 'Type at least 3 letters of a name to find a recipient.',
    'Wpisz imię lub nazwisko': 'Type a name', 'Dodaj…': 'Add…', 'Szukam…': 'Searching…', 'Nikogo nie znaleziono': 'No one found',
    'Nie udało się wyszukać': 'Search failed', 'Dodaj odbiorcę': 'Add a recipient', 'Napisz treść wiadomości': 'Write your message',
    'Zapisywanie…': 'Saving…', 'Wiadomość wysłana': 'Message sent', 'Zapisano w szkicach': 'Saved to drafts', 'IDU nie przyjęło wiadomości': 'IDU did not accept the message',
    'Szkic': 'Draft', 'Usuń': 'Remove', 'nauczyciel': 'teacher', 'rodzic': 'parent', 'uczeń': 'student',
    // homework
    'Szukaj zadania lub przedmiotu': 'Search homework or subject', 'Do zrobienia': 'To do', 'Bez terminu': 'No deadline', 'Zakończone': 'Closed',
    'zakończone': 'closed', 'Nic do zrobienia': 'Nothing to do', 'Brak zadań': 'No homework', 'Brak zadań domowych': 'No homework', 'bez terminu': 'no deadline',
    'Twoje pliki': 'Your files', 'Nie wysłano jeszcze plików': 'No files sent yet', 'Dodaj plik': 'Add file', 'Opis': 'Description',
    'ZADANIE DOMOWE': 'HOMEWORK', 'Wyślij plik': 'Send file', 'Zdjęcie, PDF, dokument… Nauczyciel zobaczy go przy zadaniu.': 'Photo, PDF, document… Your teacher will see it with the homework.',
    'Wybierz plik': 'Choose a file', 'Dotknij, aby wybrać z telefonu': 'Tap to pick one from your phone', 'Wróć do zadania': 'Back to the homework',
    'Plik wysłany': 'File sent', 'Nie udało się wysłać pliku': 'Could not send the file',
    // subject, topics, lesson
    'Tematy lekcji': 'Lesson topics', 'Pliki': 'Files', 'Pobierz Excel': 'Download Excel', 'Szukaj tematu': 'Search topics', 'Brak tematów': 'No topics',
    'Nauczyciel nie dodał opisu': 'No description added', 'Wszystkie tematy': 'All topics', 'Lekcja': 'Lesson',
    // events, calendar
    'Szukaj': 'Search', 'Nowe': 'New', 'Brak wydarzeń': 'No events', 'Ładowanie…': 'Loading…', 'Ładowanie kalendarza…': 'Loading calendar…',
    'Nie udało się wczytać szczegółów.': 'Could not load the details.', 'Dodane przez': 'Added by', 'WYDARZENIE': 'EVENT', 'Ogłoszenia przedmiotowe': 'Subject announcements',
    // forum
    'Szukaj na forum': 'Search the forum', 'Wątki': 'Threads', 'Komentarze': 'Comments', 'Posty': 'Posts', 'Brak komentarzy': 'No comments',
    'Brak postów. Napisz pierwszy!': 'No posts yet. Write the first one!', 'Dodaj komentarz…': 'Add a comment…', 'Dodaj komentarz': 'Add comment',
    'Odpowiedz': 'Reply', 'Załączniki': 'Attachments', 'Dodano komentarz': 'Comment added', 'Opublikowano': 'Posted', 'Szukane wyrażenie': 'Search phrase',
    'Wpisz słowo i naciśnij Enter': 'Type a word and press Enter', 'Fora klasowe': 'Class forums', 'Fora przedmiotowe': 'Subject forums',
    'Forum ogólne': 'General forum', 'Nowy temat': 'New topic', 'Wyszukaj': 'Search', 'Wyszukiwarka': 'Search', 'zobacz więcej wątków': 'see more threads',
    // documents, files
    'Szukaj dokumentu': 'Search documents', 'Brak dokumentów': 'No documents', 'Pobierz': 'Download', 'Pokaż': 'Show', 'Dokument': 'Document',
    'Otwórz plik': 'Open file', 'Wszystkie dokumenty': 'All documents', 'Szukaj pliku': 'Search files', 'Brak plików': 'No files', 'Otwieram plik…': 'Opening file…',
    // profile, class, people
    'Wychowawca': 'Form tutor', 'Wychowawcy': 'Form tutors', 'Rodzice / opiekunowie': 'Parents / guardians', 'Dane osobowe': 'Personal data',
    'Pokaż dane (adres, PESEL, telefon…)': 'Show data (address, PESEL, phone…)', 'Ostatnie oceny': 'Recent grades', 'Ostatnie obecności': 'Recent attendance',
    'Edytuj profil': 'Edit profile', 'KLASA': 'CLASS', 'Forum klasy': 'Class forum', 'Uczniowie': 'Students', 'Szukaj ucznia': 'Search students', 'TY': 'YOU',
    'Rodzic / opiekun': 'Parent / guardian', 'Wyślij wiadomość': 'Send a message', 'Kontakt': 'Contact', 'LISTA UCZNIÓW': 'STUDENT LIST',
    'Prowadzi': 'Teacher', 'Prowadzący': 'Teachers', 'Uczniowie, nauczyciele i rodzice w IDU': 'Students, teachers and parents in IDU',
    'Imię lub nazwisko (min. 3 litery)': 'First or last name (min. 3 letters)', 'Grupy do których należę': 'My groups', 'Klasy, których jestem wychowawcą': 'Classes I tutor',
    'Lista nauczycieli': 'Teachers', 'Lista klas': 'Classes', 'Lista sal': 'Rooms', 'Recenzje': 'Reviews', 'Nic tu jeszcze nie ma': 'Nothing here yet',
    'Ilość miejsc': 'Seats', 'Przystosowana dla osób niepełnosprawnych': 'Wheelchair accessible', 'nie': 'no', 'tak': 'yes',
    // announcement
    'Nowe ogłoszenie do potwierdzenia.': 'New announcement to confirm.', 'IDU pokaże resztę dopiero po jego przeczytaniu.': 'IDU will show everything else once you have read it.',
    'Potwierdzam przeczytanie': 'I have read it', 'Potwierdzanie…': 'Confirming…',
    // settings
    'Zmiany działają od razu i zapisują się w apce.': 'Changes apply at once and are saved in the app.', 'Twoje zdjęcie': 'Your photo', 'Wybierz': 'Choose',
    'Zdjęcie zostaje tylko w tym telefonie — nie jest wysyłane do IDU i nikt inny go nie zobaczy.': 'The photo stays on this phone only — it is never sent to IDU and nobody else sees it.',
    'Imię w powitaniu': 'Name in the greeting', 'np. Janek': 'e.g. John', 'Wygląd': 'Appearance', 'Motyw': 'Theme', 'Ciemny': 'Dark', 'Czarny (OLED)': 'Black (OLED)',
    'Granatowy': 'Navy', 'Grafit': 'Graphite', 'Śliwkowy': 'Plum', 'Kolor akcentu': 'Accent colour', 'Kolory przedmiotów': 'Subject colours', 'Żywe': 'Vivid',
    'Stonowane': 'Muted', 'Jeden kolor': 'One colour', 'Zaokrąglenie': 'Corners', 'Małe': 'Small', 'Średnie': 'Medium', 'Duże': 'Large', 'Gęstość': 'Density',
    'Kompaktowa': 'Compact', 'Normalna': 'Normal', 'Rozmiar tekstu': 'Text size', 'Czcionka': 'Font', 'Standardowa': 'Standard', 'Zaokrąglona': 'Rounded',
    'Animacje': 'Animations', 'Efekt szkła (rozmycie)': 'Glass effect (blur)', 'Wibracje przy dotyku': 'Haptic feedback', 'Powiadomienia': 'Notifications',
    'Przypomnienie przed lekcją': 'Reminder before each lesson', 'Wył.': 'Off', 'Sprawdzian — dzień wcześniej': 'Tests — the day before',
    'Termin zadania — dzień wcześniej': 'Homework deadlines — the day before', 'Godzina przypomnień „dzień wcześniej”': 'Time of the “day before” reminders',
    'Przypomnienia liczą się z Twojego planu i kalendarza, więc działają też przy zamkniętej apce. Nowych ocen i wiadomości iPhone nie może sprawdzać w tle.':
      'Reminders are worked out from your timetable and calendar, so they work even when the app is closed. The iPhone cannot check for new grades or messages in the background.',
    'Powiadomienia działają tylko w aplikacji IDU na iPhonie.': 'Notifications only work in the IDU iPhone app.',
    'iPhone blokuje powiadomienia dla IDU. Włącz je w Ustawieniach iPhone’a → Powiadomienia → IDU.': 'Your iPhone blocks notifications for IDU. Turn them on in iPhone Settings → Notifications → IDU.',
    'Widget': 'Widget', 'Następna lekcja i sala': 'Next lesson and room', 'Przytrzymaj palec na ekranie głównym →': 'Touch and hold the Home Screen →',
    'Edytuj': 'Edit', 'Dodaj widżet': 'Add Widget', 'i wybierz rozmiar.': 'and pick a size.', 'Na ekranie blokady: przytrzymaj go →': 'On the Lock Screen: touch and hold it →',
    'Dostosuj': 'Customize', 'Ekran blokady': 'Lock Screen', '→ pole widżetów.': '→ widget area.', 'Widget odświeża się, gdy otworzysz Start w apce.': 'The widget updates whenever you open Home in the app.',
    'Ekran Start': 'Home screen', 'Karta bieżącej lekcji': 'Current lesson card', 'Zadania z bliskim terminem': 'Homework due soon', 'Nadchodzące wydarzenia': 'Upcoming events',
    'Nawigacja': 'Navigation', 'Po otwarciu apki pokaż': 'Open the app on', 'Plan lekcji domyślnie': 'Timetable opens as', 'Poczta': 'Mail',
    'Podpisy w dolnym pasku': 'Labels in the tab bar', 'Przywróć domyślne': 'Reset to defaults', 'Zdjęcie zapisane': 'Photo saved',
    'Nie udało się wczytać zdjęcia': 'Could not load the photo', 'Ten format zdjęcia nie jest obsługiwany': 'This photo format is not supported',
    'Brak połączenia z IDU': 'No connection to IDU', 'Twoje obecności': 'Your attendance', 'Uczący': 'Teaching', 'Nieuczący': 'Non-teaching',
    'brak': 'none', 'Moje wypowiedzi na forach': 'My forum posts'
  };
  const STATUS_EN = { 'Obecność': 'Present', 'Nieobecność': 'Absence', 'Spóźnienie': 'Late', 'Usprawiedliwione': 'Excused' };
  const TR_RX = [
    [/^Sprawdzian: (.+)$/, 'Test: $1'],
    [/^(\d+) lekcje$/, '$1 lessons'],
    [/^lekcja (\d+)$/, 'lesson $1'],
    [/^Komentarze · (\d+)$/, 'Comments · $1'],
    [/^Posty · (\d+)$/, 'Posts · $1'],
    [/^(Obecność|Nieobecność|Spóźnienie|Usprawiedliwione) (×\d+)$/, (m, a, b) => STATUS_EN[a] + ' ' + b],
    [/^(\d+) wątków$/, '$1 threads'],
    [/^Termin: (.+)$/, 'Due: $1'],
    [/^Aktualizacja: (.+)$/, 'Update: $1'],
    [/^Sala (\S{1,8})$/, 'Room $1']
  ];
  const MONTH_EN = { sty: 'Jan', lut: 'Feb', mar: 'Mar', kwi: 'Apr', maj: 'May', cze: 'Jun', lip: 'Jul', sie: 'Aug', wrz: 'Sep', 'paź': 'Oct', lis: 'Nov', gru: 'Dec' };
  const MONTH_RX = /(\d{1,2}) (sty|lut|mar|kwi|maj|cze|lip|sie|wrz|paź|lis|gru)(?=[\s,.)]|$)/g;

  /* start (at the very end, so everything above is defined) */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
