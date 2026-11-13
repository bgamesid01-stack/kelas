/* server/worker.js
   Server akun kecil untuk web Kelas Ceria, berjalan gratis di Cloudflare Workers dengan penyimpanan KV.
   File ini TIDAK dijalankan oleh GitHub Pages. Salin isinya ke Worker di dashboard Cloudflare
   (langkah lengkap ada di README.md, bagian "Mode server").

   Yang dibutuhkan di Worker:
   - KV namespace dengan nama variabel (binding)  : AKUN
   - Secret / variabel dengan nama                : KODE_DAFTAR   (kode pendaftaran yang kamu bagikan ke kelas)

   Yang disimpan di KV hanya username, garam, dan hash kata sandi. Daftar akun tidak pernah dibuka ke publik:
   peramban hanya bisa meminta garam satu username, lalu mengirim hash untuk dicocokkan di sini. */

// Alamat web yang boleh memakai server ini. Sesuaikan dengan alamat webmu.
const ASAL_BOLEH = [
  "https://akonenusa.my.id",
  "https://www.akonenusa.my.id",
  "https://bgamesid01-stack.github.io",
  "http://localhost:8000"
];

const reUser = /^[a-z0-9][a-z0-9._]{2,19}$/;
const reGaram = /^[0-9a-f]{32}$/;
const reHash = /^[0-9a-f]{64}$/;

// Perbandingan teks yang waktunya tidak bergantung pada letak perbedaan.
function samaAman(a, b){
  if(a.length !== b.length) return false;
  let r = 0;
  for(let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function bacaAngka(env, kunci){ return parseInt(await env.AKUN.get(kunci) || "0", 10) }
async function tulisAngka(env, kunci, n, detik){
  try{ await env.AKUN.put(kunci, String(n), { expirationTtl: detik }) }catch(e){ /* batas tulis harian: abaikan */ }
}

export default {
  async fetch(req, env){
    const asal = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ASAL_BOLEH.includes(asal) ? asal : ASAL_BOLEH[0],
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    const jawab = (isi, status = 200) => new Response(JSON.stringify(isi), {
      status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" }
    });

    if(req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if(asal && !ASAL_BOLEH.includes(asal)) return jawab({ ok:false, pesan:"Asal tidak diizinkan." }, 403);

    const url = new URL(req.url);
    const ip = req.headers.get("CF-Connecting-IP") || "?";

    try{
      // 1. Meminta garam milik satu username
      if(req.method === "GET" && url.pathname === "/garam"){
        const u = url.searchParams.get("u") || "";
        if(!reUser.test(u)) return jawab({ ok:false, pesan:"Username tidak valid." }, 400);
        const akun = await env.AKUN.get("u:" + u, "json");
        return akun ? jawab({ ok:true, salt: akun.salt }) : jawab({ ok:false }, 404);
      }

      // 2. Mencocokkan hash kata sandi (maksimal 5 salah per 5 menit untuk tiap username)
      if(req.method === "POST" && url.pathname === "/masuk"){
        const { u, hash } = await req.json();
        if(!reUser.test(u || "") || !reHash.test(hash || "")) return jawab({ ok:false, pesan:"Data tidak valid." }, 400);
        const kunciGagal = "gagal:" + u, gagal = await bacaAngka(env, kunciGagal);
        if(gagal >= 5) return jawab({ ok:false, pesan:"Terlalu banyak percobaan. Coba lagi beberapa menit lagi." }, 429);
        const akun = await env.AKUN.get("u:" + u, "json");
        if(akun && samaAman(akun.hash, hash)) return jawab({ ok:true });
        await tulisAngka(env, kunciGagal, gagal + 1, 300);
        return jawab({ ok:false, pesan:"Username atau kata sandi salah." }, 401);
      }

      // 3. Mendaftarkan akun baru (harus memakai kode pendaftaran dari admin)
      if(req.method === "POST" && url.pathname === "/daftar"){
        if(!env.KODE_DAFTAR) return jawab({ ok:false, pesan:"Server belum diatur: KODE_DAFTAR masih kosong." }, 500);
        const { u, salt, hash, kode } = await req.json();
        const kunciIp = "kode:" + ip, salah = await bacaAngka(env, kunciIp);
        if(salah >= 10) return jawab({ ok:false, pesan:"Terlalu banyak percobaan. Coba lagi nanti." }, 429);
        if(!samaAman(String(kode || ""), env.KODE_DAFTAR)){
          await tulisAngka(env, kunciIp, salah + 1, 3600);
          return jawab({ ok:false, pesan:"Kode pendaftaran salah." }, 403);
        }
        if(!reUser.test(u || "") || !reGaram.test(salt || "") || !reHash.test(hash || "")) return jawab({ ok:false, pesan:"Data tidak valid." }, 400);
        if(await env.AKUN.get("u:" + u)) return jawab({ ok:false, pesan:"Username sudah dipakai." }, 409);
        await env.AKUN.put("u:" + u, JSON.stringify({ salt, hash, dibuat: Date.now() }));
        return jawab({ ok:true }, 201);
      }

      return jawab({ ok:false, pesan:"Tidak ditemukan." }, 404);
    }catch(err){
      return jawab({ ok:false, pesan:"Terjadi kesalahan di server." }, 500);
    }
  }
};
