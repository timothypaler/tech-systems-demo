import { runtimeEnv as env } from "@/lib/runtime-env";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

const emptyDashboard = {
  metrics: { products: 0, orders: 0, sales: 0, completed_sales: 0, open_orders: 0, low_stock: 0, avg_order: 0, customers: 0 },
  branches: [], products: [], stock: [], orders: [], orderItems: [], movements: [], notifications: [], salesTrend: [], orderStatus: [], branchPerformance: [], categoryMix: [], topProducts: [],
};

export async function GET(request: Request) {
  if(!await requireAdmin(request))return unauthorized();
  const requestedBranch = new URL(request.url).searchParams.get("branch") ?? "";
  const branchId = requestedBranch === "all" ? "" : requestedBranch;
  try {
    const [metrics, branches, products, stock, orders, orderItems, movements, notifications, salesTrend, orderStatus, branchPerformance, categoryMix, topProducts] = await env.DB.batch([
      env.DB.prepare(`WITH filtered_orders AS (
          SELECT * FROM orders WHERE (?='' OR branch_id=?)
        ), filtered_inventory AS (
          SELECT * FROM inventory WHERE (?='' OR branch_id=?)
        ) SELECT
        (SELECT COUNT(DISTINCT fi.product_id) FROM filtered_inventory fi JOIN products p ON p.id=fi.product_id WHERE p.active=1) AS products,
        (SELECT COUNT(*) FROM filtered_orders) AS orders,
        (SELECT COALESCE(SUM(subtotal-discount+shipping_fee+service_total),0) FROM filtered_orders WHERE status != 'cancelled') AS sales,
        (SELECT COALESCE(SUM(subtotal-discount+shipping_fee+service_total),0) FROM filtered_orders WHERE status = 'completed') AS completed_sales,
        (SELECT COUNT(*) FROM filtered_orders WHERE status IN ('new','ready')) AS open_orders,
        (SELECT COUNT(*) FROM filtered_inventory WHERE quantity-reserved<=reorder_level) AS low_stock,
        (SELECT COALESCE(ROUND(AVG(subtotal-discount+shipping_fee+service_total)),0) FROM filtered_orders WHERE status != 'cancelled') AS avg_order,
        (SELECT COUNT(DISTINCT email) FROM filtered_orders) AS customers`).bind(branchId,branchId,branchId,branchId),
      env.DB.prepare(`SELECT id, code, name, address, phone, active FROM branches WHERE active=1 ORDER BY name`),
      env.DB.prepare(`SELECT p.*, COALESCE(SUM(i.quantity),0) AS total_stock, COALESCE(SUM(i.reserved),0) AS total_reserved
        FROM products p LEFT JOIN inventory i ON i.product_id=p.id AND (?='' OR i.branch_id=?)
        GROUP BY p.id ORDER BY p.active DESC, p.category, p.name`).bind(branchId,branchId),
      env.DB.prepare(`SELECT i.id, p.sku, p.name, p.category, b.name AS branch, b.code AS branch_code, i.branch_id, i.product_id, i.quantity, i.reserved, i.reorder_level
        FROM inventory i JOIN products p ON p.id=i.product_id JOIN branches b ON b.id=i.branch_id
        WHERE p.active=1 AND (?='' OR i.branch_id=?) ORDER BY (i.quantity-i.reserved) ASC, p.name LIMIT 250`).bind(branchId,branchId),
      env.DB.prepare(`SELECT o.order_number, o.customer_name, o.email, o.phone, o.fulfillment, o.payment_method, o.payment_reference, o.payment_details, o.paid_at, o.delivery_address, o.subtotal, o.coupon_code, o.discount, o.shipping_fee, o.service_total, o.services_json, o.build_metadata, (o.subtotal-o.discount+o.shipping_fee+o.service_total) AS grand_total, o.status, o.payment_status, o.created_at, o.branch_id, b.name AS branch,
        (SELECT COALESCE(SUM(oi.quantity),0) FROM order_items oi WHERE oi.order_id=o.id) AS item_count
        FROM orders o LEFT JOIN branches b ON b.id=o.branch_id WHERE (?='' OR o.branch_id=?) ORDER BY o.created_at DESC LIMIT 100`).bind(branchId,branchId),
      env.DB.prepare(`SELECT o.order_number, oi.product_id, oi.product_name, oi.quantity, oi.unit_price, (oi.quantity*oi.unit_price) AS line_total
        FROM order_items oi JOIN orders o ON o.id=oi.order_id
        WHERE (?='' OR o.branch_id=?) ORDER BY o.created_at DESC, oi.product_name LIMIT 500`).bind(branchId,branchId),
      env.DB.prepare(`SELECT s.type, s.quantity, s.reference, s.notes, s.created_at, s.branch_id, p.name AS product, p.sku, b.name AS branch
        FROM stock_movements s JOIN products p ON p.id=s.product_id JOIN branches b ON b.id=s.branch_id
        WHERE (?='' OR s.branch_id=?) ORDER BY s.created_at DESC LIMIT 100`).bind(branchId,branchId),
      env.DB.prepare(`SELECT n.order_number,n.channel,n.recipient,n.subject,n.body,n.status,n.created_at,o.branch_id,b.name AS branch
        FROM notifications n JOIN orders o ON o.id=n.order_id LEFT JOIN branches b ON b.id=o.branch_id
        WHERE (?='' OR o.branch_id=?) ORDER BY n.created_at DESC LIMIT 100`).bind(branchId,branchId),
      env.DB.prepare(`SELECT substr(created_at,1,10) AS day, COUNT(*) AS orders, COALESCE(SUM(CASE WHEN status!='cancelled' THEN subtotal-discount+shipping_fee+service_total ELSE 0 END),0) AS sales
        FROM orders WHERE date(created_at) >= date('now','-6 day') AND (?='' OR branch_id=?)
        GROUP BY substr(created_at,1,10) ORDER BY day`).bind(branchId,branchId),
      env.DB.prepare(`SELECT status, COUNT(*) AS value FROM orders WHERE (?='' OR branch_id=?) GROUP BY status ORDER BY value DESC`).bind(branchId,branchId),
      env.DB.prepare(`SELECT b.id, b.code, b.name,
        COUNT(o.id) AS orders,
        COALESCE(SUM(CASE WHEN o.status!='cancelled' THEN o.subtotal-o.discount+o.shipping_fee+o.service_total ELSE 0 END),0) AS sales,
        COALESCE((SELECT SUM(i.quantity-i.reserved) FROM inventory i WHERE i.branch_id=b.id),0) AS available
        FROM branches b LEFT JOIN orders o ON o.branch_id=b.id
        WHERE b.active=1 AND (?='' OR b.id=?) GROUP BY b.id ORDER BY sales DESC`).bind(branchId,branchId),
      env.DB.prepare(`SELECT p.category, COUNT(DISTINCT p.id) AS value FROM products p
        JOIN inventory i ON i.product_id=p.id WHERE p.active=1 AND (?='' OR i.branch_id=?)
        GROUP BY p.category ORDER BY value DESC`).bind(branchId,branchId),
      env.DB.prepare(`SELECT oi.product_name AS name, SUM(oi.quantity) AS units, SUM(oi.quantity*oi.unit_price) AS sales
        FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE o.status!='cancelled' AND (?='' OR o.branch_id=?)
        GROUP BY oi.product_name ORDER BY units DESC, sales DESC LIMIT 5`).bind(branchId,branchId),
    ]);

    return Response.json({
      metrics: metrics.results[0] ?? emptyDashboard.metrics,
      branches: branches.results, products: products.results, stock: stock.results,
      orders: orders.results, orderItems: orderItems.results, movements: movements.results, notifications: notifications.results,
      salesTrend: salesTrend.results, orderStatus: orderStatus.results,
      branchPerformance: branchPerformance.results, categoryMix: categoryMix.results,
      topProducts: topProducts.results, branch: branchId || "all", syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ ...emptyDashboard, error: error instanceof Error ? error.message : "Dashboard unavailable" }, { status: 500 });
  }
}
