import { runtimeEnv as env } from "@/lib/runtime-env";
import { branches, initialStocks, storeProducts } from "@/lib/store-data";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export async function POST(request:Request){
  if(!await requireAdmin(request))return unauthorized();
  try{
    const body=await request.json() as {confirm?:string};
    if(body.confirm!=="RESET_DEMO")return Response.json({error:"Reset confirmation is required."},{status:400});
    await env.DB.batch([
      env.DB.prepare("DELETE FROM notifications"),
      env.DB.prepare("DELETE FROM order_items"),
      env.DB.prepare("DELETE FROM orders"),
      env.DB.prepare("DELETE FROM stock_movements"),
      env.DB.prepare("DELETE FROM customer_sessions"),
      env.DB.prepare("DELETE FROM customer_accounts"),
      env.DB.prepare("DELETE FROM customers"),
      env.DB.prepare("DELETE FROM commerce_records WHERE id NOT LIKE 'seed-%'"),
      env.DB.prepare(`UPDATE commerce_records SET status=CASE id WHEN 'seed-po-01' THEN 'ordered' WHEN 'seed-rma-01' THEN 'inspection' WHEN 'seed-review-01' THEN 'published' WHEN 'seed-cart-01' THEN 'recoverable' ELSE 'active' END,updated_at=CURRENT_TIMESTAMP WHERE id LIKE 'seed-%'`),
      env.DB.prepare("UPDATE inventory SET quantity=0,reserved=0,updated_at=CURRENT_TIMESTAMP"),
      ...branches.flatMap((branch,branchIndex)=>storeProducts.map((product,index)=>env.DB.prepare("UPDATE inventory SET quantity=?,reserved=0,updated_at=CURRENT_TIMESTAMP WHERE branch_id=? AND product_id=?")
        .bind(Math.max(1,initialStocks[index]-branchIndex*2),branch.id,product.id))),
    ]);
    return Response.json({ok:true,message:"Demo orders, customer accounts, commerce activity, notifications, and stock were reset. Product catalog, media, and baseline records were preserved."});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to reset demo data"},{status:500});}
}
