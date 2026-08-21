// Cloudflare Pages Function: GET /api/weather
// 路由：/functions/api/weather.js → /api/weather
// 说明：Pages Functions 无常驻内存缓存/定时器，故每次请求直接抓取一次；
//       handler 内部有超时与 try/catch，抓取失败返回 502+明确定位信息。
// 格式：CommonJS 导出 onRequest（wrangler 构建时会转为 Worker ES Module，
//       对外以 onRequest 为名），同时便于在本地用 node require 直接加载验证。
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
    const data = await webapi.weatherHandler();
    return jsonResponse(data.ok ? 200 : 502, data);
  } catch (e) {
    return jsonResponse(502, { ok: false, error: '天气服务暂时不可用: ' + (e && e.message) });
  }
}

module.exports = { onRequest };