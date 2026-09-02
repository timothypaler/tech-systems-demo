import { runtimeEnv as env } from "@/lib/runtime-env";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

const customers=[
  {name:"Jamie Dela Cruz",email:"jamie.demo@example.com",phone:"09170001001"},
  {name:"Alex Santos",email:"alex.demo@example.com",phone:"09170001002"},
  {name:"Patricia Lim",email:"patricia.demo@example.com",phone:"09170001003"},
  {name:"Marco Reyes",email:"marco.demo@example.com",phone:"09170001004"},
];
const methods=["gcash","card","home-credit","pay-on-pickup"];

export async function POST(request:Request){
  if(!await requireAdmin(request))return unauthorized();
  try{
    const body=await request.json().catch(()=>({})) as {branchId?:string};
    let branchId=body.branchId;
    if(!branchId||branchId==="all"){
      const branches=await env.DB.prepare("SELECT id FROM branches WHERE active=1 ORDER BY id").all<{id:string}>();
      if(!branches.results.length)return Response.json({error:"Initialize branch data first."},{status:409});
      branchId=branches.results[Math.floor(Math.random()*branches.results.length)].id;
    }
    const branch=await env.DB.prepare("SELECT id,name FROM branches WHERE id=? AND active=1").bind(branchId).first<{id:string;name:string}>();
    if(!branch)return Response.json({error:"Choose an active branch."},{status:400});
    const available=await env.DB.prepare(`SELECT p.id,p.name,p.price,i.quantity,i.reserved FROM products p JOIN inventory i ON i.product_id=p.id
      WHERE p.active=1 AND i.branch_id=? AND i.quantity-i.reserved>0 ORDER BY p.name LIMIT 40`).bind(branchId).all<{id:string;name:string;price:number;quantity:number;reserved:number}>();
    if(!available.results.length)return Response.json({error:"This branch has no available stock."},{status:409});
    const shuffled=[...available.results].sort(()=>Math.random()-.5).slice(0,Math.min(2,available.results.length));
    const customer=customers[Math.floor(Math.random()*customers.length)];const paymentMethod=methods[Math.floor(Math.random()*methods.length)];
    const paid=paymentMethod==="gcash"||paymentMethod==="card";const approved=paymentMethod==="home-credit";
    const paymentStatus=paid?"paid":approved?"approved":"pending";const paymentReference=paymentMethod==="pay-on-pickup"?null:`DEMO-${paymentMethod.toUpperCase().replaceAll("-","")}-${Date.now().toString().slice(-8)}`;
    const orderId=crypto.randomUUID();const orderNumber=`TS-DEMO-${Date.now().toString().slice(-6)}`;
    const lines=shuffled.map((product,index)=>({...product,orderQuantity:Math.min(index+1,product.quantity-product.reserved)}));
    const subtotal=lines.reduce((sum,line)=>sum+line.price*line.orderQuantity,0);
    const statements=[
      env.DB.prepare("INSERT OR IGNORE INTO customers (id,name,email,phone) VALUES (?,?,?,?)").bind(crypto.randomUUID(),customer.name,customer.email,customer.phone),
      env.DB.prepare("INSERT INTO orders (id,order_number,customer_name,email,phone,fulfillment,payment_method,branch_id,subtotal,status,payment_status,payment_reference,payment_details,paid_at) VALUES (?,?,?,?,?,'pickup',?,?,?,'new',?,?,?,?)")
        .bind(orderId,orderNumber,customer.name,customer.email,customer.phone,paymentMethod,branchId,subtotal,paymentStatus,paymentReference,"Generated presentation order",paid?new Date().toISOString():null),
      ...lines.flatMap(line=>[
        env.DB.prepare("INSERT INTO order_items (id,order_id,product_id,product_name,quantity,unit_price) VALUES (?,?,?,?,?,?)").bind(crypto.randomUUID(),orderId,line.id,line.name,line.orderQuantity,line.price),
        env.DB.prepare("UPDATE inventory SET reserved=reserved+?,updated_at=CURRENT_TIMESTAMP WHERE branch_id=? AND product_id=?").bind(line.orderQuantity,branchId,line.id),
        env.DB.prepare("INSERT INTO stock_movements (id,branch_id,product_id,type,quantity,reference,notes) VALUES (?,?,?,'reservation',?,?,?)").bind(crypto.randomUUID(),branchId,line.id,-line.orderQuantity,orderNumber,"Generated presentation order"),
      ]),
      env.DB.prepare("INSERT INTO notifications (id,order_id,order_number,channel,recipient,subject,body,status) VALUES (?,?,?,?,?,?,?,'sent')").bind(crypto.randomUUID(),orderId,orderNumber,"email",customer.email,`Demo order ${orderNumber}`,`Your generated order was received by ${branch.name}.`),
      env.DB.prepare("INSERT INTO notifications (id,order_id,order_number,channel,recipient,subject,body,status) VALUES (?,?,?,?,?,?,?,'sent')").bind(crypto.randomUUID(),orderId,orderNumber,"sms",customer.phone,"Tech Systems demo order",`${orderNumber} is reserved. This is a simulated SMS.`),
    ];
    await env.DB.batch(statements);
    return Response.json({ok:true,orderNumber,branch:branch.name,paymentMethod,paymentStatus,total:subtotal});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Unable to generate sample order"},{status:500});}
}
