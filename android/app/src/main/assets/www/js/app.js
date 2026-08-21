// ============ 主应用控制 ============
(function () {
  const YL = window.YL;

  // Tab 切换
  function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + name));
    if (name === 'news') YL.loadNews();
    if (name === 'health') YL.renderHealth();
    if (name === 'coupon') YL.renderCoupon();
    if (name === 'fashion') YL.renderFashion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 梅花易数方法切换
  document.getElementById('methodChips').addEventListener('click', ev => {
    const chip = ev.target.closest('.method-chip');
    if (!chip) return;
    document.querySelectorAll('.method-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    YL.renderMeihuaForm(chip.dataset.method);
  });
  document.getElementById('qiGuaBtn').addEventListener('click', () => YL.qiGua());

  // 顶部日期
  function setHeaderDate() {
    const now = new Date();
    const d = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 周${YL.WEEK[now.getDay()]}`;
    const h = now.getHours();
    const tide = h < 6 ? '夜深了' : h < 9 ? '早上好' : h < 12 ? '上午好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好';
    document.getElementById('headerDate').textContent = `${tide}，今天是${d}`;
  }

  // 初始化
  function init() {
    setHeaderDate();
    YL.renderMeihuaForm('time');
    YL.initToday(); // 功能一默认今天
    // 若从外部新闻详情返回（原生端带 #news），自动切到新闻列表
    const hash = (location.hash || '').replace('#', '');
    switchTab(hash === 'news' ? 'news' : 'lunar');
    // 注册 service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();