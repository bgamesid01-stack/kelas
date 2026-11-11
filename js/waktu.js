function posisiLangit(h){
  const el = document.querySelector(".sun"); if(!el) return;
  const siang = h >= 5 && h < 18;
  const t = siang ? (h - 5) / 13 : ((h < 5 ? h + 24 : h) - 18) / 11;
  el.style.left = (8 + t * 84) + "%";
  el.style.top = (62 - 50 * Math.sin(Math.PI * t)) + "%";
}
function setWaktu(){
  const sp = new URLSearchParams(location.search), d = new Date();
  let h = d.getHours() + d.getMinutes() / 60;
  const demo = { pagi:7.5, siang:12.5, sore:16.5, malam:23 }, q = sp.get("waktu"), j = parseFloat(sp.get("jam"));
  if(demo[q] !== undefined) h = demo[q]; else if(!isNaN(j) && j >= 0 && j < 24) h = j;
  document.documentElement.dataset.waktu = h >= 5 && h < 10 ? "pagi" : h >= 10 && h < 15 ? "siang" : h >= 15 && h < 18 ? "sore" : "malam";
  posisiLangit(h);
}
setWaktu(); setInterval(setWaktu, 60000);
