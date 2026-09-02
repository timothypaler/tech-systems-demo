import { runtimeEnv as env } from "@/lib/runtime-env";
import { getCustomer } from "@/lib/customer-auth";

const publicTypes=new Set(["promotion","review","question"]);

export async function GET(request:Request){
  try{
    const url=new URL(request.url);const type=url.searchParams.get("type")??"promotion";const productId=url.searchParams.get("product")??"";const branchId=url.searchParams.get("branch")??"";
    if(!publicTypes.has(type))return Response.json({error:"Unsupported record type."},{status:400});
    const result=await env.DB.prepare(`SELECT id,type,branch_id,customer_email,reference,title,status,payload,created_at,updated_at FROM commerce_records
      WHERE type=? AND status NOT IN ('hidden','archived') AND (?='' OR branch_id IS NULL OR branch_id=?)
      AND (?='' OR json_extract(payload,'$.productId')=?) ORDER BY created_at DESC LIMIT 100`).bind(type,branchId,branchId,productId,productId).all();
    return Response.json({records:result.results});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Commerce data unavailable"},{status:500});}
}

export async function POST(request:Request){
  const customer=await getCustomer(request);if(!customer)return Response.json({error:"Sign in to post a review or question."},{status:401});
  try{
    const body=await request.json() as {type?:string;productId?:string;title?:string;body?:string;rating?:number};const type=String(body.type??"");
    if(!["review","question"].includes(type)||!body.productId||!String(body.body??"").trim())return Response.json({error:"Product and message are required."},{status:400});
    const rating=type==="review"?Math.max(1,Math.min(5,Math.round(Number(body.rating??5)))):null;const reference=`${type==="review"?"REV":"QNA"}-${Date.now().toString(36).toUpperCase()}`;
    const payload={productId:body.productId,body:String(body.body).trim().slice(0,1500),rating,author:customer.name,verified:true};
    await env.DB.prepare("INSERT INTO commerce_records (id,type,customer_email,reference,title,status,payload) VALUES (?,?,?,?,?,'published',?)")
      .bind(crypto.randomUUID(),type,customer.email,reference,String(body.title??(type==="review"?"Customer review":"Product question")).slice(0,120),JSON.stringify(payload)).run();
    return Response.json({ok:true,reference},{status:201});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Your message could not be posted"},{status:500});}
}
