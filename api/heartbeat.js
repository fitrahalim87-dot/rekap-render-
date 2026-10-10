
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

  const { notebook_id, url } = req.body || {};

  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(String(notebook_id || ""))) {
    return json(res, 400, {
      error: "notebook_id tidak valid"
    });
  }

  try {
    const worker = await getJson(`worker-id:${notebook_id}`);

    if (!worker) {
      return json(res, 404, {
        error: "Worker belum terdaftar atau sudah kedaluwarsa"
      });
    }

    if (
      url &&
      (
        !validWorkerUrl(String(url)) ||
        String(url).replace(/\/+$/, "") !== worker.url
      )
    ) {
      return json(res, 400, {
        error: "URL heartbeat tidak cocok"
      });
    }

    worker.last_seen = Date.now();

    await setJson(`worker-code:${worker.code}`, worker, 120);
    await setJson(`worker-id:${notebook_id}`, worker, 120);

    return json(res, 200, {
      ok: true,
      expires_in: 120
    });
  } catch (error) {
    return json(res, 500, {
      error: error.message || "Heartbeat gagal"
    });
  }
};
