import { runtimeEnv as env } from "@/lib/runtime-env";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

export async function POST(request: Request) {
  if(!await requireAdmin(request))return unauthorized();
  try {
    const body = await request.json() as { branchId?:string; productId?:string; quantity?:number; notes?:string };
    const quantity = Number(body.quantity ?? 0);
    if (!body.branchId || !body.productId || !Number.isInteger(quantity) || quantity===0) return Response.json({ error:"Branch, product and a non-zero whole quantity are required." }, { status:400 });
    const current = await env.DB.prepare("SELECT quantity, reserved FROM inventory WHERE branch_id=? AND product_id=?").bind(body.branchId,body.productId).first<{quantity:number;reserved:number}>();
    if (!current || current.quantity + quantity < current.reserved) return Response.json({ error:"Adjustment would reduce available stock below reserved quantity." }, { status:409 });
    const reference=`ADJ-${Date.now().toString().slice(-8)}`;
    await env.DB.batch([
      env.DB.prepare("UPDATE inventory SET quantity=quantity+?, updated_at=CURRENT_TIMESTAMP WHERE branch_id=? AND product_id=?").bind(quantity,body.branchId,body.productId),
      env.DB.prepare("INSERT INTO stock_movements (id, branch_id, product_id, type, quantity, reference, notes) VALUES (?, ?, ?, 'adjustment', ?, ?, ?)").bind(crypto.randomUUID(),body.branchId,body.productId,quantity,reference,body.notes??"Manual stock adjustment"),
    ]);
    return Response.json({ ok:true, reference });
  } catch (error) { return Response.json({ error:error instanceof Error ? error.message : "Unable to adjust stock" }, { status:500 }); }
}
