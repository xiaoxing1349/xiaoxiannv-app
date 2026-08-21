const fs = require('fs');
const path = require('path');

// 生成简单 PWA 图标（用纯数据，避免依赖）
// 192 & 512 版本
function svgPng(size, color1, color2, text) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${color1}"/>
      <stop offset="1" stop-color="${color2}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size*0.2}" fill="url(#g)"/>
  <circle cx="${size*0.5}" cy="${size*0.42}" r="${size*0.16}" fill="rgba(255,255,255,0.0)" stroke="#e6d18a" stroke-width="${size*0.03}"/>
  <text x="${size*0.5}" y="${size*0.5}" font-size="${size*0.34}" text-anchor="middle" dominant-baseline="central" fill="#f0d989" font-family="serif" font-weight="bold">☯</text>
  <text x="${size*0.5}" y="${size*0.78}" font-size="${size*0.11}" text-anchor="middle" fill="#ffffffcc" font-family="sans-serif">五行生活</text>
</svg>`;
}
fs.writeFileSync(path.join(__dirname,'../public/icon.svg'), svgPng(512,'#1d2d4f','#2a3e6b',''));
console.log('SVG icon written');

// 用浏览器能力生成 PNG 较复杂，改用纯 node 生成的最小 png
// 这里直接用 SVG 作为图标（PWA 支持 svg icon），并生成简化 png 占位
fs.writeFileSync(path.join(__dirname,'../public/icon-512.svg'), svgPng(512,'#1d2d4f','#2a3e6b',''));
fs.writeFileSync(path.join(__dirname,'../public/icon-192.svg'), svgPng(192,'#1d2d4f','#2a3e6b',''));
console.log('Now converting SVG to PNG via sharp...');