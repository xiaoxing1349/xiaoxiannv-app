// ============ 功能六：时尚穿搭（季节推荐 + 五行幸运色 + 场合指南 + 动画穿搭图） ============
(function () {
  const YL = window.YL;

  function esc(s) {
    if (s == null) return '';
    const map = { 'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'", 'nbsp': ' ' };
    let cur = String(s).replace(/<[^>]*>/g, ' ');
    let prev = ''; let guard = 0;
    while (cur !== prev && guard < 4) {
      prev = cur;
      cur = cur.replace(/&#x([0-9a-fA-F]{1,6});|&#(\d{1,7});/g, (_, h, d) => { try { return String.fromCodePoint(h ? parseInt(h, 16) : parseInt(d, 10)); } catch (e) { return ' '; } })
        .replace(/&([a-zA-Z]+);/g, (m, k) => (map[k] !== undefined ? map[k] : m));
      guard++;
    }
    return cur.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\s+/g, ' ').trim();
  }

  // 四季样式数据
  const SEASON_STYLE = {
    spring: {
      name: '春季', emoji: '🌸', key: '轻暖叠穿 · 春意盎然',
      tone: ['#4a8c5c', '#7ec28b'],
      desc: '春季气温多变，早晚温差大，建议采用"洋葱式叠穿法"。内搭轻薄透气，中间层选针织或薄毛衣，外套选风衣或轻薄夹克，方便随时增减。',
      tips: [
        '上装：薄针织衫、衬衫、卫衣，搭配轻薄风衣或牛仔外套',
        '下装：直筒裤、阔腿裤、A字裙，面料选棉麻或轻薄羊毛',
        '配色：以浅绿、米白、淡粉、天蓝等柔和色系为主，呼应春意',
        '鞋履：小白鞋、乐福鞋、浅口单鞋，轻便舒适',
        '配饰：丝巾、贝雷帽、轻薄围巾，点睛之笔不厚重'
      ],
      avoid: '避免过于厚重的外套和深色沉闷搭配，春天宜轻盈明亮。'
    },
    summer: {
      name: '夏季', emoji: '☀️', key: '清凉透气 · 防晒为先',
      tone: ['#2d7fb8', '#5bb5e8'],
      desc: '盛夏高温湿热，穿搭核心是"透气、防晒、清爽"。优先选择棉麻、真丝、冰丝等天然透气面料，浅色系反射阳光更凉快，同时注意物理防晒。',
      tips: [
        '上装：纯棉T恤、亚麻衬衫、吊带+薄开衫，选浅色系',
        '下装：棉麻短裤、阔腿裤、A字裙、百褶裙，宽松不贴腿',
        '防晒：UPF50+防晒衣、宽檐帽、太阳镜、冰袖',
        '鞋履：凉鞋、渔夫鞋、透气网面运动鞋',
        '配色：白色、浅蓝、薄荷绿、淡紫、鹅黄，清爽降温'
      ],
      avoid: '避免深色紧身衣物、化纤面料，闷热易出汗。'
    },
    autumn: {
      name: '秋季', emoji: '🍂', key: '层次质感 · 温暖大地色',
      tone: ['#8b5e3c', '#c4956a'],
      desc: '秋季气温渐凉，穿搭讲究层次感与质感。推荐毛衣、针织衫、风衣、西装外套等有质感的单品，大地色系是秋季永恒的经典，配合叠穿打造丰富层次。',
      tips: [
        '上装：高领毛衣、针织开衫、衬衫+马甲，外搭风衣或西装',
        '下装：直筒牛仔裤、毛呢裤、针织长裙、灯芯绒裤',
        '配色：驼色、焦糖、酒红、橄榄绿、深蓝，温暖高级',
        '鞋履：切尔西靴、马丁靴、乐福鞋、厚底运动鞋',
        '配饰：羊毛围巾、贝雷帽、皮质腰带，提升整体质感'
      ],
      avoid: '避免过于单薄的夏装直接过渡，注意早晚温差添衣。'
    },
    winter: {
      name: '冬季', emoji: '❄️', key: '保暖有型 · 长款为主',
      tone: ['#3a4a6b', '#6b7fa3'],
      desc: '冬季穿搭首要保暖，但不必臃肿。推荐长款羽绒服或羊毛大衣为核心单品，内搭高领毛衣或卫衣，下装选加绒裤或毛呢裤，兼顾温度与风度。青岛冬季海风大，务必防风。',
      tips: [
        '上装：高领毛衣、加绒卫衣、羽绒服、羊毛大衣，叠穿更暖',
        '下装：加绒牛仔裤、毛呢裤、厚针织裙+打底裤',
        '配色：黑色、深灰、藏蓝、酒红、奶白，经典耐看',
        '鞋履：雪地靴、加绒马丁靴、厚底运动鞋，防滑保暖',
        '配饰：围巾、手套、毛线帽、耳罩，青岛海风必备'
      ],
      avoid: '避免过于单薄暴露，海边出行务必防风防寒。'
    }
  };

  function getSeason() {
    const m = new Date().getMonth() + 1;
    if (m >= 3 && m <= 5) return 'spring';
    if (m >= 6 && m <= 8) return 'summer';
    if (m >= 9 && m <= 11) return 'autumn';
    return 'winter';
  }

  // ============ 五行模特穿搭图 ============
  const MODEL_IMGS = {
    '金': { src: './img/fashion-metal.jpg', alt: '金系穿搭 · 白色米色系', label: '✨ 今日金系穿搭 · 纯净优雅' },
    '木': { src: './img/fashion-wood.jpg', alt: '木系穿搭 · 绿色系', label: '🌿 今日木系穿搭 · 清新自然' },
    '水': { src: './img/fashion-water.jpg', alt: '水系穿搭 · 蓝色系', label: '💧 今日水系穿搭 · 沉稳知性' },
    '火': { src: './img/fashion-fire.jpg', alt: '火系穿搭 · 红色系', label: '🔥 今日火系穿搭 · 热情明媚' },
    '土': { src: './img/fashion-earth.jpg', alt: '土系穿搭 · 大地色系', label: '🏔️ 今日土系穿搭 · 温暖高级' }
  };

  // ============ 时尚博主穿搭实拍图（按色系） ============
  const COLLECTION_IMGS = {
    '金': [
      { src: './img/fashion-white1.jpg', alt: '白色吊带裙夏季穿搭' },
      { src: './img/fashion-white2.jpg', alt: '米色系夏季穿搭' }
    ],
    '木': [
      { src: './img/fashion-green1.jpg', alt: '绿色系夏季穿搭' },
      { src: './img/fashion-green2.jpg', alt: '绿色户外穿搭' }
    ],
    '水': [
      { src: './img/fashion-blue1.jpg', alt: '蓝色系夏季穿搭' },
      { src: './img/fashion-blue2.jpg', alt: '蓝白碎花连衣裙' }
    ],
    '火': [
      { src: './img/fashion-red1.jpg', alt: '粉色花卉穿搭' },
      { src: './img/fashion-red2.jpg', alt: '粉色系夏季穿搭' }
    ],
    '土': [
      { src: './img/fashion-brown1.jpg', alt: '驼色套装夏季穿搭' },
      { src: './img/fashion-brown2.jpg', alt: '棕色驼色穿搭' }
    ]
  };

  // ============ 五行幸运色搭配 ============
  const WUXING_COLORS = {
    '金': { colors: ['#f5f0e8', '#e8dcc8', '#d4c5a0', '#ffffff', '#faf8f2'], names: ['乳白', '米白', '香槟金', '纯白', '象牙白'], style: '金属性人宜穿白色、米色系，搭配金色饰品点亮。白色西装/衬衫干练利落，米色针织温柔知性。', items: '白色衬衫、米色风衣、香槟金配饰、象牙白针织衫' },
    '木': { colors: ['#4a8c5c', '#7ec28b', '#a8d8b9', '#2d6a3f', '#5b9a6b'], names: ['森林绿', '薄荷绿', '浅草绿', '深翠绿', '橄榄绿'], style: '木属性人宜穿绿色系，象征生机与成长。绿色衬衫清新自然，橄榄绿外套沉稳大气，搭配木质饰品更显质感。', items: '绿色衬衫、橄榄绿外套、草木印花裙、木质手串' },
    '水': { colors: ['#2d5f8a', '#4a8ab5', '#1a3a5c', '#6ba3c7', '#0d2b45'], names: ['深海蓝', '天蓝', '藏青', '雾蓝', '墨蓝'], style: '水属性人宜穿蓝色、黑色系，沉稳内敛如水。蓝色针织衫温柔知性，藏青西装干练专业，适合职场和正式场合。', items: '蓝色针织衫、藏青西装、深蓝牛仔裤、黑色长裤' },
    '火': { colors: ['#c0392b', '#e74c3c', '#ff6b6b', '#d4a017', '#f0c040'], names: ['中国红', '热情红', '珊瑚粉', '金色', '暖阳黄'], style: '火属性人宜穿红色、紫色系，热情奔放。红色单品作点睛之笔最佳，例如红色围巾或包包，大面积使用建议选酒红或紫红更显高级。', items: '红色围巾、酒红毛衣、紫红半裙、金色耳饰' },
    '土': { colors: ['#c4956a', '#d4a76a', '#e8c98b', '#a07840', '#f5deb3'], names: ['驼色', '卡其', '焦糖', '棕色', '麦色'], style: '土属性人宜穿黄色、棕色系，稳重踏实。驼色大衣是秋冬必备经典，卡其裤百搭不过时，整体给人温暖可靠的感觉。', items: '驼色大衣、卡其裤、焦糖毛衣、棕色皮带' }
  };

  function getDayWuxing() {
    const now = new Date();
    const baseDate = new Date(2026, 0, 1);
    const diffDays = Math.floor((now - baseDate) / (1000 * 60 * 60 * 24));
    const tgIndex = ((diffDays % 10) + 1) % 10;
    const tgNames = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const tgWuxing = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
    return { tg: tgNames[tgIndex], wuxing: tgWuxing[tgIndex], element: tgWuxing[tgIndex] };
  }

  // ============ 场合穿搭指南 ============
  const OCCASIONS = [
    {
      name: '通勤上班', emoji: '💼',
      desc: '职场穿搭讲究"得体、专业、有质感"。推荐简约干练的风格，以中性色为基础，用配饰或内搭小面积亮色点缀。',
      tips: [
        '女士：西装外套+直筒裤/半裙，或衬衫+阔腿裤，配色不超过三种',
        '男士：衬衫+西裤/休闲裤，外搭轻薄夹克或针织开衫',
        '鞋子选乐福鞋、牛津鞋或低跟单鞋，舒适且正式',
        '配饰宜精不宜多：一块简约手表或一条细项链即可点睛'
      ]
    },
    {
      name: '休闲出街', emoji: '🛍️',
      desc: '周末逛街、约会或朋友聚会，穿搭以舒适自在为主，但可以通过色彩和配饰提升时尚感。',
      tips: [
        '卫衣+牛仔裤是最经典的休闲组合，搭配帆布鞋青春活力',
        '连衣裙+小白鞋省心又好看，外搭牛仔外套应对温差',
        '尝试叠穿：T恤+衬衫敞开穿，层次感立现',
        '亮色包包或帽子是低成本提升时尚感的好方法'
      ]
    },
    {
      name: '运动健身', emoji: '🏃',
      desc: '运动穿搭以功能性为先，但也可以在运动装备中展现个人风格。',
      tips: [
        '速干面料运动T恤+leggings/运动短裤，透气排汗',
        '运动内衣要选支撑性好的，运动鞋根据运动类型选择',
        '同色系运动套装显高显瘦，撞色搭配更有活力',
        '防晒外套+空顶帽是户外跑步的标配'
      ]
    },
    {
      name: '约会聚会', emoji: '💕',
      desc: '约会或聚会的穿搭可以在保持舒适的基础上，增加一些精致感和女性化元素。',
      tips: [
        '连衣裙是最省心又出彩的选择，根据场合选长度',
        '真丝或缎面材质自带高级光泽，拍照也好看',
        '小面积露肤（锁骨、脚踝、手腕）比大面积更显精致',
        '一双精致的小跟鞋或设计感平底鞋，瞬间提升整体造型'
      ]
    },
    {
      name: '居家休闲', emoji: '🏠',
      desc: '居家也要穿得舒服有质感，不邋遢。棉麻、纯棉、莫代尔等亲肤面料是首选。',
      tips: [
        '纯棉家居服套装，柔软透气，颜色选浅色系更放松',
        '针织开衫是居家必备，随时披上应对温差',
        '居家拖鞋选软底防滑款，保护脚部',
        '即使不出门，换掉睡衣也能提升居家幸福感'
      ]
    }
  ];

  // ============ 注入动画样式 ============
  function injectStyles() {
    if (document.getElementById('fashionAnimStyle')) return;
    const style = document.createElement('style');
    style.id = 'fashionAnimStyle';
    style.textContent = `
      @keyframes fashionFadeIn {
        from { opacity: 0; transform: translateY(18px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes fashionSlideIn {
        from { opacity: 0; transform: translateX(30px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes fashionPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.03); }
      }
      @keyframes shimmer {
        0%   { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      .fashion-carousel {
        position: relative;
        border-radius: 16px;
        overflow: hidden;
        margin-bottom: 12px;
        background: #f5f5f5;
        box-shadow: 0 4px 16px rgba(0,0,0,.12);
      }
      .fashion-carousel img {
        width: 100%;
        display: block;
        object-fit: cover;
        aspect-ratio: 3/4;
        animation: fashionFadeIn 0.8s ease-out;
      }
      .fashion-carousel .fc-overlay {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        background: linear-gradient(transparent, rgba(0,0,0,0.55));
        padding: 20px 14px 12px;
        color: #fff;
        animation: fashionSlideIn 0.6s ease-out 0.3s both;
      }
      .fc-overlay .fc-label {
        font-size: 13px;
        font-weight: 600;
        opacity: 0.9;
        margin-bottom: 2px;
      }
      .fc-overlay .fc-title {
        font-size: 16px;
        font-weight: 700;
      }
      .fc-dots {
        display: flex;
        justify-content: center;
        gap: 6px;
        padding: 8px 0 4px;
      }
      .fc-dot {
        width: 6px; height: 6px;
        border-radius: 50%;
        background: #ddd;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      .fc-dot.active {
        width: 18px;
        border-radius: 4px;
        background: var(--gold, #e8a0b4);
      }
      .fashion-item-anim {
        animation: fashionFadeIn 0.5s ease-out both;
      }
      .fashion-item-anim:nth-child(1) { animation-delay: 0.05s; }
      .fashion-item-anim:nth-child(2) { animation-delay: 0.10s; }
      .fashion-item-anim:nth-child(3) { animation-delay: 0.15s; }
      .fashion-item-anim:nth-child(4) { animation-delay: 0.20s; }
      .fashion-item-anim:nth-child(5) { animation-delay: 0.25s; }
    `;
    document.head.appendChild(style);
  }

  // ============ 轮播状态 ============
  let _carouselTimer = null;
  let _carouselIdx = 0;

  function renderWuxingCarousel(container, imgs) {
    if (!imgs || !imgs.length) return;
    const idx = _carouselIdx % imgs.length;
    const img = imgs[idx];
    container.innerHTML = `
      <div class="fashion-carousel">
        <img src="${img.src}" alt="${esc(img.alt)}" loading="lazy" onerror="this.style.display='none'">
        <div class="fc-overlay">
          <div class="fc-label">👗 时尚博主穿搭 · 第${idx+1}张</div>
          <div class="fc-title">${esc(img.alt)}</div>
        </div>
        <div class="fc-dots">
          ${imgs.map((_, i) => `<div class="fc-dot ${i === idx ? 'active' : ''}" data-fi="${i}"></div>`).join('')}
        </div>
      </div>`;
    container.querySelectorAll('.fc-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const i = parseInt(dot.dataset.fi, 10);
        if (!isNaN(i) && i !== idx) {
          _carouselIdx = i;
          renderWuxingCarousel(container, imgs);
        }
      });
    });
    if (_carouselTimer) clearInterval(_carouselTimer);
    _carouselTimer = setInterval(() => {
      _carouselIdx = (_carouselIdx + 1) % imgs.length;
      renderWuxingCarousel(container, imgs);
    }, 3000);
  }

  // ============ 渲染 ============
  function renderSeason() {
    injectStyles();
    const s = SEASON_STYLE[getSeason()];
    const dw = getDayWuxing();
    const imgs = COLLECTION_IMGS[dw.wuxing] || [];

    const carouselHtml = imgs.length ? `<div id="fashionCarousel" style="margin-top:12px"></div>` : '';

    const html = `
      <div class="health-hero" style="background:linear-gradient(135deg,${s.tone[0]},${s.tone[1]})">
        <div class="hh-emoji">${s.emoji}</div>
        <div class="hh-body">
          <div class="hh-title">${s.name}穿搭 · ${s.key}</div>
          <div class="hh-sub">${s.desc}</div>
        </div>
      </div>
      ${carouselHtml}
      <div class="health-grid" style="margin-top:12px">
        ${s.tips.map((t, i) => `<div class="health-item fashion-item-anim"><div class="v">👗 ${esc(t)}</div></div>`).join('')}
      </div>
      <div class="health-tip fashion-item-anim" style="margin-top:10px">⚠️ ${esc(s.avoid)}</div>`;
    document.getElementById('fashionSeason').innerHTML = html;

    // 启动轮播
    const carouselEl = document.getElementById('fashionCarousel');
    if (carouselEl && imgs.length) {
      _carouselIdx = 0;
      renderWuxingCarousel(carouselEl, imgs);
    }
  }

  function renderColors() {
    const dw = getDayWuxing();
    const wx = WUXING_COLORS[dw.wuxing];
    if (!wx) return;
    const model = MODEL_IMGS[dw.wuxing];

    const shengMap = { '金': '土', '水': '金', '木': '水', '火': '木', '土': '火' };
    const sheng = shengMap[dw.wuxing];
    const shengWx = WUXING_COLORS[sheng];

    const swatches = wx.colors.map((c, i) =>
      `<div class="swatch" style="background:${c};width:22px;height:22px;display:inline-block;border-radius:6px;margin:2px;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.15)" title="${esc(wx.names[i])}"></div>`
    ).join('');

    // 模特穿搭展示图
    const modelHtml = model ? `
      <div class="fashion-model-card fashion-item-anim" style="background:#fff;border-radius:16px;overflow:hidden;margin-bottom:12px;box-shadow:var(--shadow);border:1.5px solid var(--line)">
        <div style="position:relative;overflow:hidden">
          <img src="${model.src}" alt="${esc(model.alt)}" style="width:100%;display:block;object-fit:cover;aspect-ratio:3/4" loading="lazy" onerror="this.style.display='none'">
          <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.6));padding:30px 14px 12px">
            <div style="color:#fff;font-size:15px;font-weight:700">${model.label}</div>
            <div style="color:rgba(255,255,255,0.85);font-size:12px;margin-top:2px">日柱 ${dw.tg} · ${dw.wuxing}属性 · 推荐色系：${wx.names.slice(0,3).join('、')}</div>
          </div>
        </div>
        <div style="padding:12px 14px">
          <div style="font-size:13px;color:#4a5568;line-height:1.7">${esc(wx.style)}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:6px;background:var(--gold-soft);border-radius:8px;padding:6px 10px">推荐单品：${esc(wx.items)}</div>
        </div>
      </div>
    ` : '';

    const html = `
      ${modelHtml}
      <div class="outfit-advice fashion-item-anim" style="background:linear-gradient(120deg,#fdf9ef,#f8f0d8);border-color:#efe3bd;color:#7a6420;margin-bottom:10px">
        📅 今日日柱：<b>${dw.tg}</b>（属<b>${dw.wuxing}</b>） · 幸运色系：${wx.names.slice(0,3).join('、')}
      </div>
      <div class="fashion-item-anim" style="background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:14px;margin-bottom:10px">
        <div style="font-weight:700;font-size:15px;color:var(--navy);margin-bottom:8px">🎨 ${dw.wuxing}属性 · 主穿搭色</div>
        <div style="margin-bottom:6px">${swatches}</div>
        <div style="font-size:13px;color:#4a5568;line-height:1.7">${esc(wx.style)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px">推荐单品：${esc(wx.items)}</div>
      </div>
      ${shengWx ? `
      <div class="fashion-item-anim" style="background:#fff;border:1.5px solid var(--line);border-radius:14px;padding:14px;margin-bottom:10px">
        <div style="font-weight:700;font-size:15px;color:var(--navy);margin-bottom:8px">🤝 相生搭配 · ${sheng}属性辅助色</div>
        <div style="margin-bottom:6px">${shengWx.colors.map((c,i) => `<div class="swatch" style="background:${c};width:22px;height:22px;display:inline-block;border-radius:6px;margin:2px;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.15)" title="${esc(shengWx.names[i])}"></div>`).join('')}</div>
        <div style="font-size:13px;color:#4a5568;line-height:1.7">${esc(shengWx.style)}</div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px">五行中${sheng}生${dw.wuxing}，搭配${sheng}属性色系可增强运势，推荐作为配饰或内搭色使用。</div>
      </div>
      ` : ''}
      <div class="outfit-advice fashion-item-anim" style="background:linear-gradient(120deg,#eef6ff,#e3f0ff);border-color:#c9e2ff;color:#24508c">
        💡 穿搭小贴士：主色占全身60%，辅助色占30%，点缀色占10%，整体和谐又出彩。幸运色不一定全身都穿，用在包包、围巾、鞋子等配饰上同样有效。
      </div>`;
    document.getElementById('fashionColors').innerHTML = html;
  }

  function renderOccasions() {
    const html = OCCASIONS.map((o, oi) => `
      <div class="coupon-card" style="margin-bottom:12px;animation:fashionFadeIn 0.5s ease-out ${0.1 + oi * 0.08}s both">
        <div class="cc-t">${o.emoji} ${esc(o.name)}</div>
        <div class="cc-d" style="margin-top:6px">${esc(o.desc)}</div>
        <div class="cc-steps" style="margin-top:8px">
          ${o.tips.map(t => `<div class="step">• ${esc(t)}</div>`).join('')}
        </div>
      </div>
    `).join('');
    document.getElementById('fashionOccasions').innerHTML = html;
  }

  function renderFashion() {
    renderSeason();
    renderColors();
    renderOccasions();
  }

  YL.renderFashion = renderFashion;
  // 页面离开时清理定时器
  window.addEventListener('beforeunload', () => { if (_carouselTimer) clearInterval(_carouselTimer); });
})();