import { runtimeEnv as env } from "@/lib/runtime-env";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import { getCustomer } from "@/lib/customer-auth";

type OrderItemInput={ productId:string; quantity:number };
const paidMethods=new Set(["gcash","card"]);
const servicePrices:Record<string,{name:string;price:number}>={assembly:{name:"Professional assembly",price:1200},os:{name:"OS and driver installation",price:850},burnin:{name:"24-hour burn-in test",price:650},cable:{name:"Premium cable management",price:450}};
const deliveryFees:Record<string,number>={nearby:250,standard:450,extended:750};

function paymentData(method:string, suppliedReference?:string){
  const reference=(suppliedReference??"").trim().slice(0,64)||`DEMO-${method.toUpperCase()}-${Date.now().toString().slice(-8)}`;
  if(paidMethods.has(method))return {status:"paid",reference,details:method==="gcash"?"Demo GCash approval · no real funds transferred":"Demo card approval · test card only",paidAt:new Date().toISOString()};
  if(method==="home-credit")return {status:"approved",reference,details:"Demo financing pre-approval · no real application submitted",paidAt:null};
  return {status:"pending",reference:null,details:"Payment due at branch pickup",paidAt:null};
}

export async function GET(request:Request) {
  if(!await requireAdmin(request))return unauthorized();
  try { const result=await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 50").all(); return Response.json({orders:result.results}); }
  catch(error){ return Response.json({error:error instanceof Error?error.message:"Unable to load orders"},{status:500}); }
}

export async function POST(request: Request) {
  try {
    const body=await request.json() as { customerName?:string; email?:string; phone?:string; fulfillment?:"pickup"|"delivery"; paymentMethod?:string; demoPaymentReference?:string; branchId?:string; deliveryAddress?:string; deliveryZone?:string; couponCode?:string; services?:string[]; buildMetadata?:unknown; items?:OrderItemInput[] };
    const signedInCustomer=await getCustomer(request);
    const customerName=(signedInCustomer?.name??body.customerName??"").trim();const email=(signedInCustomer?.email??body.email??"").trim().toLowerCase();const phone=(body.phone??signedInCustomer?.phone??"").trim();
    if(!customerName||!email||!phone||!body.fulfillment||!body.paymentMethod||!body.items?.length) return Response.json({error:"Complete customer, fulfillment, payment and cart details are required."},{status:400});
    if(!["pay-on-pickup","gcash","card","home-credit"].includes(body.paymentMethod))return Response.json({error:"Choose a valid demo payment method."},{status:400});
    if(body.fulfillment==="pickup"&&!body.branchId) return Response.json({error:"Choose a pickup branch."},{status:400});
    if(body.fulfillment==="delivery"&&!body.deliveryAddress?.trim()) return Response.json({error:"Enter the delivery address."},{status:400});
    const branchId=body.branchId??"branch-angeles"; const requested=body.items.filter(i=>Number.isInteger(i.quantity)&&i.quantity>0);
    if(!requested.length)return Response.json({error:"Add at least one product."},{status:400});
    const placeholders=requested.map(()=>"?").join(",");
    const productResult=await env.DB.prepare(`SELECT p.id,p.name,p.price,i.quantity,i.reserved FROM products p JOIN inventory i ON i.product_id=p.id AND i.branch_id=? WHERE p.active=1 AND p.id IN (${placeholders})`).bind(branchId,...requested.map(i=>i.productId)).all<{id:string;name:string;price:number;quantity:number;reserved:number}>();
    if(productResult.results.length!==requested.length) return Response.json({error:"One or more products are unavailable at the selected branch."},{status:409});
    for(const item of requested){ const row=productResult.results.find((product:{id:string})=>product.id===item.productId)!; if(row.quantity-row.reserved<item.quantity) return Response.json({error:`Only ${row.quantity-row.reserved} available for ${row.name}.`},{status:409}); }
    const orderId=crypto.randomUUID(); const orderNumber=`TS-${new Date().toISOString().slice(2,10).replaceAll("-","")}-${Math.floor(1000+Math.random()*9000)}`;
    const subtotal=requested.reduce((sum,item)=>sum+(productResult.results.find((product:{id:string})=>product.id===item.productId)!.price*item.quantity),0);
    const selectedServices=(body.services??[]).filter((id)=>Boolean(servicePrices[id])).map((id)=>({id,...servicePrices[id]}));
    const serviceTotal=selectedServices.reduce((sum,item)=>sum+item.price,0);const shippingFee=body.fulfillment==="delivery"?(deliveryFees[String(body.deliveryZone??"standard")]??deliveryFees.standard):0;
    let couponCode=String(body.couponCode??"").trim().toUpperCase();let discount=0;
    if(couponCode){
      const promotion=await env.DB.prepare("SELECT payload,branch_id,status FROM commerce_records WHERE type='promotion' AND upper(json_extract(payload,'$.code'))=? LIMIT 1").bind(couponCode).first<{payload:string;branch_id:string|null;status:string}>();
      if(promotion?.status==="active"&&(!promotion.branch_id||promotion.branch_id===branchId)){
        const details=JSON.parse(promotion.payload) as {kind?:string;value?:number;minSpend?:number;maxDiscount?:number};
        if(subtotal>=Number(details.minSpend??0))discount=details.kind==="percent"?Math.round(subtotal*Number(details.value??0)/100):Number(details.value??0);
        discount=Math.max(0,Math.min(discount,Number(details.maxDiscount??discount),subtotal));
      }else couponCode="";
    }
    const payment=paymentData(body.paymentMethod,body.demoPaymentReference);
    const statements=[
      env.DB.prepare("INSERT OR IGNORE INTO customers (id,name,email,phone) VALUES (?,?,?,?)").bind(crypto.randomUUID(),customerName,email,phone),
      env.DB.prepare("INSERT INTO orders (id,order_number,customer_id,customer_name,email,phone,fulfillment,payment_method,branch_id,delivery_address,subtotal,coupon_code,discount,shipping_fee,service_total,services_json,build_metadata,status,payment_status,payment_reference,payment_details,paid_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'new',?,?,?,?)")
        .bind(orderId,orderNumber,signedInCustomer?.id??null,customerName,email,phone,body.fulfillment,body.paymentMethod,branchId,body.deliveryAddress?.trim()||null,subtotal,couponCode||null,discount,shippingFee,serviceTotal,JSON.stringify(selectedServices),JSON.stringify(body.buildMetadata??{}),payment.status,payment.reference,payment.details,payment.paidAt),
      ...requested.flatMap(item=>{const row=productResult.results.find((product:{id:string})=>product.id===item.productId)!;return[
        env.DB.prepare("INSERT INTO order_items (id,order_id,product_id,product_name,quantity,unit_price) VALUES (?,?,?,?,?,?)").bind(crypto.randomUUID(),orderId,row.id,row.name,item.quantity,row.price),
        env.DB.prepare("UPDATE inventory SET reserved=reserved+?,updated_at=CURRENT_TIMESTAMP WHERE branch_id=? AND product_id=?").bind(item.quantity,branchId,row.id),
        env.DB.prepare("INSERT INTO stock_movements (id,branch_id,product_id,type,quantity,reference,notes) VALUES (?,?,?,'reservation',?,?,?)").bind(crypto.randomUUID(),branchId,row.id,-item.quantity,orderNumber,"Reserved for demo customer order"),
      ];}),
      env.DB.prepare("INSERT INTO notifications (id,order_id,order_number,channel,recipient,subject,body,status) VALUES (?,?,?,?,?,?,?,'sent')")
        .bind(crypto.randomUUID(),orderId,orderNumber,"email",email,`Demo order ${orderNumber} received`,`Hi ${customerName}, your demo order for ${(subtotal-discount+shippingFee+serviceTotal).toLocaleString("en-PH")} PHP is confirmed. Payment status: ${payment.status}.`),
      env.DB.prepare("INSERT INTO notifications (id,order_id,order_number,channel,recipient,subject,body,status) VALUES (?,?,?,?,?,?,?,'sent')")
        .bind(crypto.randomUUID(),orderId,orderNumber,"sms",phone,"Tech Systems demo order",`${orderNumber} is reserved at your selected branch. This is a simulated notification.`),
    ];
    await env.DB.batch(statements);
    return Response.json({ok:true,orderNumber,subtotal,discount,shippingFee,serviceTotal,total:subtotal-discount+shippingFee+serviceTotal,status:"new",paymentStatus:payment.status,paymentReference:payment.reference,demo:true},{status:201});
  } catch(error){ return Response.json({error:error instanceof Error?error.message:"Unable to place order"},{status:500}); }
}

export async function PATCH(request: Request) {
  if(!await requireAdmin(request))return unauthorized();
  try {
    const body=await request.json() as { orderNumber?:string; status?:string };
    if(!body.orderNumber||!["ready","completed","cancelled"].includes(body.status??"")) return Response.json({error:"Valid order number and status are required."},{status:400});
    const order=await env.DB.prepare("SELECT id,branch_id,status,customer_name,email,phone FROM orders WHERE order_number=?").bind(body.orderNumber).first<{id:string;branch_id:string;status:string;customer_name:string;email:string;phone:string}>();
    if(!order) return Response.json({error:"Order not found."},{status:404});
    if(["completed","cancelled"].includes(order.status)) return Response.json({error:"A completed or cancelled order cannot be changed."},{status:409});
    const nextStatus=String(body.status);
    const statements=[
      env.DB.prepare("UPDATE orders SET status=?, payment_status=CASE WHEN ?='completed' THEN 'paid' ELSE payment_status END, paid_at=CASE WHEN ?='completed' AND paid_at IS NULL THEN CURRENT_TIMESTAMP ELSE paid_at END WHERE id=?").bind(nextStatus,nextStatus,nextStatus,order.id),
      env.DB.prepare("INSERT INTO notifications (id,order_id,order_number,channel,recipient,subject,body,status) VALUES (?,?,?,?,?,?,?,'sent')")
        .bind(crypto.randomUUID(),order.id,body.orderNumber,"email",order.email,`Demo order ${nextStatus}`,`Hi ${order.customer_name}, ${body.orderNumber} is now ${nextStatus}. This is a simulated email.`),
      env.DB.prepare("INSERT INTO notifications (id,order_id,order_number,channel,recipient,subject,body,status) VALUES (?,?,?,?,?,?,?,'sent')")
        .bind(crypto.randomUUID(),order.id,body.orderNumber,"sms",order.phone,"Tech Systems order update",`${body.orderNumber}: ${nextStatus}. Demo notification only.`),
    ];
    if(nextStatus==="completed"||nextStatus==="cancelled"){
      const items=await env.DB.prepare("SELECT product_id,quantity FROM order_items WHERE order_id=?").bind(order.id).all<{product_id:string;quantity:number}>();
      for(const item of items.results){
        if(nextStatus==="completed") statements.push(env.DB.prepare("UPDATE inventory SET quantity=quantity-?,reserved=reserved-?,updated_at=CURRENT_TIMESTAMP WHERE branch_id=? AND product_id=?").bind(item.quantity,item.quantity,order.branch_id,item.product_id));
        else statements.push(env.DB.prepare("UPDATE inventory SET reserved=MAX(0,reserved-?),updated_at=CURRENT_TIMESTAMP WHERE branch_id=? AND product_id=?").bind(item.quantity,order.branch_id,item.product_id));
        statements.push(env.DB.prepare("INSERT INTO stock_movements (id,branch_id,product_id,type,quantity,reference,notes) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),order.branch_id,item.product_id,nextStatus==="completed"?"sale":"release",nextStatus==="completed"?-item.quantity:item.quantity,body.orderNumber,nextStatus==="completed"?"Demo order completed":"Demo reservation released"));
      }
    }
    await env.DB.batch(statements);
    return Response.json({ok:true,status:nextStatus});
  } catch(error){ return Response.json({error:error instanceof Error?error.message:"Unable to update order"},{status:500}); }
}
