// ============ 五行穿衣核心逻辑库 ============
// 规则依据：以当日"日支"五行定日主（"日支代表天"）。
// 五档优先级模型（对称自洽，木日精确匹配用户示例：火>木>金>土>水）：
//   1最宜=我生  2次宜=同我(比和)  3平=克我(官)  4次忌=我克(财)  5最忌=生我(印)
// 相生：木→火→土→金→水→木；相克：木→土→水→火→金→木

const EARTHLY_BRANCH = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土',
  '巳': '火', '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
};

// 五行代表色与着装关键词
const WUXING_COLOR = {
  '木': { level1: '绿色', level2: '青碧色', hex: ['#2e8b57', '#16a085', '#27ae60'], keywords: ['绿色系', '青碧色系'] },
  '火': { level1: '红色', level2: '紫色', hex: ['#c0392b', '#e74c3c', '#8e44ad'], keywords: ['红紫色系'] },
  '土': { level1: '黄色', level2: '棕色', hex: ['#d4a017', '#f1c40f', '#a0522d'], keywords: ['黄棕色系'] },
  '金': { level1: '白色', level2: '银色', hex: ['#ecf0f1', '#bdc3c7', '#95a5a6'], keywords: ['白银色系'] },
  '水': { level1: '黑色', level2: '蓝色', hex: ['#2c3e50', '#2980b9', '#1f2d3d'], keywords: ['黑蓝色系'] }
};

// 五行优先级排列：给定日主五行 → 返回 [五行1(最宜), 五行2, 五行3, 五行4, 五行5(最忌)]
const SHENG = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' }; // 我生
const KE = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };    // 我克
const BEI_KE = { '木': '金', '金': '火', '火': '水', '水': '土', '土': '木' }; // 克我

function getWuxingOrder(dayZhi) {
  const wo = EARTHLY_BRANCH[dayZhi] || '木';
  return [SHENG[wo], wo, BEI_KE[wo], KE[wo], SHENG[BEI_KE[wo]]];
}

// 五行相生用于生我 = reverse of SHENG
const BEI_SHENG = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };

// 生成某一天的五行穿衣完整档位
function genDailyOutfit(dayZhi) {
  const wo = EARTHLY_BRANCH[dayZhi] || '木';
  const order = getWuxingOrder(dayZhi); // [最宜, 次宜, 平, 次忌, 最忌]
  const levels = [
    { rank: 1, tag: '最宜', desc: '首选用色', wx: order[0] },
    { rank: 2, tag: '次宜', desc: '和气生财', wx: order[1] },
    { rank: 3, tag: '平', desc: '中规中矩', wx: order[2] },
    { rank: 4, tag: '次忌', desc: '尽量少用', wx: order[3] },
    { rank: 5, tag: '最忌', desc: '避免选择', wx: order[4] }
  ];
  levels.forEach(lv => {
    const c = WUXING_COLOR[lv.wx];
    lv.color = c.level1 + (c.level2 ? '、' + c.level2 : '');
    lv.hex = c.hex;
    lv.keywords = c.keywords.join('、');
  });
  return { dayZhi, dayWuxing: wo, levels };
}

// 根据衣+气温给出具体穿搭建议
function outfitAdvice(dayWuxing, weather, tempHigh, tempLow, isRain) {
  const adv = [];
  if (isRain) adv.push('今日有雨，请备好雨伞或防泼水外套');
  if (tempHigh >= 30) adv.push('气温较高，建议轻薄透气的棉麻夏装');
  else if (tempHigh >= 24) adv.push('体感舒适，短袖/薄衬衫+轻便长裤即可');
  else if (tempHigh >= 18) adv.push('早晚偏凉，建议加一件薄外套或开衫');
  else adv.push('气温较低，注意保暖，建议外套+长裤');
  // 五行对应穿搭场景化建议
  adv.push('主色系用于上装或外套，取色大面积；辅助色用于内搭、下装或配饰点缀，更显协调');
  return adv.join('；');
}

if (typeof module !== 'undefined') {
  module.exports = { EARTHLY_BRANCH, WUXING_COLOR, getWuxingOrder, genDailyOutfit, outfitAdvice };
}