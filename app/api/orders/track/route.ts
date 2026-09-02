import { getCustomer } from "@/lib/customer-auth";
import { runtimeEnv as env } from "@/lib/runtime-env";

async function findOrder(orderNumber:string,email:string){
  if(!orderNumber||!email)return Response.json({error:"Enter your order number and email address."},{status:400});
  const order=await env.DB.prepare(`SELECT o.order_number,o.customer_name,o.email,o.fulfillment,o.payment_method,o.payment_status,o.payment_reference,o.subtotal,o.coupon_code,o.discount,o.shipping_fee,o.service_total,o.services_json,o.build_metadata,(o.subtotal-o.discount+o.shipping_fee+o.service_total) AS grand_total,o.status,o.created_at,o.delivery_address,b.name AS branch
    FROM orders o LEFT JOIN branches b ON b.id=o.branch_id WHERE o.order_number=? AND lower(o.email)=?`).bind(orderNumber,email).first();
  if(!order)return Response.json({error:"No demo order matched those details."},{status:404});
  const [items,notifications]=await env.DB.batch([
    env.DB.prepare("SELECT product_name,quantity,unit_price,(quantity*unit_price) AS line_total FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.order_number=? ORDER BY product_name").bind(orderNumber),
    env.DB.prepare("SELECT channel,subject,body,status,created_at FROM notifications WHERE order_number=? ORDER BY created_at DESC LIMIT 10").bind(orderNumber),
  ]);
  return Response.json({order,items:items.results,notifications:notifications.results,demo:true});
}

export async function GET(request:Request){
  try{
    const customer=await getCustomer(request);if(!customer)return Response.json({error:"Sign in or enter the customer email to track this order."},{status:401});
    const orderNumber=(new URL(request.url).searchParams.get("order")??"").trim().toUpperCase();
    return findOrder(orderNumber,customer.email.toLowerCase());
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to track order"},{status:500});}
}

export async function POST(request:Request){
  try{
    const body=await request.json() as {order?:string;email?:string};const customer=await getCustomer(request);
    const orderNumber=String(body.order??"").trim().toUpperCase();const email=(customer?.email??String(body.email??"")).trim().toLowerCase();
    return findOrder(orderNumber,email);
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to track order"},{status:500});}
}
