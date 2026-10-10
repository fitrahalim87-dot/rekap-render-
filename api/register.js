
const {
  getJson,
  setJson,
  safeEqual,
  json,
  method,
  validWorkerUrl
} = require("./lib/store");

module.exports = async function handler(req, res) {
  if (!method(req, res, "POST")) return;

  const expected = process.env.PAIRING_SECRET;
  const supplied = req.headers["x-pairing-secret"];

  if (
    !expected ||
    !safeEqual(String(supplied || ""), expected)
  ) {
    return json(res, 401, {
      error: "Pairing secret tidak valid"
    });
  }

  const { code, notebook_id, url, service } = req.body || {};

  if (!/^\d{6}$/.test(String(code || ""))) {
    return json(res, 400, {
      error: "Kode harus 6 digit"
    });
  }

  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(String(notebook_id || ""))) {
    return json(res, 400, {
      error: "notebook_id tidak valid"
    });
  }

  if (service !== "recap_render") {
    return json(res, 400, {
      error: "Jenis layanan tidak didukung"
    });
  }

  if (!validWorkerUrl(String(url || ""))) {
    return json(res, 400, {
      error: "URL worker harus HTTPS trycloudflare.com"
    });
  }

  try {
    const existing = await getJson(`worker-code:${code}`);

    if (existing && existing.notebook_id !== notebook_id) {
      return json(res, 409, {
        error: "Kode sedang digunakan worker lain"
      });
    }

    const now = Date.now();

    const worker = {
      code: String(code),
      notebook_id: String(notebook_id),
      url: String(url).replace(/\/+$/, ""),
      service,
      created_at: now,
      last_seen: now
    };

    await setJson(`worker-code:${code}`, worker, 120);
    await setJson(`worker-id:${notebook_id}`, worker, 120);

    return json(res, 200, {
      ok: true,
      expires_in: 120,
      notebook_id
    });
  } catch (error) {
    return json(res, 500, {
      error: error.message || "Gagal mendaftarkan worker"
    });
  }
};
  
