const DEFAULT_WISP = 'wss://glseries.net/wisp/';
const DEFAULT_SERVERS = [{ name: 'GLSeries', url: DEFAULT_WISP }];
const THEMES = [
    { id: '', name: 'Default', color: '#ef4444', video: null },
    { id: 'blackhole', name: 'Blackhole', color: '#8b5cf6', video: 'https://raw.githubusercontent.com/cineosweb/cineosweb.github.io/main/Videos/BlackHole.mp4' },
    { id: 'cozy', name: 'Cozy', color: '#f59e0b', video: 'https://raw.githubusercontent.com/cineosweb/cineosweb.github.io/main/Videos/CozyFox.mp4' },
    { id: 'stormy', name: 'Stormy', color: '#818cf8', video: 'https://raw.githubusercontent.com/cineosweb/cineosweb.github.io/main/Videos/RainyCity.mp4' },
    { id: 'snowy', name: 'Snowy', color: '#93c5fd', video: 'https://raw.githubusercontent.com/cineosweb/cineosweb.github.io/main/Videos/SnowFox.mp4' },
    { id: 'crimson', name: 'Crimson', color: '#ef3340', video: null },
    { id: 'eclipse', name: 'Eclipse', color: '#a78bfa', video: null },
    { id: 'neko', name: 'Neko', color: '#f472b6', video: null },
    { id: 'lost', name: 'Lost', color: '#a3e635', video: null }
];

const state = {
    tabs: [], activeTabId: null, nextId: 1,
    wispUrl: null, customWisps: [], autoswitch: true,
    theme: '', wallpaper: '', premium: false
};

function bp() { const p = location.pathname; return p.substring(0, p.lastIndexOf('/') + 1) || '/'; }

function loadState() {
    state.wispUrl = localStorage.getItem('proxServer') || DEFAULT_WISP;
    try { state.customWisps = JSON.parse(localStorage.getItem('customWisps') || '[]'); } catch { state.customWisps = []; }
    state.autoswitch = localStorage.getItem('wispAutoswitch') !== 'false';
    state.theme = localStorage.getItem('axisTheme') || '';
    state.wallpaper = localStorage.getItem('axisWallpaper') || '';
    state.premium = localStorage.getItem('axisPremium') === 'true';
}

function saveState() {
    localStorage.setItem('proxServer', state.wispUrl);
    localStorage.setItem('customWisps', JSON.stringify(state.customWisps));
    localStorage.setItem('wispAutoswitch', String(state.autoswitch));
    localStorage.setItem('axisTheme', state.theme);
    state.wallpaper ? localStorage.setItem('axisWallpaper', state.wallpaper) : localStorage.removeItem('axisWallpaper');
}

function getTab(id) { return state.tabs.find(t => t.id === id); }
function activeTab() { return getTab(state.activeTabId); }
function allServers() { return [...DEFAULT_SERVERS, ...state.customWisps]; }
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function domain(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } }

function faviconFor(u) {
    if (!u) return null;
    const d = domain(u); if (!d) return null;
    const l = d[0].toUpperCase();
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="7" fill="#27272a"/><text x="16" y="22" font-family="Inter,sans-serif" font-size="17" font-weight="600" fill="#a1a1aa" text-anchor="middle">${l}</text></svg>`)}`;
}

function ntFavicon() {
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="7" fill="#27272a"/><path d="M5 8 L27 8 L16 16 Z" fill="#ef4444"/><path d="M5 24 L27 24 L16 16 Z" fill="#ef4444" opacity=".5"/></svg>`)}`;
}

function detectDevice() {
    const ua = navigator.userAgent;
    document.body.classList.remove('device-phone', 'device-tablet', 'device-chromebook', 'device-pc');
    if (/iPhone|iPad|iPod|Android.*Mobile/i.test(ua)) document.body.classList.add('device-phone');
    else if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) document.body.classList.add('device-tablet');
    else if (/CrOS/i.test(ua)) document.body.classList.add('device-chromebook');
    else document.body.classList.add('device-pc');
}

function applyTheme() {
    document.body.classList.remove(...THEMES.map(t => `theme-${t.id}`));
    if (state.theme) document.body.classList.add(`theme-${state.theme}`);
    document.body.classList.toggle('axis-premium', state.premium);
    applyVideo();
}

function applyVideo() {
    const theme = THEMES.find(t => t.id === state.theme);
    const vid = document.getElementById('theme-video');
    if (theme?.video) {
        if (vid.src !== theme.video) { vid.src = theme.video; vid.play().catch(() => {}); }
        document.body.classList.add('has-video-bg');
        vid.classList.add('active');
    } else {
        vid.classList.remove('active');
        document.body.classList.remove('has-video-bg');
        setTimeout(() => { if (!document.body.classList.contains('has-video-bg')) vid.removeAttribute('src'); vid.load(); }, 900);
    }
}

function applyWallpaper() {
    const theme = THEMES.find(t => t.id === state.theme);
    if (theme?.video) { document.body.style.backgroundImage = ''; return; }
    document.body.style.backgroundImage = state.wallpaper ? `url(${state.wallpaper})` : '';
}

/* ── Tabs ── */
function createTab(url = null) {
    const id = state.nextId++;
    const tab = { id, url: url || null, isNewTab: !url, title: 'New Tab', favicon: ntFavicon(), loading: false };
    state.tabs.push(tab);
    createFrame(tab);
    renderTabs();
    switchTab(id);
    if (url) navTo(url, id);
    return tab;
}

function createFrame(tab) {
    const c = document.getElementById('iframe-container');
    const f = document.createElement('iframe');
    f.id = `iframe-${tab.id}`;
    f.className = 'tab-iframe hidden';
    f.sandbox = 'allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads';
    f.allow = 'fullscreen; clipboard-write';
    f.src = tab.isNewTab ? bp() + 'Nt.html' : bp() + 'embed.html#' + encodeURIComponent(tab.url);
    c.appendChild(f);
}

function switchTab(id) {
    state.activeTabId = id;
    document.querySelectorAll('.tab-iframe').forEach(f => f.classList.add('hidden'));
    const f = document.getElementById(`iframe-${id}`);
    if (f) f.classList.remove('hidden');
    const tab = getTab(id);
    if (tab) { updateBar(tab); updateNav(tab); }
    renderTabs();
}

function closeTab(id) {
    const i = state.tabs.findIndex(t => t.id === id);
    if (i === -1) return;
    const f = document.getElementById(`iframe-${id}`);
    if (f) f.remove();
    state.tabs.splice(i, 1);
    if (state.tabs.length === 0) { createTab(); return; }
    if (state.activeTabId === id) switchTab(state.tabs[Math.min(i, state.tabs.length - 1)].id);
    renderTabs();
}

function renderTabs() {
    const c = document.getElementById('tabs');
    c.innerHTML = '';
    state.tabs.forEach(tab => {
        const el = document.createElement('div');
        el.className = `tab${tab.id === state.activeTabId ? ' active' : ''}`;
        el.innerHTML = `<img class="tab-favicon" src="${tab.favicon}" alt="" onerror="this.style.display='none'"><span class="tab-title">${esc(tab.title)}</span><span class="tab-close" data-c="${tab.id}"><i class="fa-solid fa-xmark"></i></span>`;
        el.addEventListener('click', e => { if (!e.target.closest('.tab-close')) switchTab(tab.id); });
        el.querySelector('.tab-close').addEventListener('click', e => { e.stopPropagation(); closeTab(tab.id); });
        c.appendChild(el);
    });
    const nb = document.createElement('button');
    nb.className = 'new-tab-btn'; nb.title = 'New tab';
    nb.innerHTML = '<i class="fa-solid fa-plus"></i>';
    nb.addEventListener('click', () => createTab());
    c.appendChild(nb);
}

/* ── Navigation ── */
function processInput(v) {
    v = v.trim(); if (!v) return null;
    if (/^https?:\/\//i.test(v)) return v;
    if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+/i.test(v) && !v.includes(' ')) return 'https://' + v;
    return 'https://search.brave.com/search?q=' + encodeURIComponent(v);
}

function navTo(url, id) {
    const tab = getTab(id); if (!tab) return;
    tab.url = url; tab.isNewTab = false;
    tab.title = domain(url) || url;
    tab.favicon = faviconFor(url);
    tab.loading = true;
    const f = document.getElementById(`iframe-${id}`);
    if (f) { f.classList.add('loading'); f.src = bp() + 'embed.html#' + encodeURIComponent(url); }
    startLoad(); updateBar(tab); updateNav(tab); renderTabs();
}

function navCurrent(input) {
    const url = processInput(input); if (!url) return;
    const tab = activeTab(); if (!tab) return;
    if (tab.isNewTab) tab.isNewTab = false;
    navTo(url, tab.id);
}

function goHome() {
    const tab = activeTab(); if (!tab) return;
    tab.url = null; tab.isNewTab = true; tab.title = 'New Tab'; tab.favicon = ntFavicon(); tab.loading = false;
    const f = document.getElementById(`iframe-${tab.id}`);
    if (f) { f.classList.remove('loading'); f.src = bp() + 'Nt.html'; }
    stopLoad(); updateBar(tab); updateNav(tab); renderTabs();
}

function refreshTab() {
    const tab = activeTab(); if (!tab || tab.isNewTab) return;
    const f = document.getElementById(`iframe-${tab.id}`);
    if (f) { tab.loading = true; f.classList.add('loading'); f.src = f.src; startLoad(); updateNav(tab); }
}

function updateBar(tab) {
    const bar = document.getElementById('address-bar');
    const icon = document.getElementById('address-icon');
    if (tab.isNewTab) {
        bar.value = ''; bar.placeholder = 'Search or enter URL';
        icon.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';
    } else {
        bar.value = tab.url || '';
        icon.innerHTML = tab.url?.startsWith('https://') ? '<i class="fa-solid fa-lock"></i>' : '<i class="fa-solid fa-globe"></i>';
    }
}

function updateNav(tab) {
    document.getElementById('back-btn').disabled = true;
    document.getElementById('forward-btn').disabled = true;
    document.getElementById('refresh-btn').querySelector('i').className = tab.loading ? 'fa-solid fa-xmark' : 'fa-solid fa-rotate-right';
}

/* ── Loading Bar ── */
let loadT = null;
function startLoad() {
    const b = document.getElementById('loading-bar');
    b.style.transition = 'none'; b.style.width = '0%'; b.style.opacity = '1';
    clearTimeout(loadT);
    requestAnimationFrame(() => {
        b.style.transition = 'width 0.4s ease'; b.style.width = '25%';
        loadT = setTimeout(() => { b.style.transition = 'width 2s ease'; b.style.width = '65%'; }, 400);
    });
}
function finishLoad() {
    clearTimeout(loadT);
    const b = document.getElementById('loading-bar');
    b.style.transition = 'width 0.2s ease'; b.style.width = '100%';
    setTimeout(() => { b.style.transition = 'opacity 0.25s ease'; b.style.opacity = '0'; }, 200);
}
function stopLoad() {
    clearTimeout(loadT);
    const b = document.getElementById('loading-bar');
    b.style.transition = 'opacity 0.2s ease'; b.style.opacity = '0';
}

/* ── Messages ── */
function onMsg(e) {
    const d = e.data; if (!d || typeof d !== 'object') return;
    if (d.type === 'navigate') { const t = activeTab(); if (t) navTo(d.url, t.id); }
    if (d.type === 'openRedeem') openModal('redeem-modal');
    if (d.type === 'loaded') {
        const t = activeTab();
        if (t) {
            t.loading = false;
            if (d.title) t.title = d.title;
            const f = document.getElementById(`iframe-${t.id}`);
            if (f) f.classList.remove('loading');
            finishLoad(); updateNav(t); renderTabs();
        }
    }
    if (d.type === 'wispChanged') { state.wispUrl = d.url; localStorage.setItem('proxServer', d.url); buildSettings(); }
    if (d.type === 'pingResult') {
        const dot = document.querySelector(`.status-dot[data-srv="${d.url}"]`);
        const badge = document.querySelector(`.ping-badge[data-srv="${d.url}"]`);
        if (dot) { dot.classList.remove('checking'); dot.classList.add(d.success ? 'ok' : 'fail'); }
        if (badge) badge.textContent = d.success ? d.latency + 'ms' : 'fail';
    }
}

/* ── Settings ── */
function openModal(id) { document.getElementById(id).classList.remove('hidden'); if (id === 'settings-modal') buildSettings(); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function buildSettings() {
    const body = document.getElementById('settings-body');
    const srvs = allServers();
    body.innerHTML = `
        <div class="settings-section">
            <div class="section-label">Proxy Server</div>
            <div class="section-desc">Select a wisp server for routing traffic.</div>
            <div id="srv-list">${srvs.map(s => `
                <div class="wisp-option${s.url === state.wispUrl ? ' active' : ''}" data-url="${esc(s.url)}">
                    <div class="wisp-radio"><div class="wisp-radio-dot"></div></div>
                    <div class="wisp-info"><div class="wisp-name">${esc(s.name)}</div><div class="wisp-url">${esc(s.url)}</div></div>
                    <div class="wisp-meta">
                        <span class="ping-badge" data-srv="${esc(s.url)}">—</span>
                        <span class="status-dot" data-srv="${esc(s.url)}"></span>
                        ${s.url !== DEFAULT_WISP ? `<button class="delete-server" data-del="${esc(s.url)}" title="Remove"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                    </div>
                </div>`).join('')}
            </div>
            <div class="input-row">
                <input type="text" id="nw-name" placeholder="Name" autocomplete="off">
                <input type="text" id="nw-url" placeholder="wss://..." autocomplete="off">
                <button id="add-wsrv">Add</button>
            </div>
            <button class="ping-all-btn" id="ping-all"><i class="fa-solid fa-signal"></i>&ensp;Ping All</button>
        </div>
        <div class="settings-section">
            <div class="section-label">Options</div>
            <div class="toggle-row">
                <span class="toggle-label">Auto-switch on failure</span>
                <div class="toggle-track${state.autoswitch ? ' on' : ''}" id="tg-auto"><div class="toggle-thumb"></div></div>
            </div>
        </div>
        <div class="settings-section">
            <div class="section-label">Theme</div>
            <div class="section-desc">Video themes include animated backgrounds.</div>
            <div class="theme-grid">${THEMES.map(t => `
                <button class="theme-swatch${t.id === state.theme ? ' active' : ''}" data-theme="${t.id}">
                    <div class="theme-dot" style="background:${t.color}">${t.video ? '<span class="theme-video-badge"><i class="fa-solid fa-play"></i></span>' : ''}</div>
                    <span>${t.name}</span>
                </button>`).join('')}
            </div>
        </div>
        <div class="settings-section" id="wp-section">
            <div class="section-label">Wallpaper</div>
            <div class="section-desc">Custom background for non-video themes.</div>
            <div class="wallpaper-row">
                <input type="text" id="wp-input" placeholder="https://example.com/image.jpg" value="${esc(state.wallpaper)}" autocomplete="off">
                <button id="set-wp">Set</button>
            </div>
            ${state.wallpaper ? '<button class="remove-wp" id="rm-wp"><i class="fa-solid fa-xmark"></i>&ensp;Remove wallpaper</button>' : ''}
        </div>`;
    bindSettings();
}

function bindSettings() {
    document.querySelectorAll('.wisp-option').forEach(o => o.addEventListener('click', e => {
        if (e.target.closest('.delete-server')) return;
        state.wispUrl = o.dataset.url; saveState(); notifySw(); buildSettings();
    }));
    document.querySelectorAll('.delete-server').forEach(b => b.addEventListener('click', e => {
        e.stopPropagation();
        state.customWisps = state.customWisps.filter(s => s.url !== b.dataset.del);
        if (state.wispUrl === b.dataset.del) state.wispUrl = DEFAULT_WISP;
        saveState(); notifySw(); buildSettings();
    }));
    const ab = document.getElementById('add-wsrv');
    if (ab) ab.addEventListener('click', () => {
        const n = document.getElementById('nw-name').value.trim();
        const u = document.getElementById('nw-url').value.trim();
        if (!u) return;
        state.customWisps.push({ name: n || 'Custom', url: u }); saveState(); notifySw(); buildSettings();
    });
    const pb = document.getElementById('ping-all');
    if (pb) pb.addEventListener('click', pingAll);
    const tg = document.getElementById('tg-auto');
    if (tg) tg.addEventListener('click', () => { state.autoswitch = !state.autoswitch; saveState(); notifySw(); buildSettings(); });
    document.querySelectorAll('.theme-swatch').forEach(s => s.addEventListener('click', () => {
        state.theme = s.dataset.theme; saveState(); applyTheme(); applyWallpaper(); buildSettings();
    }));
    const sw = document.getElementById('set-wp');
    if (sw) sw.addEventListener('click', () => { state.wallpaper = document.getElementById('wp-input').value.trim(); saveState(); applyWallpaper(); buildSettings(); });
    const rw = document.getElementById('rm-wp');
    if (rw) rw.addEventListener('click', () => { state.wallpaper = ''; saveState(); applyWallpaper(); buildSettings(); });
}

async function pingAll() {
    const srvs = allServers();
    srvs.forEach(s => {
        const dot = document.querySelector(`.status-dot[data-srv="${s.url}"]`);
        const badge = document.querySelector(`.ping-badge[data-srv="${s.url}"]`);
        if (dot) { dot.className = 'status-dot checking'; }
        if (badge) badge.textContent = '...';
    });
    if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'ping' });
    } else {
        for (const s of srvs) {
            const r = await pingMain(s.url);
            const dot = document.querySelector(`.status-dot[data-srv="${s.url}"]`);
            const badge = document.querySelector(`.ping-badge[data-srv="${s.url}"]`);
            if (dot) { dot.classList.remove('checking'); dot.classList.add(r.ok ? 'ok' : 'fail'); }
            if (badge) badge.textContent = r.ok ? r.ms + 'ms' : 'fail';
        }
    }
}

function pingMain(url) {
    return new Promise(res => {
        const t0 = Date.now();
        try {
            const ws = new WebSocket(url);
            const to = setTimeout(() => { try { ws.close(); } catch {} res({ ok: false }); }, 3000);
            ws.onopen = () => { clearTimeout(to); res({ ok: true, ms: Date.now() - t0 }); try { ws.close(); } catch {} };
            ws.onerror = () => { clearTimeout(to); res({ ok: false }); };
        } catch { res({ ok: false }); }
    });
}

function notifySw() {
    if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'config', wispurl: state.wispUrl, servers: allServers(), autoswitch: state.autoswitch });
    }
}

/* ── Redeem ── */
function handleRedeem() {
    const code = document.getElementById('redeem-input').value.trim().toUpperCase();
    const st = document.getElementById('redeem-status');
    if (!code) { st.className = 'status-err'; st.textContent = 'Please enter a code.'; return; }
    if (code.startsWith('AXIS-') && code.length >= 8) {
        state.premium = true; localStorage.setItem('axisPremium', 'true'); applyTheme();
        st.className = 'status-ok'; st.textContent = 'Premium unlocked! Reloading...';
        setTimeout(() => location.reload(), 1200);
    } else { st.className = 'status-err'; st.textContent = 'Invalid code. Please try again.'; }
}

/* ── Keys ── */
function onKey(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 't') { e.preventDefault(); createTab(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') { e.preventDefault(); if (state.activeTabId) closeTab(state.activeTabId); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') { e.preventDefault(); const b = document.getElementById('address-bar'); b.focus(); b.select(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') { e.preventDefault(); refreshTab(); }
    if (e.key === 'Escape') { closeModal('settings-modal'); closeModal('redeem-modal'); }
}

/* ── SW ── */
async function regSW() {
    if (!('serviceWorker' in navigator)) return;
    try {
        await navigator.serviceWorker.register(bp() + 'sw.js', { scope: bp() });
        await navigator.serviceWorker.ready;
        navigator.serviceWorker.controller?.postMessage({ type: 'config', wispurl: state.wispUrl, servers: allServers(), autoswitch: state.autoswitch });
    } catch (e) { console.warn('SW:', e); }
}

/* ── Init ── */
function init() {
    loadState(); detectDevice(); applyTheme(); applyWallpaper();
    const bar = document.getElementById('address-bar');
    bar.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); navCurrent(bar.value); bar.blur(); } });
    bar.addEventListener('focus', () => bar.select());
    document.getElementById('back-btn').addEventListener('click', () => { const f = document.getElementById(`iframe-${state.activeTabId}`); if (f) try { f.contentWindow.history.back(); } catch {} });
    document.getElementById('forward-btn').addEventListener('click', () => { const f = document.getElementById(`iframe-${state.activeTabId}`); if (f) try { f.contentWindow.history.forward(); } catch {} });
    document.getElementById('refresh-btn').addEventListener('click', () => {
        const t = activeTab();
        if (t?.loading) { t.loading = false; const f = document.getElementById(`iframe-${t.id}`); if (f) f.classList.remove('loading'); stopLoad(); updateNav(t); }
        else refreshTab();
    });
    document.getElementById('home-btn-nav').addEventListener('click', goHome);
    document.getElementById('settings-btn').addEventListener('click', () => openModal('settings-modal'));
    document.getElementById('close-settings').addEventListener('click', () => closeModal('settings-modal'));
    document.getElementById('close-redeem').addEventListener('click', () => closeModal('redeem-modal'));
    document.getElementById('settings-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal('settings-modal'); });
    document.getElementById('redeem-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal('redeem-modal'); });
    document.getElementById('apply-redeem').addEventListener('click', handleRedeem);
    document.getElementById('redeem-input').addEventListener('keydown', e => { if (e.key === 'Enter') handleRedeem(); });
    window.addEventListener('message', onMsg);
    document.addEventListener('keydown', onKey);
    createTab();
    regSW();
}
window.addEventListener('DOMContentLoaded', init);