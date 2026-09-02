import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import { runtimeEnv as env } from "@/lib/runtime-env";

type Row = Record<string, string | number | null>;

function contentSuggestion(input: Record<string, unknown>) {
  const name = String(input.name || "This product").trim();
  const brand = String(input.brand || "").trim();
  const category = String(input.category || "computer hardware").trim();
  const socket = String(input.socket || "").trim();
  const memory = String(input.memoryType || "").trim();
  const formFactor = String(input.formFactor || "").trim();
  const details = [socket && `${socket} socket`, memory && `${memory} support`, formFactor && `${formFactor} form factor`].filter(Boolean);
  const identity = brand && !name.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${name}` : name;
  return {
    title: identity,
    searchTitle: `${identity} | ${category} | Tech Systems`,
    description: `${identity} is a ${category.toLowerCase()} selected for dependable computer systems${details.length ? `, with ${details.join(", ")}` : ""}. Verify compatibility, branch stock, and final specifications before checkout.`,
    bullets: [
      `Exact model: ${identity}`,
      details.length ? details.join(" · ") : `Category: ${category}`,
      "Branch-connected demo stock and pricing",
      "Compatibility reviewed during PC Builder selection",
    ],
  };
}

function answerKnowledge(question: string) {
  const q = question.toLowerCase();
  if (q.includes("return") || q.includes("refund")) return { answer: "For the demo, returns must be reviewed against the order, serial number, product condition, and branch policy. Do not promise a refund until an authorized manager confirms eligibility.", sources: ["Store settings", "Order record", "Warranty record"] };
  if (q.includes("warranty") || q.includes("rma")) return { answer: "Open the exact order first, confirm the product and purchase date, then record the warranty request in after-sales. Warranty length comes from the product record; approval remains a branch or manufacturer decision.", sources: ["Product warranty field", "Order history", "After-sales records"] };
  if (q.includes("payment") || q.includes("gcash") || q.includes("card")) return { answer: "GCash, card, and financing are simulations in this demo. Staff should verify the payment status and reference on the order before moving fulfillment forward. Never request or store a customer's full card details.", sources: ["Order payment status", "Demo safety policy"] };
  if (q.includes("stock") || q.includes("inventory") || q.includes("transfer")) return { answer: "Use the selected branch inventory as the source of truth. Available stock is quantity minus reserved units. If another branch has stock, create a transfer record instead of manually inflating inventory.", sources: ["Branch inventory", "Stock movements", "Transfer records"] };
  if (q.includes("compatible") || q.includes("builder") || q.includes("graphics")) return { answer: "Use the PC Builder compatibility result: CPU and motherboard socket, RAM type, case and board form factor, PSU headroom, and integrated-graphics support must all pass. A processor without supported integrated graphics requires a dedicated GPU.", sources: ["PC Builder rules", "Product compatibility fields"] };
  if (q.includes("image") || q.includes("photo") || q.includes("media")) return { answer: "Use an exact-model, manufacturer-authorized image whenever possible. Confirm the SKU, color, port layout, and included accessories before publishing; never use a similar-looking generic product as the primary image.", sources: ["Product scanner review rules", "Catalog media policy"] };
  return { answer: "Start with the selected branch and the exact product or order record. The dashboard can assist with current demo data, but pricing, stock, warranty, compatibility, and fulfillment should always be confirmed from their dedicated records before promising anything to a customer.", sources: ["Selected branch data", "Catalog", "Orders", "Inventory"] };
}

export async function POST(request: Request) {
  if (!await requireAdmin(request)) return unauthorized();
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const mode = String(body.mode || "insights");
  const requestedBranch = String(body.branch || "all");
  const branchId = requestedBranch === "all" ? "" : requestedBranch;

  if (mode === "content") return Response.json({ mode, ...contentSuggestion((body.product || {}) as Record<string, unknown>), demo: true });
  if (mode === "knowledge") return Response.json({ mode, ...answerKnowledge(String(body.question || "")), demo: true });

  try {
    const [metricsResult, inventoryResult, topResult] = await env.DB.batch([
      env.DB.prepare(`SELECT
        COUNT(*) AS orders,
        COALESCE(SUM(CASE WHEN status!='cancelled' THEN subtotal-discount+shipping_fee+service_total ELSE 0 END),0) AS sales,
        COALESCE(AVG(CASE WHEN status!='cancelled' THEN subtotal-discount+shipping_fee+service_total END),0) AS average_order,
        SUM(CASE WHEN status IN ('new','ready') THEN 1 ELSE 0 END) AS open_orders,
        SUM(CASE WHEN date(created_at)>=date('now','-7 day') AND status!='cancelled' THEN subtotal-discount+shipping_fee+service_total ELSE 0 END) AS recent_sales,
        SUM(CASE WHEN date(created_at)>=date('now','-14 day') AND date(created_at)<date('now','-7 day') AND status!='cancelled' THEN subtotal-discount+shipping_fee+service_total ELSE 0 END) AS previous_sales
        FROM orders WHERE (?='' OR branch_id=?)`).bind(branchId, branchId),
      env.DB.prepare(`SELECT p.id,p.sku,p.name,p.category,b.name AS branch,
        (i.quantity-i.reserved) AS available,i.reorder_level,
        COALESCE(SUM(CASE WHEN o.status!='cancelled' AND date(o.created_at)>=date('now','-30 day') THEN oi.quantity ELSE 0 END),0) AS sold_30
        FROM inventory i JOIN products p ON p.id=i.product_id JOIN branches b ON b.id=i.branch_id
        LEFT JOIN order_items oi ON oi.product_id=p.id
        LEFT JOIN orders o ON o.id=oi.order_id AND o.branch_id=i.branch_id
        WHERE p.active=1 AND (?='' OR i.branch_id=?)
        GROUP BY i.id ORDER BY available ASC,p.name LIMIT 250`).bind(branchId, branchId),
      env.DB.prepare(`SELECT oi.product_name AS name,SUM(oi.quantity) AS units,SUM(oi.quantity*oi.unit_price) AS sales
        FROM order_items oi JOIN orders o ON o.id=oi.order_id
        WHERE o.status!='cancelled' AND (?='' OR o.branch_id=?)
        GROUP BY oi.product_name ORDER BY units DESC,sales DESC LIMIT 5`).bind(branchId, branchId),
    ]);

    const metrics = (metricsResult.results[0] || {}) as Row;
    const inventory = inventoryResult.results as Row[];
    const recent = Number(metrics.recent_sales || 0);
    const previous = Number(metrics.previous_sales || 0);
    const change = previous > 0 ? Math.round(((recent - previous) / previous) * 100) : recent > 0 ? 100 : 0;
    const lowStock = inventory.filter((row) => Number(row.available) <= Number(row.reorder_level));
    const forecast = inventory.map((row) => {
      const available = Number(row.available || 0);
      const sold = Number(row.sold_30 || 0);
      const daily = sold / 30;
      const daysCoverage = daily > 0 ? Math.max(0, Math.floor(available / daily)) : null;
      const suggestedOrder = Math.max(0, Math.ceil(Math.max(Number(row.reorder_level || 0) * 3, sold * 1.25) - available));
      return { ...row, daysCoverage, suggestedOrder, urgency: available <= 0 ? "critical" : daysCoverage !== null && daysCoverage <= 14 ? "high" : available <= Number(row.reorder_level) ? "medium" : "healthy" };
    }).filter((row) => row.suggestedOrder > 0 || row.urgency !== "healthy").sort((a, b) => (a.daysCoverage ?? 9999) - (b.daysCoverage ?? 9999)).slice(0, 12);

    return Response.json({
      mode: "insights",
      branch: branchId || "all",
      metrics: { ...metrics, weekChange: change },
      insights: [
        { label: "7-day sales pulse", value: change === 0 ? "Flat" : `${change > 0 ? "+" : ""}${change}%`, detail: previous > 0 ? "Compared with the prior seven days." : "Building a comparison baseline.", tone: change >= 0 ? "positive" : "warning" },
        { label: "Open fulfillment", value: String(Number(metrics.open_orders || 0)), detail: "Orders still marked new or ready.", tone: Number(metrics.open_orders || 0) > 5 ? "warning" : "neutral" },
        { label: "Reorder attention", value: String(lowStock.length), detail: "Branch inventory at or below its reorder level.", tone: lowStock.length ? "warning" : "positive" },
        { label: "Average order", value: Number(metrics.average_order || 0), currency: true, detail: "Average non-cancelled order value.", tone: "neutral" },
      ],
      forecast,
      topProducts: topResult.results,
      generatedAt: new Date().toISOString(),
      demo: true,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "AI operations are unavailable" }, { status: 500 });
  }
}
