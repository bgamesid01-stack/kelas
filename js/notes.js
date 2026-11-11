/* js/notes.js
   Fitur Catatan: teks, daftar centang, dan struktur bertingkat. */

let notes = [], activeId = null, saveT;
const TIPE = { teks:["📝","Catatan"], centang:["✅","Daftar centang"], struktur:["🌳","Struktur"] };
const uid = () => Math.random().toString(36).slice(2, 9);
const nKey = () => "kelas_catatan_" + session.sub;
const cur = () => notes.find(x => x.id === activeId);
function persist(){ store.set(nKey(), notes); const e = $("saved"); if(e) e.textContent = "Tersimpan ✓" }
function touch(n){
  n.updated = Date.now();
  const e = $("saved"); if(e) e.textContent = "Menyimpan...";
  clearTimeout(saveT); saveT = setTimeout(() => { persist(); renderList() }, 400);
}
function findNode(list, id){ for(const x of list){ if(x.id === id) return x; const r = findNode(x.k, id); if(r) return r } }
function rmNode(list, id){ const i = list.findIndex(x => x.id === id); if(i > -1){ list.splice(i, 1); return true } return list.some(x => rmNode(x.k, id)) }
const newNode = () => ({ id: uid(), t: "", k: [] });
const tplKelas = () => [{ id:uid(), t:"Wali Kelas", k:[{ id:uid(), t:"Ketua Kelas", k:["Wakil Ketua","Sekretaris","Bendahara","Seksi Kebersihan"].map(t => ({ id:uid(), t, k:[] })) }] }];

function renderNotes(){
  notes = store.get(nKey(), []);
  if(!cur()) activeId = (matchMedia("(min-width:900px)").matches && notes.length) ? notes[0].id : null;
  renderList(); renderEditor();
}
function renderList(){
  const arr = [...notes].sort((a, b) => b.updated - a.updated);
  $("nItems").innerHTML = arr.length ? arr.map(n =>
    `<li><button type="button" class="nitem ${n.id === activeId ? "on" : ""}" data-id="${n.id}"><span class="ai">${TIPE[n.type][0]}</span><span>${esc(n.title || "Tanpa judul")}<small>${TIPE[n.type][1]}, ${new Date(n.updated).toLocaleDateString("id-ID", { day:"numeric", month:"short" })}</small></span></button></li>`).join("")
    : '<li class="sub">Belum ada catatan. Buat yang pertama lewat tombol di atas.</li>';
}
function renderEditor(){
  const n = cur(), box = $("nEditor");
  $("nt").classList.toggle("editing", !!n);
  if(!n){ box.innerHTML = '<div class="nempty"><div style="font-size:3rem">📒</div><p>Pilih catatan di samping atau buat yang baru.</p></div>'; return }
  box.innerHTML = `<div class="ehead"><button type="button" class="btn white back" id="nBack">Kembali</button><span class="badge">${TIPE[n.type][0]} ${TIPE[n.type][1]}</span><span id="saved" class="sv">Tersimpan ✓</span><button type="button" class="btn pink" id="nDel">Hapus</button></div><input type="text" id="nTitle" class="etitle" maxlength="80" placeholder="Judul catatan" value="${esc(n.title)}"><div id="nBody"></div>`;
  renderBody(n);
}
function treeHtml(list, d){
  return "<ul>" + list.map(x => `<li class="node"><div class="nrow"><input type="text" class="d${Math.min(d, 2)}" data-t="${x.id}" value="${esc(x.t)}" placeholder="Nama"><button type="button" class="mini" data-add="${x.id}" aria-label="Tambah turunan">+</button><button type="button" class="mini del" data-rm="${x.id}" aria-label="Hapus">✕</button></div>${x.k.length ? treeHtml(x.k, d + 1) : ""}</li>`).join("") + "</ul>";
}
function renderBody(n){
  let h = "";
  if(n.type === "teks") h = `<textarea id="nText" class="ebody" placeholder="Tulis catatanmu di sini...">${esc(n.body)}</textarea>`;
  if(n.type === "centang") h = n.items.map((it, i) => `<div class="crow"><input type="checkbox" data-i="${i}" ${it.d ? "checked" : ""}><input type="text" class="ci ${it.d ? "done" : ""}" data-i="${i}" value="${esc(it.t)}" placeholder="Isi item"><button type="button" class="mini del" data-del="${i}" aria-label="Hapus item">✕</button></div>`).join("") + '<div class="erow"><button type="button" class="btn mint" id="cAdd">+ Tambah item</button></div>';
  if(n.type === "struktur") h = `<div class="tree">${n.tree.length ? treeHtml(n.tree, 0) : '<p class="sub">Struktur masih kosong. Tambahkan induk, lalu tekan + untuk membuat turunannya.</p>'}</div><div class="erow"><button type="button" class="btn mint" id="tAdd">+ Tambah induk</button>${n.tree.length ? "" : '<button type="button" class="btn white" id="tTpl">Pakai contoh struktur kelas</button>'}</div>`;
  $("nBody").innerHTML = h;
}
function focusEl(sel){ const e = document.querySelector(sel); if(e) e.focus() }

$("catatan").addEventListener("click", e => {
  const nb = e.target.closest("[data-new]");
  if(nb){
    const t = nb.dataset.new;
    const n = { id: uid(), title: "", type: t, updated: Date.now(), body: "", items: t === "centang" ? [{ t:"", d:false }] : [], tree: [] };
    notes.push(n); activeId = n.id; persist(); renderList(); renderEditor(); window.scrollTo(0, 0); focusEl("#nTitle"); return;
  }
  const it = e.target.closest(".nitem");
  if(it){ activeId = it.dataset.id; renderList(); renderEditor(); window.scrollTo(0, 0); return }
  const n = cur(), b = e.target.closest("button");
  if(!n || !b) return;
  if(b.id === "nBack"){ activeId = null; renderList(); renderEditor(); window.scrollTo(0, 0) }
  else if(b.id === "nDel"){
    if(!confirm("Hapus catatan ini? Tindakan ini tidak bisa dibatalkan.")) return;
    notes = notes.filter(x => x !== n); activeId = null; persist(); renderList(); renderEditor();
  }
  else if(b.id === "cAdd"){ n.items.push({ t:"", d:false }); touch(n); renderBody(n); const l = document.querySelectorAll(".ci"); l[l.length - 1].focus() }
  else if(b.dataset.del !== undefined){ n.items.splice(+b.dataset.del, 1); touch(n); renderBody(n) }
  else if(b.id === "tAdd"){ const x = newNode(); n.tree.push(x); touch(n); renderBody(n); focusEl(`[data-t="${x.id}"]`) }
  else if(b.id === "tTpl"){ n.tree = tplKelas(); touch(n); renderBody(n) }
  else if(b.dataset.add){ const x = newNode(); findNode(n.tree, b.dataset.add).k.push(x); touch(n); renderBody(n); focusEl(`[data-t="${x.id}"]`) }
  else if(b.dataset.rm){
    const x = findNode(n.tree, b.dataset.rm);
    if(x.k.length && !confirm("Bagian ini punya turunan. Hapus semuanya?")) return;
    rmNode(n.tree, b.dataset.rm); touch(n); renderBody(n);
  }
});
$("nEditor").addEventListener("input", e => {
  const n = cur(), t = e.target; if(!n) return;
  if(t.id === "nTitle") n.title = t.value;
  else if(t.id === "nText") n.body = t.value;
  else if(t.classList.contains("ci")) n.items[+t.dataset.i].t = t.value;
  else if(t.dataset.t) findNode(n.tree, t.dataset.t).t = t.value;
  else return;
  touch(n);
});
$("nEditor").addEventListener("change", e => {
  const n = cur(), t = e.target;
  if(n && t.type === "checkbox"){ n.items[+t.dataset.i].d = t.checked; t.nextElementSibling.classList.toggle("done", t.checked); touch(n) }
});
