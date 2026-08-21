// ============ 功能四：养生（季节养生 + 时辰养生） ============
(function () {
  const YL = window.YL;

  // 四季养生（按公历月份判定）
  const SEASONS = {
    spring: { name: '春季', months: [3, 4, 5], key: '春生', emoji: '🌱',
      tone: ['#2e7d32', '#66bb6a'],
      diet: '多吃辛温发散与绿色时蔬，如春笋、香椿、菠菜、豆芽、香菜，少食酸涩收敛之物。',
      sleep: '早睡早起，舒展筋骨，多到户外踏青、深呼吸，顺应阳气生发。',
      sport: '宜舒缓拉伸、快走与慢跑，量力而行，微微出汗即可，勿大汗伤阳。',
      mood: '春季肝气主升发，宜保持心情舒畅，少怒少郁，可借郊游亲近自然舒缓压力。',
      tip: '春捂秋冻：早晚温差大，注意护好背部与足踝，不宜过早脱减衣物。' },
    summer: { name: '夏季', months: [6, 7, 8], key: '夏长', emoji: '☀️',
      tone: ['#e65100', '#ff9800'],
      diet: '清热利湿、养心为先，多食苦瓜、绿豆、莲子、冬瓜、西瓜，少食辛辣油腻。',
      sleep: '宜晚睡早起，午后小憩 15 至 30 分钟以养心；纳凉勿贪凉，空调温度勿过低。',
      sport: '选早晚时段活动，运动以游泳、散步等轻中度项目为宜，避免正午暴晒大汗。',
      mood: '心主夏，戒躁戒怒，心静自然凉，可听舒缓音乐、练习冥想静心。',
      tip: '出汗多要及时补水补钾，可饮绿豆汤、酸梅汤；谨防中暑与空调病。' },
    autumn: { name: '秋季', months: [9, 10, 11], key: '秋收', emoji: '🍂',
      tone: ['#8d4e00', '#e8a33d'],
      diet: '润燥养肺，多食梨、百合、银耳、山药、蜂蜜及白色食物，少食辛辣。',
      sleep: '早睡早起，收敛神气；秋燥宜多饮水，午后可食酸甘化阴之品生津。',
      sport: '金秋气爽宜登山、慢跑、骑行，循序渐进增强体质，适时添衣防凉。',
      mood: '秋属金主收敛，易生悲秋情绪，宜平和心境，多晒太阳、多交流以调节情绪。',
      tip: '秋季干燥易伤津液，多食润肺之品；早晚转凉注意护肺护鼻，预防呼吸道不适。' },
    winter: { name: '冬季', months: [12, 1, 2], key: '冬藏', emoji: '❄️',
      tone: ['#1a3a5c', '#3d6a9e'],
      diet: '温补养肾，多食羊肉、牛肉、山药、黑芝麻、核桃，宜温热、易消化。',
      sleep: '宜早睡晚起，作息顺应冬藏之性；注意保暖，头、足尤须护好。',
      sport: '宜室内温和运动如太极、八段锦、慢跑，太阳升起后再锻炼为佳。',
      mood: '冬主收藏，精神宜内守，可早睡养阴，多与家人朋友交流温暖身心。',
      tip: '进补有度、辨证为宜，膏方进补需遵医嘱；睡前热水泡脚 20 分钟以温阳助眠。' }
  };

  function currentSeason() {
    const m = new Date().getMonth() + 1;
    for (const k in SEASONS) {
      if (SEASONS[k].months.includes(m)) return { k, s: SEASONS[k] };
    }
    return { k: 'winter', s: SEASONS.winter };
  }

  // 十二时辰表（子至亥）
  const SHICHEN = [
    { hours: '23:00-01:00', z: '胆经值守', name: '子时 · 胆经当令', emoji: '🌙',
      txt: '「胆为中正之官」此时最佳养生为熟睡，以养胆气、助好眠。子时前入睡收益最大，切勿熬夜。',
      act: '放下手机，上床就寝，营造黑暗、安静的睡眠环境。' },
    { hours: '01:00-03:00', z: '肝经值守', name: '丑时 · 肝经当令', emoji: '😴',
      txt: '「人卧则血归于肝」深睡眠是肝脏排毒修复的黄金期。此阶段应保持熟睡，切忌熬夜伤肝。',
      act: '若醒后难再入睡，闭目静卧，不要看屏幕。' },
    { hours: '03:00-05:00', z: '肺经值守', name: '寅时 · 肺经当令', emoji: '🌬️',
      txt: '肺主气司呼吸，此时气血由静转动，易惊醒或轻微咳嗽。宜保持温暖通风的睡眠环境。',
      act: '惯常醒来可做几次深呼吸，再续睡或起身静坐。' },
    { hours: '05:00-07:00', z: '大肠经值守', name: '卯时 · 大肠经当令', emoji: '🚻',
      txt: '「肺与大肠相表里」晨起排便并喝一杯温水，唤醒肠道蠕动，是开启一天循环的起点。',
      act: '起床后温开水一杯，顺时针轻揉腹部，养成定时排便习惯。' },
    { hours: '07:00-09:00', z: '胃经值守', name: '辰时 · 胃经当令', emoji: '🍚',
      txt: '此时胃气最旺，是吃早餐的最佳时间。按时、营养均衡进餐，滋养一整天的精力。',
      act: '吃好早餐：主食 + 蛋奶 + 蔬果，细嚼慢咽，不宜边走边吃。' },
    { hours: '09:00-11:00', z: '脾经值守', name: '巳时 · 脾经当令', emoji: '💪',
      txt: '脾主运化水谷、主肌肉四肢，此时精力最盛，适合处理复杂脑力工作，但忌久坐。',
      act: '每坐 45 分钟起身活动伸展，适时饮温水解乏。' },
    { hours: '11:00-13:00', z: '心经值守', name: '午时 · 心经当令', emoji: '🥣',
      txt: '「心主血脉」此时阴阳交替于中，宜用午膳并小憩养心。午睡 15 至 30 分钟，胜过后半夜熬夜补觉。',
      act: '午餐七分饱，饭后小憩，勿趴桌久睡或立即剧烈运动。' },
    { hours: '13:00-15:00', z: '小肠经值守', name: '未时 · 小肠经当令', emoji: '☕',
      txt: '小肠分清泌浊、负责营养吸收，午后宜少量多次补水，帮助消化吸收更顺畅。',
      act: '午后喝杯温水或淡茶，稍作走动清醒头脑。' },
    { hours: '15:00-17:00', z: '膀胱经值守', name: '申时 · 膀胱经当令', emoji: '🏃',
      txt: '膀胱经贯穿全身，此时精神充沛、最适合锻炼与饮水，也是运动排毒的黄金时段。',
      act: '安排 30 分钟快走或运动，及时补水，勿憋尿。' },
    { hours: '17:00-19:00', z: '肾经值守', name: '酉时 · 肾经当令', emoji: '🍲',
      txt: '肾藏精纳气，此时宜以清淡、少盐少油的晚餐收尾一天的进食，为夜间蓄养精气。',
      act: '晚餐清淡、七分饱，饭后散步帮助消化、放松身心。' },
    { hours: '19:00-21:00', z: '心包经值守', name: '戌时 · 心包经当令', emoji: '🧘',
      txt: '心包经护心，此时适合散步、聊天、泡脚等放松活动，让身心逐渐归于平静。',
      act: '睡前两小时不再接触刺激信息，热水泡脚、轻柔按摩放松。' },
    { hours: '21:00-23:00', z: '三焦经值守', name: '亥时 · 三焦经当令', emoji: '🛌',
      txt: '三焦通百脉，此时宜静养准备入睡，是迎接子时深睡的「黄金睡眠前奏」。',
      act: '准备就寝：泡脚、读点轻松的书籍，定时关灯入睡。' }
  ];

  // 当前小时 → 时辰下标
  function idxOfHour(h) { return Math.floor(((h + 1) % 24) / 2); }

  function esc(s) { return (s || '').replace(/[<>]/g, ''); }

  // ============ 当季每日饭菜推荐（按季节食材 + 日期轮换，每日自动更新） ============
  // 每季各配 7 组"一日三餐+午茶"，用当天日期取模轮换，保证每日不重样
  const SEASON_MEALS = {
    spring: { name:'春季', title:'春养肝 · 升发宜辛甘', emoji:'🌱',
      meals: [
        { d:'春笋炒肉片', z:'小米南瓜粥', s:'香椿拌豆腐', w:'荸荠雪梨汤' },
        { d:'韭菜炒鸡蛋', z:'燕麦牛奶羹', s:'凉拌菠菜粉丝', w:'绿豆百合茶' },
        { d:'豌豆炒虾仁', z:'菠菜猪肝粥', s:'荠菜豆腐羹', w:'蜂蜜柠檬水' },
        { d:'香椿炒蛋面', z:'山药红枣粥', s:'拌木耳莴笋丝', w:'草莓酸奶杯' },
        { d:'春笋笃鲜汤', z:'五谷杂粮粥', s:'蒜蓉西兰花', w:'甘蔗马蹄水' },
        { d:'荠菜肉末豆腐', z:'小米鸡蛋粥', s:'凉拌香干芹菜', w:'樱桃柠檬饮' },
        { d:'豌豆牛肉粒', z:'山药薏米粥', s:'拌青笋海带丝', w:'陈皮山楂茶' }
      ] },
    summer: { name:'夏季', title:'夏养心 · 清热宜甘淡', emoji:'☀️',
      meals: [
        { d:'冬瓜排骨汤', z:'绿豆莲子粥', s:'凉拌苦瓜木耳', w:'酸梅汤' },
        { d:'丝瓜炒鸡蛋', z:'薏米红豆粥', s:'拍黄瓜&番茄', w:'绿豆沙' },
        { d:'清蒸鲈鱼', z:'荷叶粥', s:'凉拌藕片', w:'西瓜薄荷饮' },
        { d:'苦瓜酿肉', z:'小米南瓜粥', s:'蒜蓉空心菜', w:'乌梅冰糖水' },
        { d:'莲子百合瘦肉汤', z:'绿豆百合粥', s:'凉拌莴笋丝', w:'柠檬蜂蜜水' },
        { d:'番茄龙利鱼', z:'玉米碴粥', s:'拌海带豆腐丝', w:'银耳莲子羹' },
        { d:'冬瓜薏米鸭肉汤', z:'赤小豆粥', s:'凉拌黄瓜鸡丝', w:'菊花茶' }
      ] },
    autumn: { name:'秋季', title:'秋养肺 · 润燥宜酸甘', emoji:'🍂',
      meals: [
        { d:'银耳雪梨羹', z:'山药小米粥', s:'凉拌百合西芹', w:'蜂蜜百合水' },
        { d:'莲藕排骨汤', z:'南瓜燕麦粥', s:'清炒时蔬', w:'雪梨杏仁饮' },
        { d:'香菇蒸鸡', z:'核桃芝麻糊', s:'拌豆腐丝青椒', w:'桂圆红枣茶' },
        { d:'萝卜炖牛腩', z:'小米红薯粥', s:'清炒秋葵', w:'蜂蜜柚子茶' },
        { d:'百合炒虾仁', z:'山药薏米粥', s:'凉拌木耳', w:'梨汁银耳羹' },
        { d:'板栗烧鸡', z:'牛奶燕麦粥', s:'炒荷兰豆', w:'桂圆银耳水' },
        { d:'山藥蒸排骨', z:'小米南瓜粥', s:'清炒芥蓝', w:'秋梨膏冲饮' }
      ] },
    winter: { name:'冬季', title:'冬养肾 · 温补宜温热', emoji:'❄️',
      meals: [
        { d:'羊肉萝卜汤', z:'枸杞小米粥', s:'蒜蓉菠菜', w:'红枣桂圆茶' },
        { d:'红烧牛肉', z:'核桃黑芝麻糊', s:'炒白菜粉丝', w:'姜枣红糖水' },
        { d:'清炖乌鸡汤', z:'山药米糊', s:'香菇炒青菜', w:'桂圆枸杞茶' },
        { d:'葱爆羊肉', z:'黑米粥', s:'炖萝卜', w:'花生核桃饮' },
        { d:'当归生姜羊肉汤', z:'小米红枣粥', s:'木耳炒山药', w:'陈皮姜茶' },
        { d:'红烧排骨', z:'板栗核桃粥', s:'炖大白菜豆腐', w:'枸杞红枣水' },
        { d:'香菇炖鸡', z:'紫薯小米粥', s:'清炒胡萝卜', w:'姜汁热牛奶' }
      ] }
  };
  function dishRow(label, v) { return `<div class="dish-row"><div class="dish-label">${label}</div><div class="dish-val">${esc(v)}</div></div>`; }
  function renderDish() {
    const m = new Date().getMonth() + 1;
    const seasonData = m >= 3 && m <= 5 ? SEASON_MEALS.spring : m >= 6 && m <= 8 ? SEASON_MEALS.summer : m >= 9 && m <= 11 ? SEASON_MEALS.autumn : SEASON_MEALS.winter;
    const today = new Date();
    const idx0 = (today.getDate() + 0) % seasonData.meals.length;
    const idx1 = (today.getDate() + 1) % seasonData.meals.length;
    const meals0 = seasonData.meals[idx0];
    const meals1 = seasonData.meals[idx1];
    const d1d = today.getDate();
    const d2 = new Date(today); d2.setDate(d2.getDate() + 1); const d2d = d2.getDate();
    const tag = document.getElementById('healthDishTag');
    if (tag) tag.textContent = seasonData.name + ' · ' + seasonData.emoji;
    const html = `
       <div class="dish-wrap">
       <div class="dish-col">
         <div class="dish-col-head">今日 ${d1d}日</div>
         ${dishRow('🌅 早餐', meals0.z)}
         ${dishRow('☀️ 午餐', meals0.d)}
         ${dishRow('🌤 下午茶', meals0.w)}
         ${dishRow('🌙 晚餐', meals0.s)}
       </div>
       <div class="dish-col">
         <div class="dish-col-head">明日 ${d2d}日</div>
         ${dishRow('🌅 早餐', meals1.z)}
         ${dishRow('☀️ 午餐', meals1.d)}
         ${dishRow('🌤 下午茶', meals1.w)}
         ${dishRow('🌙 晚餐', meals1.s)}
       </div>
       </div>
       <div class="health-tip" style="margin-top:12px">💡 ${esc(seasonData.title)}：一日三餐搭配应季食材，清淡少油，温热为主，晚餐七分饱。</div>`;
     document.getElementById('healthDish').innerHTML = html;
  }

  function renderHealth() {
    const { s, k } = currentSeason();
    // 季节卡片
    document.getElementById('healthSeasonTag').textContent = s.key + ' · ' + (s.name);
    const seasonHtml = `
      <div class="health-hero" style="background:linear-gradient(135deg,${s.tone[0]},${s.tone[1]})">
        <div class="hh-emoji">${s.emoji}</div>
        <div class="hh-body">
          <div class="hh-title">${s.name}·${s.key}</div>
          <div class="hh-sub">${k === 'spring' ? '宜疏 宜生发' : k === 'summer' ? '宜清 宜养心' : k === 'autumn' ? '宜润 宜收敛' : '宜温 宜藏精'}</div>
        </div>
      </div>
      <div class="health-grid">
        <div class="health-item"><div class="h">🥗 饮食</div><div class="v">${esc(s.diet)}</div></div>
        <div class="health-item"><div class="h">🛌 起居睡眠</div><div class="v">${esc(s.sleep)}</div></div>
        <div class="health-item"><div class="h">🏃 运动</div><div class="v">${esc(s.sport)}</div></div>
        <div class="health-item"><div class="h">🧠 情志</div><div class="v">${esc(s.mood)}</div></div>
      </div>
      <div class="health-tip">💡 ${esc(s.tip)}</div>`;
    document.getElementById('healthSeason').innerHTML = seasonHtml;

    // 当前时辰
    const sc = SHICHEN[idxOfHour(new Date().getHours())];
    document.getElementById('healthNowTag').textContent = sc.name;
    document.getElementById('healthNow').innerHTML = `
      <div class="now-shichen">
        <div class="ns-emoji">${sc.emoji}</div>
        <div class="ns-body">
          <div class="ns-name">${sc.name} <span class="ns-z">${sc.z}</span></div>
          <div class="ns-hours">⏰ ${sc.hours}</div>
          <div class="ns-txt">${esc(sc.txt)}</div>
        </div>
      </div>
      <div class="health-tip">✅ 现时建议：${esc(sc.act)}</div>`;

    // 今日时令饭菜
    renderDish();

    // 十二时辰表
    document.getElementById('healthShichen').innerHTML = SHICHEN.map((c, i) => {
      const now = i === idxOfHour(new Date().getHours());
      return `<div class="shichen-card${now ? ' now' : ''}">
        <div class="sh-head"><span class="sh-emoji">${c.emoji}</span><b>${c.name}</b></div>
        <div class="sh-hours">${c.hours}</div>
        <div class="sh-z">${c.z}</div>
        <div class="sh-acts">${esc(c.act)}</div>
        ${now ? '<div class="sh-now">● 当前时辰</div>' : ''}
      </div>`;
    }).join('');
  }

  YL.renderHealth = renderHealth;
})();