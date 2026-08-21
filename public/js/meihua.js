// ============ 功能二：梅花易数 前端逻辑 ============
(function () {
  const YL = window.YL;

  const BAGUA = {
    1:{name:'乾',ziran:'☰',wuxing:'金',obj:'天·朝廷·君父'},
    2:{name:'兑',ziran:'☱',wuxing:'金',obj:'泽·少女·喜悦'},
    3:{name:'离',ziran:'☲',wuxing:'火',obj:'火·中女·光明'},
    4:{name:'震',ziran:'☳',wuxing:'木',obj:'雷·长男·行动'},
    5:{name:'巽',ziran:'☴',wuxing:'木',obj:'风·长女·财运'},
    6:{name:'坎',ziran:'☵',wuxing:'水',obj:'水·中男·险陷'},
    7:{name:'艮',ziran:'☶',wuxing:'土',obj:'山·少男·静止'},
    8:{name:'坤',ziran:'☷',wuxing:'土',obj:'地·老母·厚德'}
  };
  const ZHI = { '子':1,'丑':2,'寅':3,'卯':4,'辰':5,'巳':6,'午':7,'未':8,'申':9,'酉':10,'戌':11,'亥':12 };
  const SHI = { '子时':1,'丑时':2,'寅时':3,'卯时':4,'辰时':5,'巳时':6,'午时':7,'未时':8,'申时':9,'酉时':10,'戌时':11,'亥时':12 };
  const DIR = { '东':'震','南':'离','西':'兑','北':'坎','东南':'巽','西南':'坤','西北':'乾','东北':'艮' };
  const SHENG = { '木':'火','火':'土','土':'金','金':'水','水':'木' };
  const KE = { '木':'土','土':'水','水':'火','火':'金','金':'木' };

  function numToGua(n) { const r = n % 8; return r === 0 ? 8 : r; }
  function guaBits(name) { const b={'乾':'111','兑':'110','离':'101','震':'100','巽':'011','坎':'010','艮':'001','坤':'000'}; return b[name]||'000'; }
  function bitsToGua(bits) { const m={'111':'乾','110':'兑','101':'离','100':'震','011':'巽','010':'坎','001':'艮','000':'坤'}; return m[bits]||'坤'; }
  const NAME_GUA = { '乾':BAGUA[1],'兑':BAGUA[2],'离':BAGUA[3],'震':BAGUA[4],'巽':BAGUA[5],'坎':BAGUA[6],'艮':BAGUA[7],'坤':BAGUA[8] };
  function keyOf(s,x){ return s+x; }

  function resolveHex(shang, xia, dong) {
    const S = typeof shang==='number'?BAGUA[shang]:shang;
    const X = typeof xia==='number'?BAGUA[xia]:xia;
    const z = YL.HEX[keyOf(S.name,X.name)];
    // 变卦
    const bits = guaBits(X.name)+guaBits(S.name);
    const arr = bits.split('');
    arr[5-(dong-1)] = arr[5-(dong-1)]==='1'?'0':'1';
    const b = arr.join('');
    const bianX = bitsToGua(b.slice(0,3)), bianS = bitsToGua(b.slice(3,6));
    const bianGua = { S:NAME_GUA[bianS], X:NAME_GUA[bianX], data: YL.HEX[keyOf(bianS,bianX)] };
    // 互卦
    const huX = bitsToGua(bits[1]+bits[2]+bits[3]);
    const huS = bitsToGua(bits[2]+bits[3]+bits[4]);
    const huGua = { S:NAME_GUA[huS], X:NAME_GUA[huX], data: YL.HEX[keyOf(huS,huX)] };
    // 体用生克（动爻所在卦为用）
    const dongInXia = dong<=3;
    const ti = dongInXia?X:S, yong = dongInXia?S:X;
    const relation = tiYong(ti.wuxing, yong.wuxing);
    return { S,X,Z:z,dong, bianGua, huGua, ti, yong, relation };
  }
  function tiYong(tw, yw){
    if(tw===yw) return {txt:`体用同类比和（${tw}比${yw}），处事多顺、进退有据`, type:'顺'};
    if(SHENG[tw]===yw) return {txt:`体${tw}生用${yw}，主付出较多、先劳后获`, type:'泄'};
    if(SHENG[yw]===tw) return {txt:`用${yw}生体${tw}，主得助有靠、行事顺遂`, type:'吉'};
    if(KE[tw]===yw) return {txt:`体${tw}克用${yw}，主掌控局面、制胜有余`, type:'旺'};
    if(KE[yw]===tw) return {txt:`用${yw}克体${tw}，主阻力较大、宜谨慎`, type:'凶'};
    return {txt:'关系平顺', type:'顺'};
  }
  // 变爻解读
  function yaoText(type, val) {
    const numName={1:'一',2:'二',3:'三',4:'四',5:'五',6:'六'};
    const shaug = resolveHex(type==='number'?1:8, type==='number'?2:8, 1);
    return val;
  }

  function calc(method, p) {
    let g;
    switch(method){
      case 'time': {
        const total = (p.year||0)+(p.month||0)+(p.day||0);
        g = resolveHex(numToGua(total), numToGua(total+(p.hour||0)), (total+(p.hour||0))%6||6);
        break; }
      case 'number': {
        const n1=Number(p.n1||0), n2=Number(p.n2||0);
        g = resolveHex(numToGua(n1), numToGua(n2), (n1+n2)%6||6);
        break; }
      case 'phone': {
        const s=String(p.tail||''); const d=s.split('').map(Number);
        const a=d[0]+d[1], b=d[2]+d[3];
        g = resolveHex(numToGua(a), numToGua(b), (a+b)%6||6);
        break; }
      case 'dir': {
        const gn=DIR[p.dir]||'震'; const gnNum=Object.keys(BAGUA).find(k=>BAGUA[k].name===gn);
        const n=Number(p.num||1);
        const shang=parseInt(gnNum); const xia=numToGua(n);
        const dong=(shang+n)%6||6;
        g = resolveHex(shang, xia, dong);
        break; }
      case 'word': {
        const w=String(p.words||''); const half=Math.ceil(w.length/2);
        const n1=wordStrokes(w.slice(0,half)), n2=wordStrokes(w.slice(half));
        g = resolveHex(numToGua(n1), numToGua(n2), (n1+n2)%6||6);
        break; }
    }
    return g;
  }
  function wordStrokes(str){
    // 简化：汉字笔画近似（常见字表），非汉字按unicode
    // 实际应用中，用字数更准确。这里提供笔画估算：常用简化字取字典
    const table={'测':'9','算':'14','现':'8','在':'6','下':'3','班':'10','好':'6','不':'4','适':'9','合':'6','打':'5','球':'11','等':'12','我':'7','你':'7','他':'5','今':'4','天':'4','签':'13','约':'6','合':'6','作':'7','买':'6','卖':'8','工':'3','作':'7','结':'9','婚':'11','开':'4','业':'5','投':'7','资':'7','学':'8','习':'3','面':'9','试':'8','考':'6','试':'8','出':'5','行':'6','谈':'10','判':'7','恋':'10','爱':'10','病':'10','康':'11','财':'7','运':'7','官':'8','婚':'11','嫁':'13','娶':'11','业':'5','成':'6','功':'5','水':'4','火':'4','木':'4','金':'8','土':'3'};
    let sum=0;
    for(const ch of str){ if(table[ch]) sum+=parseInt(table[ch]); else sum += ch.charCodeAt(0)%10||1; }
    return sum || 1;
  }

  // ---- 渲染方法表单 ----
  const FORMS = {
    time: `<div class="field"><label>年（当地支数，如子年=1…见下）</label><input id="p_year" type="number" placeholder="例：2026年→按年度地支1-12"></div>
      <div class="field"><label>月（一月=1…十二月=12）</label><input id="p_month" type="number" placeholder="例：8"></div>
      <div class="field"><label>日（初一=1…三十=30）</label><input id="p_day" type="number" placeholder="例：18"></div>
      <div class="field"><label>时辰</label><select id="p_hour">${Object.keys(SHI).map(k=>`<option value="${SHI[k]}">${k}</option>`).join('')}</select></div>
      <div class="play-warn">注：参考农历日期与时辰。也可用"报数法"更简单。</div>`,
    number: `<div class="field"><label>第一个数字（1-8以上的整数）</label><input id="p_n1" type="number" placeholder="例：18"></div>
      <div class="field"><label>第二个数字</label><input id="p_n2" type="number" placeholder="例：11"></div>`,
    phone: `<div class="field"><label>手机号后四位</label><input id="p_tail" type="number" placeholder="例：1023"></div>`,
    dir: `<div class="field"><label>所见物品方位</label><select id="p_dir">${Object.keys(DIR).map(k=>`<option>${k}</option>`).join('')}</select></div>
      <div class="field"><label>一个辅助数字（如物品卦数）</label><input id="p_num" type="number" placeholder="例：5"></div>`,
    word: `<div class="field"><label>输入所问之词句</label><input id="p_words" type="text" placeholder="例：现在下班好不好"></div>`
  };

  function renderForm(method){
    document.getElementById('methodForm').innerHTML = FORMS[method]||FORMS.number;
  }
  function readMethod(method){
    const v = id => { const e=document.getElementById(id); return e? e.value:'0'; };
    switch(method){
      case 'time': return {year:+v('p_year')||0, month:+v('p_month')||0, day:+v('p_day')||0, hour:+v('p_hour')||0};
      case 'number': return {n1:v('p_n1'), n2:v('p_n2')};
      case 'phone': return {tail:v('p_tail')};
      case 'dir': return {dir:document.getElementById('p_dir')?.value||'东', num:v('p_num')};
      case 'word': return {words:v('p_words')};
    }
  }
  const METHOD_NAME = { time:'年月日时起卦', number:'报数起卦', phone:'手机尾号起卦', dir:'方位起卦', word:'文字起卦' };

  // ---- 吉凶总评：体用生克 + 动爻爻辞吉凶倾向综合 ----
  function fortune(g) {
    // 体用关系权重
    const w = { '吉': 90, '顺': 75, '旺': 70, '泄': 50, '凶': 30 }[g.relation.type] || 60;
    // 动爻爻辞吉凶倾向加分/减分
    const y = g.Z.yaos[g.dong - 1] || '';
    let adj = 0;
    if (/元吉|大吉|吉|利|亨|无咎|有庆|有喜|有获|得.手|利见大人|有攸往利/.test(y)) adj += 12;
    if (/凶|厉|悔|吝|贞厉|勿用|有灾|有疾|灾|不利|其亡|迷|凶咎/.test(y)) adj -= 12;
    if (/悔亡|无咎|小吝|厉无咎|君子|终日乾乾/.test(y)) adj += 4;
    let score = Math.max(5, Math.min(98, w + adj));
    // 吉凶等级
    let level, color;
    if (score >= 85) { level = '大吉'; color = '#1e8449'; }
    else if (score >= 70) { level = '吉'; color = '#2e8b57'; }
    else if (score >= 55) { level = '小吉'; color = '#7a8b3a'; }
    else if (score >= 40) { level = '平'; color = '#b8860b'; }
    else if (score >= 25) { level = '小凶'; color = '#c77b1a'; }
    else { level = '凶'; color = '#c0392b'; }
    return { score: Math.round(score), level, color, bytext: g.relation.txt };
  }

  // ---- 爻辞白话翻译（吉凶倾向 + 现代白话） ----
  function yaoBaiHua(yaoStr) {
    const y = yaoStr || '';
    let txt, tend;
    if (/勿用/.test(y)) { tend = '宜静'; txt = '当下时机未到，不宜轻举妄动，先审时度势、蓄势待发'; }
    else if (/凶|贞厉|厉|有灾|灾/.test(y)) { tend = '凶'; txt = '局面存在风险或阻碍，需格外谨慎，宜放缓节奏、多做准备，避免贸然激进'; }
    else if (/悔|吝|困|穷|羁/.test(y) && !/无咎/.test(y)) { tend = '平'; txt = '事情进展不易顺畅，或有小波折，但尚不致命，需耐心周旋、控制情绪'; }
    else if (/元吉|大吉|吉上|\b吉\b|有庆|有喜|利/.test(y)) { tend = '吉'; txt = '征兆较佳，进展顺利、可得助力，宜把握机会顺势前行'; }
    else if (/无咎|悔亡|厉无咎/.test(y)) { tend = '平吉'; txt = '虽有波折，但无大碍，守正而行即可安然无咎'; }
    else if (/利见大人|见龙|飞龙|贞/.test(y)) { tend = '吉'; txt = '预示着有利的进展，宜主动行动，寻求贤者与资源相助'; }
    else { tend = '平'; txt = '需结合所问之事具体衡量，宜稳中求进，三思而后行'; }
    return { txt, tend };
  }

  // ---- 渲染结果 ----
  function renderResult(g, method, huati){
    const el = document.getElementById('guaResult');
    const numName={1:'初',2:'二',3:'三',4:'四',5:'五',6:'上'};
    const tagC = { '顺':'..', '吉':'..', '泄':'..', '旺':'..', '凶':'..' };
    const relationColor = { '吉':'#2e8b57','顺':'#2a3e6b','旺':'#b8860b','泄':'#8b93a7','凶':'#c0392b' };
    const z = g.Z, bian = g.bianGua.data, hu = g.huGua.data;
    const yaoStr = z.yaos[g.dong-1];
    // 吉凶总评 + 爻辞白话
    const fd = fortune(g);
    const yb = yaoBaiHua(yaoStr);
    el.innerHTML = `
      <div class="card">
        <div class="card-title"><span class="bar"></span>${METHOD_NAME[method] ?? method} · 解卦</div>
        ${huati?`<div style="background:#f4f1ea;border-radius:10px;padding:10px 12px;margin-bottom:12px;font-size:14px">🔮 所占之事：<b>${huati}</b></div>`:''}
        <div style="display:flex;align-items:center;gap:14px;background:linear-gradient(120deg,#fdf6e6,#f3e7c8);border-radius:14px;padding:14px;margin-bottom:12px;border:1px solid #efd9a4">
          <div style="width:74px;height:74px;border-radius:50%;background:${fd.color};color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 6px 18px ${fd.color}55">
            <div style="font-size:11px;opacity:.85">吉凶</div>
            <div style="font-size:26px;font-weight:800;line-height:1">${fd.level}</div>
            <div style="font-size:11px;opacity:.85">${fd.score}分</div>
          </div>
          <div style="flex:1;font-size:13px;color:#5d4a1f;line-height:1.6">
            <b style="color:${fd.color};font-size:16px">总评：${fd.level}</b>（综合评分 ${fd.score} 分）<br>${z.jing} 从体用关系看：${fd.bytext}
          </div>
        </div>
        <div class="gua-cards">
          <div class="gua-card"><div class="lb">本卦（主）</div><div class="trigram">${g.S.ziran}${g.X.ziran}</div><div class="gname">${g.S.name}${g.X.name}·${z.name}</div>
            <div style="font-size:11px;color:#b9c6e4;margin-top:3px">${z.yi}</div></div>
          <div class="gua-card"><div class="lb">互卦</div><div class="trigram">${g.huGua.S.ziran}${g.huGua.X.ziran}</div><div class="gname">${hu?hu.name:'—'}</div></div>
          <div class="gua-card change"><div class="lb">变卦</div><div class="trigram">${g.bianGua.S.ziran}${g.bianGua.X.ziran}</div><div class="gname">${bian?bian.name:'—'}</div></div>
        </div>

        <div style="text-align:center;margin-bottom:12px">
          <span class="section-tag">动爻：第${numName[g.dong]}爻</span>
          <span class="section-tag" style="margin-left:6px;background:#eef0ff;color:#4a5ab8">体卦「${g.ti.name}${g.ti.wuxing}」</span>
          <span class="section-tag" style="margin-left:6px;background:#eef6ff;color:#2a6bb8">用卦「${g.yong.name}${g.yong.wuxing}」</span>
        </div>

        <div class="gua-relation" style="border-left:4px solid ${relationColor[g.relation.type]||'#8b93a7'}">体用关系：${g.relation.txt}</div>

        <div class="gua-section"><div class="h">📜 卦辞</div><div class="gua-text">「${z.duan}」<br><b>白话：</b>${z.duanRun}</div></div>
        <div class="gua-section"><div class="h">✒️ 动爻「第${numName[g.dong]}爻」爻辞</div><div class="gua-text">「${yaoStr}」<br><b>白话：</b>${yb.txt}</div></div>
        <div class="gua-section"><div class="h">🧭 象曰</div><div class="gua-text">${z.xiang}</div></div>
        <div class="gua-section"><div class="h">💡 给您的建议</div><div class="gua-text">${z.jing}</div></div>
        <div class="gua-section"><div class="h">🔄 变卦启示（事态发展走向）</div><div class="gua-text">${bian?bian.name+'：'+bian.jing:'—'}</div></div>

        <button class="btn ghost" onclick="YL.saveGuaImage(this)">🖼 保存卦象图片</button>
        <p class="play-warn">梅花易数为传统占验之术，结果仅供参考，娱乐随心，勿过度依赖。</p>
      </div>`;
    // 保存当前卦数据
    YL._lastGua = { g, method, huati, z, yaoStr, fd };
    el.classList.add('show');
    el.scrollIntoView({behavior:'smooth', block:'start'});
  }

  // 保存卦象为图片
  YL.saveGuaImage = function(btn){
    const d = YL._lastGua; if(!d) return;
    const W=720, H=1000;
    const cv=document.createElement('canvas'); cv.width=W;cv.height=H;
    const ctx=cv.getContext('2d');
    const gr=ctx.createLinearGradient(0,0,W,H); gr.addColorStop(0,'#1d2d4f'); gr.addColorStop(1,'#2a3e6b');
    ctx.fillStyle=gr; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';
    ctx.fillStyle='#f0d989'; ctx.font='bold 44px serif'; ctx.fillText('梅花易数 · 起卦结果', W/2, 90);
    ctx.fillStyle='#cdd6ea'; ctx.font='22px sans-serif';
    ctx.fillText(d.huati?('所占：'+d.huati):'梅花易数测算', W/2, 140);
    ctx.strokeStyle='rgba(240,217,137,.5)';ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(60,170);ctx.lineTo(W-60,170);ctx.stroke();ctx.setLineDash([]);
    // 卦名大字
    ctx.fillStyle='#fff'; ctx.font='bold 60px serif';
    ctx.fillText(`${d.z.name}卦 · 第${['一','二','三','四','五','六'][d.g.dong-1]}爻动`, W/2, 240);
    ctx.fillStyle='#f0d989'; ctx.font='26px sans-serif';
    ctx.fillText(`本卦 ${d.g.S.ziran}${d.g.X.ziran}${d.g.S.name}${d.g.X.name}（${d.z.name}）  变卦 ${d.g.bianGua.data.name}`, W/2, 320);
    // 吉凶总评
    if (d.fd) {
      ctx.fillStyle='rgba(46,139,87,.22)';roundRect(ctx,60,360,W-120,60,16);ctx.fill();
      ctx.fillStyle=(d.fd.color||'#f0d989');
      ctx.font='bold 26px sans-serif'; ctx.fillText(`吉凶：${d.fd.level}（${d.fd.score}分）`, W/2, 400);
    }
    // 卦辞
    ctx.fillStyle='rgba(255,255,255,.08)';roundRect(ctx,60,360,W-120,120,16);ctx.fill();
    ctx.fillStyle='#f0d989'; ctx.font='bold 24px sans-serif'; ctx.textAlign='left'; ctx.fillText('卦辞', 100, 405);
    ctx.fillStyle='#fff'; ctx.font='22px sans-serif'; wrapText(ctx, `「${d.z.duan}」 ${d.z.duanRun}`, 100, 448, W-200, 32, 2);
    // 爻辞
    ctx.fillStyle='rgba(240,217,137,.12)';roundRect(ctx,60,500,W-120,120,16);ctx.fill();
    ctx.fillStyle='#f0d989'; ctx.font='bold 24px sans-serif'; ctx.fillText('动爻爻辞', 100, 545);
    ctx.fillStyle='#fff'; ctx.font='22px sans-serif'; wrapText(ctx, `「${d.yaoStr}」`, 100, 590, W-200, 32, 2);
    // 建议
    ctx.fillStyle='rgba(46,139,87,.22)';roundRect(ctx,60,650,W-120,120,16);ctx.fill();
    ctx.fillStyle='#2ecc71'; ctx.font='bold 24px sans-serif'; ctx.fillText('今日建议', 100, 695);
    ctx.fillStyle='#fff'; ctx.font='22px sans-serif'; wrapText(ctx, `${d.z.jing}`, 100, 740, W-200, 32, 3);
    // 底部
    ctx.fillStyle='rgba(205,214,234,.6)'; ctx.font='19px sans-serif'; ctx.textAlign='center';
    ctx.fillText('一事一卦 · 心诚则灵 · 五行生活指南', W/2, H-40);
    cv.toBlob(b=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=`梅花易数_${YL.formatNow()}.png`; a.click(); URL.revokeObjectURL(a.href); },'image/png');
    function roundRect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
    function wrapText(c,text,x,y,maxW,lh,maxLine){
      let line='',ln=0;
      for(let i=0;i<text.length;i++){ const ch=text[i]; const test=line+ch; if(c.measureText(test).width>maxW && line){ c.fillText(line,x,y); line=ch; y+=lh; ln++; if(ln>=maxLine){c.fillText('……',x,y);return;}} else line=test;}
      if(line) c.fillText(line,x,y);
    }
  };
  YL.formatNow = function(){ const d=new Date(); return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; };

  // ---- 初始化 ----
  window.YL.meihua = { calc, resolveHex };
  window.YL.calcMeihua = calc;
  window.YL.renderMeihuaForm = renderForm;
  window.YL.qiGua = function(){
    const method = document.querySelector('.method-chip.active')?.dataset.method || 'number';
    const huati = document.getElementById('huati').value.trim();
    const p = readMethod(method);
    const g = calc(method, p);
    renderResult(g, method, huati);
  };
})();