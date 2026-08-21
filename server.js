const express = require('express');
const path = require('path');

// 实时接口核心逻辑已抽取到 lib/webapi.js（无 Express 依赖，可在 Node 与
// Cloudflare Pages Functions 中共用）。本文件保留 Express 服务、内存缓存、
// 定时刷新、静态资源与 APK 下载等"常驻进程"能力。
const webapi = require('./lib/webapi');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
// 全局 CORS：允许网页版(任意域名)与打包 APK(file://) 跨域访问 API
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, p) => {
    if (/\.(js|html|css|json)$/.test(p)) res.setHeader('Cache-Control', 'no-cache');
  }
}));

// ============ 天气聚合（Open-Meteo，青岛/市南区） ============
app.get('/api/weather', async (req, res) => {
  const data = await webapi.weatherHandler();
  if (data.ok) return res.json(data);
  res.status(502).json(data);
});

// ============ 新闻聚合（常驻内存缓存 + 定时刷新，逻辑取自 lib/webapi.js） ============
let newsCache = null;            // newsHandler() 返回的完整载荷
let netClear = null;

function scheduleNextNewsRefresh() {
  const now = new Date();
  let targets = [];
  const d = new Date(now); d.setHours(8, 0, 2, 0); if (d > now) targets.push(d);
  const e = new Date(now); e.setHours(20, 0, 2, 0); if (e > now) targets.push(e);
  // 若今天两个点都过了，则顺延到明天 08:00
  if (!targets.length) { const t = new Date(now); t.setDate(t.getDate() + 1); t.setHours(8, 0, 2, 0); targets = [t]; }
  const next = targets.sort((a, b) => a - b)[0];
  const delay = next.getTime() - now.getTime();
  clearTimeout(netClear);
  netClear = setTimeout(() => {
    webapi.newsHandler().then(r => { newsCache = r; if (process.env.DEBUG_NEWS) console.log('[news] 定时刷新完成', r.crawled); })
      .catch(() => { /* 保底：保留旧缓存 */ })
      .finally(scheduleNextNewsRefresh);
  }, delay);
  if (process.env.DEBUG_NEWS) console.log('[news] 下次定时刷新:', next.toLocaleString());
}

app.get('/api/news', async (req, res) => {
  const date = webapi.todayStr();
  // 若缓存有效且是今天构建的，直接返回（快、稳定）；否则走一次全新抓取
  if (newsCache && newsCache.date === date) {
    return res.json({ ...newsCache, date, cached: true });
  }
  try {
    const data = await webapi.newsHandler();
    newsCache = data;
    scheduleNextNewsRefresh();
    return res.json(data);
  } catch (e) {
    if (process.env.DEBUG_NEWS) console.error('[news] fail:', e && e.message);
    // 极端的最后兜底：直接使用内置条目（来源标注清晰）
    return res.json({
      ok: true, date, cached: false, sections: webapi.NEWS_SECTIONS,
      channels: ['权威媒体'],
      items: webapi.NEWS_CURATED.map(n => ({ ...n, date: n.time, section: n.section || '国内' }))
    });
  }
});

// ============ 优惠券 / 周边游（缓存 + 定时刷新，逻辑取自 lib/webapi.js） ============
let couponCache = { items: [], updatedAt: 0, crawled: 0 };

app.get('/api/coupons', async (req, res) => {
  // 缓存过期(≥9分钟)则后台刷新；先立即返回已有缓存，保证不因抓取慢而超时
  if (!couponCache.items.length || Date.now() - couponCache.updatedAt > 9 * 60 * 1000) {
    webapi.couponsHandler().then(d => {
      couponCache = { items: d.items, updatedAt: d.updatedAt, crawled: d.crawled };
    }).catch(() => {});
  }
  res.json({ ok: true, items: couponCache.items, updatedAt: couponCache.updatedAt, crawled: couponCache.crawled });
});

// PWA 相关
app.get('/sw.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// 说明文档页
app.use('/guide', express.static(path.join(__dirname, '..', 'usage-guide'), { index: 'usage-guide.html' }));

// APK 下载（ASCII 名，兼容各类客户端）
app.get('/_apk/WuXingLife.apk', (req, res) => {
  res.download(path.join(__dirname, 'apk', 'WuXingLife.apk'), '五行生活指南-v1.0.0.apk');
});

module.exports = app;

// 仅直接运行时才启动监听（兼容 Vercel / 云函数等无服务器环境）
if (require.main === module) {
  // 启动即刷新一次新闻（异步，不阻塞监听启动）；随后按早/晚时间点自动刷新
  webapi.newsHandler().then(r => {
    newsCache = r;
    if (process.env.DEBUG_NEWS) console.log('[news] 启动刷新完成', r.crawled);
  }).catch(() => { /* 暂时无缓存，请求时兜底 */ })
    .finally(scheduleNextNewsRefresh);

  // 启动时先刷新一次优惠券；随后每 30 分钟刷新
  const touchCoupons = () => webapi.couponsHandler().then(d => {
    couponCache = { items: d.items, updatedAt: d.updatedAt, crawled: d.crawled };
  }).catch(() => {});
  touchCoupons();
  const loop = setInterval(touchCoupons, 30 * 60 * 1000);
  loop.unref();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[YiLiApp] 服务已启动: http://0.0.0.0:${PORT}`);
  });
}