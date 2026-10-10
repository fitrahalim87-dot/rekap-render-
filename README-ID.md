# Recap Render Pairing — panduan deploy tanpa GitHub

Paket ini berisi frontend HTML, API pairing untuk Vercel Functions, penyimpanan sesi Redis melalui Upstash REST API, reverse proxy ke worker Colab, snippet integrasi, serta notebook Recap Render dengan sel pairing tambahan (`recap_render_server_v3_pairing.ipynb`).

## Penting sebelum digunakan
- Ini fondasi pairing. Endpoint render asli belum dipanggil otomatis karena bentuk payload/upload dari notebook `recap_render_server_v3.ipynb` harus dicocokkan dulu.
- Kode pairing berlaku singkat (TTL 120 detik diperbarui heartbeat); sesi browser berlaku 8 jam.
- Worker harus memakai HTTPS Cloudflare Quick Tunnel `*.trycloudflare.com`.
- Jangan pernah menaruh `PAIRING_SECRET` atau token database di `index.html`.
- Jangan gunakan endpoint ini untuk data rahasia tanpa meninjau autentikasi, pembatasan percobaan kode, dan kebijakan penyimpanan.

## A. Buat database Upstash Redis
1. Buka https://console.upstash.com/ dari HP dan login.
2. Buat database Redis baru.
3. Buka detail database dan salin `UPSTASH_REDIS_REST_URL` serta `UPSTASH_REDIS_REST_TOKEN`.
4. Jangan kirim token tersebut ke chat atau menaruhnya di HTML.

## B. Siapkan project Vercel tanpa GitHub
Cara yang paling bisa diandalkan tanpa GitHub adalah menggunakan Vercel CLI dari komputer atau Termux di Android. Dashboard Vercel umumnya meminta repository Git untuk alur impor biasa; file ZIP saja tidak selalu bisa langsung di-deploy dari dashboard.
1. Ekstrak ZIP ini ke folder `recap-render-pairing`.
2. Di Termux, pasang Node.js dan npm dari sumber resmi Termux, lalu install Vercel CLI: `npm install -g vercel`.
3. Masuk ke folder project, jalankan `vercel login`, lalu `vercel`.
4. Ikuti pertanyaan CLI untuk membuat project baru.
5. Tambahkan environment variables melalui Vercel dashboard → Project → Settings → Environment Variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `PAIRING_SECRET`
6. Buat secret acak panjang, minimal 32 karakter. Masukkan nilai yang sama di Vercel dan notebook Colab. Jangan gunakan contoh literal.
7. Redeploy setelah menambahkan environment variables: `vercel --prod`.

Jika tidak ingin menggunakan Termux, deploy langsung lewat integrasi Git atau gunakan komputer. Jangan memasukkan token database ke halaman HTML untuk mempermudah deployment.

## C. Integrasikan notebook Colab
1. Deploy project dan salin URL production Vercel, misalnya `https://nama-project.vercel.app`.
2. Buka file `colab_pairing_snippet.py`.
3. Setelah notebook menghasilkan URL Cloudflare Tunnel, tempel snippet itu pada sel baru.
4. Ganti `APP_URL` dengan URL Vercel.
5. Pastikan variabel `url` memang berisi URL Cloudflare Quick Tunnel dari notebook. Jika nama variabel berbeda, ubah `WORKER_URL = url`.
6. Ganti `PAIRING_SECRET` dengan secret yang sama seperti di Vercel. Untuk pemakaian serius, masukkan secret melalui Colab Secrets, bukan menuliskannya permanen di notebook.
7. Jalankan sel. Kode enam digit akan muncul. Masukkan kode tersebut di website.
8. Uji tombol Periksa Status dan Tes Koneksi Render.

## D. Endpoint yang tersedia
- `POST /api/register` — registrasi worker; butuh header `x-pairing-secret`.
- `POST /api/heartbeat` — memperbarui status worker setiap 30 detik.
- `POST /api/pair` — tukar kode aktif menjadi token sesi.
- `GET /api/status` — status sesi browser.
- `POST /api/logout` — menghapus sesi browser.
- `/api/worker/health` — proxy ke endpoint `/health` worker.
- `/api/worker/<path>` — proxy endpoint worker setelah sesi valid.

## E. Catatan teknis
- Upstash Redis REST dipakai supaya sesi bertahan antar-invokasi Vercel Functions.
- Endpoint proxy mengizinkan URL tunnel hanya dari domain `trycloudflare.com` yang didaftarkan dengan secret.
- Untuk endpoint upload file/multipart, body proxy perlu diuji dan mungkin perlu penyesuaian berdasarkan implementasi FastAPI asli.
- Jika `PAIRING_SECRET` berubah, restart/redeploy Vercel dan perbarui notebook.
- Jika kode kedaluwarsa, jalankan ulang sel registrasi notebook dan gunakan kode terbaru.
