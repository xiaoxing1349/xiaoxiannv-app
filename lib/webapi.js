// ============================================================================
// lib/webapi.js — Express 无关的实时接口核心逻辑（天气 / 新闻 / 优惠券）
// ----------------------------------------------------------------------------
// 本模块从 server.js 中抽取了三个实时接口所需的全部抓取与解析逻辑：
//   - 天气 weather : Open-Meteo 聚合
//   - 新闻 news    : 央视/新华/澎湃/网易/B站/微博/小红书等多源聚合 + 兜底
//   - 优惠券 coupons: 青岛周边游实时攻略 + 当季精选兜底
// 无 Express 依赖，仅使用全局 fetch / AbortController / setTimeout 等标准 API，
// 因此既可在 Node（server.js 常驻进程）中使用，也可直接用于 Cloudflare Pages
// Functions 等无服务器环境。每个 handler 返回可直接 JSON 序列化的对象。
// ============================================================================

'use strict';

// ---- 出口代理适配（可选）：沙箱/部分部署环境下抓取走代理 ----
const ProxyAgent = (() => { try { return require('undici').ProxyAgent; } catch (e) { return null; } })();
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || '';
function hasProxy() { return !!(ProxyAgent && PROXY); }

// 工具：带超时、代理与 UA 的 fetch
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15';
// 桌面浏览器 UA：B站/小红书等内容站点对桌面 UA 风控更友好
const UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchJson(url, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA },
      ...(hasProxy() ? { dispatcher: new ProxyAgent(PROXY) } : {})
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    return await resp.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': UA },
      ...(hasProxy() ? { dispatcher: new ProxyAgent(PROXY) } : {})
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    clearTimeout(timer);
    return await resp.text();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// ============================ 天气聚合 ============================
// 市南区坐标约 120.395, 36.075
const WEATHER = { lat: 36.075, lon: 120.395, name: '青岛市南区' };

async function weatherHandler() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER.lat}&longitude=${WEATHER.lon}` +
      `&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,apparent_temperature&` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code,wind_speed_10m_max&timezone=Asia%2FShanghai&forecast_days=3`;
    const data = await fetchJson(url);
    return { ok: true, location: WEATHER.name, data };
  } catch (e) {
    return { ok: false, error: '天气服务暂时不可用: ' + e.message };
  }
}

// ============================ 新闻聚合 ============================
// 内置当日热点（可被新闻来源抓取失败时兜底），来源标注清晰
const NEWS_CURATED = [
  {
    id: 'n1', title: '全民医保"十五五"规划发布，2030年全面建成多层次医疗保障体系',
    source: '人民日报 / 新华网', time: '08-20', section: '国内',
    summary: '国家医保局发布《全民医疗保障"十五五"规划》，提出到2030年全面建成多层次医疗保障体系，覆盖参保、就医、购药、异地结算等环节。',
    impact: '关乎每个家庭的医疗支出：报销将更便利、保障更全面，同时对医院、药店合规提出更高要求，个人就医和购药流程可能优化。',
    link: 'https://www.news.cn/politics/'
  },
  {
    id: 'n2', title: '朱雀三号遥二火箭一子级首次实现陆地回收，突破可重复使用火箭技术',
    source: '央视新闻 / 人民日报海外版', time: '08-20', section: '国内',
    summary: '朱雀三号火箭一子级成功实现陆地回收，标志着我国重复使用运载火箭技术取得重大突破，商业航天进入快车道。',
    impact: '利好商业航天、火箭制造、新材料和测控服务产业链，可能带来相关行业就业机会与航天文旅、科普的升温。',
    link: 'https://news.cctv.cn/'
  },
  {
    id: 'n3', title: '2026世界机器人大会开幕，"人工智能+"向产业链加速渗透',
    source: '央视网 / 央广网', time: '08-20',
    summary: '世界机器人大会聚焦AI与机器人深度融合，智能制造、人形机器人等成为热点，AI正重塑各产业环节。',
    impact: '对就业市场影响显著：机器人、智能制造、AI应用等岗位需求上升，部分重复性岗位面临自动化替代压力，职涯规划需顺势调整。',
    link: 'https://tv.cctv.cn/lm/wjxw/'
  },
  {
    id: 'n4', title: '240小时过境免签"朋友圈"扩至57国，海南30天免签上新',
    source: '央广网 / 新华网', time: '08-20',
    summary: '自8月20日起，吉尔吉斯斯坦、越南等国公民可适用240小时过境免签及海南30天入境免签，跨境往来更便利。',
    impact: '利好跨境游、会展、国际贸易、航空酒店；上海、北京、海南、广州等枢纽城市的涉外消费服务需求上升。',
    link: 'http://www.cnr.cn/'
  },
  {
    id: 'n5', title: '《网络数据安全风险评估办法》8月20日起施行',
    source: '央广网 / 新华网', time: '08-20',
    summary: '网络数据安全新规正式施行，对互联网平台、App及企业数据处理、跨境业务、数据安全合规提出明确要求。',
    impact: 'App和平台的数据收集将更规范，个人数据泄露风险治理有望加强；企业数据合规成本上升，普通用户隐私更有保障。',
    link: 'http://www.cnr.cn/newscenter/native/gd/'
  },
  {
    id: 'n6', title: '最高法发布著作权民事纠纷司法解释修改决定，9月1日施行',
    source: '央广网', time: '08-20',
    summary: '最高法对著作权相关司法解释作出修改，涉及短视频搬运、AI生成内容、图文抄袭、网文盗版等争议。',
    impact: '影响内容创作与MCN机构版权合规；对短视频创作者、自媒体、网文作者而言，版权保护与侵权风险判定将更明确。',
    link: 'http://www.cnr.cn/newscenter/native/gd/'
  },
  {
    id: 'n7', title: '前7个月社会消费品零售总额同比增长2.6%，消费市场总体平稳',
    source: '央广网 / 商务部', time: '08-20',
    summary: '商务部发布消费数据，社零总额同比稳步增长，餐饮、文旅、即时零售等线下消费恢复中。',
    impact: '反映居民消费恢复节奏；对零售、餐饮、文旅从业者而言，性价比与体验服务成为拉动增长的关键。',
    link: 'http://www.cnr.cn/newscenter/native/gd/'
  },
  {
    id: 'n8', title: '上海地铁票价优化方案公布，平均每人次约提高1元并推计次票',
    source: '公开报道 / 热搜聚合', time: '08-20',
    summary: '上海地铁票价优化方案公布，平均每人次票价提高约1元，同步推出计次票以平衡成本与需求。',
    impact: '直接影响上海及跨城通勤族出行成本；可能带动网约车、共享单车等替代出行需求变化。',
    link: 'https://120s.baispace.cn/'
  },
  {
    id: 'n9', title: '国家铁路1至7月发送货物23.5亿吨，中欧班列持续扩容',
    source: '央视《新闻联播》', time: '08-20',
    summary: '1-7月全国铁路发送货物23.5亿吨，中欧班列开行量持续增长，产业链供应链韧性增强。',
    impact: '利好物流、港口、跨境电商从业者；大宗商品流通更顺畅，从事外贸和内贸运输的人群业务机会增多。',
    link: 'https://tv.cctv.com/'
  },
  {
    id: 'n10', title: '嫦娥七号任务器箭组合体垂直转运至发射区，探月四期工程稳步推进',
    source: '央视 / 国家航天局', time: '08-20',
    summary: '嫦娥七号组合体转运至发射区，我国探月工程四期进入发射冲刺阶段。',
    impact: '标志我国航天进入密集发射期；利好航天制造、测控、深空探测产业链及相关科研岗位需求。',
    link: 'https://tv.cctv.com/'
  },
  {
    id: 'n11', title: '消费市场总体平稳，互联网零售、即时物流热度不减',
    source: '商务部 / 央广网', time: '08-20',
    summary: '前7个月社零总额同比温和增长，即时零售、餐饮、文旅等新消费形式表现活跃。',
    impact: '对零售、外卖、即时配送从业者是积极信号；竞争核心转向的品质、时效与服务体验。',
    link: 'http://www.cnr.cn/'
  },
  {
    id: 'n12', title: '反诈宣传进社区，电信网络诈骗案发数连续多月下降',
    source: '公安部 / 央广网', time: '08-20',
    summary: '全国公安机关持续开展反诈专项行动，电信网络诈骗案发数与损失金额连续多月实现双下降。',
    impact: '普通用户的财产安全更有保障；对金融、支付、通讯等行业而言，账户安全与实名合规要求趋严。',
    link: 'https://www.news.cn/'
  },
  {
    id: 'n13', title: '热播剧收官引热议，多部新片官宣定档七夕',
    source: '网易娱乐 / 微博热搜', time: '08-20', section: '文娱八卦', cat: '文旅消费',
    summary: '热播剧收官、明星动态与定档消息登上娱乐版头条，七夕档电影市场迅速升温。',
    impact: '对影视、宣发、影院从业者是机会窗口；普通用户娱乐选择更丰富，假期观影安排可提上日程。',
    link: 'https://ent.163.com/'
  },
  {
    id: 'n14', title: '热门游戏赛事带动电竞与二次创作内容热',
    source: 'B站热门 / 微博热议', time: '08-20', section: '热搜榜', cat: '文旅消费',
    summary: '电竞赛事直播与二创视频热度居高不下，带动周边、观赛与内容创作等消费。',
    impact: '利好电竞、直播、游戏内容创作等新消费领域；相关从业者可抓住赛事流量节点提升影响力。',
    link: 'https://www.bilibili.com/'
  },
  {
    id: 'n15', title: '国际原油与航运市场波动，多国关注能源粮食供应链',
    source: '新华社国际部', time: '08-20', section: '国际', cat: '国际外交',
    summary: '地缘形势与极端天气交织，全球能源、粮食与航运市场出现波动，多国加强应对。',
    impact: '关注进出口商品与服务价格波动；跨境贸易、物流从业者需留意运输成本与交付时效变化。',
    link: 'https://www.news.cn/world/'
  },
  {
    id: 'n16', title: '多国博物馆通过科技手段让文物"活"起来',
    source: '央视国际 / 新华社', time: '08-20', section: '国际', cat: '文旅消费',
    summary: 'AR、VR等数字技术在文化遗产领域的应用增多，国际文旅体验持续升级。',
    impact: '利好文化旅游与数字内容产业；也给会展、文旅设计岗位带来新机会。',
    link: 'https://news.cctv.cn/'
  },
  // ---- 青岛本土（实时不足时的兜底） ----
  { id:'qd1', title:'青岛海上马拉松定档10月25日，重磅回归', source:'青岛新闻网', time:'08-20', section:'青岛', cat:'文旅消费',
    summary:'青岛海上马拉松正式定档10月25日，赛事报名与赛事经济同步启动，推动海上运动与城市旅游联动。',
    impact:'利好青岛体育赛事、旅游、餐饮住宿行业；跑友及观赛者可提前规划行程与报名时间。', link:'https://news.qingdaonews.com/' },
  { id:'qd2', title:'青岛暑期往返客流高位运行，省外旅客同比增11%', source:'青岛新闻网', time:'08-20', section:'青岛', cat:'经济产业',
    summary:'暑运以来青岛机场与铁路客流保持高位，省外游客以沪、蓉、渝为主，交通与住宿订单升温。',
    impact:'利好青岛酒店、景区、交通及零售消费；暑期出行高峰建议提前预订票务与住宿。', link:'https://news.qingdaonews.com/' },
  { id:'qd3', title:'青岛海西湾船舶海工业上半年产值158亿元', source:'青岛新闻网', time:'08-20', section:'青岛', cat:'经济产业',
    summary:'青岛海西湾船舶海工产业链上半年产值达158.1亿元，全链条提速发展。',
    impact:'利好青岛船舶制造、配套与港口物流岗位；相关从业者可关注产业链招聘与订单机会。', link:'https://news.qingdaonews.com/' },
  { id:'qd4', title:'青岛启动外卖骑手"等灯加时"，优化配送安全', source:'青岛新闻网', time:'08-20', section:'青岛', cat:'民生健康',
    summary:'青岛在即墨试点外卖骑手"等灯加时"创新机制，为骑手划设等候区，提升配送安全。',
    impact:'利好外卖与本地生活从业者，配送安全与用工环境改善，市民收餐体验更稳。', link:'https://news.qingdaonews.com/' },
  { id:'qd5', title:'青岛多个景区推出限时研学福利', source:'青岛新闻网', time:'08-20', section:'青岛', cat:'文旅消费',
    summary:'多家青岛景区限时推出门票直降、课程特惠等研学福利，暑期亲子出游热度高。',
    impact:'利好青岛文旅与教育机构；家庭出游可提前关注优惠，错峰安排研学活动。', link:'https://news.qingdaonews.com/' },
  { id:'qd6', title:'青岛多个景区与场馆可办理婚姻登记业务', source:'青岛新闻网', time:'08-20', section:'青岛', cat:'民生健康',
    summary:'青岛公布可在景区、地标办理婚姻登记的攻略，颁证场景更多样、更具仪式感。',
    impact:'便民服务升级，新人可享受更有仪式感的登记体验；文旅场景获得新流量。', link:'https://news.qingdaonews.com/' },
  { id:'qd7', title:'青岛公交多线路临时调流，市民出行注意', source:'青岛新闻网', time:'08-20', section:'青岛', cat:'民生健康',
    summary:'8月20日起青岛部分公交线路临时调流，涉及通勤重点区域，市民出行需关注线路变化。',
    impact:'影响青岛通勤与日常出行；建议上班族提前查看绕行方案，预留通勤时间。', link:'https://news.qingdaonews.com/' },
  { id:'qd8', title:'618对新人集中领证，青岛七夕登记平稳有序', source:'青岛新闻网', time:'08-20', section:'青岛', cat:'文旅消费',
    summary:'七夕当天青岛638对新人登记结婚，登记处推出暖心服务，婚庆消费同步升温。',
    impact:'利好青岛婚庆、鲜花、餐饮等行业；新人及家属可参考便民流程提前预约。', link:'https://news.qingdaonews.com/' },
  // ---- 国际补充 ----
  { id:'in1', title:'国际社会关注全球气候与能源合作新进展', source:'新华社国际部', time:'08-20', section:'国际', cat:'国际外交',
    summary:'多国在气候与能源转型领域加强协调，国际经贸与地缘格局持续演变。',
    impact:'从事外贸、能源、物流的从业者需关注国际政策风向，把握出口与投资机会。', link:'https://www.news.cn/world/' },
  { id:'in2', title:'人民币跨境结算规模持续扩大，国际化提速', source:'新华社国际部', time:'08-20', section:'国际', cat:'经济产业',
    summary:'人民币跨境使用范围扩大，跨境结算流程更便捷，伴随汇率波动风险仍须关注。',
    impact:'利好外贸与跨境电商的结算效率；涉及跨境收付款的个人与企业应留意汇率对冲。', link:'https://www.news.cn/world/' },
  { id:'in3', title:'全球多国推进智慧城市建设与数字政务', source:'新华社国际部', time:'08-20', section:'国际', cat:'经济产业',
    summary:'数字政务、智慧交通在全球多地上线，公共服务数字化进程加快。',
    impact:'启示本地数字化转型；相关技术与运营岗位需求上升，便民服务更高效。', link:'https://www.news.cn/world/' },
  { id:'in4', title:'国际航运运价温和回落，出口企业成本缓解', source:'新华社国际部', time:'08-20', section:'国际', cat:'经济产业',
    summary:'受运力供给和国际需求变化影响，主要航线运价回落，外贸物流成本压力得到一定缓解。',
    impact:'利好外贸、跨境电商与物流企业利润；接单报价时可持续跟踪运费走势。', link:'https://www.news.cn/world/' },
  { id:'in5', title:'多国放宽互免签证，跨境旅游持续升温', source:'新华社国际部', time:'08-20', section:'国际', cat:'文旅消费',
    summary:'多国互免签证政策扩容，出境游与入境游双向升温，航空与酒店预订活跃。',
    impact:'利好跨境旅游、会展、航空酒店；计划出行的用户可关注签证口径与航班价格。', link:'http://www.cnr.cn/' },
  { id:'in6', title:'国际粮食市场总体稳定，极端天气仍需关注', source:'新华社国际部', time:'08-20', section:'国际', cat:'国际外交',
    summary:'全球粮食供应总体平稳，但局部极端天气与地缘扰动仍可能造成短期波动。',
    impact:'关注进口粮油价格，普通家庭消费平稳；大宗与食品类从业者需留意供给端变化。', link:'https://www.news.cn/world/' },
  // ---- 文娱八卦补充 ----
  { id:'en1', title:'多部新片定档暑期档，票房竞争激烈', source:'网易娱乐', time:'08-20', section:'文娱八卦', cat:'文旅消费',
    summary:'暑期档多部新片密集定档，动画、现实题材与爱情片同台竞技，影院排片关注度高。',
    impact:'利好影视宣发、影院从业者；观众可结合口碑选择观影片单。', link:'https://ent.163.com/' },
  { id:'en2', title:'热播综艺带动话题，明星商业代言热度回升', source:'网易娱乐', time:'08-20', section:'文娱八卦', cat:'文旅消费',
    summary:'多档综艺热播带动明星话题与商业代言活跃，衍生周边销量走高。',
    impact:'利好品牌营销、直播电商从业者；关注流量热点可提升内容传播效果。', link:'https://ent.163.com/' },
  { id:'en3', title:'音乐节与演唱会密集上演，演出经济火爆', source:'网易娱乐', time:'08-20', section:'文娱八卦', cat:'文旅消费',
    summary:'多地音乐节、演唱会档期密集，演出票务与城市文旅消费联动升温。',
    impact:'利好演出、文旅、酒店行业；乐迷购票需注意官方渠道与防诈提示。', link:'https://ent.163.com/' },
  { id:'en4', title:'微短剧精品化提速，行业监管趋严', source:'网易娱乐', time:'08-20', section:'文娱八卦', cat:'文旅消费',
    summary:'微短剧转向精品化创作，平台加强分账与内容审核，市场规模持续扩大。',
    impact:'利好内容创作、剪辑、投流等岗位；作者需提升作品质量以适配新规。', link:'https://ent.163.com/' },
  { id:'en5', title:'顶流明星海外活动引热议，出海内容增多', source:'网易娱乐 / 微博', time:'08-20', section:'文娱八卦', cat:'文旅消费',
    summary:'多位电影与音乐人开启海外巡演与宣传，华语内容出海热度上升。',
    impact:'利好文化出海与艺人经纪；相关制作与运营岗位需求增加。', link:'https://ent.163.com/' },
  { id:'en6', title:'经典IP影视化启动，怀旧题材受关注', source:'网易娱乐', time:'08-20', section:'文娱八卦', cat:'文旅消费',
    summary:'多部经典小说与动画启动影视化，怀旧IP改编带动话题与版权交易活跃。',
    impact:'关注版权与改编合规；内容从业者把握怀旧题材的用户情感溢价。', link:'https://ent.163.com/' },
  { id:'en7', title:'直播带货主播格局变动，头部主播动态引热议', source:'网易娱乐 / 微博热搜', time:'08-20', section:'文娱八卦', cat:'文旅消费',
    summary:'直播电商主播格局生变，头部主播频登热搜，带货与内容平台规则同步更新。',
    impact:'利好直播、MCN从业者；消费者理性消费，谨防冲动下单与货不对板风险。', link:'https://ent.163.com/' },
  // ---- 热搜榜补充（B站热门 + 微博热搜 + 小红书热搜） ----
  { id:'bi1', title:'科普区爆款不断，硬核知识类视频受追捧', source:'B站热门', time:'08-20', section:'热搜榜', cat:'科技航天',
    summary:'B站科普与硬核知识类视频热度走高，科技、物理、AI话题播放量激增。',
    impact:'利好科普内容创作者，知识短视频商业价值上升。', link:'https://www.bilibili.com/' },
  { id:'bi2', title:'国漫新番口碑走高，二创与周边热度攀升', source:'B站热门', time:'08-20', section:'热搜榜', cat:'文旅消费',
    summary:'多部国漫新番上线口碑走高，相关二创、配音与周边内容在站内热传。',
    impact:'利好动画制作、配音、二创创作者；关注选题可提升内容数据。', link:'https://www.bilibili.com/' },
  { id:'bi3', title:'数码区新机测评集中发布，玩家关注性价比', source:'B站热门', time:'08-20', section:'热搜榜', cat:'科技航天',
    summary:'开学季数码新机与配件测评密集发布，续航、性能与性价比成为讨论焦点。',
    impact:'利好数码测评与带货内容；购物者可按评测理性比对再下单。', link:'https://www.bilibili.com/' },
  { id:'bi4', title:'游戏区新作上线，开放世界与速通玩法出圈', source:'B站热门', time:'08-20', section:'热搜榜', cat:'文旅消费',
    summary:'多款新作与经典老游戏在站内热度上升，教程、速通与整活视频持续更新。',
    impact:'利好游戏内容创作与陪玩咨询；玩家购卡充值请认准官方渠道。', link:'https://www.bilibili.com/' },
  { id:'bi5', title:'科技区AI工具实测，效率类应用讨论热烈', source:'B站热门', time:'08-20', section:'热搜榜', cat:'科技航天',
    summary:'AI办公、绘图、剪辑类工具实测视频热门，生产力工具体验分享成趋势。',
    impact:'利好AI应用学习与推广；职场人可按需掌握新工具提升效率。', link:'https://www.bilibili.com/' },
  { id:'bi6', title:'美食区探店与自制视频热度高，消费转向平价', source:'B站热门', time:'08-20', section:'热搜榜', cat:'文旅消费',
    summary:'平价探店与家常菜复刻视频播放量上涨，理性消费与实用内容占据主流。',
    impact:'利好美食内容创作者；观众可借鉴本地平价餐饮与生活妙招。', link:'https://www.bilibili.com/' },
  { id:'bi7', title:'学习区up主分享干货，考公考研备考视频走红', source:'B站热门', time:'08-20', section:'热搜榜', cat:'民生健康',
    summary:'考公、考研、考证类备考规划视频热度走高，学习方法与资料整理成关注点。',
    impact:'利好教育内容创作；备考者可参考高效方法合理规划时间。', link:'https://www.bilibili.com/' },
  // ---- 微博热搜补充 ----
  { id:'wb1', title:'失业男子饿20天致肾衰竭', source:'微博热搜', time:'08-20', section:'热搜榜', cat:'民生健康',
    summary:'一则关于失业男子因经济困难长期节食导致肾衰竭的新闻登上微博热搜，引发对就业与健康保障的讨论。',
    impact:'提醒关注就业压力与身体健康：长期节食或营养不良会严重损害健康，遇到困难应主动求助社区、民政与公益组织，切勿硬扛。', link:'https://s.weibo.com/' },
  { id:'wb2', title:'我国气候异常', source:'微博热搜', time:'08-20', section:'热搜榜', cat:'民生健康',
    summary:'极端高温、暴雨等气候异常现象引发公众关注，多地发布预警并加强应对。',
    impact:'对出行与户外工作影响明显：关注本地气象预警，合理安排出行与户外作业，做好防暑降温与防汛避险。', link:'https://s.weibo.com/' },
  { id:'wb3', title:'中国铁路加速驶入AI赋能新阶段', source:'微博热搜', time:'08-20', section:'热搜榜', cat:'科技航天',
    summary:'铁路系统加速引入人工智能技术，在调度、安检、客服等环节提升智能化水平。',
    impact:'利好AI与轨道交通从业者；旅客出行体验更智能高效，相关岗位技能要求同步提升。', link:'https://s.weibo.com/' },
  { id:'wb4', title:'398一杯的芋圆葡萄', source:'微博热搜', time:'08-20', section:'热搜榜', cat:'文旅消费',
    summary:'一款定价398元的芋圆葡萄饮品引发热议，网友讨论高价饮品与消费观。',
    impact:'反映消费分层与网红营销现象：理性看待高价商品，按需消费，避免为噱头买单。', link:'https://s.weibo.com/' },
  { id:'wb5', title:'男子捡3根金条以为假的随手扔掉', source:'微博热搜', time:'08-20', section:'热搜榜', cat:'综合要闻',
    summary:'一男子捡到3根金条误以为是假货随手扔掉，事后得知真相引发网友热议。',
    impact:'提醒提高对贵重物品的辨别意识：捡到疑似贵重物品应先妥善保管并报警处理，避免造成损失。', link:'https://s.weibo.com/' },
  // ---- 小红书热搜补充 ----
  { id:'xhs1', title:'用万能旅行拍照姿势美美出片', source:'小红书热搜', time:'08-20', section:'热搜榜', cat:'文旅消费',
    summary:'小红书热榜第一，万能旅行拍照姿势教程走红，教大家在不同场景拍出好看照片。',
    impact:'对爱拍照、爱旅行的用户很实用：收藏姿势教程，出行拍照更出片；对摄影与旅行博主是流量选题。', link:'https://www.xiaohongshu.com/' },
  { id:'xhs2', title:'耗时三年拍下古诗词里的中国', source:'小红书热搜', time:'08-20', section:'热搜榜', cat:'文旅消费',
    summary:'创作者耗时三年走遍全国，用镜头还原古诗词中的中国美景，引发广泛共鸣。',
    impact:'文旅内容优质案例：带动诗词文化与旅游打卡热度，对文旅创作者有借鉴价值。', link:'https://www.xiaohongshu.com/' },
  { id:'xhs3', title:'超日常美食教程速来get', source:'小红书热搜', time:'08-20', section:'热搜榜', cat:'文旅消费',
    summary:'小红书热榜美食教程走红，教大家做简单又好吃的家常菜。',
    impact:'对想省钱又吃好的用户很实用：跟着教程学做家常菜，既健康又省钱；对美食博主是涨粉选题。', link:'https://www.xiaohongshu.com/' }
];

const NEWS_CHANNELS = ['央视新闻', '新华网', '澎湃新闻', '网易娱乐', 'B站热门', '微博热搜', '小红书热搜', '青岛新闻网', '权威媒体'];
const NEWS_SECTIONS = ['全部', '国内', '国际', '青岛', '文娱八卦', '热搜榜'];

// 实时新闻聚合 —— 标题关键词分类 → 生成"对工作与生活的影响"
const IMPACT_RULES = [
  { cat: '政策法规', keys: ['规划','办法','意见','条例','规定','方案','施行','发布','修改','司法解释','立法','改革'],
    work: '这类政策法规大多带有强制性与时效性，与所在行业和岗位的执业规范直接挂钩。建议及时关注相关部门与行业协会的正式发文和官方解读，核对适用范围、过渡期与罚则，并据此更新业务流程、合同模板与合规台账，避免因不了解新规而产生合规风险。',
    life: '政策落地通常伴随参保、购房、落户、补贴申报等切身权益的办理窗口。建议对照本地细则备齐材料、算好时间，主动向政务窗口或社区确认申报条件，把属于自己的福利和优惠用足。',
    act: '行动建议：收藏官方原文并设一个月内提醒，逐条核对自己相关的条款是否在有效期内。' },
  { cat: '经济产业', keys: ['经济','增长','产业','投资','消费','外贸','进出口','出口','零售','制造业','房地产','就业','工资','市场','数据'],
    work: '经济与产业信号会传导到订单、营收、成本与招聘节奏，进而影响收入、奖金和职业前景。建议结合所处行业景气度评估风险：下行行业宜谨慎扩张、储备现金流；回暖行业可关注调薪晋升窗口，外贸从业者还需盯紧汇率与地缘波动。',
    life: '价格、补贴与消费政策变化直接影响日常开销。大额消费前建议先比价并核算满减、优惠券、立减金叠加后的实际支出，合理规划家庭预算，避免冲动下单。',
    act: '行动建议：消费品逢购物节与会员日集中采购，食品日用关注临期特价，买菜比价后再买。' },
  { cat: '科技航天', keys: ['航天','火箭','卫星','芯片','人工智能','机器人','AI','半导体','通信','探月','飞船'],
    work: '技术进步重塑产业岗位结构，AI、机器人、半导体带来新工种，也可能替代部分重复劳动。建议持续跟进本领域技术动态与能力要求，主动补齐数据分析、AI 应用等新技能，提升行业变革中的竞争力。',
    life: '新技术让生活更便利，但新品迭代快，存在"早买贵、晚买新"的节奏差。建议结合评测与价格走势理性选购，不急用就等大促或换代后再入手，用得更划算。',
    act: '行动建议：大件家电数码先全网比价、错峰到购物节再买。' },
  { cat: '民生健康', keys: ['医保','社保','养老金','医疗','医院','医生','卫生','疾控','疫苗','养老','生育','住房'],
    work: '民生领域政策与资源配置调整会影响医疗、养老、保障、食品等公共服务行业的人员编制、收入结构与执业要求。相关从业者应及时掌握所在地的轮岗、职称与待遇政策，抓住资源向基层和紧缺领域倾斜的窗口。',
    life: '这与本人和家人的就医、养老、住房、生育密切相关。建议及时关注本地报销比例、异地结算、疫苗接种等细则，材料备齐、时间算好，确保应享尽享。',
    act: '行动建议：把家庭医保、养老、体检事项做成清单，按窗口期办理。' },
  { cat: '国际外交', keys: ['免签','外交','美国','俄罗斯','乌克兰','中东','欧洲','关税','国际','出口管制','一带一路'],
    work: '涉外政策与地缘局势会影响外贸订单、跨国业务与资金结算。外贸、跨境、航运、金融从业者尤需关注关税、出口管制与汇率波动，提前评估在手订单风险并备好对冲方案。',
    life: '签证、直航与防疫政策直接影响跨境旅游、留学和工作交流的便利与成本。计划出国前务必确认目的地的最新政策与安全提示。',
    act: '行动建议：涉外出行前到官方渠道核实最新签证与出入境规定。' },
  { cat: '文旅消费', keys: ['旅游','文旅','免签','假期','出行','酒店','节庆','消费','门票'],
    work: '文旅、影视、餐饮、住宿等服务进入机会窗口，节假日与热播内容客流量明显波动。相关从业者可围绕节庆与内容 IP 做排期、选品和营销，抓住客流高峰；其他行业也可借势做节日营销。',
    life: '娱乐与出行选择丰富且常有优惠，观演购票认准官方渠道，谨防刷单、黄牛与冒充电商骗局。',
    act: '行动建议：热门档期提前订票、出行比价，认准官方渠道下单。' },
  { cat: '安全法治', keys: ['网络','数据','隐私','侵权','版权','诈骗','辟谣','公安','违法','处罚','安全'],
    work: '数据合规与内容审核要求持续趋严，涉及个人信息、版权与数据处理的业务必须加强风控与合规建设，及时更新内部审校与应急预案。',
    life: '这类信息关乎你的资金与账号安全，尤其要警惕新型电信诈骗。不点陌生链接、不给验证码、转账前电话核实，并启用反诈提醒。',
    act: '行动建议：遇到可疑转账先核实再操作，异常情况及时报警。' }
];

function classifyTitle(title) {
  for (const r of IMPACT_RULES) {
    if (r.keys.some(k => title.includes(k))) {
      return { cat: r.cat, impact: '对工作：' + r.work + '；对生活：' + r.life + '；' + r.act, work: r.work, life: r.life, act: r.act };
    }
  }
  return { cat: '综合要闻', impact: '对工作：这类综合要闻虽不直接指向某一行业，但往往反映社会与经济走向，可帮助你把握大环境、适时调整自身节奏；对生活：建议结合自身处境重点吸收与自身利益相关的部分，让资讯服务于决策，理性看待即可。', work: '', life: '', act: '' };
}

function pickLead(title) {
  const t = String(title || '').replace(/^(我国|中国|国家|全国|山东|青岛|本市|记者|当地时间|商务部|发改委|教育部|人社部|卫健委|工信部|科技部|央行|国常会|国务院|央视|据)/, '');
  return t.split(/[，,。;；:：()（）、]/)[0].trim();
}

function pickObj(title) {
  const OBJS = ['医保','社保','养老金','养老','医疗','医药','药品','看病','报销','生育','就业','工资','人才','房价','楼市','房地产','油价','汽油','降息','利率','贷款','存款','公积金','出行','交通','高铁','地铁','景区','旅游','酒店','票房','市场','消费','A股','股市','基金','理财','外贸','出口','进口','关税','芯片','半导体','AI','人工智能','机器人','航天','火箭','卫星','数据','隐私','网络','反诈','诈骗','外卖','餐饮','补贴','购车','汽车'];
  for (const o of OBJS) if (title.includes(o)) return o;
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

function contentPoints(title, source, sec, cat){
  const lead = pickLead(title);
  const obj = pickObj(title);
  const pts = [];
  pts.push('事件要点：' + lead + '。' + (obj ? '本条聚焦『' + obj + '』的最新变化' : '为今日(' + todayStr().slice(5) + ')发布的要闻') + '。');
  pts.push('核心事实：' + title + '。涉及对象为' + (obj || '相关领域') + '，这是' + (sec === '青岛' ? '青岛本地' : sec === '国际' ? '国际' : '国内') + '板块关注的动向。');
  pts.push('关联解读：' + (obj ? '『' + obj + '』类议题与你的' + (cat === '民生健康'||cat==='经济产业' ? '收支与职业规划' : '生活与职业判断') + '相关，可把本条与近期同类信息放到一起看，把握趋势。' : '本条为综合动态，可吸收其中与自己工作生活相关的部分，其余做背景了解即可。'));
  return pts;
}

function makeItem(title, link, source, seen, section) {
  let tt = (title || '').replace(/\s+/g, ' ').trim();
  const emap = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  let prev = ''; let guard = 0;
  while (tt !== prev && guard < 4) {
    prev = tt;
    tt = tt
      .replace(/\[!--[\s\S]*?--\]/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/&#x([0-9a-fA-F]{1,6});|&#(\d{1,7});/g, (_, h, d) => { try { return String.fromCodePoint(h ? parseInt(h, 16) : parseInt(d, 10)); } catch (e) { return ' '; } })
      .replace(/&([a-zA-Z]+);/g, (m, k) => (emap[k] !== undefined ? emap[k] : m));
    guard++;
  }
  tt = tt.replace(/\s+/g, ' ').trim();
  if (!tt || tt.length < 6 || tt.length > 38 || tt.includes('。') || tt.includes('，') ||
      /template|datalist|kapian|功网络|hot|更多|>>|htmlVideoCode|京ICP|版权所有/i.test(tt)) return null;
  if (seen.has(tt)) return null;
  seen.add(tt);
  const c = classifyTitle(tt);
  const sec = section || (/国际|海外|全球|美|俄|中美元|欧洲|中东/.test(tt) ? '国际' : '国内');
  const impact = genFallbackImpact(tt, sec);
  const points = contentPoints(tt, source, sec, c.cat);
  return {
    id: 'c' + Math.random().toString(36).slice(2, 8),
    title: tt,
    source,
    section: sec,
    time: todayStr().slice(5),
    points,
    summary: points[0],
    impact,
    cat: c.cat,
    link
  };
}

function genFallbackImpact(title, section) {
  const t = (title || '');
  const patterns = [
    { re: /航天|火箭|卫星|探月|飞船/, text: '我国航天事业持续取得新进展，本次任务在技术验证与应用层面均有突破，标志着相关领域进入新的发展阶段。航天科技的进步不仅推动国防与科研能力提升，也带动了商业航天、卫星应用、新材料等产业链的快速发展。' },
    { re: /AI|人工智能|机器人|芯片|半导体/, text: '科技领域迎来重要突破，相关技术在实际应用场景中展现出越来越强的能力。AI与机器人技术的深度融合正在重塑制造业、服务业和内容创作等多个行业，带来效率提升的同时也对从业者技能提出了新要求。' },
    { re: /医保|社保|养老金|医疗|养老/, text: '民生保障政策持续完善，此次调整涉及参保范围、待遇标准和服务流程等多个方面。相关部门将配套出台实施细则，确保政策平稳落地，让广大群众切实享受到改革红利。建议关注本地具体实施方案和办理时间节点。' },
    { re: /经济|GDP|增长|产业|消费|市场/, text: '经济数据反映出当前经济运行的整体态势，各行业景气度呈现分化特征。消费市场保持平稳，新兴产业增速较快，传统行业面临转型升级压力。这些信号对就业、投资和消费决策具有重要参考价值。' },
    { re: /旅游|文旅|景区|酒店|出行/, text: '文旅市场持续升温，各地景区和旅游目的地在暑期迎来客流高峰。相关部门加强服务保障和安全监管，推出多项便民措施提升游客体验。建议出行前关注目的地天气、客流和预约信息，合理安排行程。' },
    { re: /外交|免签|国际|贸易|出口/, text: '国际形势持续变化，相关政策和市场动态对跨境贸易、旅游和投资产生直接影响。多边合作机制不断完善，为企业和个人跨境活动提供了更多便利和保障。' },
    { re: /网络|数据|隐私|安全|反诈|诈骗/, text: '网络安全与数据保护领域持续加强治理，相关法规和监管措施不断完善。这对个人信息保护和财产安全具有积极意义，同时也对企业合规经营提出了更高要求。建议用户增强防范意识，保护个人隐私和账户安全。' },
    { re: /电影|综艺|明星|娱乐|八卦|票房/, text: '文娱行业动态活跃，多部作品和活动引发广泛关注和讨论。内容创作质量持续提升，观众选择更加丰富多元。建议关注官方渠道信息，理性消费娱乐内容。' },
    { re: /游戏|电竞|直播|二次元|动漫|B站/, text: '数字内容与互动娱乐领域持续活跃，平台内容生态不断丰富。创作者与用户之间的互动形式更加多元，相关产业商业价值进一步提升。关注热点时请注意甄别信息真实性。' }
  ];
  for (const p of patterns) {
    if (p.re.test(t)) return p.text;
  }
  if (section === '热搜榜') return '该内容在B站、微博或小红书等平台登上热搜，反映当前网络社区的热门话题和用户兴趣方向。作为年轻人聚集的内容社区，其热门榜单往往体现最新的文化趋势和消费风向。';
  if (section === '文娱八卦') return '文娱领域的最新动态，反映了当前大众文化的关注焦点和消费趋势。这类信息有助于了解流行文化走向，也可作为社交话题参考。';
  if (section === '国际') return '国际方面的最新消息，涉及全球政治、经济或社会领域的重要变化。这些动态可能通过贸易、汇率、出行等渠道对国内产生影响，值得保持关注。';
  if (section === '青岛') return '青岛本地的最新资讯，与市民的日常生活、出行、消费和工作密切相关。建议关注官方渠道获取详细信息。';
  return '国内最新要闻，反映当前社会经济发展的重要动态。建议关注相关领域的后续报道和官方解读，全面了解事件背景和影响。';
}

function todayStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function crawlCCTV(out, seen) {
  try {
    const html = await fetchText('https://news.cctv.com/');
    const re = /<a[^>]*href="(https:\/\/news\.cctv\.com\/\d{4}\/\d{2}\/\d{2}\/[^"]+\.shtml|https:\/\/tv\.cctv\.com\/\d{4}\/\d{2}\/\d{2}\/[^"]+\.shtml)"[^>]*>([^<]{6,60})<\/a>/g;
    let m; let cnt = 0;
    while ((m = re.exec(html)) && cnt < 16) {
      const it = makeItem(m[2], m[1], '央视新闻', seen, '国内');
      if (it) { out.push(it); cnt++; }
    }
  } catch (e) { /* 忽略 */ }
}

const XWLB_COLUMNS = {
  '早间': { id: 'TOPC1451558496100826', name: '朝闻天下' },
  '午间': { id: 'TOPC1451559097947700', name: '新闻30分' }
};

function makeLianboItem(title, link, source, program) {
  let tt = String(title || '').replace(/\s+/g, ' ').trim();
  if (!tt || tt.length < 6) return null;
  const c = classifyTitle(tt);
  const impact = genFallbackImpact(tt, '国内');
  const points = contentPoints(tt, source, '国内', c.cat);
  return {
    id: 'lb' + Math.random().toString(36).slice(2, 8),
    title: tt,
    source,
    section: '国内',
    program,
    time: todayStr().slice(5),
    points,
    summary: points[0],
    impact,
    cat: c.cat,
    link
  };
}

async function crawlXinwenLianbo(out, seen) {
  const pad = n => String(n).padStart(2, '0');
  const d = new Date();
  const today = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const yest = new Date(d); yest.setDate(yest.getDate() - 1);
  const yesterday = `${yest.getFullYear()}${pad(yest.getMonth() + 1)}${pad(yest.getDate())}`;

  for (const day of [today, yesterday]) {
    try {
      const html = await fetchText(`https://tv.cctv.com/lm/xwlb/day/${day}.shtml`, 9000);
      const re = /<a[^>]*href="(https:\/\/tv\.cctv\.com\/\d{4}\/\d{2}\/\d{2}\/[^"]+\.shtml)"[^>]*title="\[视频\]([^"]{6,120})"/g;
      let m; let cnt = 0;
      while ((m = re.exec(html)) && cnt < 20) {
        const title = m[2].replace(/\s+/g, ' ').trim();
        if (!title || seen.has(title)) { continue; }
        seen.add(title);
        const it = makeLianboItem(title, m[1], '央视新闻联播', '晚间');
        if (it) { out.push(it); cnt++; }
      }
    } catch (e) { /* 忽略 */ }
  }

  for (const [prog, col] of Object.entries(XWLB_COLUMNS)) {
    try {
      const data = await fetchJson(`https://api.cntv.cn/NewVideo/getVideoListByColumn?id=${col.id}&n=6&sort=desc&p=1&mode=0&serviceId=tvcctv`, 9000);
      const list = (data && data.data && data.data.list) || [];
      if (process.env.DEBUG_NEWS) console.log(`[lianbo] ${prog} ${col.name}: list=${list.length}`);
      const recent = list.filter(it => (it.focus_date || 0) >= Date.now() - 26 * 3600 * 1000).slice(0, 2);
      for (const prog2 of recent) {
        const brief = (prog2.brief || '')
          .replace(/本期节目主要内容[：:]\s*/, '')
          .replace(/（《[^）]*》.*$/, '')
          .replace(/\s+/g, ' ')
          .trim();
        const parts = brief.split(/[；;]/).map(s => s.replace(/^\s+|\s+$/g, '')).filter(s => s.length >= 6);
        if (process.env.DEBUG_NEWS) console.log(`[lianbo] ${prog} 节目 ${prog2.title}: 拆分 ${parts.length} 条`);
        for (const p of parts) {
          if (seen.has(p)) continue;
          seen.add(p);
          const it = makeLianboItem(p, prog2.url, '央视' + col.name, prog);
          if (it) out.push(it);
        }
      }
    } catch (e) {
      if (process.env.DEBUG_NEWS) console.log(`[lianbo] ${prog} ${col.name} 失败:`, e && e.message);
    }
  }
}

async function crawlCN(out, seen) {
  try {
    const html = await fetchText('https://www.news.cn/');
    const re = /<a[^>]*href='(https:\/\/www\.news\.cn\/[^']+)'[^>]*>([^<]{6,60})<\/a>/g;
    let m; let cnt = 0;
    while ((m = re.exec(html)) && cnt < 14) {
      const it = makeItem(m[2], m[1], '新华网', seen, '国内');
      if (it) { out.push(it); cnt++; }
    }
  } catch (e) { /* 忽略 */ }
}

async function crawlQingdao(out, seen) {
  const y = new Date().getFullYear();
  try {
    const html = await fetchText('https://news.qingdaonews.com/', 9000);
    const re = new RegExp(`<a[^>]*href="(https?://news\\.qingdaonews\\.com/qingdao/${y}-\\d{2}/\\d{2}/content_\\d+\\.htm)"[^>]*>([^<]{8,40})<\\/a>`, 'g');
    let m; let cnt = 0;
    while ((m = re.exec(html)) && cnt < 10) {
      const it = makeItem(m[2], m[1], '青岛新闻网', seen, '青岛');
      if (it) { out.push(it); cnt++; }
    }
  } catch (e) { /* 忽略 */ }
}

function makeBiliItem(v, seen) {
  let tt = (v.title || '').replace(/\s+/g, ' ').trim();
  const emap = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  let prev = ''; let guard = 0;
  while (tt !== prev && guard < 4) {
    prev = tt;
    tt = tt
      .replace(/\[!--[\s\S]*?--\]/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/&#x([0-9a-fA-F]{1,6});|&#(\d{1,7});/g, (_, h, d) => { try { return String.fromCodePoint(h ? parseInt(h, 16) : parseInt(d, 10)); } catch (e) { return ' '; } })
      .replace(/&([a-zA-Z]+);/g, (m, k) => (emap[k] !== undefined ? emap[k] : m));
    guard++;
  }
  tt = tt.replace(/\s+/g, ' ').trim();
  if (!tt || tt.length < 6 || tt.length > 46 || /template|htmlVideoCode|京ICP|版权所有|>>/i.test(tt)) return null;
  if (seen.has(tt)) return null;
  seen.add(tt);
  const c = classifyTitle(tt);
  const desc = (v.description || v.desc || '').replace(/\s+/g, ' ').trim();
  const impact = (desc && desc.length >= 30) ? desc : genBiliLead(tt);
  const points = (desc && desc.length >= 200) ? [desc] : [
    '视频看点：这是B站热门榜上的「' + tt + '」，当前播放与讨论度较高，反映年轻人关注的新趋势。',
    '内容方向：' + impact.split('。')[0] + '。适合对该主题感兴趣的观众观看与学习。',
    '观看建议：视频通常几分钟到十几分钟，可结合弹幕、评论区了解大家对该话题的看法，理性参考。'
  ];
  return {
    id: 'b' + Math.random().toString(36).slice(2, 8),
    title: tt,
    source: 'B站热门',
    section: '热搜榜',
    time: todayStr().slice(5),
    points,
    summary: points[0],
    impact,
    cat: c.cat,
    link: `https://www.bilibili.com/video/av${v.aid}`,
    _hasDesc: !!(desc && desc.length >= 30)
  };
}

async function crawlBili(out, seen) {
  const endpoints = [
    'https://api.bilibili.com/x/web-interface/popular?ps=12&pn=1',
    'https://api.bilibili.com/x/web-interface/ranking?rid=0&type=all',
    'https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all'
  ];
  for (const url of endpoints) {
    try {
      let data;
      if (process.env.BILI_PROXY || hasProxy()) {
        const resp = await fetch(url, {
          dispatcher: new ProxyAgent(process.env.BILI_PROXY || PROXY),
          signal: AbortSignal.timeout(9000),
          headers: { 'User-Agent': UA_DESKTOP, 'Referer': 'https://www.bilibili.com/', 'Accept': 'application/json, text/plain, */*' }
        });
        data = await resp.json();
      } else {
        data = await fetchJson(url, 9000);
      }
      const list = (data && data.data && data.data.list) || [];
      if (!Array.isArray(list) || !list.length) continue;
      let cnt = 0;
      for (const v of list.slice(0, 10)) {
        if (cnt >= 8) break;
        const it = makeBiliItem(v, seen);
        if (it) { out.push(it); cnt++; }
      }
      if (out.length) return;
    } catch (e) { /* 尝试下一来源 */ }
  }
}

async function crawlWeiboHot(out, seen) {
  try {
    const url = 'https://weibo.com/ajax/statuses/hot_band';
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(9000),
      headers: { 'User-Agent': UA, 'Referer': 'https://weibo.com/', 'Accept': 'application/json, text/plain, */*' },
      ...(hasProxy() ? { dispatcher: new ProxyAgent(PROXY) } : {})
    });
    const data = await resp.json();
    const list = (data && data.data && data.data.band_list) || [];
    let cnt = 0;
    for (const b of list.slice(0, 15)) {
      if (cnt >= 10) break;
      const word = (b.word || '').replace(/\s+/g, ' ').trim();
      if (!word || word.length < 4 || word.length > 40) continue;
      const rank = b.rank || 0;
      const heat = b.num || '';
      const it = makeHotItem(word, 'https://s.weibo.com/weibo?q=' + encodeURIComponent(word), '微博热搜', seen, '热搜榜', rank, heat);
      if (it) { out.push(it); cnt++; }
    }
  } catch (e) { /* 忽略 */ }
}

async function crawlXiaohongshuHot(out, seen) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch('https://www.46.la/tool/xiaohongshu-hot', {
      signal: controller.signal,
      headers: { 'User-Agent': UA_DESKTOP, 'Referer': 'https://www.46.la/', 'Accept': 'text/html,application/xhtml+xml,*/*' },
      ...(hasProxy() ? { dispatcher: new ProxyAgent(PROXY) } : {})
    });
    clearTimeout(timer);
    const html = resp.ok ? await resp.text() : '';
    const re = /<tr[^>]*>\s*<td>\s*<span class="b[^"]*">(\d+)<\/span>\s*<\/td>\s*<td>\s*<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>\s*<\/td>\s*<td>\s*<span class="b">([^<]+)<\/span>\s*<\/td>\s*<\/tr>/g;
    let m; let cnt = 0;
    while ((m = re.exec(html)) && cnt < 12) {
      const word = (m[3] || '').replace(/\s+/g, ' ').trim();
      if (!word || word.length < 4 || word.length > 40) continue;
      const it = makeHotItem(word, m[2], '小红书热搜', seen, '热搜榜', parseInt(m[1], 10), m[4]);
      if (it) { out.push(it); cnt++; }
    }
  } catch (e) { /* 忽略 */ }
}

function makeHotItem(title, link, source, seen, section, rank, heat) {
  let tt = (title || '').replace(/\s+/g, ' ').trim();
  if (!tt || tt.length < 4 || tt.length > 40 || seen.has(tt)) return null;
  seen.add(tt);
  const c = classifyTitle(tt);
  const rankStr = rank ? `第${rank}名` : '';
  const heatStr = heat ? `热度${heat}` : '';
  const lead = pickLead(tt);
  const obj = pickObj(tt);
  const impact = genHotImpact(tt, source, rankStr, heatStr, obj, c);
  const points = hotPoints(tt, source, rankStr, heatStr, obj);
  return {
    id: 'h' + Math.random().toString(36).slice(2, 8),
    title: tt,
    source,
    section,
    time: todayStr().slice(5),
    points,
    summary: points[0],
    impact,
    cat: c.cat,
    link,
    rank,
    heat
  };
}

function hotPoints(title, source, rankStr, heatStr, obj) {
  const pts = [];
  pts.push('热搜要点：' + title + ' 登上' + source + (rankStr ? ' ' + rankStr : '') + (heatStr ? '（' + heatStr + '）' : '') + '，是当前全网讨论度较高的话题。');
  pts.push('事件背景：该话题在' + source + '引发大量讨论，' + (obj ? '核心围绕「' + obj + '」展开' : '反映公众对相关内容的关注与情绪') + '，热度往往与民生、消费或社会情绪相关。');
  pts.push('关注价值：热点背后通常藏着大众的真实关切，可据此把握当下舆论风向；涉及自身利益的部分建议进一步核实官方信息。');
  return pts;
}

function genHotImpact(title, source, rankStr, heatStr, obj, c) {
  const prefix = source + (rankStr ? ' ' + rankStr : '') + (heatStr ? '，' + heatStr : '') + '，当前全网关注度较高。';
  if (obj && OBJ_IMPACT[obj]) {
    return prefix + '这条热搜围绕「' + obj + '」展开。对工作：' + OBJ_IMPACT[obj].w + '；对生活：' + OBJ_IMPACT[obj].l + '；' + OBJ_IMPACT[obj].a;
  }
  if (c && c.impact) return prefix + c.impact;
  return prefix + '这条热搜反映了当前公众关注的焦点话题，建议结合自身情况关注事件后续进展与官方信息，理性看待网络热议。';
}

function genBiliLead(title) {
  const t = (title || '');
  if (/科普|知识|科学|物理|化学|生物|数学|历史|经济|哲学|心理/.test(t)) return '该视频以深入浅出的方式讲解相关知识，在B站知识区获得广泛关注。内容结合案例与数据，帮助观众理解复杂概念，适合对该领域感兴趣的学习者观看。创作者以独特的视角和生动的表达，让硬核知识变得通俗易懂。';
  if (/数码|手机|电脑|测评|开箱|体验|芯片|AI|人工智能|科技|机器人/.test(t)) return '该视频对最新科技产品进行了详细测评与体验分享，从性能、外观、使用场景等多维度展开分析，为消费者提供实用的选购参考。视频内容客观详实，在B站科技数码区引发热烈讨论，帮助观众做出更理性的消费决策。';
  if (/游戏|电竞|攻略|实况|赛事|速通|MOD|主机|Steam|原神|王者|LOL|英雄联盟/.test(t)) return '该视频围绕热门游戏展开，包含精彩的操作、独特的玩法和深度的游戏理解。视频内容在B站游戏区获得大量播放和互动，反映了当前游戏社区的热门趋势和玩家关注焦点，无论是对老玩家还是新观众都有吸引力。';
  if (/美食|探店|做饭|料理|烘焙|甜品|家常菜|小吃|餐厅|外卖/.test(t)) return '该视频记录了美食制作或探店过程，从食材准备到成品呈现，细节丰富、画面诱人。创作者分享了实用的烹饪技巧与搭配建议，在B站美食区获得广泛好评，为观众提供了在家复刻或外出觅食的灵感。';
  if (/动画|动漫|番剧|二次元|手书|MAD|AMV|cosplay|国漫|日漫/.test(t)) return '该视频在B站动画区引发热议，内容展现了创作者对动漫作品的独特理解和创意表达。视频通过精美的画面、用心的剪辑和深入的分析，为同好提供了高质量的二次创作内容，体现了B站独特的二次元文化氛围。';
  if (/音乐|翻唱|演奏|原创|编曲|混音|VOCALOID|说唱|乐队|弹唱/.test(t)) return '该音乐视频展现了创作者出色的音乐才华，无论是编曲、演唱还是演奏都达到了较高水准。视频在B站音乐区获得广泛传播，评论区互动热烈，体现了B站用户对优质音乐内容的高度认可和喜爱。';
  if (/生活|日常|Vlog|记录|挑战|搞笑|整活|吐槽|鬼畜|配音/.test(t)) return '该视频以生动有趣的形式记录了创作者的生活片段或创意内容，凭借独特的风格和真诚的表达在B站获得大量关注。视频内容轻松幽默，展现了当下年轻人的生活态度和创造力，适合休闲放松时观看。';
  return '该视频在B站平台获得较高关注度，内容反映当前网络社区的热门话题和用户兴趣方向。B站作为年轻人聚集的内容社区，其热门榜单往往体现最新的文化趋势和消费风向，值得关注。创作者以独特的视角呈现了这一主题，引发了观众的广泛讨论和共鸣。';
}

async function crawlEnt(out, seen) {
  try {
    const html = await fetchText('https://ent.163.com/', 9000);
    const re = /<a[^>]*href="(https:\/\/www\.163\.com\/[^"]+|[^"]*\/\d{6,}\/[^"]+)"[^>]*>([^<]{8,38})<\/a>/g;
    let m; let cnt = 0;
    while ((m = re.exec(html)) && cnt < 14) {
      const it = makeItem(m[2], m[1], '网易娱乐', seen, '文娱八卦');
      if (it) { out.push(it); cnt++; }
    }
  } catch (e) { /* 忽略 */ }
}

async function crawlThePaper(out, seen) {
  try {
    const html = await fetchText('https://m.thepaper.cn/', 9000);
    const re = /<a[^>]*href="([^"]+)"[^>]*>([^<]{8,40})<\/a>/g;
    let m; let cnt = 0;
    while ((m = re.exec(html)) && cnt < 14) {
      const it = makeItem(m[2], m[1], '澎湃新闻', seen, null);
      if (it) { out.push(it); cnt++; }
    }
  } catch (e) { /* 忽略 */ }
}

async function crawlWorld(out, seen) {
  const srcs = [
    { url: 'https://www.news.cn/world/', src: '新华网国际', re: /<a[^>]*href='(https:\/\/www\.news\.cn\/(world|gj)\/20\d\d[^']+\.htm)'[^>]*>([^<]{6,60})<\/a>/g },
    { url: 'https://www.chinanews.com.cn/', src: '中新网', re: /<a[^>]*href="(https:\/\/www\.chinanews\.com\.cn\/(gj|chinese)\/20\d\d\/\d{2}-\d{2}\/\d+\.shtml)"[^>]*>([^<]{6,60})<\/a>/g },
    { url: 'https://world.huanqiu.com/', src: '环球网', re: /<a[^>]*href="(https:\/\/world\.huanqiu\.com\/article\/([0-9A-Za-z]+)\.html)"[^>]*>([^<]{6,60})<\/a>/g }
  ];
  for (const s of srcs) {
    try {
      const html = await fetchText(s.url, 9000);
      let m; let cnt = 0;
      while ((m = s.re.exec(html)) && cnt < 12) {
        const t = (m[3] || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if (t.length < 6) continue;
        const it = makeItem(t, m[1], s.src, seen, '国际');
        if (it) { out.push(it); cnt++; }
      }
    } catch (e) { /* 尝试下一来源 */ }
  }
}

async function crawlEntMore(out, seen) {
  const srcs = [
    { url: 'https://ent.163.com/', src: '网易娱乐', re: /<a[^>]*href="(https?:\/\/(www\.)?163\.com\/\d{4}\/\d{2}\/\d{2}\/[^"]+\.html)"[^>]*>([^<]{8,50})<\/a>/g },
    { url: 'https://ent.sina.com.cn/', src: '新浪娱乐', re: /<a[^>]*href="(https:\/\/ent\.sina\.com\.cn\/[a-z]+\/20\d\d-\d{2}-\d{2}\/doc-[^"]+\.shtml)"[^>]*>([^<]{8,50})<\/a>/g }
  ];
  for (const s of srcs) {
    try {
      const html = await fetchText(s.url, 9000);
      let m; let cnt = 0;
      while ((m = s.re.exec(html)) && cnt < 12) {
        const t = (m[3] || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if (t.length < 8) continue;
        const it = makeItem(t, m[1], s.src, seen, '文娱八卦');
        if (it) { out.push(it); cnt++; }
      }
    } catch (e) { /* 尝试下一来源 */ }
  }
}

const ALL_SEC = NEWS_SECTIONS.slice(1);
const MIN_PER_SECTION = 8;

function ensurePerSection(live, date) {
  const out = [];
  const used = new Set();
  live.forEach(n => { n.section = n.section || '国内'; if (!used.has(n.title)) { out.push(n); used.add(n.title); } });
  for (const sec of ALL_SEC) {
    let have = out.filter(n => n.section === sec).length;
    if (have < MIN_PER_SECTION) {
      let need = MIN_PER_SECTION - have;
      const pool = NEWS_CURATED.filter(n => (n.section || '国内') === sec && !used.has(n.title));
      for (const p of pool) {
        if (need <= 0) break;
        out.push({ ...p, impact: p.summary || p.title, time: date.slice(5), date: date.slice(5), section: p.section || sec });
        used.add(p.title); need--;
      }
    }
  }
  const hot = out.filter(n => n.section === '热搜榜');
  if (hot.length) {
    const required = ['B站热门', '微博热搜', '小红书热搜'];
    for (const needSrc of required) {
      const haveCnt = hot.filter(n => n.source === needSrc || n.source.indexOf(needSrc) >= 0).length;
      if (haveCnt >= 3) continue;
      let add = 3 - haveCnt;
      const seeds = NEWS_CURATED.filter(n => (n.section || '国内') === '热搜榜' && (n.source === needSrc || n.source.indexOf(needSrc) >= 0) && !used.has(n.title));
      for (const p of seeds) {
        if (add <= 0) break;
        out.push({ ...p, impact: p.summary || p.title, time: date.slice(5), date: date.slice(5), section: '热搜榜' });
        used.add(p.title); add--;
      }
    }
  }
  return out;
}

// 24 小时新闻池：把历次刷新抓到的条目累积、去重、按时间倒序
let newsPool = []; // { item, ts } 按 ts 倒序
const NEWS_24H_MS = 24 * 60 * 60 * 1000 + 10 * 60 * 1000;
function mergeIntoPool(items, date) {
  const now = Date.now();
  const map = new Map();
  for (const it of items) {
    if (!map.has(it.title)) map.set(it.title, { item: it, ts: now });
  }
  for (const e of newsPool) {
    if (now - e.ts <= NEWS_24H_MS) { if (!map.has(e.item.title)) map.set(e.item.title, e); }
  }
  newsPool = Array.from(map.values()).sort((a, b) => b.ts - a.ts).slice(0, 100);
}

// 抽取新闻正文（去 HTML）
function stripHtmlJ(s){
  if (!s) return '';
  const map = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ensp: '\u2002', emsp: '\u2003', mdash: '—', ndash: '–', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', middot: '·' };
  let cur = String(s).replace(/<[^>]*>/g, ' '); let prev = ''; let g = 0;
  while (cur !== prev && g < 4) { prev = cur; cur = cur.replace(/&#x([0-9a-fA-F]{1,6});|&#(\d{1,7});/g, (_, h, d) => { try { return String.fromCodePoint(h ? parseInt(h, 16) : parseInt(d, 10)); } catch (e) { return ' '; } }).replace(/&([a-zA-Z]+);/g, (m, k) => (map[k] !== undefined ? map[k] : m)); g++; }
  return cur.replace(/\[!--begin:[\s\S]*?--\][\s\S]*?\[!--end:[\s\S]*?--\]/g,' ').replace(/\[!--[\s\S]*?--\]/g,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/\s+/g, ' ').trim();
}

// 抓取新闻详情原文：多策略提取正文作为"新闻原文"填充 impact
async function enrichNewsDetail(it) {
  if (!it || !it.link || !/^https?:\/\//.test(it.link)) return;
  if (/bilibili/.test(it.link)) {
    if (!it._hasDesc && it.title) it.impact = genBiliLead(it.title);
    return;
  }
  if (it.impact && it.impact !== it.title && it.impact.length > 30) return;
  try {
    const html = await fetchText(it.link, 6000);
    if (!html) return;
    const re1 = /<p[^>]*>([\s\S]{0,400}?)<\/p>/g;
    const BAD = /\[!--|htmlVideoCode|htmlimgcode|videoCode|img\d|京ICP|版权所有|负责|责任编辑|广告|copyright|转载|声明|扫码|二维码|下载App|阅读原文|原标题|延伸|监控|主编|监制|记者|编辑|出品|Copyright|ICP备|仅供参考|function|window\.|var\s|let\s|const\s|\{|\}|\+datalist|datalist\s*\.|datalist\s*\[/i;
    let m; const leads = [];
    let guard = 0;
    while ((m = re1.exec(html)) && guard < 8) {
      const txt = stripHtmlJ(m[1]);
      if (txt.length >= 20 && txt.length <= 400 && !BAD.test(txt) && !/^[\s0-9.:;。，,、()（）《》【】"'“”\-—\d]+$/.test(txt)) { leads.push(txt); guard++; }
    }
    if (leads.length < 2) {
      const meta = /<meta[^>]*name="description"[^>]*content="([^"]+)"[^>]*>/i.exec(html) || /<meta[^>]*content="([^"]+)"[^>]*name="description"[^>]*>/i.exec(html);
      if (meta) {
        const txt = stripHtmlJ(meta[1]);
        if (txt.length >= 20 && txt.length <= 400 && !BAD.test(txt)) leads.push(txt);
      }
    }
    if (leads.length < 2) {
      const re2 = /<div[^>]*class="[^"]*(?:content|article|text|body|main|detail)[^"]*"[^>]*>([\s\S]{0,600}?)<\/div>/gi;
      while ((m = re2.exec(html)) && leads.length < 3) {
        const txt = stripHtmlJ(m[1]);
        if (txt.length >= 20 && txt.length <= 400 && !BAD.test(txt) && !/^[\s0-9.:;。，,、()（）《》【】"'“”\-—\d]+$/.test(txt)) leads.push(txt);
      }
    }
    if (leads.length) {
      const body = leads.map((l, i) => (i === 0 ? '' : '') + l).join(' ');
      it.impact = body;
      it.points = [body];
    }
  } catch (e) { /* 保留已有内容兜底 */ }
}

// 实际执行一次"抓取 + 解析 + 汇总"，返回 { items, crawled, updatedAt, builtDate }
async function doRefreshNews() {
  const date = todayStr();
  const seen = new Set();
  const live = [];
  await Promise.all([crawlXinwenLianbo(live, seen), crawlCCTV(live, seen), crawlCN(live, seen), crawlBili(live, seen), crawlWeiboHot(live, seen), crawlXiaohongshuHot(live, seen), crawlEnt(live, seen), crawlEntMore(live, seen), crawlThePaper(live, seen), crawlWorld(live, seen), crawlQingdao(live, seen)]);
  const items = ensurePerSection(live, date);
  const targets = items.filter(i => i.link && !/bilibili/.test(i.link));
  const groups = {};
  targets.forEach(i => { const k = i.section || '其他'; (groups[k] = groups[k] || []).push(i); });
  const picked = [];
  const keys = Object.keys(groups);
  let gi = 0;
  while (picked.length < targets.length) {
    const g = groups[keys[gi % keys.length]];
    if (g && g.length) picked.push(g.shift());
    if (keys.every(kk => !groups[kk].length)) break;
    gi++;
  }
  const cap = Math.min(20, picked.length);
  for (let i = 0; i < cap; i++) {
    await Promise.race([enrichNewsDetail(picked[i]), new Promise(r => setTimeout(r, 6000))]);
  }
  mergeIntoPool(items, date);
  return { items: newsPool.map(e => e.item), crawled: live.length, updatedAt: Date.now(), builtDate: date };
}

// 新闻 handler：室外无常驻缓存环境（如 Pages Functions）每次都全新抓取；失败走内置兜底
function newsHandler() {
  return doRefreshNews().then(r => ({
    ok: true,
    date: r.builtDate,
    cached: false,
    updatedAt: r.updatedAt,
    channels: NEWS_CHANNELS,
    sections: NEWS_SECTIONS,
    crawled: r.crawled,
    items: r.items
  })).catch((e) => {
    if (process.env.DEBUG_NEWS) console.error('[news] refresh fail:', e && e.message);
    return {
      ok: true,
      date: todayStr(),
      cached: false,
      sections: NEWS_SECTIONS,
      channels: ['权威媒体'],
      items: NEWS_CURATED.map(n => ({ ...n, date: n.time, section: n.section || '国内' }))
    };
  });
}

// ============================ 优惠券 / 周边游 ============================
const COUPON_REALTIME_SEARCH = [
  '8月 青岛人 避暑 好玩 地方 推荐 省内',
  '8月 暑假 避暑胜地 推荐 长白山 草原 海边 自驾',
  '山东 省内 避暑 周末游 泰山 烟台 威海 推荐',
  '8月 青岛 崂山 北九水 玩水 攻略',
  '暑假 亲子 避暑旅游 推荐 青海 贵州 呼伦贝尔',
  '青岛 啤酒节 游玩 推荐 攻略'
];

// 从 Bing 结果页解析 {标题, 链接, 摘要}
function parseBingResults(html){
  const out = []; const seen = new Set();
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  const liRe = /<li\s+class="[^"]*b_algo[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let li;
  while ((li = liRe.exec(body)) && out.length < 14) {
    const blk = li[1];
    const a = /<h2[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>/i.exec(blk);
    if (!a) continue;
    const link = a[1];
    if (!/^https?:\/\//.test(link) || /bing\.com|baidu\.com|\.gov\.|wikipedia/.test(link)) continue;
    const title = stripHtmlJ(a[2]);
    if (title.length < 8 || title.length > 60) continue;
    const cap = /class="b_caption"[^>]*>([\s\S]*?)<\/p>/i.exec(blk) || /class="[^"]*b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/(p|span)>/i.exec(blk);
    const snippet = cap ? stripHtmlJ(cap[1]) : '';
    const combo = title + ' ' + snippet;
    if (/百科|政务|人民政府|企业名录|企业黄页|官网|首页|注册|登录|软件下载|原神|王者|游戏|脑叶|定位|雷达|上市公司|视频|电视剧|地图|翻译|新闻中心|招投标|优惠券|返利|薅羊毛|立减|满减|会员日|特价|秒杀|折扣|山姆|盒马/.test(combo)) continue;
    if (!/避暑|玩水|海边|草原|长白山|泰山|承德|坝上|呼伦贝尔|青海|贵州|烟台|威海|日照|崂山|北九水|青岛|清凉|大山|8月|暑假|暑期|盛夏|夏季|亲子|度假|旅行|旅游|攻略|景点|好玩|推荐/.test(combo)) continue;
    if (seen.has(title)) continue; seen.add(title);
    const bodyText = (snippet && snippet.length >= 12) ? '摘要：' + snippet : '网络实时搜到的当季暑期出行信息，点开链接看详情。';
    out.push({ t: title, link, source: '实时攻略', snippet, live: true, d: bodyText, how: '点开链接看完整玩法与交通住宿建议；无账号也能先看摘要，无需强制登录' });
  }
  return out;
}

async function crawlBingCoupons(out){
  const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const job = async (url) => {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const resp = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': desktopUA }, ...(hasProxy() ? { dispatcher: new ProxyAgent(PROXY) } : {}) });
      if (!resp.ok) return [];
      const html = await resp.text();
      return parseBingResults(html);
    } catch (e) { return []; } finally { clearTimeout(timer); }
  };
  const rs = await Promise.all(COUPON_REALTIME_SEARCH.slice(0, 4).map(kw => job('https://www.bing.com/search?q=' + encodeURIComponent(kw) + '&setlang=zh-hans')));
  rs.forEach(r => out.push(...r));
}

const COUPON_KEYS = ['青岛','崂山','八大关','栈桥','金沙滩','即墨','西海岸','攻略','必去','一日游','两日游','好的','景点','行程','路线','海边','古城','啤酒','北九水','自驾','亲子'];
const COUPON_SOURCES = ['https://www.qingdaonews.com/', 'https://ly.qingdao.gov.cn/', 'https://m.ctrip.com/html5/'];

function stripHtml(s){
  if (!s) return '';
  const map = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  let cur = String(s).replace(/<[^>]*>/g, ' '); let prev = ''; let g = 0;
  while (cur !== prev && g < 4) { prev = cur; cur = cur.replace(/&#x([0-9a-fA-F]{1,6});|&#(\d{1,7});/g, (_, h, d) => { try { return String.fromCodePoint(h ? parseInt(h, 16) : parseInt(d, 10)); } catch (e) { return ' '; } }).replace(/&([a-zA-Z]+);/g, (m, k) => (map[k] !== undefined ? map[k] : m)); g++; }
  return cur.replace(/\s+/g, ' ').trim();
}

function parseCouponDeals(html, sourceName){
  const out=[]; const seen=new Set();
  const re=/<a[^>]*href="([^"]+)"[^>]*>([\s\S]{0,120}?)<\/a>/g;
  let m;
  while((m=re.exec(html)) && out.length<16){
    const link=m[1]; let t=stripHtml(m[2]);
    if(!link || link.indexOf('javascript')===0) continue;
    const tt = t;
    if(tt.length<8 || tt.length>46) continue;
    if(!COUPON_KEYS.some(k=>tt.includes(k))) continue;
    if(seen.has(tt)) continue; seen.add(tt);
    out.push({ t: tt, link, source: sourceName, live:true, d:'来自「'+sourceName+'」整理到的青岛游玩信息，具体以页面实际公告为准。', how:'点开链接查看出发前准备与预约详情' });
  }
  return out;
}

// 当季内置精选（兜底 + 保证实时噪声不淹没优质当季内容）
const SEASONAL_TRIPS = [
  { t:'崂山北九水 · 县城内避暑玩水', n:'青岛·当日', d:'盛夏九曲十八潭的溪水瀑布把暑气隔绝在外，是青岛本地人夏季戏水踏青首选。', how:'早班进山避开正午，穿速干衣带足水；雨后水量更大更清凉。' },
  { t:'烟台蓬莱阁 & 长岛海岛避暑', n:'山东省内·2日', d:'蓬莱阁临海仙气十足，长岛登岛看海与渔村海鲜，海风常年凉快，是省内海边避暑经典。', how:'高铁约2小时到烟台，长岛提前查船班，适合周末两日。' },
  { t:'威海刘公岛 / 半月湾', n:'山东省内·2日', d:'威海气候清凉、街道干净，水质清透，是省内公认的夏日清凉海滨。', how:'高铁直达，市区+海岛分两日，海边紫外线强务必防晒。' },
  { t:'泰安泰山夜爬避暑', n:'山东省内·2日', d:'盛夏山顶凉爽清凉，夜爬避开白晒还能看云海日出，是山东人暑期消夏之选。', how:'带头灯薄外套、看好日出时间与天气，旺季索道排队提前规划。' },
  { t:'承德避暑山庄 + 木兰围场', n:'河北·3日', d:'皇家夏日行宫+坝上草原，盛夏平均气温远比周边低，是离青岛较近的消夏目的地。', how:'高铁到承德，山庄+草原三段式，草原早晚温差大可带薄羽绒。' },
  { t:'长白山天池避暑', n:'吉林·3-4日', d:'盛夏山顶天池清爽宜人，瀑布温泉原始森林合一，是国内避暑看自然奇观的代表。', how:'8月看天池好时节，山上气温低，提前看天气是否开放，备厚外套。' },
  { t:'呼伦贝尔大草原', n:'内蒙古·4-5日', d:'8月草原最盛，骑马、蒙古包、那达慕氛围浓，气温凉爽通透，是暑期草原度假首选。', how:'飞海拉尔落地，光线强、昼夜温差大，带墨镜防晒和薄外套。' },
  { t:'青海湖 & 茶卡盐湖', n:'青海·4-5日', d:'8月青海湖油菜花与湖水相映、茶卡"天空之镜"出片，高原盛夏清冽凉爽。', how:'海拔高注意高反循序适应，白天防晒夜间保暖。' }
];

// 优惠券 handler：内置当季精选永远兜底 → ok 恒为 true
async function couponsHandler() {
  const items=[]; const seen=new Set();
  SEASONAL_TRIPS.forEach(x => { seen.add(x.t); items.push({ ...x, source: '当季精选', live:true }); });
  try { const bingOut = []; await crawlBingCoupons(bingOut); bingOut.forEach(x => { if (!seen.has(x.t)) { seen.add(x.t); items.push(x); } }); } catch (e) {}
  const jobs = COUPON_SOURCES.map(async (url) => {
    try {
      const html = await fetchText(url, 8000);
      const name = url.replace(/^https?:\/\//, '').split('/')[0];
      const parsed = parseCouponDeals(html, name).filter(x => { if (seen.has(x.t)) return false; seen.add(x.t); return true; });
      return parsed;
    } catch (e) { return []; }
  });
  const results = await Promise.all(jobs);
  results.forEach(r => items.push(...r));
  const cache = { items: items.slice(0, 24), updatedAt: Date.now(), crawled: items.length };
  if (process.env.DEBUG_COUPONS) console.log('[coupons] refreshed', cache.items.length, 'items');
  return { ok: true, items: cache.items, updatedAt: cache.updatedAt, crawled: cache.crawled };
}

module.exports = {
  weatherHandler,
  newsHandler,
  couponsHandler,
  NEWS_SECTIONS,
  NEWS_CURATED,
  NEWS_CHANNELS,
  SEASONAL_TRIPS,
  todayStr
};