const crypto = require("crypto");

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Database belum dikonfigurasi. Isi UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN.");
  return { url: url.replace(/\/+$/, ""), token };
}
async function redis(command, ...args) {
  const {url, token} = redisConfig();
  const encoded = [command, ...args].map(v => encodeURIComponent(String(v))).join("/");
  const response = await fetch(`${url}/${encoded}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(body.error || "Database request failed");
  return body.result;
}
const key = (name) => `recap-render:${name}`;
async function getJson(name) {
  const raw = await redis("GET", key(name));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
async function setJson(name, value, ttlSeconds) {
  return redis("SET", key(name), JSON.stringify(value), "EX", ttlSeconds);
}
async function del(name) { return redis("DEL", key(name)); }
function randomToken(bytes=32) { return crypto.randomBytes(bytes).toString("hex"); }
function safeEqual(a,b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x=Buffer.from(a), y=Buffer.from(b);
  return x.length===y.length && crypto.timingSafeEqual(x,y);
}
function json(res, status, data) {
  res.status(status).setHeader("Cache-Control","no-store").json(data);
}
function method(req,res,expected) {
  if(req.method!==expected){res.setHeader("Allow",expected);json(res,405,{error:"Method tidak diizinkan"});return false;}
  return true;
}
function bearer(req) {
  const header=req.headers.authorization||"";
  return header.startsWith("Bearer ")?header.slice(7):"";
}
async function sessionFromRequest(req) {
  const token=bearer(req);
  if(!token) return null;
  const session=await getJson(`session:${token}`);
  if(!session) return null;
  const worker=await getJson(`worker-id:${session.worker_id}`);
  if(!worker) return null;
  return {token,session,worker};
}
function validWorkerUrl(url) {
  try {
    const u=new URL(url);
    return u.protocol==="https:" && (u.hostname==="trycloudflare.com" || u.hostname.endsWith(".trycloudflare.com"));
  } catch { return false; }
}
module.exports={redis,getJson,setJson,del,randomToken,safeEqual,json,method,bearer,sessionFromRequest,validWorkerUrl,key};
