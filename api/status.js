const {sessionFromRequest,json,method}=require("./lib/store");
module.exports=async function handler(req,res){
  if(!method(req,res,"GET")) return;
  try{
    const found=await sessionFromRequest(req);
    if(!found) return json(res,401,{error:"Sesi tidak valid atau sudah kedaluwarsa. Masukkan kode lagi."});
    const {worker}=found;
    const online=Date.now()-worker.last_seen<90000;
    return json(res,200,{ok:true,session_active:true,worker_online:online,worker_id:worker.notebook_id,last_seen:worker.last_seen,service:worker.service});
  }catch(e){return json(res,500,{error:e.message||"Gagal membaca status"});}
};
