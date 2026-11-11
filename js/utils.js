/* js/utils.js
   Fungsi bantu (penyimpanan lokal, pemilih elemen, notifikasi) dan state sesi. */

const store = {
  get(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d }catch(e){ return d } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)) }catch(e){} }
};
const $ = id => document.getElementById(id);
const views = ["vLogin","vHome","vName"];
let session = store.get("kelas_session", null);   // {sub,email,picture,gname}
let profiles = store.get("kelas_profiles", {});   // {sub:{fullName}}
let editing = false;

function show(...names){ views.forEach(v => $(v).classList.toggle("hidden", !names.includes(v))) }
function toast(t){
  const e = document.createElement("div"); e.className = "toast"; e.textContent = t;
  document.body.appendChild(e); setTimeout(() => e.remove(), 2200);
}

// Mengamankan teks sebelum dimasukkan ke HTML.
const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
