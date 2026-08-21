// ============ 功能一：黄历 + 五行穿衣 ============
(function () {
  const YL = window.YL;

  // ---- 五行穿衣规则 ----
  const WUXING_COLOR = {
    '木': { level1: '绿色', level2: '青碧色', hex: ['#2e8b57', '#16a085', '#27ae60'], k: '绿色系·青碧色系' },
    '火': { level1: '红色', level2: '紫色', hex: ['#c0392b', '#e74c3c', '#8e44ad'], k: '红紫色系' },
    '土': { level1: '黄色', level2: '棕色', hex: ['#d4a017', '#f1c40f', '#a0522d'], k: '黄棕色系' },
    '金': { level1: '白色', level2: '银色', hex: ['#ecf0f1', '#bdc3c7', '#95a5a6'], k: '白银色系' },
    '水': { level1: '黑色', level2: '蓝色', hex: ['#2c3e50', '#2980b9', '#1f2d3d'], k: '黑蓝色系' }
  };
  const ZHI_WX = { '子':'水','丑':'土','寅':'木','卯':'木','辰':'土','巳':'火','午':'火','未':'土','申':'金','酉':'金','戌':'土','亥':'水' };
  const SHENG = { '木':'火','火':'土','土':'金','金':'水','水':'木' };
  const KE = { '木':'土','土':'水','水':'火','火':'金','金':'木' };
  const WO = { '木':'火','火':'土','土':'金','金':'水','水':'木' }; // 我生=最宜
  const KE_WO = { '木':'金','金':'火','火':'水','水':'土','土':'木' }; // 克我=平
  const WO_KE = { '木':'土','土':'水','水':'火','火':'金','金':'木' }; // 我克=次忌
  const SHENG_WO = { '木':'水','水':'金','金':'土','土':'火','火':'木' }; // 生我=最忌

  function wuxingOrder(dayZhi) {
    const w = ZHI_WX[dayZhi] || '木';
    // 档位：1最宜(我生火...) 2次宜(比和=我) 3平(克我) 4次忌(我克) 5最忌(生我)
    return { w, levels: [
      { rank:1, tag:'最宜', wx: WO[w], note:'优先 · 助运' },
      { rank:2, tag:'次宜', wx: w, note:'比和 · 和气' },
      { rank:3, tag:'平',   wx: KE_WO[w], note:'中和' },
      { rank:4, tag:'次忌', wx: WO_KE[w], note:'耗力' },
      { rank:5, tag:'最忌', wx: SHENG_WO[w], note:'宜避' }
    ]};
  }

  // ---- 从 lunar.js 取某天的黄历信息 ----
  function getLunarInfo(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const solar = Solar.fromYmd(y, m, d);
    const l = solar.getLunar();
    return {
      dateStr, weekday: WEEK[solar.getWeek()],
      lunar: l.getMonthInChinese() + '月' + l.getDayInChinese(),
      ganzhiYear: l.getYearInGanZhi(), ganzhiMonth: l.getMonthInGanZhi(), ganzhiDay: l.getDayInGanZhi(),
      dayZhi: l.getDayZhi(), dayGan: l.getDayGan(),
      yi: l.getDayYi() || [], ji: l.getDayJi() || [],
      jieqi: l.getJieQi() || '',
      chong: l.getDayChong(), // 冲
      sha: l.getDaySha() || '',
      xing: l.getZhiXing() || '', // 星宿（值星）
      pengzu: l.getPengZuZhi() || '', // 彭祖百忌（按地支）
      kong: l.getDayXunKong() || '' // 旬空
    };
  }

  // ---- 渲染日期滚动条（固定以今日为起点，避免选后面日期后前面消失） ----
  function renderDateScroll(curDate) {
    const el = document.getElementById('dateScroll');
    let html = '';
    const now = new Date();
    const DAYS = 15; // 展示今日起未来 15 天，始终保留今日与之前可选
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const ds = YL.fmtDate(d);
      const info = getLunarInfo(ds);
      const isToday = ds === YL.today();
      const active = ds === curDate ? ' active' : '';
      html += `<div class="day-pill${active}" data-date="${ds}">
        <div class="wd">${isToday ? '今天' : '周'+info.weekday}</div>
        <div class="md">${d.getMonth()+1}/${d.getDate()}</div>
        <div class="wd">${info.lunar.split('月')[1]}</div>
      </div>`;
    }
    el.innerHTML = html;
    // 让选中日期滚动到可视区域
    const activeEl = el.querySelector('.day-pill.active');
    if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    el.querySelectorAll('.day-pill').forEach(p => {
      p.addEventListener('click', () => { initToday(p.dataset.date); });
    });
  }

  // ---- 渲染黄历卡片 ----
  function renderLunar(dateStr) {
    L = getLunarInfo(dateStr); // 缓存
    const card = document.getElementById('lunarCard');
    const wd = wuxingOrder(L.dayZhi);
    card.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="bar"></span>今日黄历 <span class="section-tag">${L.dateStr === YL.today() ? '今日' : '查吉日'}</span></div>
        <div class="lish-grid">
          <div class="lish-item"><div class="k">公历</div><div class="v">${L.dateStr} 周${L.weekday}</div></div>
          <div class="lish-item"><div class="k">农历</div><div class="v">${L.lunar}</div></div>
          <div class="lish-item"><div class="k">干支</div><div class="v">${L.ganzhiYear}年 ${L.ganzhiMonth}月 ${L.ganzhiDay}日</div></div>
          <div class="lish-item"><div class="k">日支定五行</div><div class="v">${L.ganzhiDay} · ${YL.zhiName(L.dayZhi)}</div></div>
          ${L.jieqi ? `<div class="lish-item"><div class="k">节气</div><div class="v">${L.jieqi}</div></div>`:''}
          ${L.chong ? `<div class="lish-item bad"><div class="k">冲/煞</div><div class="v">冲${L.chong} ${L.sha?'煞'+L.sha:''}</div></div>`:''}
        </div>
        ${L.pengzu?`<div class="outfit-advice" style="margin-top:10px">🐷 彭祖百忌（${YL.zhiName(L.dayZhi)}·${L.dayGan}）：${L.pengzu}</div>`:''}
        <div class="sec-label" style="margin-top:14px">宜</div>
        <div>${(L.yi||[]).map(x=>`<span class="yi-item">${x}</span>`).join('')||'<span class="yi-item">诸事不宜</span>'}</div>
        <div class="sec-label" style="margin-top:10px">忌</div>
        <div>${(L.ji||[]).map(x=>`<span class="ji-item">${x}</span>`).join('')||'<span class="ji-item">无</span>'}</div>
      </div>`;
  }

  // ---- 渲染五行穿衣卡片 ----
  function renderOutfit(dateStr, weather) {
    const info = getLunarInfo(dateStr);
    const { w, levels } = wuxingOrder(info.dayZhi);
    const card = document.getElementById('outfitCard');
    const rows = levels.map(lv => {
      const c = WUXING_COLOR[lv.wx];
      const sw = c.hex.map(h => `<div class="swatch" style="background:${h}"></div>`).join('');
      return `<div class="outfit-level rank${lv.rank}">
        <div class="rank"><span class="tag">${lv.tag}</span></div>
        <div class="swatches">${sw}</div>
        <div class="info"><div class="cname">${c.level1}${c.level2?'、'+c.level2:''}</div><div class="kwords">${c.k}</div></div>
      </div>`;
    }).join('');
    // 今日关键词
    const todayTxt = dateStr === YL.today() ? '今日' : '';
    // 天气建议（青岛：天气/温度/是否下雨，明确标注，推荐搭配）
    const IS_RAIN = { 51:1,53:1,55:1,61:1,63:1,65:1,66:1,67:1,71:1,73:1,75:1,80:1,81:1,82:1,95:1,96:1,99:1 };
    let adv = '';
    if (weather) {
      const t = weather;
      const isRain = !!IS_RAIN[t.code] || /雨|雷/.test(t.text || '');
      const parts = [];
      parts.push(`青岛 · ${t.text || ''}，气温 ${t.low}~${t.high}℃`);
      if (t.wind) parts.push(`风力约${t.wind}km/h`);
      if (isRain) parts.push('⚠ 有雨，建议带伞、穿防泼水外套，脚部注意防滑');
      else parts.push(t.high >= 29 ? '天气热，宜轻薄透气' : t.high >= 20 ? '舒适，早晚微凉可加薄外套' : '偏凉，注意保暖');
      parts.push('主色系用于上装外套，辅色用于内搭下装配饰');
      adv = `<div class="outfit-advice weather${isRain ? ' rain' : ''}">🌤 ${parts.join('；')}</div>`;
    }
    card.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="bar"></span>五行穿衣 <span class="section-tag">日支 ${YL.zhiName(info.dayZhi)} 定</span></div>
        <div class="outfit-time" id="outfitTime"></div>
        ${weather ? '' : '<div class="outfit-advice weather">🌤 青岛：天气正在获取，请稍后或点击下方刷新（联网可看温度/降雨与穿搭建议）</div>'}
        <div class="clothes-hero">
          <div class="cycle"><div class="cycle-in"><b>${w}</b><span>五行</span></div></div>
          <div style="flex:1">
            <div style="font-size:16px;font-weight:700">今日五行属「${w}」</div>
            <div style="font-size:13px;color:var(--muted);margin-top:4px">依据当日日支 ${info.ganzhiDay} · 相生克定吉色</div>
            <div style="font-size:12px;color:#a5851f;background:var(--gold-soft);border-radius:8px;padding:6px 8px;margin-top:8px">${wuxingNote(w)}</div>
          </div>
        </div>
        ${rows}
        ${adv}
        <div style="display:flex;gap:10px;margin-top:14px">
          <button class="btn ghost" onclick="YL.downloadPost('${dateStr}')">🖼 下载穿衣海报</button>
        </div>
      </div>`;
    // 时间/天气放最顶上：显示当前日期与时间，每天自动更新
    const tEl = document.getElementById('outfitTime');
    if (tEl) { tEl.innerHTML = timeHeaderHtml(); }
    // 存当前五行供海报
    YL._curOutfit = { info, w, levels, weather };
  }
  // 顶部时间栏：农历 + 阳历 + 当前时间，跨天自动更新
  function timeHeaderHtml() {
    const d = new Date();
    const ymd = d.getFullYear() + '年' + (d.getMonth()+1) + '月' + d.getDate() + '日 ' + '星期' + '日一二三四五六'[d.getDay()];
    const hm = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
    const todayLunar = YL.todayLunar ? YL.todayLunar() : '';
    return `<div class="outfit-time-inner"><span class="ot-d">${ymd}</span><span class="ot-hm">${hm}</span>${todayLunar ? '<span class="ot-lunar">农历' + todayLunar + '</span>' : ''}</div>`;
  }
  // 让时间栏每分钟刷新；若跨天（日期改变）则整体重绘天气与五行
  function startClock() {
    setInterval(() => {
      const d = new Date();
      const el = document.getElementById('outfitTime');
      if (el) el.innerHTML = timeHeaderHtml();
      // 跨天自动更新：重新初始化今天
      const today = YL.today();
      if (window.__wuxDay !== today) { window.__wuxDay = today; YL.initToday(today); }
    }, 60000);
  }
  function ensureClock() { if (!window.__wuxClock) { window.__wuxClock = 1; startClock(); } }

  function wuxingNote(w) {
    const m = {
      '木':'木主生发 · 宜绿色青色 · 帮身助运',
      '火':'火主光明 · 宜红紫暖色 · 宣扬显达',
      '土':'土主厚德 · 宜黄棕大地色 · 稳中求进',
      '金':'金主收敛 · 宜白金银亮 · 彰显贵气',
      '水':'水主智慧 · 宜黑蓝深邃 · 沉静致远'
    };
    return m[w] || '';
  }

  // ---- 天气：从后端获取（网页版走 /api/weather；APK file:// 走原生桥直连 Open-Meteo） ----
  async function loadWeather() {
    try {
      const net = window.AndroidNet;
      // APK 直连模式：原生桥直接抓 Open-Meteo JSON
      if (net && typeof net.get === 'function') {
        const html = await nativeFetchOne(
          'https://api.open-meteo.com/v1/forecast?latitude=36.075&longitude=120.395&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,apparent_temperature&daily=temperature_2m_max,temperature_2m_min,weather_code,wind_speed_10m_max&timezone=Asia%2FShanghai&forecast_days=1'
        );
        if (html) {
          const d = JSON.parse(html);
          const daily = d.daily;
          const idx = 0;
          const wcode = daily.weather_code[idx];
          return {
            high: Math.round(daily.temperature_2m_max[idx]),
            low: Math.round(daily.temperature_2m_min[idx]),
            text: WMO_CODE[wcode] || '多云', code: wcode,
            wind: Math.round(daily.wind_speed_10m_max ? daily.wind_speed_10m_max[idx] : 0)
          };
        }
        return null;
      }
      // 网页版：后端 /api/weather
      const base = (YL.API_BASE || '').replace(/\/$/, '');
      const r = await fetch(base + '/api/weather');
      const j = await r.json();
      if (!j.ok) return null;
      const d = j.data;
      const daily = d.daily;
      const todayIdx = 0; // open-meteo index 0 为今天
      const wcode = daily.weather_code[todayIdx];
      const text = WMO_CODE[wcode] || '';
      return {
        high: Math.round(daily.temperature_2m_max[todayIdx]),
        low: Math.round(daily.temperature_2m_min[todayIdx]),
        text, code: wcode,
        wind: (daily.wind_speed_10m_max ? Math.round(daily.wind_speed_10m_max[todayIdx]) : 0)
      };
    } catch (e) { return null; }
  }
  function nativeFetchOne(url, timeout){
    return new Promise((resolve)=>{
      const net = window.AndroidNet;
      if(!net || typeof net.get !== 'function'){ resolve(null); return; }
      window.__netcb = window.__netcb || { _map:{} };
      const cb = '__w'+Math.floor(Math.random()*1e9)+'_'+Date.now();
      window.__netcb._map[cb] = (data)=>{ resolve(data!=null?data:null); delete window.__netcb._map[cb]; };
      try{ net.get(url, cb); }
      catch(e){ resolve(null); }
      setTimeout(()=>{ resolve(null); if(window.__netcb._map[cb]) delete window.__netcb._map[cb]; }, timeout||8000);
    });
  }
  const WMO_CODE = {
    0:'晴',1:'大部晴',2:'多云',3:'阴',45:'雾',48:'雾凇',51:'毛毛雨',53:'毛毛雨',55:'毛毛雨',61:'小雨',63:'中雨',65:'大雨',66:'冻雨',67:'冻雨',71:'小雪',73:'中雪',75:'大雪',80:'阵雨',81:'中阵雨',82:'强阵雨',95:'雷阵雨',96:'雷阵雨伴冰雹',99:'雷阵雨伴冰雹'
  };

  // ---- Canvas 生成可下载海报（排版不交叉） ----
  function downloadPost(dateStr) {
    const info = getLunarInfo(dateStr);
    const wd = wuxingOrder(info.dayZhi);
    const o = { info, w: wd.w, levels: wd.levels, weather: YL._curOutfit ? YL._curOutfit.weather : null };
    YL._curOutfit = o;
    const W = 750, H = 1250;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    // 背景
    const g = ctx.createLinearGradient(0,0,W,H);
    g.addColorStop(0,'#1d2d4f'); g.addColorStop(1,'#2a3e6b');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    // 顶部装饰圆
    ctx.globalAlpha=.08; ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(W-50,-50,200,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(-40,H*0.5,180,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
    // 标题
    ctx.textAlign='center';
    ctx.fillStyle='#f0d989'; ctx.font='bold 52px "PingFang SC","Microsoft YaHei",serif'; ctx.fillText('五行穿衣指南', W/2, 110);
    ctx.fillStyle='#cdd6ea'; ctx.font='24px "PingFang SC",sans-serif';
    ctx.fillText(`公历 ${o.info.dateStr} · 周${o.info.weekday} · ${o.info.jieqi?o.info.jieqi+' ':''}${o.info.lunar}`, W/2, 165);
    ctx.fillText(`日柱 ${o.info.ganzhiDay}（日支${YL.zhiName(o.info.dayZhi)} · 属${o.w}）`, W/2, 205);
    // 分隔线
    ctx.strokeStyle='rgba(240,217,137,.5)'; ctx.lineWidth=2; ctx.setLineDash([8,8]);
    ctx.beginPath(); ctx.moveTo(60,240); ctx.lineTo(W-60,240); ctx.stroke(); ctx.setLineDash([]);
    // 五行轮盘中央强调
    const cx=W/2, cy=330, r=92;
    // 五色环
    const colors=['#c0392b','#f1c40f','#27ae60','#2980b9','#e67e22'];
    let a0=-Math.PI/2;
    colors.forEach(c=>{ const a1=a0+Math.PI*2/5; ctx.fillStyle=c; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,a0,a1); ctx.fill(); a0=a1; });
    ctx.fillStyle='#1d2d4f'; ctx.beginPath(); ctx.arc(cx,cy,62,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#f0d989'; ctx.font='bold 66px serif'; ctx.fillText(o.w, cx, cy+24);
    ctx.fillStyle='#fff'; ctx.font='22px sans-serif'; ctx.fillText(`五行·${wuxingNote(o.w)}`, cx, cy+80);
    // 各档位排名（左标签/中色名/右色块，纵向分行避免交叉）
    let y = 440;
    for (const lv of o.levels) {
      const lw = WUXING_COLOR[lv.wx];
      const tags = {1:'最宜',2:'次宜',3:'平',4:'次忌',5:'最忌'};
      ctx.fillStyle='rgba(255,255,255,.06)'; roundRect(ctx,70,y,W-140,122,16); ctx.fill();
      // 左：档位标签
      ctx.fillStyle= lv.rank===1?'#e74c3c':lv.rank===2?'#27ae60':lv.rank===5?'#2980b9':'#f39c12';
      ctx.textAlign='center'; ctx.font='bold 30px sans-serif';
      ctx.fillText(tags[lv.rank], 118, y+46);
      // 中：五行
      ctx.fillStyle='#f0d989'; ctx.font='bold 34px sans-serif';
      ctx.fillText('属'+lv.wx, 205, y+48);
      // 中：色名与关键词（限宽防交叉）
      ctx.textAlign='left'; ctx.fillStyle='#fff'; ctx.font='24px sans-serif';
      let items = `${lw.level1}${lw.level2?'、'+lw.level2:''}`;
      const cap = 300;
      if (ctx.measureText(items).width > cap && lw.level2) items = lw.level1;
      if (ctx.measureText(items).width > cap) items = lw.level1.slice(0, 8);
      ctx.fillText(items, 268, y+48);
      ctx.fillStyle='#9aa8c9'; ctx.font='19px sans-serif';
      const kw = lw.k;
      if (ctx.measureText(kw).width > cap) ctx.fillText(kw.slice(0,2)+'系', 268, y+82);
      else ctx.fillText(kw, 268, y+82);
      // 右：色块
      let sx=505, sy=y+34, s=48, gap=9;
      lw.hex.slice(0,3).forEach(h=>{ ctx.fillStyle=h; roundRect(ctx,sx,sy,s,s,8); ctx.fill(); sx+=s+gap; });
      // 右下：备注
      ctx.fillStyle='rgba(205,214,234,.9)'; ctx.textAlign='right'; ctx.font='17px sans-serif';
      ctx.fillText(lv.note, W-96, y+100);
      y += 142;
    }
    // 底部天气建议
    const advTxt = o.weather ? `${o.weather.text||''} · ${o.weather.low}~${o.weather.high}℃  ${o.weather.high>=29?'宜轻薄透气':o.weather.high>=22?'可加薄外套':'注意保暖'}` : '结合实况天气参考';
    ctx.fillStyle='rgba(240,217,137,.15)'; roundRect(ctx,70,y+6,W-140,72,14); ctx.fill();
    ctx.fillStyle='#f0d989'; ctx.font='22px sans-serif'; ctx.textAlign='center';
    ctx.fillText('今日天气 ' + advTxt, W/2, y+52);
    ctx.fillStyle='rgba(205,214,234,.7)'; ctx.font='20px sans-serif';
    ctx.fillText('五行穿衣依据传统方位四季推理 · 仅供参考  ·  五行生活指南', W/2, H-40);

    // 输出：生成海报，弹出预览（WebView/手机端可靠），并附带原生下载
    cv.toBlob((blob) => {
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const inWebView = location.protocol === 'file:' || /wv|android/i.test(navigator.userAgent) && /; wv\)/i.test(navigator.userAgent);
      showPosterPreview(cv, blob, dateStr);
      // 浏览器/桌面：额外触发原生下载
      if (blob && !inWebView && !isIOS) {
        try {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `五行穿衣_${dateStr}.png`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1200);
        } catch (e) { /* 预览已兜底 */ }
      }
    }, 'image/png');

    // 保存引用供预览
    return cv;
  }

  function toastWeb(msg) {
    try {
      let t = document.getElementById('ppToast');
      if (!t) { t = document.createElement('div'); t.id='ppToast';
        t.style.cssText='position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:rgba(0,0,0,.85);color:#fff;padding:10px 18px;border-radius:8px;font-size:14px;z-index:100001;max-width:80vw;text-align:center';
        document.body.appendChild(t); }
      t.textContent = msg; t.style.display='block';
      clearTimeout(t._t); t._t = setTimeout(()=>{ t.style.display='none'; }, 2400);
    } catch(e){}
  }

  // 保存按钮：Android 端优先走原生相册桥；浏览器端走 <a download>；iOS 提示长按
  function mkSaveBtn(dataUrl, dateStr) {
    const b = document.createElement('button');
    const inNative = window.Android && typeof window.Android.saveImage === 'function';
    b.textContent = '💾 ' + (inNative ? '保存到相册' : '保存图片');
    b.style.cssText = 'display:inline-block;padding:12px 28px;border-radius:10px;background:linear-gradient(135deg,#a96a1f,#b8860b);color:#fff;font-size:15px;font-weight:700;border:none;cursor:pointer;margin-right:10px';
    b.addEventListener('click', () => {
      try {
        if (inNative) {
          window.Android.saveImage(dataUrl, `五行穿衣_${dateStr}.png`);
          return;
        }
        if (/iphone|ipad|ipod/i.test(navigator.userAgent)) { toastWeb('请长按上方图片不松手，选择"存储到相册"'); return; }
        const a = document.createElement('a');
        a.href = dataUrl; a.download = `五行穿衣_${dateStr}.png`;
        document.body.appendChild(a); a.click();
        setTimeout(() => a.remove(), 600);
        toastWeb('已开始下载，请留意浏览器下载记录');
      } catch (e) { toastWeb('保存失败，请长按图片保存'); }
    });
    return b;
  }

  // 海报预览：始终弹出，含大图预览 + 保存图片 + 关闭
  function showPosterPreview(cv, blob, dateStr) {
    let box = document.getElementById('posterPreview');
    const dataUrl = cv.toDataURL('image/png');
    const inNative = window.Android && typeof window.Android.saveImage === 'function';
    if (!box) {
      box = document.createElement('div');
      box.id = 'posterPreview';
      box.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px';
      box.innerHTML = '<div style="color:#f0d989;font-size:14px;margin-bottom:10px">五行穿衣海报已生成</div>' +
        '<div style="max-height:60vh;overflow:auto;margin-bottom:14px"><img style="max-width:min(92vw,360px);border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.5)"></div>' +
        '<div style="margin-bottom:12px"></div>' +
        '<button class="pp-close" style="padding:10px 26px;border:1px solid #999;border-radius:9px;background:rgba(255,255,255,.08);color:#fff;font-size:15px;cursor:pointer">关 闭</button>';
      document.body.appendChild(box);
      box.querySelector('.pp-close').addEventListener('click', () => { box.remove(); });
    }
    box.querySelector('img').src = dataUrl;
    const slot = box.querySelector('div[style*="margin-bottom:12px"]');
    slot.innerHTML = '';
    slot.appendChild(mkSaveBtn(dataUrl, dateStr));
    box.querySelector('img').style.cursor = 'zoom-in';
    // 长按图片也可保存（移动端）
    const img = box.querySelector('img');
    if (!inNative) img.addEventListener('contextmenu', (e) => { e.preventDefault(); });
  }
  function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

  // ---- 初始化（今日） ----
  let L = null;
  async function initToday(dateStr) {
    dateStr = dateStr || YL.today();
    const cur = dateStr;
    renderDateScroll(cur);
    renderLunar(cur);
    // 启动"时间栏 + 跨天自动更新"的时钟（每分钟刷新时间；跨天后自动重新拉天气与五行）
    ensureClock();
    // 先渲染(无天气)，天气到了再局部更新，避免一直等网络
    renderOutfit(cur, null);
    const weather = await loadWeather();
    renderOutfit(cur, weather);
  }

  window.YL.initToday = initToday;
  window.YL.downloadPost = downloadPost;
  window.YL.getLunarInfo = getLunarInfo;
  window.YL.wuxingOrder = wuxingOrder;
  window.YL.WMO_CODE = WMO_CODE;
  window.YL.WUXING_COLOR = WUXING_COLOR;
})();