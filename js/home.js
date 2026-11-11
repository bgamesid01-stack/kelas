/* js/home.js
   Isi beranda: pengumuman, tugas kelas, dan jadwal pelajaran. */

function paintAvatar(el, name){
  el.innerHTML = "";
  const first = (name[0] || "?").toUpperCase();
  if(session.picture){
    const img = new Image(); img.src = session.picture; img.alt = ""; img.referrerPolicy = "no-referrer";
    img.onerror = () => { el.textContent = first };
    el.appendChild(img);
  } else el.textContent = first;
}
function renderHome(){
  if(!session) return;
  const name = profiles[session.sub]?.fullName || "", now = new Date(), jam = now.getHours();
  paintAvatar($("drAvatar"), name);
  $("drName").textContent = name; $("drMail").textContent = session.email || "";
  $("foot").textContent = "© " + now.getFullYear() + " Kelas Ceria. Dibuat dengan semangat untuk " + NAMA_KELAS + ".";

  const IK = ["📚","🧹","🌱","📌"];
  $("ann").innerHTML = PENGUMUMAN.map(([t, d], i) => `<li><span class="ai">${IK[i % IK.length]}</span><div><b>${t}</b>${d}</div></li>`).join("");

  const done = store.get("kelas_tugas_" + session.sub, {});
  $("tasks").innerHTML = TUGAS.map(([id, t, d]) =>
    `<li><label><input type="checkbox" data-id="${id}" ${done[id] ? "checked" : ""}><span>${t}<small>${d}</small></span></label></li>`).join("");
  const upd = () => { const n = TUGAS.filter(t => done[t[0]]).length; $("taskInfo").textContent = n + " dari " + TUGAS.length + " tugas sudah selesai"; $("bar").style.width = (n / TUGAS.length * 100) + "%"; };
  upd();
  $("tasks").onchange = e => {
    done[e.target.dataset.id] = e.target.checked;
    store.set("kelas_tugas_" + session.sub, done); upd();
    if(e.target.checked) toast("Mantap, tugas selesai!");
  };

  const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"][now.getDay()];
  const list = JADWAL[hari] || [];
  $("todayTitle").textContent = "Hari ini, " + hari;
  $("todayList").innerHTML = list.length
    ? list.map((m, i) => `<span class="chip"><small>Jam ${i + 1}</small>${m}</span>`).join("")
    : "<p style='margin:0;font-weight:700'>Hari ini libur. Istirahat yang cukup ya!</p>";

  const days = Object.keys(JADWAL), rows = JADWAL[days[0]].length;
  let h = "<thead><tr><th>Jam</th>" + days.map(d => `<th class="${d === hari ? "today" : ""}">${d}</th>`).join("") + "</tr></thead><tbody>";
  for(let i = 0; i < rows; i++){
    h += `<tr><td><b>${i + 1}</b></td>` + days.map(d => `<td class="${d === hari ? "today" : ""}">${JADWAL[d][i]}</td>`).join("") + "</tr>";
  }
  $("sched").innerHTML = h + "</tbody>";
  if(!JADWAL[selDay]) selDay = JADWAL[hari] ? hari : days[0];
  $("dayTabs").onclick = e => { const b = e.target.closest("button"); if(b){ selDay = b.dataset.d; renderDay() } };
  renderDay();
}
let selDay = null;
function renderDay(){
  $("dayTabs").innerHTML = Object.keys(JADWAL).map(d => `<button type="button" data-d="${d}" class="${d === selDay ? "on" : ""}">${d}</button>`).join("");
  $("dayList").innerHTML = JADWAL[selDay].map((m, i) => `<li><b>${i + 1}</b><span>${m}</span></li>`).join("");
}
