import { runtimeEnv as env } from "@/lib/runtime-env";
import { branches, initialStocks, storeProducts } from "@/lib/store-data";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

type ProductInput = {
  id?: string; name?: string; sku?: string; brand?: string; category?: string; description?: string;
  price?: number; powerWatts?: number | null; socket?: string | null; memoryType?: string | null;
  formFactor?: string | null; active?: boolean | number;
};

function cleanProduct(body: ProductInput) {
  const rawPower = body.powerWatts;
  return {
    name: String(body.name ?? "").trim(), sku: String(body.sku ?? "").trim().toUpperCase(),
    brand: String(body.brand ?? "").trim(), category: String(body.category ?? "").trim(),
    description: String(body.description ?? "").trim(), price: Math.round(Number(body.price ?? 0)),
    powerWatts: rawPower === null || rawPower === undefined || String(rawPower).trim() === "" ? null : Math.round(Number(rawPower)),
    socket: String(body.socket ?? "").trim() || null, memoryType: String(body.memoryType ?? "").trim() || null,
    formFactor: String(body.formFactor ?? "").trim() || null, active: body.active === false || body.active === 0 ? 0 : 1,
  };
}

function validate(product: ReturnType<typeof cleanProduct>) {
  if (!product.name || !product.sku || !product.brand || !product.category || product.price < 0 || !Number.isFinite(product.price)) {
    return "Valid name, SKU, brand, category and price are required.";
  }
  if (product.powerWatts !== null && (!Number.isFinite(product.powerWatts) || product.powerWatts < 0)) return "Power draw must be zero or greater.";
  return "";
}

export async function GET(request: Request) {
  const url=new URL(request.url);const branchId = url.searchParams.get("branch") ?? "branch-angeles";const productId=url.searchParams.get("id")??"";
  try {
    if(productId){
      const [product,stock]=await env.DB.batch([
        env.DB.prepare(`SELECT p.*,pd.specs_json,pd.warranty_months,pd.cost,pd.barcode,pd.gpu_length_mm,pd.case_gpu_clearance_mm,pd.cooler_height_mm,pd.case_cooler_clearance_mm,pd.radiator_size_mm,pd.case_radiator_support_mm,pd.pcie_connectors,pd.bios_version
          FROM products p LEFT JOIN product_details pd ON pd.product_id=p.id WHERE p.active=1 AND p.id=?`).bind(productId),
        env.DB.prepare(`SELECT b.id AS branch_id,b.name AS branch,b.code,i.quantity,i.reserved,(i.quantity-i.reserved) AS available FROM inventory i JOIN branches b ON b.id=i.branch_id WHERE i.product_id=? AND b.active=1 ORDER BY b.name`).bind(productId),
      ]);
      const row=product.results[0];if(!row)return Response.json({error:"Product not found."},{status:404});
      return Response.json({product:row,stock:stock.results,persistent:true});
    }
    const result = await env.DB.prepare(`
      SELECT p.*, COALESCE(i.quantity, 0) AS quantity, COALESCE(i.reserved, 0) AS reserved,
        pd.specs_json,pd.warranty_months,pd.gpu_length_mm,pd.case_gpu_clearance_mm,pd.cooler_height_mm,pd.case_cooler_clearance_mm,pd.radiator_size_mm,pd.case_radiator_support_mm,pd.pcie_connectors,pd.bios_version
      FROM products p LEFT JOIN inventory i ON i.product_id = p.id AND i.branch_id = ? LEFT JOIN product_details pd ON pd.product_id=p.id
      WHERE p.active = 1 ORDER BY p.category, p.name
    `).bind(branchId).all();
    if (!result.results.length) throw new Error("Catalog database is not initialized");
    return Response.json({ products: result.results, persistent: true });
  } catch {
    if (productId) {
      const fallback = storeProducts.find((product) => product.id === productId);
      if (!fallback) return Response.json({ error: "Product not found." }, { status: 404 });
      const fallbackIndex = storeProducts.findIndex((product) => product.id === productId);
      return Response.json({
        product: {
          ...fallback,
          power_watts: fallback.powerWatts ?? null,
          memory_type: fallback.memoryType ?? null,
          form_factor: fallback.formFactor ?? null,
          warranty_months: 12,
          specs_json: "{}",
        },
        stock: branches.map((branch, branchIndex) => ({
          branch_id: branch.id,
          branch: branch.name,
          code: branch.code,
          quantity: Math.max(1, initialStocks[fallbackIndex] - branchIndex * 2),
          reserved: 0,
          available: Math.max(1, initialStocks[fallbackIndex] - branchIndex * 2),
        })),
        persistent: false,
      });
    }
    return Response.json({
      products: storeProducts.map((product, index) => ({
        ...product,
        quantity: initialStocks[index],
        reserved: 0,
      })),
      persistent: false,
    });
  }
}

export async function POST(request: Request) {
  if(!await requireAdmin(request))return unauthorized();
  try {
    const body = await request.json() as ProductInput;
    const product = cleanProduct(body); const error = validate(product);
    if (error) return Response.json({ error }, { status: 400 });
    const id = crypto.randomUUID();
    const branches = await env.DB.prepare("SELECT id, code FROM branches WHERE active=1").all<{ id: string; code: string }>();
    const statements = [
      env.DB.prepare("INSERT INTO products (id, sku, name, brand, category, description, price, power_watts, socket, memory_type, form_factor, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(id, product.sku, product.name, product.brand, product.category, product.description, product.price, product.powerWatts, product.socket, product.memoryType, product.formFactor, product.active),
      ...branches.results.map((branch:{ id:string; code:string }) => env.DB.prepare("INSERT INTO inventory (id, branch_id, product_id, quantity, reserved, reorder_level) VALUES (?, ?, ?, 0, 0, 3)")
        .bind(`inv-${branch.code.toLowerCase()}-${id}`, branch.id, id)),
    ];
    await env.DB.batch(statements);
    return Response.json({ id, product }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create product";
    return Response.json({ error: message.includes("UNIQUE") ? "That SKU is already in use." : message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if(!await requireAdmin(request))return unauthorized();
  try {
    const body = await request.json() as ProductInput;
    if (!body.id) return Response.json({ error: "Product ID is required." }, { status: 400 });
    const product = cleanProduct(body); const error = validate(product);
    if (error) return Response.json({ error }, { status: 400 });
    const result = await env.DB.prepare("UPDATE products SET sku=?, name=?, brand=?, category=?, description=?, price=?, power_watts=?, socket=?, memory_type=?, form_factor=?, active=? WHERE id=?")
      .bind(product.sku, product.name, product.brand, product.category, product.description, product.price, product.powerWatts, product.socket, product.memoryType, product.formFactor, product.active, body.id).run();
    if (!result.meta.changes) return Response.json({ error: "Product not found." }, { status: 404 });
    return Response.json({ ok: true, product });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update product";
    return Response.json({ error: message.includes("UNIQUE") ? "That SKU is already in use." : message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if(!await requireAdmin(request))return unauthorized();
  try {
    const body = await request.json() as { id?: string };
    if (!body.id) return Response.json({ error: "Product ID is required." }, { status: 400 });
    const result = await env.DB.prepare("UPDATE products SET active=0 WHERE id=?").bind(body.id).run();
    if (!result.meta.changes) return Response.json({ error: "Product not found." }, { status: 404 });
    return Response.json({ ok: true, archived: true });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to archive product" }, { status: 500 }); }
}
