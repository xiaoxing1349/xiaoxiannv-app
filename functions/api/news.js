// Cloudflare Pages Function: GET /api/news
// 路由：/functions/api/news.js → /api/news
// 说明：Pages Functions 无常驻内存缓存/定时器，故每次请求全新抓取一次（冷启动
//       一次抓取较慢可接受，多源各有独立超时）。内部 try/catch 兜底：
//       复用 lib/webapi.js 的 newsHandler 内置兜底（抓取失败时返回内置条目）。
// 格式：CommonJS 导出 onRequest（构建后对外为 onRequest）。
const webapi = require('../../lib/webapi');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function jsonResponse(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS }
  });
}

async function onRequest(context) {
  const request = (context && context.request) || {};
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  try {
    const data = await webapi.newsHandler(); // 自带兜底，正常情况下恒返回 ok:true
    return jsonResponse(200, data);
  } catch (e) {
    // 极端保护：newsHandler 已兜底，这里是最后一层防线
    return jsonResponse(200, {
      ok: true,
      date: webapi.todayStr(),
      cached: false,
      sections: webapi.NEWS_SECTIONS,
      channels: ['权威媒体'],
      items: webapi.NEWS_CURATED.map(n => ({ ...n, date: n.time, section: n.section || '国内' }))
    });
  }
}

module.exports = { onRequest };