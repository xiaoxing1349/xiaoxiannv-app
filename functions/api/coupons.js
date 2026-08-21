// Cloudflare Pages Function: GET /api/coupons
// 路由：/functions/api/coupons.js → /api/coupons
// 说明：Pages Functions 无常驻内存缓存/定时器，故每次请求直接抓取；
//       couponsHandler 内置"当季精选"兜底，ok 恒为 true。
// 格式：ESM 导出 onRequest（wrangler 构建所需）。
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

export async function onRequest(context) {
  const request = (context && context.request) || {};
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  try {
    const data = await webapi.couponsHandler(); // ok 恒为 true（当季精选兜底）
    return jsonResponse(200, data);
  } catch (e) {
    // 最后一层防线：返回唯一可稳定的内置当季精选
    return jsonResponse(200, {
      ok: true,
      items: (webapi.SEASONAL_TRIPS || []).map(x => ({ ...x, source: '当季精选', live: true })),
      updatedAt: Date.now(),
      crawled: 0
    });
  }
}