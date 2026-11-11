/* js/waktu.js
   Suasana pagi/siang/sore/malam dan gerak matahari/bulan menurut jam. */

// Matahari terbit 05.00 (kiri), tertinggi sekitar 11.30, terbenam 18.00 (kanan).
// Bulan terbit 18.00 (kiri), tertinggi sekitar 23.30, terbenam 05.00 (kanan).
function posisiLangit(h){
  const el = document.querySelector(".sun"); if(!el) return;
  const siang = h >= 5 && h < 18;
  const t = siang ? (h - 5) / 13 : ((h < 5 ? h + 24 : h) - 18) / 11;
  el.style.left = (8 + t * 84) + "%";
  el.style.top = (62 - 50 * Math.sin(Math.PI * t)) + "%";
}
function setWaktu(){
  // Untuk mencoba: tambahkan ?waktu=pagi / siang / sore / malam, atau ?jam=14.5 di alamat web.
  const sp = new URLSearchParams(location.search), d = new Date();
  let h = d.getHours() + d.getMinutes() / 60;
  const demo = { pagi:7.5, siang:12.5, sore:16.5, malam:23 }, q = sp.get("waktu"), j = parseFloat(sp.get("jam"));
  if(demo[q] !== undefined) h = demo[q]; else if(!isNaN(j) && j >= 0 && j < 24) h = j;
  document.documentElement.dataset.waktu = h >= 5 && h < 10 ? "pagi" : h >= 10 && h < 15 ? "siang" : h >= 15 && h < 18 ? "sore" : "malam";
  posisiLangit(h);
}
setWaktu(); setInterval(setWaktu, 60000);
