const {del,bearer,json,method}=require("./lib/store");
module.exports=async function handler(req,res){
  if(!method(req,res,"POST")) return;
  const token=bearer(req);
  if(token) try{await del(`session:${token}`);}catch(e){return json(res,500,{error:"Gagal menghapus sesi"});}
  return json(res,200,{ok:true});
};
