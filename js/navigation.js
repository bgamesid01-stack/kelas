/* js/navigation.js
   Perpindahan halaman, navbar, dan menu garis tiga. */

/* ---- HALAMAN ---- */
let curPage = "beranda";
function go(p){
  curPage = p;
  const n = p === "catatan";
  document.querySelectorAll(".pg-home").forEach(e => e.classList.toggle("hidden", n));
  $("catatan").classList.toggle("hidden", !n);
  document.querySelectorAll("[data-go]").forEach(a => a.classList.toggle("on", a.dataset.go === p));
  if(n){ renderNotes(); window.scrollTo(0, 0); return }
  const t = p === "beranda" ? null : $(p);
  window.scrollTo({ top: t ? t.getBoundingClientRect().top + window.scrollY - 84 : 0, behavior: "smooth" });
}

/* ---- MENU GARIS TIGA ---- */
const drawer = $("drawer"), scrim = $("scrim"), menuBtn = $("menuBtn");
function setMenu(open){
  drawer.classList.toggle("on", open); scrim.classList.toggle("on", open);
  menuBtn.setAttribute("aria-expanded", String(open));
  drawer.setAttribute("aria-hidden", String(!open));
  document.body.style.overflow = open ? "hidden" : "";
  if(open) $("closeMenu").focus();
}
menuBtn.onclick = () => setMenu(true);
$("closeMenu").onclick = () => setMenu(false);
scrim.onclick = () => setMenu(false);
document.querySelectorAll("[data-go]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); setMenu(false); go(a.dataset.go) }));
$("editName").addEventListener("click", () => setMenu(false));
$("logout").addEventListener("click", () => { setMenu(false); go("beranda") });
document.addEventListener("keydown", e => { if(e.key === "Escape" && drawer.classList.contains("on")){ setMenu(false); menuBtn.focus() } });
