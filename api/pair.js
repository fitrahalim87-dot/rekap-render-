const {getJson,setJson,randomToken,json,method}=require("./lib/store");
module.exports=async function handler(req,res){
  if(!method(req,res,"POST")) return;
  const {code}=req.body||{};
  if(!/^\d{6}$/.test(String(code||""))) return json(res,400,{error:"Masukkan kode 6 digit"});
  try{
    const worker=await getJson(`worker-code:${code}`);
    if(!worker) return json(res,401,{error:"Kode tidak ditemukan atau sudah kedaluwarsa. Periksa Colab dan coba lagi."});
    if(Date.now()-worker.last_seen>90000) return json(res,401,{error:"Worker tidak aktif. Jalankan ulang notebook Colab."});
    const token=randomToken(32);
    await setJson(`session:${token}`,{worker_id:worker.notebook_id,created_at:Date.now()},28800);
    return json(res,200,{ok:true,token,worker_id:worker.notebook_id,expires_in:28800});
  }catch(e){return json(res,500,{error:e.message||"Pairing gagal"});}
};
