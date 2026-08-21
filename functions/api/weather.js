// Cloudflare Pages Function: GET /api/weather
// 路由：/functions/api/weather.js → /api/weather
// 格式：ESM 导出 onRequest（wrangler 构建所需）
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
    const data = await webapi.weatherHandler();
    return jsonResponse(data.ok ? 200 : 502, data);
  } catch (e) {
    return jsonResponse(502, { ok: false, error: '天气服务暂时不可用: ' + (e && e.message) });
  }
}