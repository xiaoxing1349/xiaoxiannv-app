// ============ 梅花易数核心逻辑库 ============
const HEX_DATA = require('./hex-data.js');

const BAGUA = {
  1: { name:'乾', ziran:'☰', wuxing:'金', nature:'刚健', obj:'天·老男·君父·政府' },
  2: { name:'兑', ziran:'☱', wuxing:'金', nature:'喜悦', obj:'泽·少女·口舌·西' },
  3: { name:'离', ziran:'☲', wuxing:'火', nature:'光明', obj:'火·中女·电·文书' },
  4: { name:'震', ziran:'☳', wuxing:'木', nature:'震动', obj:'雷·长男·行动·东' },
  5: { name:'巽', ziran:'☴', wuxing:'木', nature:'入顺', obj:'风·长女·财运·东南' },
  6: { name:'坎', ziran:'☵', wuxing:'水', nature:'险陷', obj:'水·中男·险·北' },
  7: { name:'艮', ziran:'☶', wuxing:'土', nature:'静止', obj:'山·少男·阻·东北' },
  8: { name:'坤', ziran:'☷', wuxing:'土', nature:'柔顺', obj:'地·老母·厚德·西南' }
};

const ZHI_NUM = { '子':1,'丑':2,'寅':3,'卯':4,'辰':5,'巳':6,'午':7,'未':8,'申':9,'酉':10,'戌':11,'亥':12 };
const HOUR = { '子时':1,'丑时':2,'寅时':3,'卯时':4,'辰时':5,'巳时':6,'午时':7,'未时':8,'申时':9,'酉时':10,'戌时':11,'亥时':12 };
const YEAR_GAN = { '甲':1,'乙':2,'丙':3,'丁':4,'戊':5,'己':6,'庚':7,'辛':8,'壬':9,'癸':10 }; // 用年支更常用
const DIR_BAGUA = { '东':'震','南':'离','西':'兑','北':'坎','东南':'巽','西南':'坤','西北':'乾','东北':'艮' };
const SHENG = { '木':'火','火':'土','土':'金','金':'水','水':'木' };
const KE = { '木':'土','土':'水','水':'火','火':'金','金':'木' };
const numName = {1:'一',2:'二',3:'三',4:'四',5:'五',6:'六'};

function numToGua(n) { const r = n % 8; return r === 0 ? 8 : r; }
function BUILD_HEX() {
  const m = {};
  for (const key in HEX_DATA) {
    const item = HEX_DATA[key];
    m[key] = {
      name: item.name, yi: item.yi, duan: item.duan, duanRun: item.duanRun,
      xiang: item.xiang, jing: item.jing, yaos: item.yaos.slice()
    };
  }
  return m;
}
const HEX = BUILD_HEX();
function getHex(shangName, xiaName) {
  const key = `${shangName}${xiaName}`;
  // 兼容八纯卦
  if (HEX[key]) return HEX[key];
  return null;
}

// 上卦/下卦输入（卦象） → 完整解卦
function buildGua(shang, xia, dong) {
  const S = typeof shang === 'number' ? BAGUA[shang] : shang;
  const X = typeof xia === 'number' ? BAGUA[xia] : xia;
  const Z = getHex(S.name, X.name);

  // 变卦：把动爻阴阳翻转（用八卦信号）
  const bits = guaBits(X.name) + guaBits(S.name); // 下卦在前(低3位)，上卦在后(高3位)，自下而上
  const arr = bits.split('');
  const yi = 5 - (dong - 1); // 动爻位置
  arr[yi] = arr[yi] === '1' ? '0' : '1';
  const b = arr.join('');
  const bianXiaName = bitsToGua(b.slice(0, 3));
  const bianShangName = bitsToGua(b.slice(3, 6));
  const B = getHex(bianShangName, bianXiaName);
  const bianGua = { shangName: bianShangName, xiaName: bianXiaName, data: B };

  // 互卦：主卦二三四爻为下互，三四五爻为上互
  const huXiaBits = bits[1] + bits[2] + bits[3];
  const huShangBits = bits[2] + bits[3] + bits[4];
  const huXiaName = bitsToGua(huXiaBits);
  const huShangName = bitsToGua(huShangBits);
  const H = getHex(huShangName, huXiaName);
  const huGua = { shangName: huShangName, xiaName: huXiaName, data: H };

  // 用体用生克
  // 动爻在下卦→下卦为用，上卦为体；动爻在上卦→上卦为用
  const dongInXia = dong <= 3;
  const tiGua = dongInXia ? X : S; // 体
  const yongGua = dongInXia ? S : X; // 用
  const shengK = {
    ti: tiGua.name + tiGua.wuxing, yong: yongGua.name + yongGua.wuxing,
    relation: tiYongRelation(tiGua.wuxing, yongGua.wuxing)
  };

  return { S, X, Z, dong, bianGua, huGua, shengK };
}

function tiYongRelation(tiWx, yongWx) {
  if (tiWx === yongWx) return '体用同类比和，处事多顺，进退有据';
  if (SHENG[tiWx] === yongWx) return `体${tiWx}生用${yongWx}，体生用力耗，主付出多、先劳后获`;
  if (SHENG[yongWx] === tiWx) return `用${yongWx}生体${tiWx}，用生体得力，主得助有靠，行事顺遂`;
  if (KE[tiWx] === yongWx) return `体${tiWx}克用${yongWx}，体克用能自持，主掌控局面、制胜有余`;
  if (KE[yongWx] === tiWx) return `用${yongWx}克体${tiWx}，用克体受制，主阻力较大、宜慎防`;
  return '关系平顺';
}

// ============ 五种起卦函数 ============
// 时间起卦：年月日时为四数，取上卦、下卦、动爻
function timeQiGua(yearZhi, month, day, hour) {
  const total = yearZhi + month + day;
  const shang = numToGua(total);
  const xia = numToGua(total + hour);
  const dong = (total + hour) % 6 || 6;
  return buildGua(shang, xia, dong);
}

// 数字起卦：任意两个数，分别取上下卦，和取动爻
function numberQiGua(num1, num2) {
  const shang = numToGua(num1);
  const xia = numToGua(num2);
  const dong = (num1 + num2) % 6 || 6;
  return buildGua(shang, xia, dong);
}

// 方位起卦：根据方位取卦，另一数取动爻
function directionQiGua(direction, num) {
  const guaName = DIR_BAGUA[direction];
  const shang = Object.keys(BAGUA).find(k => BAGUA[k].name === guaName);
  const xia = numToGua(num);
  const dong = (Object.keys(BAGUA).indexOf(shang) + 1 + num) % 6 || 6;
  return buildGua(parseInt(shang), xia, dong);
}

// 声音起卦：声音次数为上下卦，总次数为动爻
function soundQiGua(count1, count2) {
  const shang = numToGua(count1);
  const xia = numToGua(count2);
  const dong = (count1 + count2) % 6 || 6;
  return buildGua(shang, xia, dong);
}

// 文字起卦：两个字的笔画数取卦
function wordQiGua(stroke1, stroke2) {
  const shang = numToGua(stroke1);
  const xia = numToGua(stroke2);
  const dong = (stroke1 + stroke2) % 6 || 6;
  return buildGua(shang, xia, dong);
}

// 变爻解卦文字（依爻辞与规则）
function yaoInterpret(gua, dong) {
  const z = gua.Z;
  const yaoStr = z.yaos[dong - 1] || '';
  const yaoName = numName[dong] + '爻';
  return { yaoStr, yaoName, which: '第' + numName[dong] + '爻动' };
}

function guaBits(name) {
  const b = { '乾':'111','兑':'110','离':'101','震':'100','巽':'011','坎':'010','艮':'001','坤':'000' };
  return b[name] || '000';
}
function bitsToGua(bits) {
  const m = { '111':'乾','110':'兑','101':'离','100':'震','011':'巽','010':'坎','001':'艮','000':'坤' };
  return m[bits] || '坤';
}

module.exports = {
  BAGUA, ZHI_NUM, HOUR, YEAR_GAN, DIR_BAGUA, numToGua, getHex, buildGua,
  yaoInterpret, tiYongRelation, guaBits, bitsToGua, SHENG, KE, HEX,
  timeQiGua, numberQiGua, directionQiGua, soundQiGua, wordQiGua
};