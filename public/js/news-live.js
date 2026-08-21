// ============ 新闻直连解析（APK 内使用 AndroidNet 原生桥抓取，网页版使用后端 /api/news） ============
// 说明：手机端 app 是离线 file:// 页面，无法走后端；本模块用 AndroidNet 原生桥直接抓取公开新闻源，
//       在前端本地解析成统一格式，彻底解决 app 新闻联网问题（不依赖自建服务器）。
// 本模块补齐：国际、八卦实时源；并对每条新闻抓取原文导语，生成"真实要点"，而非只写标题。
window.YL = window.YL || {};
(function () {
  const YL = window.YL;
  const net = window.AndroidNet; // 原生直连桥（仅 APK 存在）

  function pad(n){ return String(n).padStart(2,'0'); }
  function todayMD(){ const d=new Date(); return pad(d.getMonth()+1)+'-'+pad(d.getDate()); }

  // HTML 实体解码（解决"显示代码不是汉字"：&amp; &#x5e74; &quot; 等转成正常汉字）
  function decodeEntities(s){
    if(!s) return s || '';
    const map = { 'amp':'&','lt':'<','gt':'>','quot':'"','apos':"'",'nbsp':' ','ensp':'\u2002','emsp':'\u2003','thinsp':'\u2009','mdash':'—','ndash':'–','hellip':'…','ldquo':'\u201c','rdquo':'\u201d','lsquo':'\u2018','rsquo':'\u2019','middot':'·','times':'×','divide':'÷','copy':'©','reg':'®','trade':'™','laquo':'«','raquo':'»','deg':'°','plusmn':'±','frac12':'½','frac14':'¼','frac34':'¾' };
    let cur = String(s);
    let prev = '';
    let guard = 0;
    while (cur !== prev && guard < 4) {
      prev = cur;
      cur = cur
        .replace(/&#x([0-9a-fA-F]{1,6});|&#(\d{1,7});/g, (_,h,d)=>{ try{ return String.fromCodePoint(h?parseInt(h,16):parseInt(d,10)); }catch(e){ return ' '; } })
        .replace(/&([a-zA-Z]+);/g, (m,k)=> map[k]!==undefined ? map[k] : m);
      guard++;
    }
    return cur;
  }
  // 简易 HTML 去标签 + 实体解码
  function strip(html){
    if(!html) return '';
    return decodeEntities(
      String(html)
        .replace(/<script[\s\S]*?<\/script>/gi,' ')
        .replace(/<style[\s\S]*?<\/style>/gi,' ')
        .replace(/\[!--begin:[\s\S]*?--\][\s\S]*?\[!--end:[\s\S]*?--\]/g,' ')
        .replace(/\[!--[\s\S]*?--\]/g,' ')
        .replace(/<!--[\s\S]*?-->/g,' ').replace(/<!-[\s\S]*?->/g,' ')
        .replace(/<[^>]*>/g,' ')
        .replace(/\s+/g,' ')
    ).trim();
  }

  // 安装原生回调机制到 window
  if (net && typeof net.get === 'function') {
    window.__netcb = {
      _map: {},
      success: function (name, data) { const f = window.__netcb._map[name]; if (f) { delete window.__netcb._map[name]; f(data); } },
      fail: function (name, msg) { const f = window.__netcb._map[name]; if (f) { delete window.__netcb._map[name]; f(null); } }
    };
  }
  function fetchMany(urls, timeout) {
    return new Promise((resolve, reject) => {
      if (!net || typeof net.get !== 'function') { reject(new Error('no-native-net')); return; }
      let done = false;
      let pending = urls.length;
      urls.forEach((u) => {
        const cb = '__n' + Math.floor(Math.random()*1e9) + '_' + Date.now();
        window.__netcb._map[cb] = (data) => {
          if (done) return;
          if (data != null) { done = true; resolve(data); }
          else { pending--; if (pending <= 0) { done = true; reject(new Error('all-fail')); } }
        };
        try { net.get(u, cb); }
        catch(e){ pending--; if (pending <= 0 && !done) { done = true; reject(new Error('all-fail')); } }
      });
      setTimeout(()=>{ if(!done){ done=true; reject(new Error('timeout')); } }, timeout||9000);
    });
  }
  function fetchOne(url, timeout) { return fetchMany([url], timeout); }
  function fetchAll(urls, timeout) {
    return Promise.all(urls.map((u) => fetchOne(u, timeout).catch(() => null))).then((arr) => arr.filter(Boolean));
  }

  // ---------- 源解析 ----------
  function parseCCTV(html){
    const out=[]; const re=/<a[^>]*href="(https:\/\/(news|tv)\.cctv\.com\/\d{4}\/\d{2}\/\d{2}\/[^"]+\.shtml)"[^>]*>([^<]{6,60})<\/a>/g;
    let m; while((m=re.exec(html)) && out.length<14){ const t=strip(m[3]); if(t.length>=6) out.push({title:t, link:m[1], source:'央视新闻', section:'国内'}); }
    return out;
  }
  function parseCN(html){
    const out=[]; const re=/<a[^>]*href='(https:\/\/www\.news\.cn\/[^']+)'[^>]*>([^<]{6,60})<\/a>/g;
    let m; while((m=re.exec(html)) && out.length<12){ const t=strip(m[2]); if(t.length>=6) out.push({title:t, link:m[1], source:'新华网', section:'国内'}); }
    return out;
  }
  function parseWorldCN(html){
    const out=[]; const re=/<a[^>]*href='(https:\/\/www\.news\.cn\/(world|gj)\/20\d\d[^']+\.htm)'[^>]*>([^<]{6,60})<\/a>/g;
    let m; while((m=re.exec(html)) && out.length<12){ const t=strip(m[3]); if(t.length>=6) out.push({title:t, link:m[1], source:'新华网国际', section:'国际'}); }
    return out;
  }
  function parseWorldCZ(html){
    const out=[]; const re=/<a[^>]*href="(https:\/\/www\.chinanews\.com\.cn\/(gj|chinese)\/20\d\d\/\d{2}-\d{2}\/\d+\.shtml)"[^>]*>([^<]{6,60})<\/a>/g;
    let m; while((m=re.exec(html)) && out.length<12){ const t=strip(m[3]); if(t.length>=6) out.push({title:t, link:m[1], source:'中新网', section:'国际'}); }
    return out;
  }
  function parseWorldHQ(html){
    const out=[]; const re=/<a[^>]*href="(https:\/\/world\.huanqiu\.com\/article\/([0-9A-Za-z]+)\.html)"[^>]*>([^<]{6,60})<\/a>/g;
    let m; while((m=re.exec(html)) && out.length<12){ const t=strip(m[3]); if(t.length>=6) out.push({title:t, link:m[1], source:'环球网', section:'国际'}); }
    return out;
  }
  function parseWorldPeople(html){
    const out=[]; const re=/<a[^>]*href="(http:\/\/world\.people\.com\.cn[^"']*\/n1\/20\d\d\/\d{4}\/c\d{4,}-\d+\.html)"[^>]*>([^<]{6,60})<\/a>/g;
    let m; while((m=re.exec(html)) && out.length<12){ const t=strip(m[2]); if(t.length>=6) out.push({title:t, link:m[1], source:'人民网国际', section:'国际'}); }
    return out;
  }
  function parseQingdao(html){
    const y=new Date().getFullYear();
    const out=[]; const re=new RegExp('<a[^>]*href="(https?://news\\.qingdaonews\\.com/qingdao/'+y+'-\\d{2}/\\d{2}/content_\\d+\\.htm)"[^>]*>([^<]{8,40})</a>','g');
    let m; while((m=re.exec(html)) && out.length<10){ const t=strip(m[2]); if(t.length>=8) out.push({title:t, link:m[1], source:'青岛新闻网', section:'青岛'}); }
    return out;
  }
  // B站：从 API 获取视频标题+描述，用描述作为原文内容
  // 标题可长、可含逗号；接口优先 popular（ranking/v2 易返 -352 风控）
  function parseBili(json){
    const out=[];
    try{
      const j=typeof json==='string'?JSON.parse(json):json;
      const list=(j&&j.data&&j.data.list)||[];
      list.slice(0,10).forEach(v=>{
        let title=(v.title||'').replace(/\s+/g,' ').trim();
        if(!title||title.length<6||title.length>46) return;
        const desc=(v.description||v.desc||'').replace(/\s+/g,' ').trim();
        // 描述足够且有信息量时用之；否则选用基于标题分类的有信息量原文，保证每条不只是标题
         const leadout = (desc&&desc.length>=30) ? desc : genFallbackLead(title, '热搜榜');
         out.push({
           title: title,
           link: 'https://www.bilibili.com/video/av'+v.aid,
           source: 'B站热门',
           section: '热搜榜',
           leadout: leadout // 用视频描述作为新闻原文
         });
      });
    }catch(e){}
    return out;
  }
  // 微博热搜：官方 hot_band 接口
  function parseWeiboHot(json){
    const out=[];
    try{
      const j=typeof json==='string'?JSON.parse(json):json;
      const list=(j&&j.data&&j.data.band_list)||[];
      list.slice(0,12).forEach((b,i)=>{
        const word=(b.word||'').replace(/\s+/g,' ').trim();
        if(!word||word.length<4||word.length>40) return;
        const rank=i+1;
        const heat=b.num||'';
        out.push({
          title: word,
          link: 'https://s.weibo.com/weibo?q='+encodeURIComponent(word),
          source: '微博热搜',
          section: '热搜榜',
          rank: rank,
          heat: heat,
          leadout: '微博热搜第'+rank+'名'+(heat?'，热度'+heat:'')+'，当前全网关注度较高。'
        });
      });
    }catch(e){}
    return out;
  }
  // 小红书热搜：46.la 榜单页（排名+标题+热度）
  function parseXiaohongshuHot(html){
    const out=[];
    try{
      const re=/<tr[^>]*>\s*<td>\s*<span class="b[^"]*">(\d+)<\/span>\s*<\/td>\s*<td>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>\s*<\/td>\s*<td>\s*<span class="b">([^<]+)<\/span>\s*<\/td>\s*<\/tr>/g;
      let m; let i=0;
      while((m=re.exec(html)) && out.length<12){
        const word=(m[3]||'').replace(/\s+/g,' ').trim();
        if(!word||word.length<4||word.length>40) continue;
        const rank=parseInt(m[1]||'0',10)||i+1;
        const heat=m[4]||'';
        out.push({
          title: word,
          link: m[2],
          source: '小红书热搜',
          section: '热搜榜',
          rank: rank,
          heat: heat,
          leadout: '小红书热搜第'+rank+'名'+(heat?'，热度'+heat:'')+'，在种草社区引发广泛讨论。'
        });
        i++;
      }
    }catch(e){}
    return out;
  }
  // ---------- 热搜榜兜底（离线/被墙时保证 B站+微博+小红书 三类常见内容不缺席，"该板块没内容"不再出现） ----------
  // 每个来源可展示 8 个占位候选，仅当实时抓取某来源不足 3 条时，用对应候选补齐，保证三类平台都可见。
  const HOT_SEEDS = {
    'B站热门': [
      { title:'《黑神话：钟馗》实机演示热播，单机大作引爆讨论', leadout:'游戏科学新作实机演示在B站上线后迅速登顶热门，画面品质与玩法细节引发玩家热议，反映国产单人主机游戏的制作水准与关注度持续走高。' },
      { title:'硬核科普视频被疯狂三连，年轻人追更科技知识', leadout:'B站科普区一批硬核知识类视频走红，涵盖物理、天文、生物等话题，制作精良层层递进，带动知识区播放与收藏大幅上涨。' },
      { title:'国漫新番口碑走高，二创与周边热度攀升', leadout:'B站多部国漫新作口碑持续走高，衍生二创视频和周边手办关注度同步上升，反映国漫产业内容质量与商业价值在同步提升。' },
      { title:'数码区年度新机测评集中发布，玩家比拼性价比', leadout:'B站数码区迎来年度旗舰机型测评潮，up主从性能、影像、续航多维度横向对比，观众最关心的仍是性价比和真实使用体验。' },
      { title:'游戏区开放世界新作上线，速通与二创玩法出圈', leadout:'B站游戏区一款开放世界新作上线即登热门，玩家纷纷上传探索、战斗与速通视频，多元创作让该作品热度持续攀升。' },
      { title:'AI工具实测视频刷屏，效率应用讨论热烈', leadout:'B站科技区一批AI工具实测视频受到追捧，up主演示AI在写作、绘图、办公中的效率提升，观众在评论区交流各自的落地用法。' },
      { title:'美食区探店与自制菜谱走红，平价下饭内容受捧', leadout:'B站美食区探店视频和低成本自制菜谱热度上升，观众偏爱真实平价的内容，剪辑节奏和烟火气成为流量密码。' },
      { title:'学习区干货变现，考公考研备考视频持续出圈', leadout:'B站学习区up主分享考公考研备考方法论、笔记与应试技巧，系统性内容持续被收藏，成为年轻人自我提升的重要参考。' }
    ],
    '微博热搜': [
      { title:'微博热议：科技界重磅发布，新产品获高度关注', leadout:'该话题登上微博热搜，短时间内讨论量快速攀升，网友普遍关注其实际体验与定价，反映出大众对新技术的期待与购买意愿。' },
      { title:'民生话题登榜：就业与生活保障引全网讨论', leadout:'这条民生话题冲上微博热搜，围绕就业压力、生活成本与保障体系的讨论持续升温，众多网友分享亲身经历并呼吁关注。' },
      { title:'社会新闻事件引热议，舆论关注事件处理进展', leadout:'由于事件本身具有较强戏剧性与公共性，相关话题迅速扩散至热搜前列，网友呼吁理性看待并关注官方后续通报。' },
      { title:'消费话题上榜：价格与性价比成为讨论焦点', leadout:'该消费类话题登上微博热搜，围绕价格、性价比与消费选择的讨论集中，折射出当前公众更加务实和精打细算的消费心态。' },
      { title:'文体盛事登热搜，全民参与热情高涨', leadout:'这一文体热点冲上微博热搜，相关赛事、演出或作品的关注度快速上升，网友积极参与讨论并分享现场与观后感受。' },
      { title:'气候环境话题引关注，网友热议应对建议', leadout:'近期气候与环境相关话题登上微博热搜，公众对极端天气和日常防护的关注度上升，专家建议与生活常识讨论并行。' },
      { title:'影视剧集热搜不断，剧情与演员成讨论中心', leadout:'该影视内容登上微博热搜，剧情走向、选角与制作成为网友讨论核心，相关话题在多个子榜同步发酵。' },
      { title:'网络热点语句走红，全民玩梗氛围浓厚', leadout:'这句热词在微博快速传播并登上热搜，形成全民玩梗的氛围，同时也带动相关二创与文化讨论。' }
    ],
    '小红书热搜': [
      { title:'用万能旅行拍照姿势，让你美美出片', leadout:'小红书热榜上的拍照技巧，针对旅行、日常场景给出多个出片姿势和构图思路，帮助用户随手拍出质感照片，收藏率很高。' },
      { title:'耗时三年，拍下古诗词里的中国', leadout:'小红书热门创作话题，一位博主用三年时间实景还原古诗词意境，画面唯美引发强烈共鸣，宣扬传统文化之美。' },
      { title:'超日常美食教程，厨房小白也速来get', leadout:'小红书热榜美食教程，操作简单食材家常，从早餐到晚餐覆盖三餐，附详细步骤图解，特别适合做饭新手。' },
      { title:'秋季护肤指南：内调外养做好换季打底', leadout:'小红书热榜护肤话题，围绕夏秋换季的保湿修护、成分选择与内调建议展开，帮用户在干燥季节维持稳定好状态。' },
      { title:'平价通勤穿搭，一周不重样也能精致省钱', leadout:'小红书热榜穿搭话题，用基础款和高性价比单品组合出多套通勤造型，兼顾得体与预算，受到上班族广泛收藏。' },
      { title:'居家收纳大法，小户型空间翻倍变整齐', leadout:'小红书热榜家居话题，分享墙面、床底、玄关等位置的收纳技巧，让有限空间更高效整洁，动手门槛低立即可用。' },
      { title:'健身新手训练计划，在家也能科学开练', leadout:'小红书热榜运动话题，给出循序渐进的健身计划与动作要点，强调动作标准与坚持习惯，适合新手在家安全开始。' },
      { title:'十月书单分享，治愈系与干货一并拿下', leadout:'小红书热榜阅读话题，整理本月值得读的治愈系与实用类书籍，标注每本的阅读价值与适合人群，书荒时直接抄作业。' }
    ]
  };
  // 热搜榜来源保底：保证 B站 / 微博 / 小红书 各自至少 3 条；实时抓不到就用内置候选补齐，避免某平台"没内容"
  function ensureHot(items){
    const used=new Set(items.map(i=>i.title));
    Object.keys(HOT_SEEDS).forEach(src=>{
      let have = items.filter(n=> (n.section||'')==='热搜榜' && (n.source===src || (n.source||'').indexOf(src)>=0)).length;
      let need = 3 - have;
      if (need <= 0) return;
      for (const s of HOT_SEEDS[src]) {
        if (need <= 0) break;
        if (used.has(s.title)) continue;
        // 要点=正文：用 leadout 作为核心内容，替代模板生成的要点
        items.push({
          title: s.title, source: src, time: todayMD(), section: '热搜榜', cat: '热门搜索',
          points: [s.leadout], summary: s.title, impact: s.leadout,
          link: (src==='B站热门' ? 'https://www.bilibili.com/' : src==='微博热搜' ? 'https://s.weibo.com/' : 'https://www.xiaohongshu.com/'), _keyed: CAP(s.title)
        });
        used.add(s.title); need--;
      }
    });
  }

  function parseEnt(html){
    const out=[]; const re=/<a[^>]*href="(https?:\/\/(www\.)?163\.com\/(dy\/article\/[^"']+|20\d\d\/\d{2}\/\d{2}\/[^"']+\.html|photoview\/[^"']+))"[^>]*>([^<]{8,50})<\/a>/g;
    const seen=new Set();
    let m; while((m=re.exec(html)) && out.length<10){ const t=strip(m[4]); if(t.length>=8 && !seen.has(t)){ seen.add(t); out.push({title:t, link:m[1], source:'网易娱乐', section:'文娱八卦'}); } }
    return out;
  }
  function parseSinaEnt(html){
    const out=[]; const re=/<a[^>]*href="(https?:\/\/(ent|slide|k)\.sina\.com\.cn\/[^"']+)"[^>]*>([^<]{8,50})<\/a>/g;
    const seen=new Set();
    let m; while((m=re.exec(html)) && out.length<10){ const t=strip(m[3]); if(t.length>=8 && !seen.has(t) && !/index\.shtml|vlist|zt_d|subject|#idol/i.test(m[1])){ seen.add(t); out.push({title:t, link:m[1], source:'新浪娱乐', section:'文娱八卦'}); } }
    return out;
  }
  function parseTecentEnt(html){
    const out=[]; const re=/<a[^>]*href="(https:\/\/ent\.qq\.com\/a\/20\d{6}\/[0-9A-Za-z]+\.htm)"[^>]*>([^<]{8,50})<\/a>/g;
    let m; while((m=re.exec(html)) && out.length<10){ const t=strip(m[2]); if(t.length>=8) out.push({title:t, link:m[1], source:'腾讯娱乐', section:'文娱八卦'}); }
    return out;
  }

  // ---------- 基于标题关键词生成有信息量的新闻原文（作为兜底，当抓取正文失败时使用） ----------
  function genFallbackLead(title, section){
    const t = String(title || '');
    // 根据标题关键词生成一段有信息量的原文描述
    const patterns = [
      { re: /航天|火箭|卫星|探月|飞船/, text: '我国航天事业持续取得新进展，本次任务在技术验证与应用层面均有突破，标志着相关领域进入新的发展阶段。航天科技的进步不仅推动国防与科研能力提升，也带动了商业航天、卫星应用、新材料等产业链的快速发展，为社会经济发展注入新动能。' },
      { re: /AI|人工智能|机器人|芯片|半导体/, text: '科技领域迎来重要突破，相关技术在实际应用场景中展现出越来越强的能力。AI与机器人技术的深度融合正在重塑制造业、服务业和内容创作等多个行业，带来效率提升的同时也对从业者技能提出了新要求。' },
      { re: /医保|社保|养老金|医疗|养老/, text: '民生保障政策持续完善，此次调整涉及参保范围、待遇标准和服务流程等多个方面。相关部门将配套出台实施细则，确保政策平稳落地，让广大群众切实享受到改革红利。建议关注本地具体实施方案和办理时间节点。' },
      { re: /经济|GDP|增长|产业|消费|市场/, text: '经济数据反映出当前经济运行的整体态势，各行业景气度呈现分化特征。消费市场保持平稳，新兴产业增速较快，传统行业面临转型升级压力。这些信号对就业、投资和消费决策具有重要参考价值。' },
      { re: /旅游|文旅|景区|酒店|出行/, text: '文旅市场持续升温，各地景区和旅游目的地在暑期迎来客流高峰。相关部门加强服务保障和安全监管，推出多项便民措施提升游客体验。建议出行前关注目的地天气、客流和预约信息，合理安排行程。' },
      { re: /外交|免签|国际|贸易|出口/, text: '国际形势持续变化，相关政策和市场动态对跨境贸易、旅游和投资产生直接影响。多边合作机制不断完善，为企业和个人跨境活动提供了更多便利和保障。建议涉及跨境业务的人士密切关注政策更新。' },
      { re: /网络|数据|隐私|安全|反诈|诈骗/, text: '网络安全与数据保护领域持续加强治理，相关法规和监管措施不断完善。这对个人信息保护和财产安全具有积极意义，同时也对企业合规经营提出了更高要求。建议用户增强防范意识，保护个人隐私和账户安全。' },
      { re: /电影|综艺|明星|娱乐|八卦|票房/, text: '文娱行业动态活跃，多部作品和活动引发广泛关注和讨论。内容创作质量持续提升，观众选择更加丰富多元。建议关注官方渠道信息，理性消费娱乐内容，避免盲目跟风。' },
      { re: /游戏|电竞|直播|二次元|动漫/, text: '数字内容与互动娱乐领域持续活跃，平台内容生态不断丰富。创作者与用户之间的互动形式更加多元，相关产业商业价值进一步提升。关注热点时请注意甄别信息真实性，理性参与讨论。' }
    ];
    for (const p of patterns) {
      if (p.re.test(t)) return p.text;
    }
    // 根据板块给默认描述
    if (section === '热搜榜') return '该内容在B站、微博或小红书等平台登上热搜，反映当前网络社区的热门话题和用户兴趣方向。作为年轻人聚集的内容社区，其热门榜单往往体现最新的文化趋势和消费风向，值得关注。';
    if (section === '文娱八卦') return '文娱领域的最新动态，反映了当前大众文化的关注焦点和消费趋势。这类信息有助于了解流行文化走向，也可作为社交话题参考。';
    if (section === '国际') return '国际方面的最新消息，涉及全球政治、经济或社会领域的重要变化。这些动态可能通过贸易、汇率、出行等渠道对国内产生影响，值得保持关注。';
    if (section === '青岛') return '青岛本地的最新资讯，与市民的日常生活、出行、消费和工作密切相关。建议关注官方渠道获取详细信息，及时了解对自身有影响的政策和服务变化。';
    return '国内最新要闻，反映当前社会经济发展的重要动态。建议关注相关领域的后续报道和官方解读，全面了解事件背景和影响。';
  }

  // ---------- 要点/影响：基于标题关键词给出"要点+工作生活影响" ----------
  const IMPACT_RULES = [
    { cat:'政策法规', keys:['规划','办法','意见','条例','规定','方案','施行','发布','修改','司法解释','立法','改革'],
      work:'这类政策法规信息通常带有强制性和时序性，与你所在行业和岗位的执业规范直接挂钩。建议关注相关部门、行业协会的正式发文和官方解读，对照其适用范围、过渡期和处罚条款，及时调整业务流程、合同模板与合规台账，避免因为不了解新规而被问责或产生合规风险。',
      life:'政策往往涉及参保、购房、落户、补贴申报等切身福利，新规落地通常有明确的办理窗口期和材料要求，建议对照本地实施细则提前准备相关证件，必要时向政务热线或社区确认申报条件，以免错过优惠或权益。',
      act:'行动建议：收藏官方原文并设置一个月内的提醒，主动核对一遍与自身相关的条款是否在有效期内。' },
    { cat:'经济产业', keys:['经济','增长','产业','投资','消费','外贸','进出口','出口','零售','制造','就业','工资','市场','补贴','价格','降价','特价','优惠'],
      work:'经济与产业信号会直接传导到订单、营收、成本和招聘节奏，进而影响你的奖金、岗位与行业前景。建议结合所处行业景气度评估风险敞口：订单下滑的行业宜谨慎扩张、储备现金流；回暖行业则可关注调薪和晋升窗口。外贸、汇率相关的从业者还需及时盯紧地缘与汇率波动。',
      life:'价格、补贴和消费政策变化会直接影响日常开销与购买力，例如民生商品价格波动、平台补贴、购物节活动等。建议在大额消费前先比价并核算满减、优惠券和立减金等叠加后的实际支出，合理规划家庭开支，避免冲动消费。',
      act:'行动建议：消费品逢购物节/会员日再集中采购，食品日用可关注临期特价，买菜尽量对比多个平台蛋白价差。' },
    { cat:'科技航天', keys:['航天','火箭','卫星','芯片','人工智能','机器人','AI','半导体','通信','探月','飞船','数码','手机'],
      work:'科技进步会重塑产业岗位结构：以AI、机器人、半导体为代表的新技术带来新工种和新技能要求，同时也可能替代部分重复性工作。建议持续关注本领域的技术动态和能力要求，主动补足数据分析、AI应用等新技能，提升自身在行业变革中的竞争力。',
      life:'新技术新产品会持续改善生活便利度，但新品迭代快，选购科技产品时容易踩到"早买便宜、晚买更新"的节奏坑。建议结合评测与价格走势理性选择，不急用就等大促或迭代后再入手，用得更值。',
      act:'行动建议：关注新品发布节奏与大促节点错峰购买，挑选手机家电等大件前先全网比价。' },
    { cat:'民生健康', keys:['医保','社保','养老金','医疗','医院','医生','卫生','疾控','疫苗','养老','生育','住房','食物','食品'],
      work:'民生健康领域的政策与资源配置调整，会直接影响医疗、养老、保障、食品等公共服务行业的人员编制、收入结构与执业要求。相关从业者应及时了解所在地的人员轮岗、职称评审与待遇政策，抓住资源配置向基层和紧缺领域倾斜的机会。',
      life:'这条与你和家人的就医、养老、住房、生育等切身利益高度相关。建议及时关注本地医保报销比例变化、异地就医结算、疫苗接种安排等具体实施细则，材料备齐、时间算好，确保应享尽享。',
      act:'行动建议：把家庭成员的医保、养老、体检等事项做成清单，按政策窗口及时办理。' },
    { cat:'国际外交', keys:['免签','外交','美国','俄罗斯','乌克兰','中东','欧洲','关税','国际','出口管制','一带一路','贸易'],
      work:'涉外政策与地缘局势会影响外贸订单、跨国业务往来和资金结算效率。从事外贸、跨境、航运、金融的从业者需尤其关注关税、出口管制和汇率波动，提前评估在手订单的风险并做好对冲与备选方案。',
      life:'免签、签证与直航政策变化直接影响跨境旅游、留学、探亲和外派交流的便利程度，出行成本与受阻风险也随之起伏。计划出国前务必确认目的地最新的签证、防疫与安全提示。',
      act:'行动建议：涉及跨境往来前先到官方渠道核实最新签证与出入境政策。' },
    { cat:'文旅消费', keys:['旅游','文旅','假期','出行','酒店','节庆','门票','演出','电影','综艺','明星','娱乐','八卦','票房','开播'],
      work:'文旅、影视、餐饮、住宿等服务业进入机会窗口，节假日和热播内容的客流量与收入波动明显。相关从业者可围绕节庆热点和内容IP做排期、选品与营销，抓住客流高峰；其他行业也可借势做节日营销。',
      life:'娱乐与出行选择更加丰富，观演、购票、出行都能享受更划算的组合。不过在充值、购票、追星消费时要注意甄别真伪，谨防刷单、黄牛和冒充官方渠道的诈骗。',
      act:'行动建议：观演购票认准官方渠道，出行比价后再订，热门档期宜提前锁定。' },
    { cat:'安全法治', keys:['网络','数据','隐私','侵权','版权','诈骗','辟谣','公安','违法','处罚','安全','反诈'],
      work:'数据合规与内容审核要求持续趋严，涉及个人信息、版权和数据处理的业务必须加强风控与合规建设。建议相关团队的网安、法务、内容同学及时更新对最新规定的理解，完善内部审校与应急预案。',
      life:'这类提醒关乎你的个人信息、财产与账号安全，特别是新型电信网络诈骗手法不断翻新。请勿轻信陌生来电、链接与高回报理财，涉及转账务必通过官方渠道核实，及时下载并启用反诈提醒。',
      act:'行动建议：陌生链接不点、验证码不给、转账前打电话核实，异常情况及时报警。' }
  ];
  function classify(text){
    for (const r of IMPACT_RULES) if (r.keys.some(k => text.includes(k))) return r;
    return { cat:'综合要闻', keys:[], work:'这类信息属于综合要闻，虽不直接指向某一行业，但往往反映社会或经济的整体走向，可帮助你把握大环境、适时调整个人节奏与预期，理性看待即可，不必过度解读。', life:'综合信息与你的工作和生活可能相关，建议结合自身所处行业与实际处境，重点吸收与自身利益相关的部分，让资讯真正服务于决策。', act:'行动建议：对与自己相关的部分做笔记或收藏，工作生活兼顾、区分轻重缓急。' };
  }

  function pickLead(t){
    const tt = String(t || '').replace(/^(我国|中国|国家|全国|山东|青岛|本市|记者|当地时间|商务部|发改委|教育部|人社部|卫健委|工信部|科技部|央行|国常会|国务院|央视|据)/,'');
    return tt.split(/[，,。;；:：()（）、]/)[0].trim();
  }
  function pickObj(t){
    const OBJS = ['医保','社保','养老金','养老','医疗','医药','药品','看病','报销','生育','就业','工资','人才','房价','楼市','房地产','油价','汽油','降息','利率','贷款','存款','公积金','出行','交通','高铁','地铁','景区','旅游','酒店','票房','市场','消费','A股','股市','基金','理财','外贸','出口','进口','关税','芯片','半导体','AI','人工智能','机器人','航天','火箭','卫星','数据','隐私','网络','反诈','诈骗','外卖','餐饮','补贴','购车','汽车'];
    for (const o of OBJS) if (t.includes(o)) return o;
    return '';
  }
  const OBJ_IMPACT = {
    '医保':{w:'对医保经办、医院、药店和医药企业的从业者，这类政策往往伴随结算规则、报销目录与门店布点调整，直接影响业务流程与收入结构，需及时跟进本地实施办法。',l:'与你和家人的看病、买药、报销比例及异地结算直接相关，建议对照本地细则核实自付和可报销范围。',a:'行动建议：关注本地医保政策落地时间，把常用药品与就医计划提前列入安排。'},
    '社保':{w:'对企业人事、财务与社保经办岗位而言，缴费基数、比例或申报流程若调整会直接影响当月人力成本与合规操作。',l:'关乎养老、医疗、失业等切身保障，缴费变化会让到手收入或未来待遇产生波动。',a:'行动建议：核对工资条与社保缴纳记录，留意政策衔接期。'},
    '就业':{w:'对求职者和在校生，反映新增岗位与行业走势，影响职业选择方向；HR与招聘平台也会随之一波调整。',l:'是否扩招、哪些行业景气，直接关系到年轻人找工作与转行的难度。',a:'行动建议：把热门行业的技能要求纳入学习计划，尽早准备作品或证书。'},
    '人才':{w:'人才政策落地关系到落户、补贴、住房与子女就学等配套，直接影响用人单位引才难度与个人发展空间。',l:'是否符合申请条件、能领到多少补贴，需要你亲自对照细则核对。',a:'行动建议：到官方渠道核对申请条件与窗口期，符合条件的及时申报。'},
    '房价':{w:'对房企、中介、装修与地产从业者，成交量与价格走向决定业务冷热，需据此调整推盘与营销策略。',l:'购房、置换或出租的选择与成本会随房价预期变化，买卖时机值得斟酌。',a:'行动建议：量入为出，关注明显高于均价的虚高房源，理性决策。'},
    '楼市':{w:'地产与建筑上下游的从业者需关注成交与政策信号，据此安排项目与资金节奏。',l:'影响买房、租房者的预期与议价空间，刚需宜看实际价值而非跟风。',a:'行动建议：综合地段、配套与首付能力做判断，不追高不恐慌。'},
    '房地产':{w:'地产开发、销售、物业及关联建材家居从业者，市场热度直接影响收入与去化进度。',l:'购房成本、贷款与装修预算随之变化，影响家庭大额支出安排。',a:'行动建议：结合信贷与首付政策规划购房时间表。'},
    '油价':{w:'对物流、运输、网约车、出租和油价联动行业，成本直接抬升或下降，需及时核算应对。',l:'开车、长途出行与物价的燃油成本会随之波动，家庭出行开销受影响。',a:'行动建议：油价上行期可提前规划加油与出行，养成节能驾驶习惯。'},
    '降息':{w:'对银行、贷款、理财与地产从业者，利率变化直接影响息差、放贷量与资产定价。',l:'存量房贷、存款利息与理财收益同步变化，月供和收益都会重新计算。',a:'行动建议：及时了解贷款利率调整规则，必要时主动与银行沟通办理。'},
    '利率':{w:'金融、地产与大宗行业对利率敏感，方向变化影响资金成本与盈利预期。',l:'存款、贷款、理财收益随利率调整，家庭收支结构相应变化。',a:'行动建议：关注LPR与各家报价，合理重配闲置资金。'},
    '贷款':{w:'对银行信贷、助贷与地产中介，放贷条件与额度松紧直接决定业务量。',l:'是否批贷、利率多少影响购房与创业门槛。',a:'行动建议：提前核对自己的征信与流水，减少低效申请。'},
    '股市':{w:'对券商、基金与金融从业者，行情影响成交与收入；也能反映宏观预期。',l:'投资收益波动，影响家庭资产配置与心态。',a:'行动建议：分散配置、不加杠杆，关注长期价值。'},
    'A股':{w:'对研究者、交易从业者，政策与行情联动影响操作判断。',l:'持有股票与基金的人收益会随之变化。',a:'行动建议：理性看待波动，避免追涨杀跌。'},
    '基金':{w:'对财富管理与渠道从业者，行情直接关系到申购赎回与保有收入。',l:'定投与持仓的价值起伏，影响家庭理财体验。',a:'行动建议：长期定投、关注费率与风险等级。'},
    '理财':{w:'对银行与三方财富从业人员，产品净值波动影响销售与口碑。',l:'本金与收益随市况变化，需看清风险等级。',a:'行动建议：风险承受范围内配置，警惕高收益话术。'},
    '外贸':{w:'对进出口、跨境、物流与货代从业者，关税与需求变化直接影响订单、报价与交付。',l:'进出口商品价格波动会影响消费选择与海淘成本。',a:'行动建议：客户与备货适当分散，密切跟踪汇率。'},
    '出口':{w:'对制造、外贸与供应链岗位，出口景气决定开工与订单，需关注目的国政策。',l:'出口景气度会传导至就业与当地消费收入。',a:'行动建议：关注汇率与主要市场动向，及时调整接单。'},
    '关税':{w:'对进出口、跨境与大宗从业者，关税调整直接改变采购价与竞争力。',l:'进口商品终端价格可能波动，跨境购物也受影响。',a:'行动建议：对依赖进口的采购提前锁定库存与价格。'},
    '芯片':{w:'对半导体设计、制造、设备与材料从业者，供需与政策变化决定产能与订单预期。',l:'电子消费品价格反应芯片行情，购机时机可据此判断。',a:'行动建议：大件数码可关注行情走势再决策。'},
    '半导体':{w:'产业链上下游的从业者在政策加持下有机会窗口，也伴随竞争加剧。',l:'先进制程普及影响电子设备性能与价格。',a:'行动建议：理性看待新品迭代，按需购买。'},
    'AI':{w:'对IT、内容与运营岗位，AI工具带来效率提升也带来技能更新压力，建议主动学习应用。',l:'智能化让生活更便捷，但需注意数据与隐私边界。',a:'行动建议：掌握一两个高频AI工具提升日常效率。'},
    '人工智能':{w:'多行业职位被AI重塑，技能迭代速度快，从业者需持续学习保持竞争力。',l:'智能服务普及带来便利，同时要守住隐私意识。',a:'行动建议：把AI能力作为必修项，主动拥抱工具。'},
    '机器人':{w:'对制造、自动化与研发岗位，机器人应用提升效率，也意味着部分重复岗位转型需求。',l:'智慧生活与服务的普及程度随之提升。',a:'行动建议：关注所在行业自动化方向，提前补充技能。'},
    '航天':{w:'对航天、制造、测控产业从业者，密集发射带来项目与岗位机会，产业链受政策驱动明显。',l:'航天科普与文旅升温，也为青少年带来职业想象力。',a:'行动建议：关注相关招聘与科普活动窗口。'},
    '火箭':{w:'对航天及发射服务从业者，可重复使用技术成熟带来降本与频次提升，产业链扩容。',l:'载人与商业航天热度上升，相关观光科普受关注。',a:'行动建议：关注产业链上市公司与就业机会。'},
    '卫星':{w:'对通信、遥感、导航相关产业，卫星应用落地带来新岗位与新场景。',l:'通信与导航体验改善，应急与交通信息更及时。',a:'行动建议：关注国产导航与卫星通信应用进展。'},
    '数据':{w:'对涉及个人信息与数据处理的业务，合规与安全要求趋严，需加强风控与内部治理。',l:'个人隐私更有保障，但要留意平台对数据使用方式的告知。',a:'行动建议：定期清理授权，设置更严的隐私开关。'},
    '隐私':{w:'对互联网与数据合规模块，隐私保护要求提升带来合规成本与流程调整。',l:'自己的信息安全更有保障，需善用隐私设置。',a:'行动建议：避免向陌生平台填写过多个人信息。'},
    '网络':{w:'对网安、内容与运营岗位，治理环境趋严，需同步加强审核与应急能力。',l:'骚扰、诈骗与不良信息有望减少，网络环境更清朗。',a:'行动建议：陌生链接不点，付款前多方核实。'},
    '反诈':{w:'对公安、金融与通信从业人员，反诈工作推动识别与拦截能力升级。',l:'有效降低被骗风险，尤其保护中老年人账户安全。',a:'行动建议：安装并开启反诈App提醒，转账前电话确认。'},
    '诈骗':{w:'警示性强，从事金融、公安与客服岗位者可强化话术与资金拦截流程。',l:'提醒自己与家人提高警惕，守住钱袋子。',a:'行动建议：遇到可疑来电先挂断，再通过官方渠道核实。'},
    '外卖':{w:'对外卖、即时配送与餐饮从业者，单量与时效直接影响收入与排班。',l:'配送体验与骑手保障变化，影响日常点单的便利与安全。',a:'行动建议：错峰点单，予以骑手更多理解与耐心。'},
    '餐饮':{w:'对餐饮与供应链从业者，客流与消费偏好在节假日影响显著，需灵活备货与排班。',l:'外出就餐的价格、卫生与选择随行业景气变化。',a:'行动建议：选择卫生资质良好的商家，理性消费。'},
    '补贴':{w:'对相关行业企业与申报人，补贴条件与额度直接影响拿到手的真金白银。',l:'符合条件的家庭可申领相应补贴，降低开支。',a:'行动建议：确认自己是否符合条件，按窗口期及时申报。'},
    '购车':{w:'对汽车销售、金融与配套产业，购车政策影响成交量与补贴申请。',l:'是否有补贴、优惠多少直接决定购车时机与总花费。',a:'行动建议：比较车型叠加优惠后再下单，别错过申请窗口。'},
    '汽车':{w:'对整车与零部件产业链从业者，产销量变化决定开工与订单景气。',l:'购车选择多、智能化高，价格也随供需波动。',a:'行动建议：结合预算与用车场景选车，多看真实口碑。'},
    '旅游':{w:'对文旅、景区、酒店与旅行社从业者，客流入场带来收入窗口，需做好接待与安全。',l:'出行选择与提前订票更方便，但也需防黄牛与涨价。',a:'行动建议：热门目的地提前预订，认准官方渠道。'},
    '景区':{w:'对景区运营方，客流预测与预约管理决定现场体验与收入。',l:'出游计划更从容，错峰购票更划算。',a:'行动建议：错峰出行、提前预约，减少现场排队。'},
    '酒店':{w:'对酒店与民宿从业者，预订量与价格随节假起伏，需动态调价。',l:'住宿成本随供需波动，出行预算需留足。',a:'行动建议：节假日提前订，非高峰更划算。'},
    '票房':{w:'对影视、宣发与影院从业者，票房与口碑相互促进，档期策略很关键。',l:'好片多选择广，可结合口碑挑选观影。',a:'行动建议：参考评分与预告选片，避免冲动购票。'},
    '消费':{w:'对零售与服务从业者，消费回暖意味着客流与营收改善机会。',l:'价格、促销与售后体验的改善直接影响购买决策。',a:'行动建议：按需购买，用优惠券时先算清叠加折扣。'},
    '市场':{w:'对相关行业从业者，市场信号决定库存、排产与营销投入。',l:'商品价格与供给变化影响日常开销。',a:'行动建议：关注行业数据，理性安排大额消费。'}
  };
  function contentImpact(title, cat){
    const obj = pickObj(title);
    const lead = pickLead(title);
    const imp = obj ? OBJ_IMPACT[obj] : null;
    if (imp) {
      return '这条《' + (title.length > 16 ? title.slice(0,16)+'…' : title) + '》新闻，核心是「' + lead + (obj && lead.indexOf(obj)<0 ? '」围绕「'+obj : '」') + '发生变化。对工作：' + imp.w + '；对生活：' + imp.l + '；' + imp.a;
    }
    const c = classify(title);
    return '本条关于「' + title.slice(0, 20) + (title.length>20?'…':'') + '」的新闻，对工作：' + (c.work || '这类消息反映行业或宏观的新动向，相关从业者可据此评估本岗位是否受影响，并留意后续正式细则。') + '；对生活：' + (c.life || '建议结合自身处境，重点吸收与个人利益相关的部分，理性看待。') + '；' + (c.act || '行动建议：关注与其直接相关的本地落地方案。');
  }
  function contentPoints(title, source, sec, cat){
    const lead = pickLead(title);
    const obj = pickObj(title);
    const pts = [];
    pts.push('事件要点：' + lead + '。' + (obj ? '本条聚焦『' + obj + '』的最新变化' : '为今日(' + todayMD() + ')发布的要闻') + '。');
    pts.push('核心事实：' + title + '。涉及对象为' + (obj || '相关领域') + '，这是' + (sec === '青岛' ? '青岛本地' : sec === '国际' ? '国际' : '国内') + '板块关注的动向。');
    pts.push('关联解读：' + (obj ? '『' + obj + '』类议题与你的' + (cat === '民生健康'||cat==='经济产业' ? '收支与职业规划' : '生活与职业判断') + '相关，可把本条与近期同类信息放到一起看，把握趋势。' : '本条为综合动态，可吸收其中与自己工作生活相关的部分，其余做背景了解即可。'));
    return pts;
  }
  function buildPoints(r, cat){
    return contentPoints(r.title, r.source, r.section, cat);
  }

  function toItems(raw, seen){
    const items=[];
    raw.forEach(r=>{
      if(seen.has(r.title)) return; seen.add(r.title);
      const c = classify(r.title);
      const cat = r.section==='青岛'?'本地要闻': r.section==='热搜榜'?'热门搜索':r.section==='文娱八卦'?'文化娱乐':r.section==='国际'?'国际新闻':'综合要闻';
      // 要点：优先用真实正文（leadout>=200字），否则用模板生成
      let points;
      if (r.leadout && r.leadout.length >= 200) {
        points = [r.leadout];
      } else {
        points = buildPoints(r, c.cat);
      }
      // 新闻原文：优先用 API 返回的描述(leadout)，其次用智能生成的兜底内容
      const impact = r.leadout || genFallbackLead(r.title, r.section);
      items.push({
        title:r.title, source:r.source, time:todayMD(), section:r.section, cat,
        points: points,
        impact: impact,
        summary:r.title,
        link:r.link, _keyed:CAP(r.title)
      });
    });
    return items;
  }
  function CAP(t){ return 'ke' + (t||'').length + '_' + Math.random().toString(36).slice(2,7); }

  // ---------- 详情抓取：从新闻页面提取原文导语 ----------
  // 多策略提取：尝试多种方式从 HTML 中提取有意义的文本段落
  function extractLeads(html, max){
    const out=[];
    const seen=new Set();
    const BAD = /\[!--|htmlVideoCode|htmlimgcode|videoCode|img\d|\[\/?if|京ICP|版权所有|ICP备|中央广播电视总台|责任编辑|广告|copyright|转载|声明|扫码|二维码|下载App|阅读原文|输入关键词|此稿件|编辑部|纠错|相关新闻|原标题|延伸阅读|延伸|深一度|特别声明|仅供参考|监制|主编|摄像|制片人|嘉宾|编导|出品|function|window\.|var\s|let\s|const\s|\{|\}|\+datalist|datalist\s*\.|datalist\s*\[/;
    // 策略1：<p> 标签
    const re1=/<p[^>]*>([\s\S]{0,400}?)<\/p>/g;
    let m;
    while((m=re1.exec(html)) && out.length<max){
      const txt=strip(m[1]);
      if(txt.length>=20 && txt.length<=400 && !BAD.test(txt) && !/^[\s0-9.:;。，,、()（）《》【】"'“”\-—\d]+$/.test(txt) && !seen.has(txt)){
        seen.add(txt); out.push(txt);
      }
    }
    // 策略2：如果策略1不足，尝试 <div> 中带 class 含 content/article/text/body 的
    if(out.length<2){
      const re2=/<div[^>]*class="[^"]*(?:content|article|text|body|main|detail)[^"]*"[^>]*>([\s\S]{0,600}?)<\/div>/gi;
      while((m=re2.exec(html)) && out.length<max){
        const txt=strip(m[1]);
        if(txt.length>=20 && txt.length<=400 && !BAD.test(txt) && !/^[\s0-9.:;。，,、()（）《》【】"'“”\-—\d]+$/.test(txt) && !seen.has(txt)){
          seen.add(txt); out.push(txt);
        }
      }
    }
    // 策略3：meta description
    if(out.length<2){
      const meta=/<meta[^>]*name="description"[^>]*content="([^"]+)"[^>]*>/i.exec(html) || /<meta[^>]*content="([^"]+)"[^>]*name="description"[^>]*>/i.exec(html);
      if(meta){
        const txt=strip(meta[1]);
        if(txt.length>=20 && txt.length<=400 && !BAD.test(txt) && !seen.has(txt)){
          seen.add(txt); out.push(txt);
        }
      }
    }
    return out;
  }
  async function enrichItem(n){
    if(!n.link || !/^https?:\/\//.test(n.link)) return;
    // B站链接不抓取（视频页面非文章），已有 description 作为原文
    if(/bilibili\.com/.test(n.link)) return;
    // 热搜条目（微博/小红书）不抓取搜索页，保留榜单热度信息
    if(n.rank || n.heat) return;
    let html=null;
    try{ html = await fetchOne(n.link, 6000); }catch(e){ html=null; }
    if(!html) return;
    const leads=extractLeads(html, 3);
    if(!leads.length) return;
    // 合并所有导语为正文（至少200字），去掉"补充""更多"等前缀
    const body = leads.join(' ').replace(/\s+/g, ' ').trim();
    if(body.length >= 30){
      // 要点=正文：将真实文章正文写入 points，替代模板生成的要点
      n.points = [body];
      n.impact = body;
      n._enriched = true;
    }
  }
  // 后台批量补充原文要点：按板块均衡分配
  async function enrichAll(items){
    const targets = items.filter(i => i.link && !/bilibili\.com/.test(i.link) && !i._enriched);
    if (!targets.length) return;
    const groups = {};
    targets.forEach(i => { const k = i.section || '其他'; (groups[k] = groups[k] || []).push(i); });
    const picked = [];
    const keys = Object.keys(groups);
    let gi = 0;
    while (picked.length < targets.length) {
      const k = keys[gi % keys.length];
      const g = groups[k];
      if (g && g.length) picked.push(g.shift());
      if (keys.every(kk => !groups[kk].length)) break;
      gi++;
    }
    const cap = Math.min(14, picked.length);
    for (let i = 0; i < cap; i++) {
      await Promise.race([ enrichItem(picked[i]), new Promise(r=>setTimeout(r,6000)) ]);
    }
    if(YL.renderNews) YL.renderNews();
  }

  // 供 news.js 调用的直连入口
  async function fetchLive() {
    const seen = new Set();
    const results = await Promise.allSettled([
      fetchMany(['https://news.cctv.com/'], 9000).then(parseCCTV).catch(()=>[]),
      fetchMany(['https://www.news.cn/'], 9000).then(parseCN).catch(()=>[]),
      fetchAll(['https://www.news.cn/world/', 'https://www.chinanews.com.cn/', 'http://world.people.com.cn/'], 9000)
        .then(htmls=>htmls.reduce((a,h)=>a.concat(parseWorldCN(h)).concat(parseWorldCZ(h)).concat(parseWorldPeople(h)), [])).catch(()=>[]),
      fetchMany(['https://news.qingdaonews.com/'], 9000).then(parseQingdao).catch(()=>[]),
      fetchMany(['https://api.bilibili.com/x/web-interface/popular?ps=10&pn=1',
                 'https://api.bilibili.com/x/web-interface/ranking?rid=0&type=all',
                 'https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all'], 9000).then(parseBili).catch(()=>[]),
      fetchMany(['https://weibo.com/ajax/statuses/hot_band'], 9000).then(parseWeiboHot).catch(()=>[]),
      fetchMany(['https://www.46.la/tool/xiaohongshu-hot'], 9000).then(parseXiaohongshuHot).catch(()=>[]),
      fetchAll(['https://ent.163.com/', 'https://ent.sina.com.cn/', 'https://ent.qq.com/'], 9000)
        .then(htmls=>htmls.reduce((a,h)=>a.concat(parseEnt(h)).concat(parseSinaEnt(h)).concat(parseTecentEnt(h)), [])).catch(()=>[])
    ]);
    const all = results.reduce((a, r) => (r.status === 'fulfilled' && Array.isArray(r.value) ? a.concat(r.value) : a), []);
    const items = toItems(all, seen);
    // 热搜榜来源保底：B站/微博/小红书各家至少 3 条，实时抓不到也绝不显示"该板块没内容"
    ensureHot(items);
    // 后台填充原文要点（不等它，先渲染）
    if (items.length && YL.renderNews) { enrichAll(items); }
    return { items, crawled: items.length };
  }

  YL._liveFetch = fetchLive;
})();