import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const branches = sqliteTable("branches", {
  id: text("id").primaryKey(), code: text("code").notNull(), name: text("name").notNull(),
  address: text("address").notNull(), phone: text("phone").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("branches_code_unique").on(table.code)]);

export const products = sqliteTable("products", {
  id: text("id").primaryKey(), sku: text("sku").notNull(), name: text("name").notNull(),
  brand: text("brand").notNull(), category: text("category").notNull(),
  description: text("description").notNull().default(""), price: integer("price").notNull(),
  powerWatts: integer("power_watts"), socket: text("socket"), memoryType: text("memory_type"),
  formFactor: text("form_factor"), imageKey: text("image_key"), active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("products_sku_unique").on(table.sku)]);

export const productDetails = sqliteTable("product_details", {
  productId: text("product_id").primaryKey().references(() => products.id),
  specsJson: text("specs_json").notNull().default("{}"),
  warrantyMonths: integer("warranty_months").notNull().default(12),
  cost: integer("cost").notNull().default(0), barcode: text("barcode"),
  gpuLengthMm: integer("gpu_length_mm"), caseGpuClearanceMm: integer("case_gpu_clearance_mm"),
  coolerHeightMm: integer("cooler_height_mm"), caseCoolerClearanceMm: integer("case_cooler_clearance_mm"),
  radiatorSizeMm: integer("radiator_size_mm"), caseRadiatorSupportMm: integer("case_radiator_support_mm"),
  pcieConnectors: integer("pcie_connectors"), biosVersion: text("bios_version"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const inventory = sqliteTable("inventory", {
  id: text("id").primaryKey(), branchId: text("branch_id").notNull().references(() => branches.id),
  productId: text("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull().default(0), reserved: integer("reserved").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(3), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("inventory_branch_product_unique").on(table.branchId, table.productId)]);

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull(),
  phone: text("phone").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("customers_email_unique").on(table.email)]);

export const customerAccounts = sqliteTable("customer_accounts", {
  id: text("id").primaryKey(), email: text("email").notNull(), name: text("name").notNull(),
  phone: text("phone").notNull().default(""), passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(), addressesJson: text("addresses_json").notNull().default("[]"),
  active: integer("active", { mode:"boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("customer_accounts_email_unique").on(table.email)]);

export const customerSessions = sqliteTable("customer_sessions", {
  id: text("id").primaryKey(), customerId: text("customer_id").notNull().references(() => customerAccounts.id),
  tokenHash: text("token_hash").notNull(), expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("customer_sessions_token_unique").on(table.tokenHash), index("idx_customer_sessions_user_expires").on(table.customerId, table.expiresAt)]);

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(), orderNumber: text("order_number").notNull(),
  customerId: text("customer_id").references(() => customers.id), customerName: text("customer_name").notNull(),
  email: text("email").notNull(), phone: text("phone").notNull(), fulfillment: text("fulfillment").notNull(),
  paymentMethod: text("payment_method").notNull(), branchId: text("branch_id").references(() => branches.id),
  deliveryAddress: text("delivery_address"), subtotal: integer("subtotal").notNull(),
  status: text("status").notNull().default("new"), paymentStatus: text("payment_status").notNull().default("pending"),
  paymentReference: text("payment_reference"), paymentDetails: text("payment_details"), paidAt: text("paid_at"),
  couponCode: text("coupon_code"), discount: integer("discount").notNull().default(0),
  shippingFee: integer("shipping_fee").notNull().default(0), serviceTotal: integer("service_total").notNull().default(0), servicesJson: text("services_json").notNull().default("[]"),
  buildMetadata: text("build_metadata").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("orders_number_unique").on(table.orderNumber),
  index("idx_orders_branch_created").on(table.branchId, table.createdAt),
  index("idx_orders_status").on(table.status),
]);

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(), orderId: text("order_id").notNull().references(() => orders.id),
  productId: text("product_id").notNull().references(() => products.id), productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(), unitPrice: integer("unit_price").notNull(),
}, (table) => [index("idx_order_items_order").on(table.orderId)]);

export const stockMovements = sqliteTable("stock_movements", {
  id: text("id").primaryKey(), branchId: text("branch_id").notNull().references(() => branches.id),
  productId: text("product_id").notNull().references(() => products.id), type: text("type").notNull(),
  quantity: integer("quantity").notNull(), reference: text("reference").notNull(), notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_stock_movements_branch_created").on(table.branchId, table.createdAt)]);

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(), orderId: text("order_id").notNull().references(() => orders.id),
  orderNumber: text("order_number").notNull(), channel: text("channel").notNull(),
  recipient: text("recipient").notNull(), subject: text("subject").notNull(), body: text("body").notNull(),
  status: text("status").notNull().default("sent"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_notifications_order_created").on(table.orderNumber, table.createdAt)]);

export const staff = sqliteTable("staff", {
  id: text("id").primaryKey(), email: text("email").notNull(), role: text("role").notNull(),
  branchId: text("branch_id").references(() => branches.id), active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("staff_email_unique").on(table.email)]);

export const adminUsers = sqliteTable("admin_users", {
  id: text("id").primaryKey(), username: text("username").notNull(), displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(), passwordSalt: text("password_salt").notNull(),
  role: text("role").notNull().default("staff"), active: integer("active", { mode:"boolean" }).notNull().default(true),
  mustChangePassword: integer("must_change_password", { mode:"boolean" }).notNull().default(true),
  lastLoginAt: text("last_login_at"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("admin_users_username_unique").on(table.username)]);

export const adminSessions = sqliteTable("admin_sessions", {
  id: text("id").primaryKey(), userId: text("user_id").notNull().references(() => adminUsers.id),
  tokenHash: text("token_hash").notNull(), expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("admin_sessions_token_unique").on(table.tokenHash), index("idx_admin_sessions_user_expires").on(table.userId, table.expiresAt)]);

export const storeSettings = sqliteTable("store_settings", {
  key: text("key").primaryKey(), value: text("value").notNull(), updatedBy: text("updated_by").references(() => adminUsers.id),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const adminAuditLogs = sqliteTable("admin_audit_logs", {
  id: text("id").primaryKey(), userId: text("user_id").references(() => adminUsers.id),
  username: text("username").notNull(), action: text("action").notNull(), details: text("details").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_admin_audit_created").on(table.createdAt), index("idx_admin_audit_user").on(table.userId)]);

export const commerceRecords = sqliteTable("commerce_records", {
  id: text("id").primaryKey(), type: text("type").notNull(),
  branchId: text("branch_id").references(() => branches.id), customerEmail: text("customer_email"),
  reference: text("reference").notNull(), title: text("title").notNull(), status: text("status").notNull().default("active"),
  payload: text("payload").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("commerce_records_reference_unique").on(table.reference),
  index("idx_commerce_records_type_branch").on(table.type, table.branchId),
  index("idx_commerce_records_customer").on(table.customerEmail, table.type),
]);
