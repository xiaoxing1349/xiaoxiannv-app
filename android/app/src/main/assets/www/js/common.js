// 通用工具
window.YL = window.YL || {};

function fmtDate(d) {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function today() { return fmtDate(new Date()); }
const WEEK = ['日','一','二','三','四','五','六'];

// 汉化干支元
function zhiName(zhi) {
  const m = { '子':'子水','丑':'丑土','寅':'寅木','卯':'卯木','辰':'辰土','巳':'巳火','午':'午火','未':'未土','申':'申金','酉':'酉金','戌':'戌土','亥':'亥水' };
  return m[zhi] || zhi;
}
function ganName(gan) {
  const m = { '甲':'甲木','乙':'乙木','丙':'丙火','丁':'丁火','戊':'戊土','己':'己土','庚':'庚金','辛':'辛金','壬':'壬水','癸':'癸水' };
  return m[gan] || gan;
}

window.YL.fmtDate = fmtDate;
window.YL.today = today;
window.YL.zhiName = zhiName;
window.YL.ganName = ganName;
window.YL.WEEK = WEEK;

// 后端 API 地址：
//   · 网页版：留空 = 同源(打开哪个域名就用哪个域名)，最省心
//   · 打包 APK 供手机：填手机能够访问的服务端地址，例如
//       http://192.168.x.x:8080      (手机与后端同一 Wi-Fi)
//       https://your-domain.com      (你有公网域名/已部署)
//   改完此值后重新打包 APK 即可在手机上拉取实时新闻。
window.YL.API_BASE = '';