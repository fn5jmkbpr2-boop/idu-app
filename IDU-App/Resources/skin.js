// ==UserScript==
// @name        IDU Skin
// @description Nowoczesny, mobilny wygląd dla IDU (s27.idu.edu.pl) w stylu aplikacji
// @version     3.0
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
    finally { uncloak(); }
  }

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  const attr = (el, a) => el ? (el.getAttribute(a) || '') : '';
  const cleanTitle = s => s.replace(/zwiń|rozwiń/g, '').trim();

  /* ------------------------------------------------------------------ *
   *  Dates (Polish)
   * ------------------------------------------------------------------ */
  const MONTHS = { sty: 0, lut: 1, mar: 2, kwi: 3, maj: 4, cze: 5, lip: 6, sie: 7, wrz: 8, 'paź': 9, paz: 9, lis: 10, gru: 11 };
  const MONTH_SHORT = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  const DAY_SHORT = ['Nd', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
  const DAY_FULL = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

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
    if (diffMin >= 0 && diffMin < 1) return 'przed chwilą';
    if (diffMin >= 0 && diffMin < 60) return diffMin + ' min temu';
    if (dayDiff === 0 && diffMin >= 0) return Math.round(diffMin / 60) + ' godz. temu';
    if (dayDiff === 0) return 'dziś';
    if (dayDiff === 1) return 'wczoraj';
    if (dayDiff === -1) return 'jutro';
    if (dayDiff > 1 && dayDiff < 7) return dayDiff + ' dni temu';
    if (dayDiff < -1 && dayDiff > -7) return 'za ' + (-dayDiff) + ' dni';
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
  function subjColor(name) {
    const n = normSubj(name);
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }
  const prettySubj = n => {
    const s = String(n || '').replace(/\([PR]\)\s*$/, '').replace(/\s+1\s*$/, '').trim();
    return s === s.toUpperCase() && s.length > 4 ? s.charAt(0) + s.slice(1).toLowerCase() : s.charAt(0).toUpperCase() + s.slice(1);
  };
  const plural = (n, one, few, many) => n === 1 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? few : many;
  const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  /* ------------------------------------------------------------------ *
   *  Icons (simple line icons)
   * ------------------------------------------------------------------ */
  const ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    grades: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    back: '<polyline points="15 18 9 12 15 6"/>',
    right: '<polyline points="9 18 15 12 9 6"/>',
    down: '<polyline points="6 9 12 15 18 9"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    news: '<path d="M4 22h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9h4"/><line x1="10" y1="7" x2="16" y2="7"/><line x1="10" y1="11" x2="16" y2="11"/><line x1="10" y1="15" x2="14" y2="15"/>',
    star: '<polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2"/>',
    book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.6" y2="16.6"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    pin: '<path d="M12 22s8-6 8-12a8 8 0 0 0-16 0c0 6 8 12 8 12z"/><circle cx="12" cy="10" r="3"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    sort: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/>',
    exam: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'
  };
  const I = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;

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
  .les.past{opacity:.5}
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
  .kv span:last-child{text-align:right;font-weight:600;word-break:break-word}

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
  `;

  /* ------------------------------------------------------------------ *
   *  Styles for the real IDU page (fallback pages + hiding)
   * ------------------------------------------------------------------ */
  const PAGE_CSS = `
  html.sk-full,html.sk-full body{background:#0f1115!important;margin:0!important;padding:0!important;min-width:0!important}
  html.sk-full body>*:not(#sk-host){display:none!important}
  #sk-host{display:block!important;position:static!important;width:auto!important;margin:0!important;padding:0!important;border:0!important;float:none!important}

  html.sk-fb{--fb-bg:#0f1115;--fb-card:#1b1e26;--fb-card2:#252a34;--fb-text:#f2f4f8;--fb-muted:#9097a8;--fb-line:#2b303b;--fb-accent:#3d9be9}
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
    scope.querySelectorAll(ANIM_SEL).forEach(el => {
      const parent = el.parentElement && el.parentElement.closest(ANIM_SEL);
      if (parent && scope.contains(parent)) return;            // only animate outermost blocks
      el.classList.remove('anim');
      void el.offsetWidth;                                     // restart animation
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
    wrap.innerHTML = `<div class="sk-brand"><div class="sk-logo">IDU</div><h1>Zaloguj się</h1>
      <div class="sk-sub">${esc(txt($('#school-name')) || 'Dziennik IDU')}</div></div><div class="sk-flash"></div><div class="sk-box"></div>`;
    const fl = wrap.querySelector('.sk-flash');
    flashes.forEach(f => {
      if (txt(f).length > 160) {       // long notices collapse
        const d = document.createElement('details');
        d.innerHTML = `<summary>${esc(txt(f).split(/[.!]/)[0].slice(0, 70))} ▾</summary>`;
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
  const ACCENTS = { blue: '#3d9be9', purple: '#8b6cf6', green: '#2fbf71', orange: '#f5862b', pink: '#ec5f9b', red: '#f0506e' };
  function loadSettings() {
    let o = {}; try { o = JSON.parse(store.get('skSettings') || '{}'); } catch (e) {}
    return Object.assign({ size: 'm', font: 'system', accent: 'blue', motion: true }, o);
  }
  function applySettings(app) {
    const st = loadSettings();
    const acc = ACCENTS[st.accent] || ACCENTS.blue;
    if (app) {
      app.style.setProperty('--accent', acc);
      app.dataset.size = st.size;
      app.classList.toggle('rounded', st.font === 'rounded');
      app.classList.toggle('nomotion', !st.motion);
    }
    document.documentElement.style.setProperty('--fb-accent', acc);
    return st;
  }
  function openSettings(root, app) {
    const st = loadSettings();
    const seg = (key, opts) => `<div class="seg" data-k="${key}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(st[key]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const sh = openSheet(root, `<h2>Ustawienia</h2><div class="muted small" style="margin-bottom:14px">Zmiany działają od razu i zapisują się w apce.</div>
      <div class="lbl" style="--c:var(--muted)">Rozmiar tekstu</div>${seg('size', [['s', 'A−'], ['m', 'A'], ['l', 'A+'], ['xl', 'A++']])}
      <div class="lbl" style="--c:var(--muted)">Czcionka</div>${seg('font', [['system', 'Standardowa'], ['rounded', 'Zaokrąglona']])}
      <div class="lbl" style="--c:var(--muted)">Kolor akcentu</div>
      <div class="swatches">${Object.entries(ACCENTS).map(([k, c]) => `<button data-acc="${k}" class="${st.accent === k ? 'on' : ''}" style="--c:${c}" aria-label="${k}"></button>`).join('')}</div>
      <div class="lbl" style="--c:var(--muted)">Animacje</div>${seg('motion', [['true', 'Włączone'], ['false', 'Wyłączone']])}
      <div class="lbl" style="--c:var(--muted)">Plan lekcji domyślnie</div>${seg('plan', [['day', 'Dzień'], ['week', 'Tydzień']])}`);
    const save = (k, v) => {
      const cur = loadSettings();
      if (k === 'plan') { store.set('skPlanMode', v); return; }
      cur[k] = k === 'motion' ? v === 'true' : v;
      store.set('skSettings', JSON.stringify(cur)); applySettings(app);
    };
    const planNow = store.get('skPlanMode') || 'day';
    sh.querySelectorAll('.seg[data-k="plan"] button').forEach(b => b.classList.toggle('on', b.dataset.v === planNow));
    sh.querySelectorAll('.seg[data-k] button').forEach(b => b.onclick = () => {
      const k = b.parentElement.dataset.k;
      b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      save(k, b.dataset.v);
    });
    sh.querySelectorAll('.swatches button').forEach(b => b.onclick = () => {
      sh.querySelectorAll('.swatches button').forEach(x => x.classList.toggle('on', x === b)); save('accent', b.dataset.acc);
    });
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
   *  MAIN
   * ------------------------------------------------------------------ */
  function main() {
    const accLink = $('#account a');

    // Fix the "tiny desktop page" problem
    let vp = $('meta[name="viewport"]');
    if (!vp) { vp = document.createElement('meta'); vp.name = 'viewport'; document.head.appendChild(vp); }
    vp.content = NO_ZOOM;

    const pageStyle = document.createElement('style');
    pageStyle.textContent = PAGE_CSS + LOGIN_CSS;
    document.head.appendChild(pageStyle);

    if (!accLink) {                             // login / logged-out pages
      if (!loginMode()) { vp.content = 'width=1000, user-scalable=yes'; pageStyle.remove(); }
      return;
    }

    const ctx = {
      student: attr(accLink, 'href'),
      name: txt($('#login strong')),
      unread: parseInt(txt($('#messages strong')), 10) || 0,
      timer: $('.js-counter'),
      path: location.pathname.replace(/\/+$/, '') || '/'
    };

    if (CLASSIC) { mountClassicSwitch(); return; }

    const page = route(ctx);
    mount(ctx, page);
  }

  function route(ctx) {
    const p = ctx.path;
    if (p === '/') return homePage(ctx);
    if ($('table.marks-table')) return gradesPage(ctx);
    if ($('table.presences_table') || /\/presences$/.test(p) && $('.module table')) return presencesPage(ctx);
    if ($('table.message-table')) return messagesPage(ctx);
    if ($('#message #message-body')) return messagePage(ctx);
    if (/homeworks$/.test(p) && $('table.object_list-table')) return homeworksPage(ctx);
    if (/^\/klasses\/\d+$/.test(p) && $('#subject-card')) return klassPage(ctx);
    if (/^\/(teachers|parents)\/\d+$/.test(p) && $('#student-card')) return personPage(ctx);
    if ($('#subject-card')) return subjectPage(ctx);
    if ($('#calendar[data-events-url]')) return calendarPage(ctx);
    if ($('#student-card')) return profilePage(ctx);
    if ($('#content table.forum-table')) return forumListPage(ctx);
    if ($('#content table.thread-table')) return threadPage(ctx);
    if (/^\/documents\/attachments$/.test(p) && $('#content table.object_list-table')) return docsPage(ctx);
    if (/\/homeworks\/\d+$/.test(p) && $('#content .module h3')) return hwDetailPage(ctx);
    if (/lesson_instances$/.test(p) && $('#content table')) return topicsPage(ctx);
    if ($('#content table.subjects-table') && !/lesson_instances/.test(p)) return subjectsListPage(ctx);
    if ($('#content .profile-event') && !$('#content textarea, #content form input[type=text]') && !$('#content table')) return eventsPage(ctx);
    return null; // fallback: keep IDU content, just restyle it
  }

  /* ------------------------------------------------------------------ *
   *  Shell: top bar, bottom nav, drawer
   * ------------------------------------------------------------------ */
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

    const tabs = [
      ['start', 'home', 'Start', '/#start'],
      ['grades', 'grades', 'Oceny', ctx.student + '/grades'],
      ['plan', 'calendar', 'Plan', '/#plan'],
      ['mail', 'mail', 'Wiadomości', '/internal_messages'],
      ['pres', 'chart', 'Frekwencja', ctx.student + '/presences']
    ];

    root.innerHTML = `<style>${APP_CSS}</style>
      <div class="app" id="app">
        <header class="top">
          ${isTop ? `<button class="btn" id="menu" aria-label="Menu">${I('menu')}</button>`
                  : `<button class="btn" id="back" aria-label="Wstecz">${I('back')}</button>`}
          <div class="title" id="title">${esc(title)}</div>
          ${isTop ? '' : `<button class="btn" id="menu" aria-label="Menu">${I('menu')}</button>`}
        </header>
        ${fallback ? '' : `<main id="main"></main>`}
        <nav class="nav">${tabs.map(([k, ic, label, href]) =>
          `<a href="${esc(href)}" data-tab="${k}" class="${k === tab ? 'on' : ''}">${I(ic)}${label}${
            k === 'mail' && ctx.unread ? `<span class="badge">${ctx.unread}</span>` : k === 'grades' && newGrades() && tab !== 'grades' ? `<span class="badge">${newGrades()}</span>` : ''}</a>`).join('')}</nav>
        <div class="scrim" id="scrim"></div>
        <aside class="drawer">${drawerHTML(ctx)}</aside>
      </div>`;

    const app = root.getElementById('app');
    applySettings(app);
    const toggle = open => app.classList.toggle('open', open);
    // tapping the tab you're already on scrolls to the top
    root.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', e => {
      if (a.classList.contains('on') && (a.getAttribute('href').split('#')[0] === location.pathname || a.getAttribute('href') === '/#' + (location.hash.slice(1) || 'start'))) {
        e.preventDefault(); e.stopPropagation(); window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, true));
    root.getElementById('settings').onclick = e => { e.preventDefault(); toggle(false); openSettings(root, app); };
    if (tab === 'grades') store.set('skNewGrades', '0');
    root.getElementById('menu').onclick = () => toggle(true);
    root.getElementById('scrim').onclick = () => toggle(false);
    const back = root.getElementById('back');
    if (back) back.onclick = () => { if (history.length > 1) history.back(); else location.href = '/'; };
    root.getElementById('classic').onclick = e => { e.preventDefault(); store.set('skClassic', '1'); location.reload(); };
    if (ctx.timer) {
      const t = root.getElementById('timer');
      const upd = () => { t.textContent = 'Wylogowanie za ' + txt(ctx.timer); };
      upd();
      new MutationObserver(upd).observe(ctx.timer, { childList: true, characterData: true, subtree: true });
    }

    // smooth page-leave animation for normal links
    root.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || a.target === '_blank') return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || /^(javascript|mailto|tel):/i.test(href)) return;
      const u = new URL(href, location.href);
      if (u.origin !== location.origin) return;
      if (u.pathname === location.pathname && u.search === location.search && u.hash) return; // same page (#plan)
      e.preventDefault();
      app.classList.add('leaving');
      setTimeout(() => { location.href = u.href; }, 140);
    });
    window.addEventListener('pageshow', ev => { if (ev.persisted) app.classList.remove('leaving'); });

    if (fallback) {
      document.documentElement.classList.add('sk-fb');
      improveFallback();
      return;
    }

    const mainEl = root.getElementById('main');
    page.render(mainEl, root, { setTitle: s => { root.getElementById('title').textContent = s; }, setTab: k => {
      root.querySelectorAll('.nav a').forEach(a => a.classList.toggle('on', a.dataset.tab === k));
    }, animate: () => animateIn(mainEl) });
    animateIn(mainEl);
    document.documentElement.classList.add('sk-full');
  }

  function drawerHTML(ctx) {
    const item = (href, ic, label, extra = '') => `<a class="dl" href="${esc(href)}">${I(ic)}<span>${label}</span>${extra}</a>`;
    return `
      <div class="who">${PERSON_AV}
        <div><b>${esc(ctx.name)}</b><span id="timer"></span></div></div>
      ${item('/#start', 'home', 'Start')}
      ${item(ctx.student + '/grades', 'grades', 'Oceny')}
      ${item('/#plan', 'calendar', 'Plan lekcji')}
      ${item(ctx.student + '/homeworks', 'edit', 'Zadania domowe')}
      ${item(ctx.student + '/presences', 'chart', 'Frekwencja')}
      ${item('/internal_messages', 'mail', 'Wiadomości', ctx.unread ? `<span class="cnt">${ctx.unread}</span>` : '')}
      <div class="dsep"></div>
      ${item('/#przedmioty', 'book', 'Przedmioty')}
      ${item(ctx.student + '/subject_announcements', 'bell', 'Ogłoszenia')}
      ${item('/informations', 'news', 'Aktualności')}
      ${item('/calendar', 'clock', 'Kalendarz')}
      ${item('/forums', 'chat', 'Forum')}
      ${item('/documents/attachments', 'file', 'Dokumenty')}
      ${item(ctx.student, 'user', 'Mój profil')}
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
      <button>Nowy wygląd</button>`;
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
          teacher: $$('.lesson-cell > a[href^="/teachers"], .teacher a', td).map(txt).join(', '),
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
        label = `Teraz · zostało ${left} min${more ? ' (+' + more + ' lekcja)' : ''}`; extra = `${cur.start} – ${cur.end}`;
        prog = Math.min(100, Math.max(0, 100 * (n - mins(cur.start)) / (mins(cur.end) - mins(cur.start))));
        after = ls.find(x => mins(x.start) >= mins(cur.end) && x.nr > cur.nr + more);
      } else if (nxt) {
        l = nxt; const inMin = mins(nxt.start) - n;
        const started = ls.some(x => mins(x.end) <= n);
        label = started ? `Przerwa · lekcja za ${inMin} min` : inMin <= 90 ? `Pierwsza lekcja za ${inMin} min` : 'Pierwsza lekcja';
        extra = `${nxt.start} – ${nxt.end}`;
      } else {
        const d = nextDayWithLessons(today);
        if (!plan[d]) return '<div id="nowcard"></div>';
        l = plan[d][0]; label = (d === (today + 1) % 7 ? 'Jutro' : DAY_FULL[d]) + ' na start'; extra = `${l.start} – ${l.end}`;
      }
      const c = subjColor(l.raw); const t = teacherFor(l);
      return `<div id="nowcard"><a class="card now tap" href="#plan" style="--c:${c}"><div class="bar"></div><div class="in" style="display:block">
        <div class="row"><div class="grow"><div class="lbl">${esc(label)}</div><div class="b clip" style="font-size:19px">${esc(l.name)}</div>
        <div class="muted small clip">${esc(extra)}${t ? ' · ' + esc(t) : ''}</div></div>
        ${l.room ? `<div class="room">${esc(l.room)}</div>` : ''}</div>
        ${l.note ? `<div class="pill warn" style="margin-top:8px">${I('exam', 'xs')} ${esc(l.note)}</div>` : ''}
        ${prog != null ? `<div class="prog"><i style="width:${prog.toFixed(1)}%"></i></div>` : ''}
        ${after ? `<div class="muted small" style="margin-top:8px">Potem: <b style="color:var(--text)">${esc(after.name)}</b> · ${esc(after.start)}${after.room ? ' · sala ' + esc(after.room) : ''}</div>` : ''}
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
            ${strip(it.subject || 'Zadanie', due ? 'Termin: ' + esc(shortDate(due) + ', ' + hhmm(due)) : 'bez terminu')}</a></div></div>`;
        }
        case 'pres': {
          const code = it.ok ? 'OB' : it.late ? 'SP' : 'NB';
          return `<div class="fi"><div class="dot">${I('chart')}</div><div class="body">${head('chart', 'Frekwencja')}
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
    // upcoming tests from the calendar (cached for 15 min)
    let exams = null;
    try { const c = JSON.parse(sessionStorage.getItem('skExams') || 'null'); if (c && Date.now() - c.t < 15 * 60e3) exams = c.list; } catch (e) {}
    async function loadExams(after) {
      if (exams) return;
      try {
        const s0 = new Date(); s0.setHours(0, 0, 0, 0); const e0 = new Date(s0); e0.setDate(e0.getDate() + 21);
        const list = await (await fetch(`/calendar_events.json?start_at=${Math.floor(s0 / 1000)}&stop_at=${Math.floor(e0 / 1000)}`, { credentials: 'same-origin' })).json();
        exams = list.filter(x => /grade_event/.test(x.className || '')).map(x => ({ title: x.title, start: x.start, url: (x.url || '').replace(/^https?:\/\/[^/]+/, '') }));
        try { sessionStorage.setItem('skExams', JSON.stringify({ t: Date.now(), list: exams })); } catch (e) {}
        if (after) after();
      } catch (e) { exams = []; }
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
          <span class="pill ${days <= 2 ? 'bad' : days <= 6 ? 'warn' : ''}">${days === 0 ? 'dziś' : days === 1 ? 'jutro' : 'za ' + days + ' dni'}</span></a>`;
      }).join('');
    }

    function startView() {
      const h = new Date().getHours();
      const hello = h < 5 ? 'Dobranoc' : h < 12 ? 'Dzień dobry' : h < 18 ? 'Cześć' : 'Dobry wieczór';
      const dateS = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
      return `
        <h1>${esc(hello)}, ${esc(firstName)}</h1>
        <p class="lead">${esc(dateS)}${klass ? ' · ' + esc(txt(klass)) : ''}</p>
        ${pendingAnn.map(a => `<a class="alert tap" href="${esc(a.href)}">${I('alert')}<div class="grow">
          <div class="b">Do potwierdzenia</div><div class="small muted clip">${esc(a.title)}</div></div>${I('right', 'sm chev')}</a>`).join('')}
        ${dueSoon.map(h => `<a class="alert tap" href="${esc(h.href)}" style="background:color-mix(in srgb,var(--bad) 14%,var(--card))">
          <div style="color:var(--bad)">${I('timer')}</div><div class="grow"><div class="b clip">${esc(h.title)}</div>
          <div class="small muted">Termin ${esc(relTime(h.dueD) === 'dziś' ? 'dziś' : relTime(h.dueD))}, ${esc(hhmm(h.dueD))}${h.subject ? ' · ' + esc(prettySubj(h.subject)) : ''}</div></div>${I('right', 'sm chev')}</a>`).join('')}
        ${nowNextCard()}
        <div id="exams">${examsHTML()}</div>
        ${events.length ? `<div class="sec"><h2>Nadchodzące</h2><a href="/calendar">Kalendarz</a></div>
          <div class="hs">${events.map(e => `<a class="card ev tap" href="${esc(e.href)}">
            <div class="datebox"><b>${e.date ? e.date.getDate() : '?'}</b><span>${e.date ? MONTH_SHORT[e.date.getMonth()] : ''}</span></div>
            <div class="grow"><div class="b two">${esc(e.title)}</div><div class="muted small">${e.date ? esc(DAY_FULL[e.date.getDay()]) + (e.date.getHours() ? ', ' + hhmm(e.date) : '') : esc(e.dateS)}</div></div></a>`).join('')}</div>` : ''}
        <div class="sec"><h2>Co nowego</h2><a href="#" id="reload">${I('refresh', 'xs')}</a></div>
        ${chipRow('ff', feedKinds().map(([v, label]) => ({ v, label, n: v === 'all' ? null : feed.filter(f => f.kind === v).length })).filter(o => o.n !== 0), feedFilter)}
        <div id="feed">${feedHTML()}</div>
        <div class="muted small" style="text-align:center;margin-top:10px">Zaktualizowano: ${esc(hhmm(new Date()))}</div>`;
    }

    // ---------- plan ----------
    const planDays = [1, 2, 3, 4, 5];
    let planDay = (plan[today] && plan[today].length && nowMin() <= mins(plan[today][plan[today].length - 1].end))
      ? today : nextDayWithLessons(today);
    if (!planDays.includes(planDay)) planDay = 1;
    let planMode = store.get('skPlanMode') || 'day';
    function dateFor(wd) { // date of weekday in current (or coming) week
      const d = new Date(); const cur = d.getDay() || 7;
      const base = (cur >= 6) ? 7 : 0; // weekend -> next week
      d.setDate(d.getDate() - cur + wd + base);
      return d;
    }
    function dayList(wd) {
      const ls = plan[wd] || [];
      if (!ls.length) return '<div class="empty">Brak lekcji</div>';
      const n = nowMin();
      return ls.map((l, i) => {
        let st = '';
        if (wd === today) { if (n >= mins(l.start) && n <= mins(l.end)) st = 'cur'; else if (n > mins(l.end)) st = 'past'; }
        const prev = ls[i - 1];
        const gap = prev ? mins(l.start) - mins(prev.end) : 0;
        return `${gap >= 15 ? `<div class="brk">przerwa ${gap} min</div>` : ''}
          <a class="card les tap ${st}" href="${esc(l.href)}" data-les="${wd}:${i}" style="--c:${subjColor(l.raw)}"><div class="bar"></div><div class="in">
          <div class="tm">${esc(l.start)}<br>${esc(l.end)}</div>
          <div class="grow"><div class="b clip">${esc(l.name)} ${st === 'cur' ? '<span class="pill good">TERAZ</span>' : ''}</div>
          <div class="muted small clip">Lekcja ${l.nr}${teacherFor(l) ? ' · ' + esc(teacherFor(l)) : ''}</div>
          ${l.note ? `<div class="pill warn" style="margin-top:5px">${I('exam', 'xs')} ${esc(l.note)}</div>` : ''}</div>
          ${l.room ? `<div class="room">${esc(l.room)}</div>` : ''}</div></a>`;
      }).join('');
    }
    function weekGrid() {
      const nrs = [].concat(...planDays.map(d => (plan[d] || []).map(l => l.nr)));
      if (!nrs.length) return '<div class="empty">Brak planu</div>';
      const minNr = Math.min(...nrs), maxNr = Math.max(...nrs);
      const times = {};
      planDays.forEach(d => (plan[d] || []).forEach(l => { times[l.nr] = l.start; }));
      let cells = `<div></div>` + planDays.map(d => `<div class="h ${d === today ? 'today' : ''}">${DAY_SHORT[d]}</div>`).join('');
      // place items with explicit rows; merge consecutive identical lessons
      const items = [];
      planDays.forEach((d, ci) => {
        const ls = (plan[d] || []).slice().sort((a, b) => a.nr - b.nr);
        for (let i = 0; i < ls.length; i++) {
          let span = 1;
          while (ls[i + span] && ls[i + span].raw === ls[i].raw && ls[i + span].nr === ls[i].nr + span) span++;
          items.push({ col: ci + 2, row: ls[i].nr - minNr + 2, span, l: ls[i] });
          i += span - 1;
        }
      });
      for (let nr = minNr; nr <= maxNr; nr++)
        cells += `<div class="t" style="grid-column:1;grid-row:${nr - minNr + 2}">${esc(times[nr] || '')}</div>`;
      cells += items.map(it => `<a class="c tap" href="${esc(it.l.href)}" data-les="${planDays[it.col - 2]}:${(plan[planDays[it.col - 2]] || []).indexOf(it.l)}" style="--c:${subjColor(it.l.raw)};grid-column:${it.col};grid-row:${it.row} / span ${it.span}">
        ${it.l.note ? '<b style="display:block;font-size:10px">⚑ test</b>' : ''}${esc(it.l.name)}<small>${esc(it.l.room)}</small></a>`).join('');
      return `<div class="grid" style="grid-template-rows:auto repeat(${maxNr - minNr + 1},minmax(42px,auto))">${cells}</div>`;
    }
    function planView() {
      return `<div class="seg"><button data-mode="day" class="${planMode === 'day' ? 'on' : ''}">Dzień</button>
        <button data-mode="week" class="${planMode === 'week' ? 'on' : ''}">Tydzień</button></div>
        ${planMode === 'day'
          ? `<div class="days">${planDays.map(d => `<button data-d="${d}" class="${d === planDay ? 'on' : ''}">${DAY_SHORT[d]}<small>${dateFor(d).getDate()}</small></button>`).join('')}</div>
             <div id="daylist">${dayList(planDay)}</div>`
          : weekGrid()}`;
    }

    // ---------- subjects ----------
    const LINK_LABEL = { 'zadania domowe': ['edit', 'Zadania'], 'oceny': ['grades', 'Oceny'], 'obecności': ['chart', 'Obecności'],
      'tematy lekcji': ['book', 'Tematy'], 'forum': ['chat', 'Forum'] };
    function subjectsView() {
      return `<div class="search">${I('search', 'sm')}<input id="filter" placeholder="Szukaj przedmiotu" autocomplete="off"></div>
        ${klass ? `<div class="chips" style="margin:0 0 14px">
          <a class="chip" href="${esc(attr(klass, 'href'))}">${I('users')}Klasa ${esc(txt(klass))}</a>
          ${klassForum ? `<a class="chip" href="${esc(attr(klassForum, 'href'))}">${I('chat')}Forum klasowe</a>` : ''}</div>` : ''}
        <div id="subjlist">${subjects.map(s => `<details class="card" data-n="${esc(s.name.toLowerCase())}">
          <summary class="row"><div class="av" style="background:${subjColor(s.name)}">${esc(prettySubj(s.name).charAt(0))}</div>
          <div class="grow b clip">${esc(prettySubj(s.name))}</div>${I('down', 'sm chev')}</summary>
          <div class="chips"><a class="chip" href="${esc(s.href)}">${I('layers')}Otwórz</a>${s.links.map(l => {
            const [ic, lab] = LINK_LABEL[l.t] || ['right', l.t];
            return `<a class="chip" href="${esc(l.h)}">${I(ic)}${esc(lab)}</a>`;
          }).join('')}</div></details>`).join('')}</div>`;
    }

    function openLesson(root, wd, i) {
      const l = (plan[wd] || [])[i]; if (!l) return;
      const subj = subjects.find(x => x.href === '/subjects/' + l.sid);
      const LL = { 'zadania domowe': ['edit', 'Zadania'], 'oceny': ['grades', 'Oceny'], 'obecności': ['chart', 'Obecności'], 'tematy lekcji': ['book', 'Tematy'], 'forum': ['chat', 'Forum'] };
      const t = teacherFor(l);
      openSheet(root, `<div class="hero" style="--c:${subjColor(l.raw)};margin:0 0 14px">
          <div style="opacity:.85;font-size:13px;font-weight:700">${esc(DAY_FULL[wd].replace(/^./, m => m.toUpperCase()))} · lekcja ${l.nr}</div>
          <h1 style="margin:4px 0 2px">${esc(l.name)}</h1><div style="font-weight:600">${esc(l.start)} – ${esc(l.end)}${l.room ? ' · sala ' + esc(l.room) : ''}</div></div>
        ${t ? `<div class="kv"><span>Nauczyciel</span><span>${esc(t)}</span></div>` : ''}
        ${l.note ? `<div class="kv"><span>Sprawdzian / notatka</span><span style="color:var(--warn)">${esc(l.note)}</span></div>` : ''}
        <div class="chips" style="margin-top:14px"><a class="chip" href="${esc(l.href)}">${I('layers')}Strona przedmiotu</a>
          ${subj ? subj.links.filter(x => LL[x.t]).map(x => `<a class="chip" href="${esc(x.h)}">${I(LL[x.t][0])}${LL[x.t][1]}</a>`).join('') : ''}
          ${l.links.map(x => `<a class="chip" href="${esc(x.h)}" target="_blank">${I('right')}${esc(x.t || 'Link')}</a>`).join('')}</div>`);
    }

    return {
      title: 'Start', tab: 'start', top: true,
      render(main, root, api) {
        function show() {
          const v = (location.hash || '#start').slice(1);
          if (v === 'plan') { api.setTitle('Plan lekcji'); api.setTab('plan'); main.innerHTML = planView(); }
          else if (v === 'przedmioty') { api.setTitle('Przedmioty'); api.setTab(''); main.innerHTML = subjectsView(); }
          else { api.setTitle('Start'); api.setTab('start'); main.innerHTML = startView(); }
          root.getElementById('app').classList.remove('open');
          window.scrollTo(0, 0);
          wire();
          if (api.animate) api.animate();
        }
        function wire() {
          const r = root.getElementById('reload');
          if (r) r.onclick = e => { e.preventDefault(); location.reload(); };
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
            dl.innerHTML = dayList(planDay);
            animateIn(dl);
          });
          const f = root.getElementById('filter');
          if (f) f.oninput = () => {
            const q = f.value.toLowerCase().trim();
            root.querySelectorAll('#subjlist details').forEach(d => { d.style.display = !q || d.dataset.n.includes(q) ? '' : 'none'; });
          };
        }
        window.addEventListener('hashchange', show);
        show();
        const view = () => (location.hash || '#start').slice(1);
        loadExams(() => { const ex = root.getElementById('exams'); if (ex && view() === 'start') { ex.innerHTML = examsHTML(); animateIn(ex); wire(); } });
        refreshTeachers(() => { if (view() === 'plan') { main.innerHTML = planView(); wire(); } else if (view() === 'start') {
          const nc = root.getElementById('nowcard'); if (nc) nc.outerHTML = nowNextCard(); } });
        setInterval(() => {
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
      let sum = 0, w = 0, pct = [], pts = 0, max = 0;
      all.forEach(m => {
        if (m.type === 'cumulative' && m.max) { pts += parseFloat(m.points) || 0; max += parseFloat(m.max) || 0; return; }
        if (/%$/.test(m.value)) { pct.push(parseFloat(m.value)); return; }
        const n = gradeNumber(m.value);
        if (n != null && (m.type === 'numeric' || /^[0-6][+-]?$/.test(m.value))) { sum += n * m.weight; w += m.weight; }
      });
      if (w) return { big: fmtAvg(sum / w), small: 'średnia' };
      if (pct.length) return { big: Math.round(pct.reduce((a, b) => a + b, 0) / pct.length) + '%', small: 'średnio' };
      if (max) return { big: pts + '/' + max, small: 'punkty' };
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
        <div class="name"><span>${esc(prettySubj(r.name))}</span><span>${all.length} ${plural(all.length, 'ocena', 'oceny', 'ocen')}</span></div></summary>
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
        return marks.length ? `<div class="card">${marks.map(x => markRow(x.m, x.r.name, x.m.cat, true)).join('')}</div>` : '<div class="nores">Brak wyników</div>';
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
            <div class="grow"><div class="lbl">Podsumowanie</div><div class="b" style="font-size:17px">${total} ${plural(total, 'ocena', 'oceny', 'ocen')} z ${withMarks.length} ${plural(withMarks.length, 'przedmiotu', 'przedmiotów', 'przedmiotów')}</div></div>
            ${overall ? `<div style="text-align:right"><div class="b" style="font-size:24px">${overall}</div><div class="muted small">średnia ogólna</div></div>` : ''}</div>` : ''}
          <div class="seg" id="gv"><button data-v="subj" class="${view === 'subj' ? 'on' : ''}">Przedmioty</button><button data-v="list" class="${view === 'list' ? 'on' : ''}">Wszystkie oceny</button></div>
          <div class="search">${I('search', 'sm')}<input id="gq" type="search" placeholder="Szukaj przedmiotu lub oceny" autocomplete="off"></div>
          <div id="gsortwrap" style="${view === 'list' ? 'display:none' : ''}">${chipRow('gs', SORTS.map(([v, label]) => ({ v, label })), sort)}</div>
          <div id="glist">${withMarks.length || without.length ? listHTML() : '<div class="empty">Brak ocen</div>'}</div>`;
        const redraw = () => { const g = root.getElementById('glist'); g.innerHTML = listHTML(); animateIn(g); };
        wireChips(root, 'gs', v => { sort = v; store.set('skGradeSort', v); redraw(); });
        root.querySelectorAll('#gv button').forEach(b => b.onclick = () => {
          view = b.dataset.v; store.set('skGradeView', view);
          root.querySelectorAll('#gv button').forEach(x => x.classList.toggle('on', x === b));
          root.getElementById('gsortwrap').style.display = view === 'list' ? 'none' : '';
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
    const code = s => /uspraw/i.test(s) ? ['u', 'U'] : /nieobec/i.test(s) ? ['nb', 'NB'] : /spóź/i.test(s) ? ['sp', 'SP'] : /obec/i.test(s) ? ['ob', 'OB'] : ['', s.slice(0, 2).toUpperCase()];
    const dayKeys = Object.keys(days).filter(Boolean).sort().reverse();

    let psort = store.get('skPresSort') || 'worst', pday = 'all';
    const cnt = k => dayKeys.reduce((n, d) => n + days[d].filter(x => code(x.status)[0] === k).length, 0);
    function subjHTML() {
      const cmp = { worst: (a, b) => (a.ob.pct ?? 100) - (b.ob.pct ?? 100), best: (a, b) => (b.ob.pct ?? 0) - (a.ob.pct ?? 0),
        az: (a, b) => norm(a.name).localeCompare(norm(b.name)) }[psort];
      return subj.slice().sort(cmp).map(s => `<a class="card tap" href="${esc(s.href)}" style="--c:${subjColor(s.name)}">
        <div class="row"><div class="grow b clip">${esc(prettySubj(s.name))}</div>
        <span class="pill ${s.ob.pct >= 85 ? 'good' : s.ob.pct >= 70 ? 'warn' : 'bad'}">${s.ob.pct != null ? Math.round(s.ob.pct) + '%' : '–'}</span></div>
        <div class="meter"><i style="width:${s.ob.pct || 0}%"></i></div>
        <div class="muted small" style="margin-top:6px">${s.ob.n}/${s.ob.of || 0} obecności${s.nb.n ? ` · ${s.nb.n} nb` : ''}${s.nb.just ? ` (${s.nb.just} uspr.)` : ''}${s.sp.n ? ` · ${s.sp.n} spóźn.` : ''}${
          s.ob.of && s.ob.pct != null && s.ob.pct < 50 ? ' · <b style="color:var(--bad)">uwaga: poniżej 50%</b>' : ''}</div></a>`).join('');
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
            <div class="ring" data-p="${p || 0}" style="--p:${p || 0}"><div><div><b>${p != null ? Math.round(p) + '%' : '–'}</b><span>obecności</span></div></div></div>
            <div class="stats">
              <div class="stat"><span class="muted">Obecności</span><b>${total.ob.n}</b></div>
              <div class="stat"><span class="muted">Nieobecności</span><b style="color:var(--bad)">${total.nb.n}</b></div>
              ${total.nb.just ? `<div class="stat"><span class="muted">usprawiedl.</span><b>${total.nb.just}</b></div>` : ''}
              <div class="stat"><span class="muted">Spóźnienia</span><b style="color:var(--warn)">${total.sp.n}</b></div>
            </div></div>` : ''}
          ${subj.length ? `<div class="sec"><h2>Przedmioty</h2></div>${chipRow('ps', [{ v: 'worst', label: 'Najniższa' }, { v: 'best', label: 'Najwyższa' }, { v: 'az', label: 'A–Z' }], psort)}<div id="plist">${subjHTML()}</div>` : ''}
          ${dayKeys.length ? `<div class="sec"><h2>Ostatnie dni</h2></div>${chipRow('pd', [{ v: 'all', label: 'Wszystko' }, { v: 'nb', label: 'Nieobecności', n: cnt('nb') }, { v: 'sp', label: 'Spóźnienia', n: cnt('sp') }, { v: 'u', label: 'Usprawiedliwione', n: cnt('u') }].filter(o => o.n !== 0), pday)}<div id="pdays">${daysHTML()}</div>` : ''}`;
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
          <a class="fab" href="/internal_messages/new" aria-label="Nowa wiadomość">${I('edit')}</a>`;
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
            <button class="btn-p" id="rs">${I('send', 'sm')}Wyślij</button></div>` : ''}`;
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
            location.reload();
          } catch (e) {
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
          : `<span class="pill ${hours < 48 ? 'bad' : hours < 120 ? 'warn' : 'good'}">${esc(relTime(i.due) === 'dziś' ? 'dziś ' + hhmm(i.due) : relTime(i.due))}</span>`;
      }
      return `<a class="box tap" href="${esc(i.href)}" style="margin-bottom:10px"><div class="in">
        <div class="row" style="align-items:flex-start"><div class="grow ttl">${esc(i.title)}</div>${pill}</div>
        <div class="sub">${i.due ? 'Termin: ' + esc(shortDate(i.due) + ', ' + hhmm(i.due)) : 'Dodano ' + esc(shortDate(i.created))}</div></div>
        <div class="strip" style="--c:${subjColor(i.subject)}"><span>${esc(prettySubj(i.subject))}</span></div></a>`;
    };
    const ended = items.filter(i => i.due && i.due < now);
    const nodue = items.filter(i => !i.due);
    let hf = open.length ? 'open' : 'all', hq = '';
    function hwHTML() {
      const nq = norm(hq);
      const pick = { open, ended, nodue, all: open.concat(nodue, ended.slice().sort((a, b) => b.due - a.due)) }[hf] || items;
      const list = pick.filter(i => !nq || norm(i.title + ' ' + i.subject).includes(nq));
      return list.length ? list.map(card).join('') : `<div class="nores">${hf === 'open' ? 'Nic do zrobienia 🎉' : 'Brak zadań'}</div>`;
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
          <div class="chips">
            ${seeMore(gm) ? `<a class="chip" href="${esc(seeMore(gm))}">${I('grades')}Oceny</a>` : ''}
            ${seeMore(pm) ? `<a class="chip" href="${esc(seeMore(pm))}">${I('chart')}Obecności</a>` : ''}
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
            <div class="card row"><div class="grow">Ostatnie ${pres.length} lekcji</div>
            <span class="pill good">${presOk} ob.</span>${pres.length - presOk ? `<span class="pill bad">${pres.length - presOk} nb.</span>` : ''}</div>` : ''}
          ${anns.length ? `<div class="sec"><h2>Ogłoszenia</h2></div>` + list(anns, a => line('bell', a.n, a.date, a.h, a.unread ? '<span class="pill new">NOWE</span>' : I('right', 'sm chev'))) : ''}
          ${hws.length ? `<div class="sec"><h2>Zadania domowe</h2></div>` + list(hws, h => line('edit', h.n, h.date, h.h, I('right', 'sm chev'))) : ''}
          ${topics.length ? `<div class="sec"><h2>Tematy lekcji</h2>${seeMore(tm) ? `<a href="${esc(seeMore(tm))}">Wszystkie</a>` : ''}</div>` +
            list(topics, t => line('book', t.n, t.date + (t.x > 1 ? ' · ×' + t.x : ''), t.h)) : ''}
          ${files.length ? `<div class="sec"><h2>Pliki</h2>${seeMore(fm) ? `<a href="${esc(seeMore(fm))}">Wszystkie</a>` : ''}</div>` +
            list(files, f => line('file', f.n, f.size + ' · ' + f.date, f.h)) : ''}`;
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
    const statusOf = s => /uspraw/i.test(s) ? ['u', 'U', 'Usprawiedliwione'] : /nieobec/i.test(s) ? ['nb', 'NB', 'Nieobecność']
      : /spóź/i.test(s) ? ['sp', 'SP', 'Spóźnienie'] : /^obec/i.test(s) ? ['ob', 'OB', 'Obecność'] : null;

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

    const allStatus = sections.every(s => s.evs.every(e => statusOf(e.name)));
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
      return out || '<div class="nores">Brak wyników</div>';
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
            <div class="ring" data-p="${Math.round(100 * (counts.ob + counts.sp) / total)}"><div><div><b>${Math.round(100 * (counts.ob + counts.sp) / total)}%</b><span>obecności</span></div></div></div>
            <div class="stats">
              <div class="stat"><span class="muted">Obecności</span><b>${counts.ob}</b></div>
              <div class="stat"><span class="muted">Nieobecności</span><b style="color:var(--bad)">${counts.nb}</b></div>
              ${counts.u ? `<div class="stat"><span class="muted">Usprawiedl.</span><b style="color:var(--accent)">${counts.u}</b></div>` : ''}
              <div class="stat"><span class="muted">Spóźnienia</span><b style="color:var(--warn)">${counts.sp}</b></div>
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
    const MONTHS_FULL = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
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
      return shortDate(e.start) + ' · cały dzień';
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
            <div class="cal" id="cal"><div class="wd">${['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map(x => `<span>${x}</span>`).join('')}</div>
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
            location.reload();
          } catch (e) { btn.disabled = false; btn.lastChild.textContent = 'Nie udało się – spróbuj ponownie'; }
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
            ${due ? `<div style="font-weight:600">Termin: ${esc(shortDate(due) + ', ' + hhmm(due))} · ${esc(hours < 0 ? 'zakończone' : relTime(due))}</div>` : ''}</div>
          ${desc ? `<div class="sec"><h2>Opis</h2></div><div class="article"><div class="mbody">${desc}</div></div>` : ''}
          <div class="sec"><h2>Twoje pliki</h2></div>
          <div class="card" style="padding:4px 14px">${files.length ? files.map(f => `<a class="frow" href="${esc(f.h)}"><div style="color:var(--accent)">${I('file', 'sm')}</div><div class="grow clip">${esc(f.t)}</div>${I('down', 'sm chev')}</a>`).join('')
            : '<div class="muted" style="padding:10px 0">Nie wysłano jeszcze plików</div>'}</div>
          ${add && (hours == null || hours >= 0) ? `<a class="btn-p" href="${esc(attr(add, 'href'))}">${I('plus', 'sm')}Dodaj plik</a>` : ''}
          ${created ? `<div class="muted small" style="text-align:center;margin-top:14px">Utworzono ${esc(created)}</div>` : ''}`;
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
              ${klass ? `<a class="chip" href="${esc(attr(klass, 'href'))}">${I('users')}Klasa ${esc(txt(klass))}</a>` : ''}
              ${year ? `<span class="chip">${I('clock')}${esc(year)}</span>` : ''}</div></div>
          ${tutor ? `<div class="sec"><h2>Wychowawca</h2></div><a class="card row tap" href="${esc(attr(tutor, 'href'))}">
            <div class="av" style="background:${subjColor(txt(tutor))}">${esc(initials(txt(tutor)))}</div><div class="grow b">${esc(txt(tutor))}</div>${I('right', 'sm chev')}</a>` : ''}
          ${isMe ? `<div class="chips"><a class="chip" href="${esc(ctx.student)}/grades">${I('grades')}Oceny</a><a class="chip" href="${esc(ctx.student)}/presences">${I('chart')}Frekwencja</a>
            <a class="chip" href="${esc(ctx.student)}/homeworks">${I('edit')}Zadania</a><a class="chip" href="/#plan">${I('calendar')}Plan</a></div>` : ''}
          ${parents.length ? `<div class="sec"><h2>Rodzice / opiekunowie</h2></div><div class="card" style="padding:2px 14px">${parents.map(p => `<a class="frow" href="${esc(p.h)}">
            <div class="av" style="width:34px;height:34px;font-size:13px;background:${subjColor(p.n)}">${esc(initials(p.n))}</div><div class="grow">${esc(p.n)}</div>${I('right', 'sm chev')}</a>`).join('')}</div>` : ''}
          ${fields.length ? `<div class="sec"><h2>Dane osobowe</h2></div><details class="card"><summary class="row"><div style="color:var(--muted)">${I('user', 'sm')}</div>
            <div class="grow">Pokaż dane (adres, PESEL, telefon…)</div>${I('down', 'sm chev')}</summary>
            <div style="margin-top:8px">${fields.map(f => `<div class="kv"><span>${esc(f.label)}</span><span>${esc(f.val)}</span></div>`).join('')}</div></details>` : ''}
          ${marks.length ? `<div class="sec"><h2>Ostatnie oceny</h2><a href="${esc(ctx.student)}/grades">Wszystkie</a></div>` + marks.map(m =>
            `<div class="gbox" style="--c:${subjColor(m.subject)};margin-bottom:8px"><div class="v">${gradeShort(m.v)}</div><div class="meta"><b>${esc(prettySubj(m.subject))}</b><span class="two">${esc(m.d)} · ${esc(m.date)}</span></div></div>`).join('') : ''}
          ${pres.length ? `<div class="sec"><h2>Ostatnie obecności</h2><a href="${esc(ctx.student)}/presences">Wszystkie</a></div><div class="card" style="padding:2px 14px">${pres.map(p =>
            `<div class="frow"><div class="st ${p.ok ? 'ob' : /spóź/i.test(p.name) ? 'sp' : /uspraw/i.test(p.name) ? 'u' : 'nb'}">${p.ok ? 'OB' : /spóź/i.test(p.name) ? 'SP' : /uspraw/i.test(p.name) ? 'U' : 'NB'}</div>
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
      title: 'Klasa ' + name, tab: '', top: false,
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

  /* start (at the very end, so everything above is defined) */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
