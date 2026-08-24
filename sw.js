const ADBLOCK = {
    blocked: [
        "googlevideo.com/videoplayback","youtube.com/get_video_info","youtube.com/api/stats/ads",
        "youtube.com/pagead","youtube.com/api/stats","youtube.com/get_midroll","youtube.com/ptracking",
        "youtube.com/youtubei/v1/player","youtube.com/s/player","youtube.com/api/timedtext",
        "facebook.com/ads","facebook.com/tr","fbcdn.net/ads","graph.facebook.com/ads",
        "graph.facebook.com/pixel","ads-api.twitter.com","analytics.twitter.com","twitter.com/i/ads",
        "ads.yahoo.com","advertising.com","adtechus.com","amazon-adsystem.com","adnxs.com",
        "doubleclick.net","googlesyndication.com","googleadservices.com","rubiconproject.com",
        "pubmatic.com","criteo.com","openx.net","taboola.com","outbrain.com","moatads.com",
        "casalemedia.com","unityads.unity3d.com","/ads/","/adserver/","/banner/","/promo/",
        "/tracking/","/beacon/","/metrics/","adsafeprotected.com","chartbeat.com",
        "scorecardresearch.com","quantserve.com","krxd.net","demdex.net"
    ]
};
function isAdBlocked(url) {
    const s = url.toString();
    for (const p of ADBLOCK.blocked) {
        const re = new RegExp('^' + p.replace(/\*/g, '.*').replace(/\./g, '\\.').replace(/\?/g, '\\?') + '$', 'i');
        if (re.test(s)) return true;
    }
    return false;
}
const swPath = self.location.pathname;
const basePath = swPath.substring(0, swPath.lastIndexOf('/') + 1);
self.basePath = self.basePath || basePath;
self.$scramjet = {
    files: {
        wasm: "https://cdn.jsdelivr.net/gh/Destroyed12121/Staticsj@main/JS/scramjet.wasm.wasm",
        sync: "https://cdn.jsdelivr.net/gh/Destroyed12121/Staticsj@main/JS/scramjet.sync.js"
    }
};
importScripts("https://cdn.jsdelivr.net/gh/Destroyed12121/Staticsj@main/JS/scramjet.all.js");
importScripts("https://cdn.jsdelivr.net/npm/@mercuryworkshop/bare-mux/dist/index.js");
const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker({ prefix: basePath + "scramjet/" });
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
let wispConfig = { wispurl: null, servers: [], autoswitch: true };
let serverHealth = new Map();
let currentServerStartTime = null;
const MAX_FAIL = 2, PING_TIMEOUT = 3000;
let resolveConfigReady;
const configReady = new Promise(r => resolveConfigReady = r);
async function pingServer(url) {
    return new Promise(resolve => {
        const start = Date.now();
        try {
            const ws = new WebSocket(url);
            const to = setTimeout(() => { try { ws.close(); } catch {} resolve({ url, success: false, latency: null }); }, PING_TIMEOUT);
            ws.onopen = () => { clearTimeout(to); resolve({ url, success: true, latency: Date.now() - start }); try { ws.close(); } catch {} };
            ws.onerror = () => { clearTimeout(to); resolve({ url, success: false, latency: null }); };
        } catch { resolve({ url, success: false, latency: null }); }
    });
}
function updateHealth(url, ok) {
    const h = serverHealth.get(url) || { fails: 0, ok: 0, lastOk: 0 };
    if (ok) { h.fails = 0; h.ok++; h.lastOk = Date.now(); } else { h.fails++; }
    serverHealth.set(url, h); return h;
}
function switchTo(url, lat) {
    if (url === wispConfig.wispurl) return;
    wispConfig.wispurl = url; currentServerStartTime = Date.now();
    self.clients.matchAll().then(cl => cl.forEach(c => c.postMessage({
        type: 'wispChanged', url, name: wispConfig.servers.find(s => s.url === url)?.name || 'Unknown', latency: lat
    })));
    if (scramjet && scramjet.client) scramjet.client = null;
}
async function proactiveCheck() {
    if (!wispConfig.autoswitch || !wispConfig.servers?.length) return;
    const results = await Promise.all(wispConfig.servers.map(s => pingServer(s.url)));
    results.forEach(r => updateHealth(r.url, r.success));
    const cur = serverHealth.get(wispConfig.wispurl);
    if (cur && cur.fails > 0) {
        const best = results.filter(r => r.success && r.url !== wispConfig.wispurl).sort((a, b) => a.latency - b.latency)[0];
        if (best) switchTo(best.url, best.latency);
    }
}
self.addEventListener("message", ({ data }) => {
    if (data.type === "config") {
        if (data.wispurl) { wispConfig.wispurl = data.wispurl; currentServerStartTime = Date.now(); }
        if (data.servers?.length) { wispConfig.servers = data.servers; if (wispConfig.autoswitch) setTimeout(proactiveCheck, 500); }
        if (typeof data.autoswitch !== 'undefined') { wispConfig.autoswitch = data.autoswitch; if (wispConfig.autoswitch && wispConfig.servers?.length) setTimeout(proactiveCheck, 500); }
        if (wispConfig.wispurl && resolveConfigReady) { resolveConfigReady(); resolveConfigReady = null; }
    } else if (data.type === "ping") {
        pingServer(wispConfig.wispurl).then(r => self.clients.matchAll().then(cl => cl.forEach(c => c.postMessage({ type: 'pingResult', ...r }))));
    }
});
self.addEventListener("fetch", event => {
    event.respondWith((async () => {
        if (isAdBlocked(event.request.url)) return new Response(new ArrayBuffer(0), { status: 204 });
        await scramjet.loadConfig();
        if (scramjet.route(event)) return scramjet.fetch(event);
        return fetch(event.request);
    })());
});
scramjet.addEventListener("request", async e => {
    e.response = (async () => {
        await configReady;
        if (!wispConfig.wispurl) return new Response("Axis: No wisp URL configured", { status: 500 });
        if (!scramjet.client) {
            const conn = new BareMux.BareMuxConnection(basePath + "bareworker.js");
            await conn.setTransport("https://cdn.jsdelivr.net/npm/@mercuryworkshop/epoxy-transport@2.1.28/dist/index.mjs", [{ wisp: wispConfig.wispurl }]);
            scramjet.client = conn;
        }
        let lastErr;
        for (let i = 0; i <= 2; i++) {
            try {
                return await scramjet.client.fetch(e.url, {
                    method: e.method, body: e.body, headers: e.requestHeaders,
                    credentials: "include", mode: e.mode === "cors" ? e.mode : "same-origin",
                    cache: e.cache, redirect: "manual", duplex: "half"
                });
            } catch (err) {
                lastErr = err;
                const m = err.message.toLowerCase();
                if (!m.includes('connect') && !m.includes('eof') && !m.includes('handshake') && !m.includes('reset')) break;
                if (i === 2 || e.method !== 'GET') break;
                await new Promise(r => setTimeout(r, 500 * (i + 1)));
            }
        }
        updateHealth(wispConfig.wispurl, false);
        if (wispConfig.autoswitch && wispConfig.servers?.length > 1) {
            const h = serverHealth.get(wispConfig.wispurl);
            if (h && h.fails >= MAX_FAIL) {
                for (const s of wispConfig.servers) {
                    if (s.url === wispConfig.wispurl) continue;
                    const sh = serverHealth.get(s.url);
                    if (!sh || sh.fails < MAX_FAIL) {
                        const pr = await pingServer(s.url);
                        if (pr.success) { switchTo(s.url, pr.latency); break; }
                    }
                }
            }
        }
        return new Response("Axis Proxy Error: " + lastErr.message, { status: 502 });
    })();
});
