/* js/dokumentasi.js
   Galeri dokumentasi kegiatan kelas dan tampilan foto besar (lightbox). */

let dkIndex = 0;

function fmtTanggal(t){
  const d = new Date(t);
  return isNaN(d) ? "" : d.toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" });
}

function renderDokumentasi(){
  const g = $("dkGrid");
  if(!DOKUMENTASI.length){ g.innerHTML = '<p class="sub">Belum ada dokumentasi.</p>'; return }
  g.innerHTML = DOKUMENTASI.map((d, i) =>
    `<button type="button" class="dk-item" data-i="${i}" aria-label="Buka foto: ${esc(d.judul)}"><img src="${esc(d.foto)}" alt="${esc(d.judul)}" loading="lazy" draggable="false"><span class="dk-cap"><b>${esc(d.judul)}</b><small>${esc(fmtTanggal(d.tanggal))}</small></span></button>`).join("");
}

function lbShow(i){
  const n = DOKUMENTASI.length;
  dkIndex = (i + n) % n;
  const d = DOKUMENTASI[dkIndex];
  $("lbImg").src = d.foto; $("lbImg").alt = d.judul;
  $("lbCap").innerHTML = `<b>${esc(d.judul)}</b><span>${esc(fmtTanggal(d.tanggal))}</span>${d.keterangan ? `<p>${esc(d.keterangan)}</p>` : ""}`;
  $("lbPrev").classList.toggle("hidden", n < 2); $("lbNext").classList.toggle("hidden", n < 2);
}
function lbOpen(i){
  lbShow(i);
  $("lightbox").classList.remove("hidden");
  document.body.style.overflow = "hidden";
  $("lbClose").focus();
}
function lbClose(){
  $("lightbox").classList.add("hidden");
  document.body.style.overflow = "";
}
const lbTerbuka = () => !$("lightbox").classList.contains("hidden");

$("dkGrid").addEventListener("click", e => {
  const b = e.target.closest(".dk-item");
  if(b) lbOpen(+b.dataset.i);
});
$("lbClose").onclick = lbClose;
$("lbPrev").onclick = () => lbShow(dkIndex - 1);
$("lbNext").onclick = () => lbShow(dkIndex + 1);
$("lightbox").addEventListener("click", e => { if(e.target.id === "lightbox") lbClose() });
document.addEventListener("keydown", e => {
  if(!lbTerbuka()) return;
  if(e.key === "Escape") lbClose();
  else if(e.key === "ArrowLeft") lbShow(dkIndex - 1);
  else if(e.key === "ArrowRight") lbShow(dkIndex + 1);
});
let sentuhX = null;   // geser jari ke kiri/kanan untuk pindah foto
$("lightbox").addEventListener("touchstart", e => { sentuhX = e.touches[0].clientX }, { passive:true });
$("lightbox").addEventListener("touchend", e => {
  if(sentuhX === null) return;
  const dx = e.changedTouches[0].clientX - sentuhX; sentuhX = null;
  if(Math.abs(dx) > 50) lbShow(dkIndex + (dx < 0 ? 1 : -1));
}, { passive:true });
