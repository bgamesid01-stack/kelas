function route(){
  if(!session){ show("vLogin"); return }
  const p = profiles[session.sub];
  if(!p || !p.fullName){ 
    openNameModal(false); show("vHome","vName"); renderHome(); return;
  }
  renderHome(); show("vHome");
}

function onLogin(user){
  session = user; store.set("kelas_session", session);
  route();
}

function decodeJwt(token){
  const b = token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");
  const json = decodeURIComponent(atob(b).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
  return JSON.parse(json);
}
function handleCredential(res){
  try{
    const d = decodeJwt(res.credential);
    onLogin({ sub: d.sub, email: d.email, picture: d.picture, gname: d.name });
  }catch(e){ toast("Login gagal, coba lagi ya") }
}
function initGoogle(){
  if(!GOOGLE_CLIENT_ID){
    $("demoBtn").classList.remove("hidden");
    return;
  }
  if(!(window.google && google.accounts && google.accounts.id)){ setTimeout(initGoogle, 300); return }
  google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleCredential });
  google.accounts.id.renderButton($("gbtn"), { theme:"filled_blue", size:"large", shape:"pill", text:"signin_with", logo_alignment:"left", width:280 });
}
$("demoBtn").onclick = () => onLogin({ sub:"demo-user", email:"siswa.demo@gmail.com", picture:"", gname:"Siswa Demo" });

function openNameModal(isEdit){
  editing = isEdit;
  $("nameTitle").textContent = isEdit ? "Ubah nama" : "Halo, teman baru!";
  $("nameDesc").textContent = isEdit ? "Perbarui nama lengkapmu di bawah ini." : "Sebelum masuk kelas, isi nama lengkapmu dulu ya. Nama ini akan tampil di beranda.";
  $("cancelName").classList.toggle("hidden", !isEdit);
  $("fullName").value = isEdit ? (profiles[session.sub]?.fullName || "") : "";
  $("nameErr").textContent = "";
  $("vName").classList.remove("hidden");
  setTimeout(() => $("fullName").focus(), 50);
}
function cleanName(s){ return s.trim().replace(/\s+/g, " ") }
function validName(s){
  if(s.length < 3) return "Nama minimal 3 huruf ya.";
  if(!/^[\p{L}][\p{L}\s.'’-]*$/u.test(s)) return "Pakai huruf saja ya, tanpa angka atau simbol aneh.";
  return "";
}
function saveName(){
  const v = cleanName($("fullName").value), e = validName(v);
  if(e){ $("nameErr").textContent = e; return }
  profiles[session.sub] = { fullName: v };
  store.set("kelas_profiles", profiles);
  $("vName").classList.add("hidden");
  renderHome(); show("vHome");
  toast(editing ? "Nama diperbarui" : "Selamat datang, " + v.split(" ")[0] + "!");
}
$("saveName").onclick = saveName;
$("fullName").addEventListener("keydown", e => { if(e.key === "Enter") saveName() });
$("cancelName").onclick = () => $("vName").classList.add("hidden");
$("editName").onclick = () => openNameModal(true);
$("logout").onclick = () => {
  if(window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
  session = null; store.set("kelas_session", null); route();
};
