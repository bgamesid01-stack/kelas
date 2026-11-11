(function(){
  const boleh = e => e.target && e.target.closest && e.target.closest("input,textarea"); // kolom nama tetap bisa diketik
  ["copy","cut","contextmenu","selectstart","dragstart"].forEach(ev =>
    document.addEventListener(ev, e => { if(!boleh(e)) e.preventDefault() }));
  document.addEventListener("keydown", e => {
    if(boleh(e)) return;
    const k = e.key.toLowerCase();
    if((e.ctrlKey || e.metaKey) && ["c","x","a","u","s","p"].includes(k)) e.preventDefault();
  });
})();
