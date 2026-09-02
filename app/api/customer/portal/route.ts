import { runtimeEnv as env } from "@/lib/runtime-env";
import { customerUnauthorized, getCustomer } from "@/lib/customer-auth";

const customerTypes=new Set(["saved_build","wishlist","quote","return","warranty","service_booking"]);

export async function GET(request:Request){
  const customer=await getCustomer(request);if(!customer)return customerUnauthorized();
  try{
    const [orders,items,records]=await env.DB.batch([
      env.DB.prepare(`SELECT o.*,b.name AS branch FROM orders o LEFT JOIN branches b ON b.id=o.branch_id WHERE lower(o.email)=? ORDER BY o.created_at DESC LIMIT 50`).bind(customer.email),
      env.DB.prepare(`SELECT o.order_number,oi.product_id,oi.product_name,oi.quantity,oi.unit_price FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE lower(o.email)=? ORDER BY o.created_at DESC`).bind(customer.email),
      env.DB.prepare(`SELECT * FROM commerce_records WHERE lower(customer_email)=? ORDER BY updated_at DESC`).bind(customer.email),
    ]);
    return Response.json({customer,orders:orders.results,items:items.results,records:records.results});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Customer portal unavailable"},{status:500});}
}

export async function POST(request:Request){
  const customer=await getCustomer(request);if(!customer)return customerUnauthorized();
  try{
    const body=await request.json() as {type?:string;title?:string;status?:string;branchId?:string;payload?:unknown};const type=String(body.type??"");
    if(!customerTypes.has(type))return Response.json({error:"Unsupported customer record."},{status:400});
    const prefix={saved_build:"BUILD",wishlist:"WISH",quote:"QUOTE",return:"RMA",warranty:"WARRANTY",service_booking:"SERVICE"}[type]??"REC";
    const reference=`${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(100+Math.random()*900)}`;const id=crypto.randomUUID();
    await env.DB.prepare("INSERT INTO commerce_records (id,type,branch_id,customer_email,reference,title,status,payload) VALUES (?,?,?,?,?,?,?,?)")
      .bind(id,type,body.branchId||null,customer.email,reference,String(body.title??type.replaceAll("_"," ")).slice(0,120),String(body.status??"open").slice(0,32),JSON.stringify(body.payload??{})).run();
    return Response.json({ok:true,id,reference},{status:201});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Record could not be saved"},{status:500});}
}

export async function DELETE(request:Request){
  const customer=await getCustomer(request);if(!customer)return customerUnauthorized();
  try{const body=await request.json() as {id?:string};if(!body.id)return Response.json({error:"Record ID is required."},{status:400});await env.DB.prepare("DELETE FROM commerce_records WHERE id=? AND lower(customer_email)=?").bind(body.id,customer.email).run();return Response.json({ok:true});}catch(error){return Response.json({error:error instanceof Error?error.message:"Record could not be removed"},{status:500});}
}
