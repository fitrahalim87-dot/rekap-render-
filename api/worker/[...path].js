
const { sessionFromRequest, json } = require("../lib/store");

module.exports = async function handler(req, res) {
  try {
    const found = await sessionFromRequest(req);

    if (!found) {
      return json(res, 401, {
        error: "Sesi tidak valid. Hubungkan worker lagi."
      });
    }

    if (Date.now() - found.worker.last_seen > 90000) {
      return json(res, 503, {
        error: "Worker Colab offline atau heartbeat kedaluwarsa."
      });
    }

    const parts = Array.isArray(req.query.path)
      ? req.query.path
      : [req.query.path].filter(Boolean);

    const path = parts.map(p => encodeURIComponent(p)).join("/");

    if (!path || path.includes("..")) {
      return json(res, 400, {
        error: "Path tidak valid"
      });
    }

    const url = found.worker.url + "/" + path;
    const headers = {};

    for (const h of ["content-type", "accept"]) {
      if (req.headers[h]) headers[h] = req.headers[h];
    }

    let body;

    if (!["GET", "HEAD"].includes(req.method)) {
      if (
        req.headers["content-type"] &&
        req.headers["content-type"].includes("application/json")
      ) {
        body = JSON.stringify(req.body || {});
      } else if (typeof req.body === "string") {
        body = req.body;
      } else if (req.body !== undefined) {
        body = JSON.stringify(req.body);
      }
    }

    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body,
      redirect: "manual"
    });

    const contentType =
      upstream.headers.get("content-type") || "application/json";

    res.status(upstream.status);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");

    if (contentType.includes("application/json")) {
      return res.send(await upstream.text());
    }

    return res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    return json(res, 502, {
      error: "Gagal menghubungi worker: " +
        (error.message || "unknown error")
    });
  }
};
      
