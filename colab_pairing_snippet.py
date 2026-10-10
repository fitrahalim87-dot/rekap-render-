# INTEGRASI PAIRING UNTUK NOTEBOOK RECAP RENDER
# Tempel setelah URL Cloudflare Tunnel berhasil dibuat.
# Isi APP_URL dengan domain deployment Vercel dan PAIRING_SECRET dengan secret yang sama di Vercel.
# Jangan menaruh PAIRING_SECRET di kode frontend HTML.

import os, time, uuid, secrets, requests, threading

APP_URL = "https://GANTI-DENGAN-DOMAIN-VERCEL"
PAIRING_SECRET = os.environ.get("PAIRING_SECRET", "GANTI_DENGAN_SECRET_YANG_SAMA")
WORKER_URL = url  # Ganti nama variabel ini jika URL tunnel pada notebook Anda berbeda.
NOTEBOOK_ID = str(uuid.uuid4())
ACCESS_CODE = f"{secrets.randbelow(1_000_000):06d}"

def register_worker():
    r = requests.post(
        f"{APP_URL.rstrip('/')}/api/register",
        headers={"x-pairing-secret": PAIRING_SECRET},
        json={
            "code": ACCESS_CODE,
            "notebook_id": NOTEBOOK_ID,
            "url": WORKER_URL,
            "service": "recap_render",
        },
        timeout=20,
    )
    r.raise_for_status()
    return r.json()

def heartbeat_loop():
    while True:
        try:
            r = requests.post(
                f"{APP_URL.rstrip('/')}/api/heartbeat",
                headers={"x-pairing-secret": PAIRING_SECRET},
                json={"notebook_id": NOTEBOOK_ID, "url": WORKER_URL},
                timeout=20,
            )
            if r.status_code == 404:
                # Pendaftaran ulang bila TTL worker hilang.
                register_worker()
            else:
                r.raise_for_status()
        except Exception as e:
            print("Heartbeat belum berhasil:", e)
        time.sleep(30)

register_worker()
threading.Thread(target=heartbeat_loop, daemon=True).start()

print("=" * 44)
print("RECAP RENDER WORKER TERDAFTAR")
print("KODE AKSES:", ACCESS_CODE)
print("Worker ID:", NOTEBOOK_ID)
print("URL Worker:", WORKER_URL)
print("Jangan tutup runtime Colab saat digunakan.")
print("=" * 44)
