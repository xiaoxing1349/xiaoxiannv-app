// ============ 功能三：新闻热点 + 要点 + 影响解析（每日新闻速览 · 解读与影响） ============
(function () {
  const YL = window.YL;
  let curSection = '全部';
  const DEFAULT_SECS = ['全部', '国内', '国际', '青岛', '文娱八卦', '热搜榜'];
  const NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];

  // 终极清洗器：无论原始 HTML/实体/模板标记里带什么"代码"，一律洗成纯汉字文本
  const _MAP = { 'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', 'apos': "'", 'nbsp': ' ' };
  function esc(s) {
    if (s == null) return '';
    let cur = String(s)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/\[!--[\s\S]*?--\]/g, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<!-[\s\S]*?->/g, ' ')
      .replace(/<[^>]*>/g, ' ');
    let prev = ''; let guard = 0;
    while (cur !== prev && guard < 4) {
      prev = cur;
      cur = cur
        .replace(/&#x([0-9a-fA-F]{1,6});|&#(\d{1,7});/g, (_, h, d) => { try { return String.fromCodePoint(h ? parseInt(h, 16) : parseInt(d, 10)); } catch (e) { return ' '; } })
        .replace(/&([a-zA-Z]+);/g, (m, k) => (_MAP[k] !== undefined ? _MAP[k] : m));
      guard++;
    }
    cur = cur
      .replace(/\[!--|htmlVideoCode|htmlimgcode|videoCode|imgCode|\[BEGIN\]|\[END\]|\[[A-Za-z:_]+\]/gi, ' ')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cur.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function _isCodeJunk(s) {
    const t = (s || '').replace(/[a-zA-Z0-9\s:;&<>\/\\\[\]{}=.,'"“”#%*+().-]/g, '');
    return t.length < 8;
  }

  // 分类 → 显示名 + 色彩 class
  function catInfo(n) {
    const sec = n.section || '国内';
    const cat = n.cat || '';
    // 优先用板块名，其次用分类
    const secName = { '国内': '国内要闻', '国际': '国际要闻', '青岛': '青岛本地', '文娱八卦': '文娱八卦', '热搜榜': '热搜榜' }[sec] || sec;
    const catName = { '综合要闻': '国内要闻', '国际新闻': '国际要闻', '本地要闻': '青岛本地', '热门搜索': '热搜榜', '热门视频': '热搜榜', '文化娱乐': '文娱八卦', '政策法规': '政策法规', '经济产业': '财经速览', '科技航天': '科技前沿', '民生健康': '民生关注', '国际外交': '国际动态', '文旅消费': '文旅消费', '安全法治': '安全法治' }[cat] || secName;
    const cls = 'cat-' + sec;
    return { name: catName, cls: cls };
  }

  // 从标题提取关联话题标签（#话题）
  const TAG_KEYWORDS = [
    '人工智能', 'AI', '机器人', '芯片', '半导体', '航天', '火箭', '卫星', '探月', '新能源汽车', '新能源', '数字经济', '数据', '隐私', '网络安全',
    '医保', '社保', '养老金', '养老', '医疗', '药品', '房价', '楼市', '房地产', '就业', '人才', '工资', '消费', '股市', 'A股', '基金', '理财',
    '外贸', '出口', '关税', '旅游', '文旅', '景区', '酒店', '电影', '综艺', '票房', '游戏', '电竞', '动漫', '二次元', '反诈', '诈骗', '油价', '降息', '利率', '贷款'
  ];
  function extractTags(title) {
    const t = String(title || '');
    const tags = [];
    for (const k of TAG_KEYWORDS) {
      if (t.includes(k)) tags.push(k);
      if (tags.length >= 4) break;
    }
    return tags;
  }

  // 单条新闻渲染：序号 + 彩色分类标签 + 标题 + 核心摘要 + 解读与影响 + 关联话题
  function itemHtml(n, idx) {
    const ci = catInfo(n);
    const num = NUMS[idx % NUMS.length] || (idx + 1);
    // 核心摘要：优先用 points 首条，否则用 impact 截断
    let raw = [];
    if (Array.isArray(n.points) && n.points.length) raw = n.points;
    else raw = (n.summary || n.title || '').split(/[。；;]/).map(s => s.trim()).filter(Boolean);
    if (!raw.length) raw = [n.title];
    const points = raw.filter(p => p && !_isCodeJunk(p));
    const fallback = raw.length && !points.length ? [n.title] : points;
    const li = fallback.map(p => `<li>${esc(p)}</li>`).join('');
    const sum = fallback[0] ? esc(fallback[0]) : '';
    // 关联话题
    const tags = extractTags(n.title);
    const tagHtml = tags.length ? `<div class="ntags">${tags.map(t => `<span class="ntag">#${esc(t)}</span>`).join('')}</div>` : '';
    const impact = n.impact && n.impact !== n.title ? n.impact : (fallback[1] || n.title);
    const heatHtml = n.heat ? `<span class="nheat">🔥 ${esc(n.heat)}</span>` : '';
    return `<div class="news-item">
      <div class="nt"><span class="nnum">${num}</span><span class="ncat ${ci.cls}">${esc(ci.name)}</span><span class="nt-title">${esc(n.title)}</span></div>
      <div class="nsrc"><span>🏛 ${esc(n.source)}</span>${heatHtml}<span>🕐 ${esc(n.time || n.date || '')}</span></div>
      <div class="ntli">
        <div class="ntli-h">📌 核心内容</div>
        <ul>${li}</ul>
      </div>
      <div class="nim"><div class="h">💡 解读与影响</div>${esc(impact)}</div>
      ${tagHtml}
      ${n.link ? `<a class="nlink" href="${n.link}" onclick="event.stopPropagation()">查看来源详情 →</a>` : ''}
    </div>`;
  }

  // 今日重点关注：跨板块挑 4 条，彩色卡片
  function renderFocus(items) {
    const card = document.getElementById('newsFocusCard');
    const holder = document.getElementById('newsFocus');
    if (!card || !holder) return;
    // 跨板块均衡挑选 4 条
    const groups = {};
    items.forEach(i => { const k = i.section || '国内'; (groups[k] = groups[k] || []).push(i); });
    const picked = [];
    const keys = Object.keys(groups);
    let gi = 0;
    while (picked.length < 4 && keys.length) {
      const k = keys[gi % keys.length];
      const g = groups[k];
      if (g && g.length) picked.push(g.shift());
      if (keys.every(kk => !groups[kk].length)) break;
      gi++;
    }
    if (!picked.length) { card.style.display = 'none'; return; }
    card.style.display = '';
    const colors = ['#e74c3c', '#e67e22', '#8e44ad', '#2980b9'];
    const names = ['重点', '关注', '热点', '要闻'];
    holder.innerHTML = `<div class="focus-grid">${picked.map((n, i) => {
      const ci = catInfo(n);
      return `<div class="focus-item" style="background:linear-gradient(135deg,${colors[i % 4]},${colors[i % 4]}cc)" onclick="location.href='${n.link || '#'}'">
        <span class="fi-tag">${names[i % 4]} · ${esc(ci.name)}</span>
        <span class="fi-title">${esc(n.title)}</span>
        <span class="fi-src">🏛 ${esc(n.source)}</span>
      </div>`;
    }).join('')}</div>`;
    const tag = document.getElementById('newsFocusTag');
    if (tag) tag.textContent = `${picked.length} 条 · ${todayStr()}`;
  }

  function todayStr() {
    const d = new Date();
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  function render(items) {
    const listEl = document.getElementById('newsList');
    const f = curSection === '全部' ? items : items.filter(n => (n.section || '国内') === curSection);
    // 国内板块：按 早/午/晚 新闻联播分组展示
    if (curSection === '国内') {
      const groups = { '早间': [], '午间': [], '晚间': [], '其他': [] };
      f.forEach(n => {
        const p = n.program;
        if (p === '早间' || p === '午间' || p === '晚间') groups[p].push(n);
        else groups['其他'].push(n);
      });
      const PROG_META = {
        '早间': { icon: '🌅', name: '早间新闻', sub: '《朝闻天下》 · 每日 06:00' },
        '午间': { icon: '☀️', name: '午间新闻', sub: '《新闻30分》 · 每日 12:00' },
        '晚间': { icon: '🌙', name: '晚间新闻', sub: '《新闻联播》 · 每日 19:00' },
        '其他': { icon: '📰', name: '更多国内要闻', sub: '权威媒体精选' }
      };
      let html = '';
      for (const key of ['早间', '午间', '晚间', '其他']) {
        const g = groups[key];
        if (!g.length) continue;
        const meta = PROG_META[key];
        html += `<div class="lb-group">
          <div class="lb-group-head"><span class="lb-ic">${meta.icon}</span><span class="lb-name">${meta.name}</span><span class="lb-sub">${meta.sub}</span><span class="lb-count">${g.length} 条</span></div>
          ${g.map((n, i) => itemHtml(n, i)).join('')}
        </div>`;
      }
      listEl.innerHTML = html || '<div class="nim" style="text-align:center">该板块暂无内容，切换其他板块看看</div>';
    } else {
      listEl.innerHTML = f.length ? f.map((n, i) => itemHtml(n, i)).join('')
        : '<div class="nim" style="text-align:center">该板块暂无内容，切换其他板块看看</div>';
    }
    // 今日重点关注只在"全部"展示
    if (curSection === '全部') renderFocus(items);
    else {
      const card = document.getElementById('newsFocusCard');
      if (card) card.style.display = 'none';
    }
    // 标题栏日期
    const d = new Date();
    const de = document.getElementById('newsDate');
    if (de) de.textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    const ie = document.getElementById('newsIssue');
    if (ie) {
      const start = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
      ie.textContent = `第${week}期`;
    }
  }

  function setTabs(secs, chanHtml) {
    const chanEl = document.getElementById('newsChannel');
    const tabEl = document.getElementById('newsTabs');
    if (chanHtml) chanEl.innerHTML = chanHtml;
    if (!tabEl) return;
    tabEl.innerHTML = secs.map(s => `<button class="news-tab${s === curSection ? ' active' : ''}" data-sec="${s}">${s}</button>`).join('');
    tabEl.querySelectorAll('.news-tab').forEach(b => {
      b.addEventListener('click', () => {
        curSection = b.dataset.sec;
        tabEl.querySelectorAll('.news-tab').forEach(x => x.classList.toggle('active', x === b));
        render(YL._lastItems || []);
      });
    });
  }

  async function loadNews() {
    const listEl = document.getElementById('newsList');
    const isNative = window.AndroidNet && typeof window.AndroidNet.get === 'function';
    const loadOffline = (why) => {
      const off = ((window.NEWS_OFFLINE && window.NEWS_OFFLINE.items) || []).map(i => ({ ...i, impact: (Array.isArray(i.points) && i.points.length ? i.points.join(' ') : (i.impact || i.title)) }));
      YL._lastItems = off;
      const chan = `<span class="ch-tag ch-live">● ${off.length ? '内置精选' : '暂无'}</span><span class="ch-tag">${window.NEWS_OFFLINE ? window.NEWS_OFFLINE.source + ' · 可离线查看' : '内置数据'}</span><button class="ch-tag ch-refresh" onclick="YL.loadNews()">↻ 联网刷新</button>`;
      setTabs(window.NEWS_OFFLINE ? window.NEWS_OFFLINE.sections : DEFAULT_SECS, chan);
      render(off);
      const loader = listEl && listEl.querySelector('.loader');
      if (loader && off.length) loader.remove();
    };
    loadOffline('内置');
    try {
      if (isNative) {
        const live = await YL._liveFetch();
        if (live && live.items && live.items.length) {
          YL._lastItems = live.items;
          const chan = `<span class="ch-tag ch-live">● 实时 ${live.crawled} 条</span><span class="ch-tag">更新于 ${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}</span><button class="ch-tag ch-refresh" onclick="YL.loadNews()">↻ 刷新</button><span class="ch-tag">直连抓取</span>`;
          setTabs(DEFAULT_SECS, chan);
          render(YL._lastItems);
          return;
        }
        return;
      }
      const base = (YL.API_BASE || '').replace(/\/$/, '');
      const r = await fetch(base + '/api/news', { signal: AbortSignal.timeout(12000) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'bad response');
      YL._lastItems = j.items || [];
      const upd = j.updatedAt ? new Date(j.updatedAt) : new Date();
      const p = n => String(n).padStart(2, '0');
      const t = j.cached ? `${p(upd.getHours())}:${p(upd.getMinutes())}` : '刚刚';
      const chan = `${j.crawled ? `<span class="ch-tag ch-live">● 实时 ${j.crawled} 条</span>` : `<span class="ch-tag ch-live">● 实时</span>`}<span class="ch-tag">更新于 ${t}</span><button class="ch-tag ch-refresh" onclick="YL.loadNews()">↻ 刷新</button>${(j.channels || []).slice(0, 4).map(c => `<span class="ch-tag">${esc(c)}</span>`).join('')}`;
      setTabs(j.sections || DEFAULT_SECS, chan);
      render(YL._lastItems);
    } catch (e) {
    }
  }

  YL.renderNews = () => render(YL._lastItems || []);
  YL.loadNews = loadNews;
})();