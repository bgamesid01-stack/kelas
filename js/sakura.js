let _fid = 0;
function flowerSVG(){
  const id = "g" + (++_fid);
  let h = `<defs><radialGradient id="${id}" cx="50%" cy="85%" r="90%"><stop offset="0" stop-color="#e8719a"/><stop offset=".45" stop-color="#f7a8c4"/><stop offset="1" stop-color="#ffe3ee"/></radialGradient></defs>`;
  for(let i = 0; i < 5; i++) h += `<path transform="rotate(${i * 72})" d="M0 -2C-20 -10 -30 -42 -10 -58L0 -49L10 -58C30 -42 20 -10 0 -2Z" fill="url(#${id})" stroke="#f08fb0" stroke-width="1.2" stroke-linejoin="round"/>`;
  let st = "", dot = "";
  for(let i = 0; i < 8; i++){
    const a = i * Math.PI / 4, x = (Math.sin(a) * 15).toFixed(1), y = (-Math.cos(a) * 15).toFixed(1);
    st += `<line x1="0" y1="0" x2="${x}" y2="${y}"/>`; dot += `<circle cx="${x}" cy="${y}" r="2.3" fill="#d9507f"/>`;
  }
  return h + `<g stroke="#d9507f" stroke-width="1.4" stroke-linecap="round">${st}</g>${dot}<circle r="4" fill="#fff4a3" stroke="#d9507f"/>`;
}
document.querySelectorAll("svg[data-flower]").forEach(el => { el.setAttribute("viewBox", "-62 -62 124 124"); el.innerHTML = flowerSVG() });
function sprinkle(el, n){
  for(let i = 0; i < n; i++){
    const p = document.createElement("i"), z = 9 + Math.random() * 10;
    p.className = "petal";
    p.style.cssText = `left:${Math.random() * 100}%;width:${z}px;height:${z * 1.15}px;animation-duration:${9 + Math.random() * 9}s;animation-delay:${-Math.random() * 14}s;--dx:${-80 + Math.random() * 200}px`;
    el.appendChild(p);
  }
}
sprinkle(document.querySelector(".hero2"), 16);
sprinkle($("vLogin"), 14);
