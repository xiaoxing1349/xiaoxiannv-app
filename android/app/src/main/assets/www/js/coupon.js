// ============ 功能五：青岛 & 周边游（推荐好玩的地方 + 旅游行程） ============
// 说明：以"青岛及周边短途游"为主体，内置精选景点 + 多套行程路线（一日/两日/三日）。
//       顶部保留"实时游玩攻略"尽力联网抓其他来源补充，抓不到也不影响——内置内容永远可见。
(function () {
  const YL = window.YL;
  const WEEKDAY = ['日','一','二','三','四','五','六'];

  function esc(s){
    if(s == null) return '';
    const map = { 'amp':'&','lt':'<','gt':'>','quot':'"','apos':"'",'nbsp':' ','ensp':'\u2002','emsp':'\u2003','mdash':'—','ndash':'–','ldquo':'“','rdquo':'”','lsquo':'‘','rsquo':'’','middot':'·' };
    let cur = String(s)
      .replace(/<script[\s\S]*?<\/script>/gi,' ')
      .replace(/\[!--[\s\S]*?--\]/g,' ').replace(/<!--[\s\S]*?-->/g,' ')
      .replace(/<[^>]*>/g,' ');
    let prev = ''; let guard = 0;
    while (cur !== prev && guard < 4) {
      prev = cur;
      cur = cur
        .replace(/&#x([0-9a-fA-F]{1,6});|&#(\d{1,7});/g, (_,h,d)=>{ try{ return String.fromCodePoint(h?parseInt(h,16):parseInt(d,10)); }catch(e){ return ' '; } })
        .replace(/&([a-zA-Z]+);/g, (m,k)=> map[k]!==undefined?map[k]:m);
      guard++;
    }
    cur = cur.replace(/\[!--|htmlVideoCode|htmlimgcode|\[[A-Za-z:_]+\]/gi,' ').replace(/\s+/g,' ').trim();
    return cur.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
  function pad(n){ return String(n).padStart(2,'0'); }
  function nowStr(){ const d=new Date(); return pad(d.getHours())+':'+pad(d.getMinutes()); }

  // ---------- 景点卡公用样式 ----------
  function spotCard(c, kind){
    const kindTag = kind === 'core' ? 'h' : kind === 'route' ? 'r' : 's';
    const tagLabel = kind === 'core' ? '当地必玩' : kind === 'route' ? '行程' : '周边';
    return `<div class="coupon-card">
      <div class="cc-t">${kind === 'route' ? '🧭' : '📍'} ${esc(c.t)} <span class="cc-tag">${esc(c.n || '')}</span></div>
      <div class="cc-d">${esc(c.d)}</div>
      ${c.steps ? '<div class="cc-steps">' + c.steps.map(x => '<div class="step">• ' + esc(x) + '</div>').join('') + '</div>' : ''}
      ${c.how ? `<div class="cc-how">🔧 ${esc(c.how)}</div>` : ''}
      ${c.link ? `<a class="cl-link" href="${c.link}" target="_blank" rel="noopener" onclick="event.stopPropagation()">▶ 查看出发前准备/详情</a>` : ''}
    </div>`;
  }

  // ================= 当季推荐（8月盛夏·避暑玩水）：青岛本地 / 山东省内 / 省外 =================
  const SPOTS = {
    core: [
      { t:'崂山北九水 · 戏水避暑', n:'崂山区·当日', d:'盛夏八月的“避暑顶流”，九曲十八潭的泉水、飞瀑与林荫把暑气隔绝在外，是青岛本地人夏季踏青戏水的首选，泉水清凉可放心踩水。', how:'早班进山避开正午，穿凉鞋/速干衣，带好饮用水；夏季雨后水量更大更清凉。' },
      { t:'石老人 / 第一海水浴场', n:'崂山·市南·当日', d:'想就近玩海就选这里——石老人沙滩开阔细软，第一海水浴场在市内老城，都是本地人夏天下班后就能到的海水浴场。', how:'戏水认准正规浴场有救生员，午后紫外线强注意防晒，下海看潮汐与警戒旗。' },
      { t:'崂山仰口 · 山海看日出', n:'崂山区·当日', d:'仰口线看海天一色与海岸奇石，清晨登顶可观海面日出，山顶海风凉爽、俯瞰环湾，体验感极佳。', how:'凌晨出发看日出，备外套（山顶风凉），可太清-仰口连走或择一线。' },
      { t:'唐岛湾 / 凤凰岛 · 傍晚骑行', n:'黄岛·当日', d:'西海岸唐岛湾与凤凰岛沿线清爽开阔，傍晚吹着海风骑行、放风筝、看日落，是避暑又治愈的本地周末去处。', how:'午后租车环岛骑行约半天，傍晚看海上日落，人少景美。' },
      { t:'青岛啤酒节会场 / 极地海洋公园', n:'市北·崂山·当日', d:'盛夏正逢青岛国际啤酒节，啤酒+海鲜+文艺演出烟火气拉满；极地海洋公园室内恒温，是带娃避暑的好选择。', how:'啤酒节看官方场次安排，海洋馆适合家庭，室内清凉不晒。' }
    ],
    around: [
      { t:'烟台 · 蓬莱阁 & 长岛海岛避暑', n:'山东省内·2日', d:'蓬莱阁临海仙气十足，长岛坐船登岛、海峰石壁与渔村海鲜，海风常年凉快，是省内海边避暑的经典。', how:'青岛到烟台高铁约2小时，长岛需提前查船班，适合周末两日。' },
      { t:'威海 · 刘公岛 / 半月湾', n:'山东省内·2日', d:'威海气候清凉、街道干净，刘公岛看海与历史，半月湾/国际海水浴场水质清透，是省内公认的夏日清凉海滨。', how:'高铁直达，市区+海岛可分两日；海边紫外线强记得涂防晒。' },
      { t:'日照 · 万平口 / 海滨绿道', n:'山东省内·1-2日', d:'日照万平口沙滩平缓、日照海边森林与绿道穿行，看海上日出和赶海，物价亲切，适合家庭短途。', how:'自驾约3小时，赶海看潮汐表；早晚赶海、午后海边树荫或室内休息。' },
      { t:'泰安 · 泰山夜爬避暑', n:'山东省内·1-2日', d:'盛夏山脚燥热、山顶凉爽，夜爬泰山既避开白天暴晒又能看云海日出，是山东人暑期消夏的“顶配”。', how:'选择夜爬时间、带上头灯和薄外套，旺季索道人流大，提前看天气是否适合观日出。' },
      { t:'临沂 · 沂蒙山 / 竹泉村戏水', n:'山东省内·2日', d:'沂蒙山区深山清凉、负氧离子高，竹泉村有天然泉水戏水区与竹林亭台，是温度比城市低好几度的消夏地。', how:'自驾进山，泉边戏水看水深警示；适合周末放松与亲子玩水。' },
      { t:'济南 · 趵突泉 & 大明湖', n:'山东省内·1日', d:'“泉城”的泉水、护城河与大明湖自带清凉，盛夏赏泉、湖上泛舟、夜晚看超然楼灯光，老城烟火又避暑。', how:'高铁1.5小时左右，泉水边/湖畔树荫下走，避开正午最热时段。' },
      { t:'淄博 · 潭溪山 / 开元溶洞', n:'山东省内·1日', d:'潭溪山有玻璃桥与山涧，开元溶洞常年恒温清凉，入洞即清凉，是省内避暑又出片的选择。', how:'自驾进山，洞内恒温可穿短袖；两条线可分两日或择一度周末。' }
    ],
    out: [
      { t:'承德避暑山庄 + 木兰围场', n:'河北·3日', d:'“皇家的夏日行宫”，避暑山庄古建+湖区绿意，周边木兰围场草原广袤，盛夏平均气温比周边低，凉快的名不虚传。', how:'高铁到承德，山庄+坝上草原三段式，草原早晚温差大需带外套。' },
      { t:'丰宁坝上草原', n:'河北·2-3日', d:'暑期草原已绿，蓝天白云、骑马、露营、看星空，海拔千米气温多在20℃上下，是离青岛不远的消夏草原。', how:'自驾或高铁+接驳，坝上风大温差大，带好防晒与薄羽绒/外套。' },
      { t:'长白山 · 天池避暑', n:'吉林·3-4日', d:'盛夏长白山顶天池仍可能见雪、清爽宜人，瀑布、温泉、原始森林合一，是国内避暑与看自然奇观的代表。', how:'8月是看天池好季节，需提前看天气是否开放，山上气温低备厚外套。' },
      { t:'呼伦贝尔大草原', n:'内蒙古·4-5日', d:'8月草原最盛的绿，骑马、穿蒙古包、看那达慕氛围，气温凉爽通透，是暑期草原度假的首选远方。', how:'建议飞机到海拉尔落地，草原光线强、昼夜温差大，带墨镜防晒和薄外套。' },
      { t:'大连 / 北戴河海滨', n:'辽宁·河北·2-3日', d:'大连滨海城市清凉干净、老虎滩/棒棰岛玩水出片；北戴河是华北老牌避暑海滨，海水浴场成熟。', how:'两地可分别做短途，海边戏水认准正规浴场，注意防晒与潮汐。' },
      { t:'贵州 · 荔波小七孔 / 梵净山', n:'贵州·4-5日', d:'贵州“天然大空调”，荔波小七孔的碧水绿林、梵净山红云金顶云雾缭绕，盛夏平均气温舒适，是避暑秘境。', how:'飞机/高铁进贵阳再高铁串联，山区多雨带雨具，步道湿滑注意安全。' },
      { t:'青海 · 青海湖 / 茶卡盐湖', n:'青海·4-5日', d:'8月青海湖油菜花与湖水相映、茶卡盐湖“天空之镜”，高原盛夏清冽凉爽，是国内暑期最出片的目的地之一。', how:'海拔高注意高反循序适应，白天防晒夜间保暖，防晒霜墨镜必备。' },
      { t:'甘肃 · 敦煌 / 张掖丹霞', n:'甘肃·4-5日', d:'大西北的盛夏反而“干热不闷”，莫高窟人文、鸣沙山月牙泉、张掖七彩丹霞，白天热夜间凉爽，是文化消夏之选。', how:'景点分散建议包车/跟团，日照强备足水和防晒，莫高窟需提前预约。' }
    ],
    route: [
      { t:'青岛本地 · 一日避暑玩水', n:'约7-8小时', d:'不用远行，一天把青岛的“水”都玩到，适合盛夏周末说走就走。',
        steps:['上午：崂山北九水戏水踏青（早班避开正午）','中午：北九水/山下吃农家菜','下午：回市区石老人或一浴海边清凉戏水','傍晚：唐岛湾或五四广场看海上日落'],
        how:'纯市内可公共交通，预算约100-200元，轻装速干装备。' },
      { t:'山东海边 · 两日避暑（烟台-威海）', n:'2天1晚', d:'把胶东半岛最清凉的两个海边一次排满，山海+海鲜兼顾。',
        steps:['D1：青岛→烟台，蓬莱阁或长岛登岛看海','D1晚：宿烟台/威海','D2：威海刘公岛/半月湾玩水，傍晚高铁回青'],
        how:'高铁衔接，人均约500-700元，海边防晒防暑都要备。' },
      { t:'省内山野 · 两日消夏（泰山夜爬）', n:'2天1晚', d:'山上的清凉+日出是盛夏的“顶配”，体验一次夜爬看云海。',
        steps:['D1：下午到泰安，晚上夜爬泰山','D1晚：山顶等日出','D2：清晨看日出云海后下山，返程'],
        how:'带头灯薄外套、查好日出时间与天气，人均约400-600元。' },
      { t:'草原消夏 · 三日（坝上）', n:'3天2晚', d:'离青岛较近的消夏草原，骑马露营看星空，盛夏平均20℃。',
        steps:['D1：赴丰宁/木兰围场，下午草原撒欢','D2：骑马、露营、看星空，晚住蒙古包','D3：草原日出后返程'],
        how:'自驾或高铁+当地包车，昼夜温差大务必带外套，人均约800-1200元。' }
    ]
  };

  // ---------- 实时游玩攻略（尽力联网抓其他来源补充，失败不影响内置展示） ----------
  const TRIP_KEYS = ['青岛','崂山','北九水','避暑','玩水','海边','泰山','长白山','草原','坝上','承德','呼伦贝尔','青海','贵州','烟台','威海','日照','避暑胜地','8月','夏季','自驾','亲子','推荐','攻略','行程'];
  function stripHtml(s){
    if(!s) return '';
    const map = { 'amp':'&','lt':'<','gt':'>','quot':'"','apos':"'",'nbsp':' ','mdash':'—','middot':'·' };
    let cur = String(s).replace(/<[^>]*>/g,' ');
    let prev = ''; let guard = 0;
    while (cur !== prev && guard < 4) {
      prev = cur;
      cur = cur
        .replace(/&#x([0-9a-fA-F]{1,6});|&#(\d{1,7});/g, (_,h,d)=>{ try{ return String.fromCodePoint(h?parseInt(h,16):parseInt(d,10)); }catch(e){ return ' '; } })
        .replace(/&([a-zA-Z]+);/g, (m,k)=> map[k]!==undefined?map[k]:m);
      guard++;
    }
    return cur.replace(/\[!--[\s\S]*?--\]/g,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/\s+/g,' ').trim();
  }
  const POS_T = /青岛|崂山|北九水|避暑|玩水|海边|泰山|长白山|草原|坝上|承德|呼伦贝尔|青海|贵州|烟台|威海|日照|夏日|盛夏|8月|夏季|攻略|自驾|亲子|推荐|行程|景点|好玩|大山/;
  const NEG_T = /百科|政务|人民政府|企业|官网|首页|注册|登录|软件下载|游戏|地图|翻译|招投标|新闻中心|视频|电视剧/;
  function parseBingTrips(html){
    const out=[]; const seen=new Set();
    const body = (html||'').replace(/<script[\s\S]*?<\/script>/gi,' ');
    const liRe=/<li\s+class="[^"]*b_algo[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
    let li;
    while((li=liRe.exec(body)) && out.length<10){
      const blk=li[1];
      const a=/<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/i.exec(blk);
      if(!a) continue;
      const link=a[1]; const t=stripHtml(a[2]);
      if(!/^https?:\/\//.test(link) || /bing\.com|baidu\.com/.test(link)) continue;
      if(t.length<8 || t.length>60) continue;
      const cap=/class="b_caption"[^>]*>([\s\S]*?)<\/p>/i.exec(blk) || /class="[^"]*b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/(p|span)>/i.exec(blk);
      const snippet=cap?stripHtml(cap[1]):'';
      const combo=t+' '+snippet;
      if(NEG_T.test(combo) || !POS_T.test(combo)) continue;
      if(seen.has(t)) continue; seen.add(t);
      out.push({ t, link, source:'实时攻略', live:true,
        d:(snippet && snippet.length >= 12 ? '摘要：' + snippet : '网络实时搜到的青岛游玩攻略，点开链接看出发前准备。'),
        how:'点开链接看完整攻略与交通住宿建议；看完摘要即可用，无需强制登录' });
    }
    return out;
  }
  function fetchLiveTrips(){
    return new Promise((resolve)=>{
      const net = window.AndroidNet;
      const done = (v)=>{ resolve(v||[]); };
      if (net && typeof net.get === 'function') {
        window.__netcb = window.__netcb || { _map:{} };
        const urls = [
          'https://www.bing.com/search?q=' + encodeURIComponent('8月 青岛人 避暑 好玩 地方 推荐 省内') + '&setlang=zh-hans',
          'https://www.bing.com/search?q=' + encodeURIComponent('8月 暑假 避暑胜地 推荐 长白山 草原 海边') + '&setlang=zh-hans'
        ];
        const cbs = urls.map(()=> '__t'+Math.floor(Math.random()*1e9)+'_'+Date.now());
        const results = [];
        let pending = cbs.length;
        cbs.forEach((cb,i)=>{
          window.__netcb._map[cb] = (data)=>{ results[i]=data||null; pending--; if(pending<=0) finish(); delete window.__netcb._map[cb]; };
          try{ net.get(urls[i], cb); }catch(e){ pending--; if(pending<=0) finish(); }
        });
        setTimeout(()=>{ if(pending>0) finish(); }, 9000);
        function finish(){
          const items=[]; const seen2=new Set();
          results.forEach(h=>{
            if(!h) return;
            parseBingTrips(h).forEach(x=>{ if(!seen2.has(x.t)){ seen2.add(x.t); items.push(x); } });
          });
          done(items);
        }
        return;
      }
      const base = (YL.API_BASE || '').replace(/\/$/,'');
      fetch(base + '/api/coupons', { signal: AbortSignal.timeout(8000) })
        .then(r=>r.json()).then(j=>done(j && j.items ? j.items : []))
        .catch(()=>done([]));
    });
  }

  // ---------- 渲染 ----------
  // 首卡：直接展示内置的"当季主打"，不带刷新/实时按钮（用户要求去掉）
  function renderRoute(){
    const holder = document.getElementById('couponLive');
    if(!holder) return;
    const d = new Date(); const wd = d.getDay();
    const picks = [];
    // 按星期轮换展示 4 条当季主打（青岛本地 + 省内 + 省外示例）
    const all = SPOTS.core.concat(SPOTS.around, SPOTS.out);
    for (let i = 0; i < 4; i++) { picks.push(all[(wd + i) % all.length]); }
    const html = picks.map((c, i) => {
      const kind = i === 0 ? '当地' : '推荐';
      return `<div class="coupon-card">
        <div class="cc-t">${i === 0 ? '⭐ ' : '📍 '} ${esc(c.t)} <span class="cc-tag">${kind} · ${esc(c.n || '')}</span></div>
        <div class="cc-d">${esc(c.d)}</div>
        ${c.how ? `<div class="cc-how">🔧 ${esc(c.how)}</div>` : ''}
      </div>`;
    }).join('');
    holder.innerHTML = `<div class="coupon-live-head">🏖 今日主打 · 8月避暑好去处</div>` + html;
  }

  function renderCouponCore() {
    const core = document.getElementById('couponToday');
    const around = document.getElementById('couponBank');
    const out = document.getElementById('couponOut');
    const route = document.getElementById('couponShop');
    if (core) core.innerHTML = SPOTS.core.map(c => spotCard(c, 'core')).join('');
    if (around) around.innerHTML = SPOTS.around.map(c => spotCard(c, 'around')).join('');
    if (out) out.innerHTML = SPOTS.out.map(c => spotCard(c, 'out')).join('');
    if (route) route.innerHTML = SPOTS.route.map(c => spotCard(c, 'route')).join('');
  }

  // 总入口：先渲染内置精选为主，再实时补充
  function loadCoupon() {
    renderCouponCore();
    renderRoute();
  }

  YL.loadCoupon = loadCoupon;
  YL.renderCoupon = loadCoupon;
})();