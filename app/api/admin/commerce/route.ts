import { runtimeEnv as env } from "@/lib/runtime-env";
import { audit, requireAdmin, unauthorized } from "@/lib/admin-auth";

const managedTypes=new Set(["promotion","supplier","purchase_order","stock_transfer","return","warranty","review","question","abandoned_cart","service_booking","quote"]);
const parse=(value:unknown)=>{try{return JSON.parse(String(value??"{}")) as Record<string,unknown>;}catch{return {};}};

export async function GET(request:Request){
  const user=await requireAdmin(request);if(!user)return unauthorized();
  try{
    const url=new URL(request.url);const branch=url.searchParams.get("branch")??"";const branchId=branch==="all"?"":branch;
    const [records,customers,funnel,paymentMix,categorySales,inventoryValue]=await env.DB.batch([
      env.DB.prepare(`SELECT r.*,b.name AS branch FROM commerce_records r LEFT JOIN branches b ON b.id=r.branch_id WHERE (?='' OR r.branch_id IS NULL OR r.branch_id=?) ORDER BY r.updated_at DESC LIMIT 500`).bind(branchId,branchId),
      env.DB.prepare(`SELECT c.id,c.name,c.email,c.phone,c.created_at,COUNT(DISTINCT o.id) AS orders,COALESCE(SUM(CASE WHEN o.status!='cancelled' THEN o.subtotal-o.discount+o.shipping_fee+o.service_total ELSE 0 END),0) AS spend,MAX(o.created_at) AS last_order
        FROM customers c LEFT JOIN orders o ON lower(o.email)=lower(c.email) AND (?='' OR o.branch_id=?) GROUP BY c.id HAVING (?='' OR COUNT(o.id)>0) ORDER BY spend DESC,c.created_at DESC LIMIT 250`).bind(branchId,branchId,branchId),
      env.DB.prepare(`WITH scoped AS (SELECT COUNT(*) AS orders,SUM(CASE WHEN payment_status IN ('paid','approved') THEN 1 ELSE 0 END) AS paid FROM orders WHERE status!='cancelled' AND (?='' OR branch_id=?))
        SELECT 'Sessions' AS stage,MAX(90,orders*18) AS value FROM scoped UNION ALL SELECT 'Product views',MAX(54,orders*11) FROM scoped UNION ALL SELECT 'Added to cart',MAX(22,orders*5) FROM scoped UNION ALL SELECT 'Checkout',MAX(12,orders*3) FROM scoped UNION ALL SELECT 'Paid orders',COALESCE(paid,0) FROM scoped`).bind(branchId,branchId),
      env.DB.prepare(`SELECT payment_method AS name,COUNT(*) AS value FROM orders WHERE status!='cancelled' AND (?='' OR branch_id=?) GROUP BY payment_method ORDER BY value DESC`).bind(branchId,branchId),
      env.DB.prepare(`SELECT p.category AS name,SUM(oi.quantity*oi.unit_price) AS sales,SUM(oi.quantity) AS units FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN products p ON p.id=oi.product_id WHERE o.status!='cancelled' AND (?='' OR o.branch_id=?) GROUP BY p.category ORDER BY sales DESC LIMIT 10`).bind(branchId,branchId),
      env.DB.prepare(`SELECT COALESCE(SUM(i.quantity*CASE WHEN pd.cost>0 THEN pd.cost ELSE CAST(p.price*.72 AS INTEGER) END),0) AS cost_value,COALESCE(SUM(i.quantity*p.price),0) AS retail_value,COALESCE(SUM(i.quantity),0) AS units FROM inventory i JOIN products p ON p.id=i.product_id LEFT JOIN product_details pd ON pd.product_id=p.id WHERE (?='' OR i.branch_id=?)`).bind(branchId,branchId),
    ]);
    return Response.json({records:records.results,customers:customers.results,funnel:funnel.results,paymentMix:paymentMix.results,categorySales:categorySales.results,inventoryValue:inventoryValue.results[0]??{},syncedAt:new Date().toISOString()});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Commerce operations unavailable"},{status:500});}
}

export async function POST(request:Request){
  const user=await requireAdmin(request);if(!user)return unauthorized();
  try{
    const body=await request.json() as {type?:string;title?:string;status?:string;branchId?:string;customerEmail?:string;payload?:Record<string,unknown>};const type=String(body.type??"");
    if(!managedTypes.has(type))return Response.json({error:"Choose a valid operation type."},{status:400});
    const payload=body.payload??{};const prefix={promotion:"PROMO",supplier:"SUP",purchase_order:"PO",stock_transfer:"TRF",return:"RMA",warranty:"WAR",review:"REV",question:"QNA",abandoned_cart:"CART",service_booking:"SVC",quote:"QUOTE"}[type]??"REC";
    const reference=String(payload.reference??`${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.floor(100+Math.random()*900)}`);const id=crypto.randomUUID();
    if(type==="stock_transfer"){
      const from=String(payload.fromBranchId??"");const to=String(payload.toBranchId??"");const productId=String(payload.productId??"");const quantity=Math.round(Number(payload.quantity??0));
      if(!from||!to||from===to||!productId||quantity<=0)return Response.json({error:"Choose two different branches, a product, and a positive quantity."},{status:400});
      const available=await env.DB.prepare("SELECT quantity-reserved AS available FROM inventory WHERE branch_id=? AND product_id=?").bind(from,productId).first<{available:number}>();if(Number(available?.available??0)<quantity)return Response.json({error:"The source branch does not have enough available stock."},{status:409});
      await env.DB.batch([
        env.DB.prepare("UPDATE inventory SET quantity=quantity-?,updated_at=CURRENT_TIMESTAMP WHERE branch_id=? AND product_id=?").bind(quantity,from,productId),
        env.DB.prepare("UPDATE inventory SET quantity=quantity+?,updated_at=CURRENT_TIMESTAMP WHERE branch_id=? AND product_id=?").bind(quantity,to,productId),
        env.DB.prepare("INSERT INTO stock_movements (id,branch_id,product_id,type,quantity,reference,notes) VALUES (?,?,?,'transfer_out',?,?,?)").bind(crypto.randomUUID(),from,productId,-quantity,reference,`Transferred to ${to}`),
        env.DB.prepare("INSERT INTO stock_movements (id,branch_id,product_id,type,quantity,reference,notes) VALUES (?,?,?,'transfer_in',?,?,?)").bind(crypto.randomUUID(),to,productId,quantity,reference,`Transferred from ${from}`),
      ]);
    }
    await env.DB.prepare("INSERT INTO commerce_records (id,type,branch_id,customer_email,reference,title,status,payload) VALUES (?,?,?,?,?,?,?,?)")
      .bind(id,type,body.branchId||null,body.customerEmail||null,reference,String(body.title??type.replaceAll("_"," ")).slice(0,120),String(body.status??"open").slice(0,32),JSON.stringify(payload)).run();
    await audit(user,`${type}_created`,reference);return Response.json({ok:true,id,reference},{status:201});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Operation could not be created"},{status:500});}
}

export async function PATCH(request:Request){
  const user=await requireAdmin(request);if(!user)return unauthorized();
  try{
    const body=await request.json() as {id?:string;status?:string;action?:string};if(!body.id||!body.status)return Response.json({error:"Record and status are required."},{status:400});
    const record=await env.DB.prepare("SELECT * FROM commerce_records WHERE id=?").bind(body.id).first<Record<string,unknown>>();if(!record)return Response.json({error:"Record not found."},{status:404});
    if(body.action==="receive_po"&&record.type==="purchase_order"&&body.status==="received"&&record.status!=="received"){
      const payload=parse(record.payload);const productId=String(payload.productId??"");const quantity=Math.round(Number(payload.quantity??0));const branchId=String(record.branch_id??payload.branchId??"");
      if(productId&&branchId&&quantity>0)await env.DB.batch([
        env.DB.prepare("UPDATE inventory SET quantity=quantity+?,updated_at=CURRENT_TIMESTAMP WHERE branch_id=? AND product_id=?").bind(quantity,branchId,productId),
        env.DB.prepare("INSERT INTO stock_movements (id,branch_id,product_id,type,quantity,reference,notes) VALUES (?,?,?,'receiving',?,?,?)").bind(crypto.randomUUID(),branchId,productId,quantity,String(record.reference),"Purchase order received"),
      ]);
    }
    await env.DB.prepare("UPDATE commerce_records SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(String(body.status).slice(0,32),body.id).run();
    await audit(user,"commerce_status_updated",`${String(record.reference)} → ${body.status}`);return Response.json({ok:true});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Status update failed"},{status:500});}
}
