import { runtimeEnv as env } from "@/lib/runtime-env";
import { branches, initialStocks, storeProducts } from "@/lib/store-data";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

const demoOrders = [
  { suffix:"1001", customer:"Mika Santos", email:"mika@example.com", phone:"09171234501", branch:0, product:0, qty:1, status:"completed", payment:"paid", days:6 },
  { suffix:"1002", customer:"Paolo Reyes", email:"paolo@example.com", phone:"09171234502", branch:1, product:8, qty:1, status:"completed", payment:"paid", days:5 },
  { suffix:"1003", customer:"Ana Cruz", email:"ana@example.com", phone:"09171234503", branch:2, product:14, qty:4, status:"completed", payment:"paid", days:4 },
  { suffix:"1004", customer:"Luis Garcia", email:"luis@example.com", phone:"09171234504", branch:0, product:4, qty:1, status:"completed", payment:"paid", days:3 },
  { suffix:"1005", customer:"Bea Lim", email:"bea@example.com", phone:"09171234505", branch:1, product:15, qty:1, status:"ready", payment:"pending", days:2 },
  { suffix:"1006", customer:"Carlo Ong", email:"carlo@example.com", phone:"09171234506", branch:2, product:16, qty:2, status:"new", payment:"pending", days:1 },
  { suffix:"1007", customer:"Nica Flores", email:"nica@example.com", phone:"09171234507", branch:0, product:3, qty:2, status:"new", payment:"pending", days:0 },
];

const detailSeed:Record<string,{specs:Record<string,string|number>;warranty:number;cost:number;gpuLength?:number;gpuClearance?:number;coolerHeight?:number;coolerClearance?:number;radiator?:number;radiatorSupport?:number;connectors?:number;bios?:string}>={
  "prd-r5-5600g":{specs:{Cores:6,Threads:12,"Boost clock":"4.4 GHz","Integrated graphics":"Radeon Vega 7",Socket:"AM4"},warranty:36,cost:5450,bios:"P2.30+"},
  "prd-r5-5600":{specs:{Cores:6,Threads:12,"Boost clock":"4.4 GHz","Integrated graphics":"None",Socket:"AM4"},warranty:36,cost:5050,bios:"P2.30+"},
  "prd-b550m":{specs:{Chipset:"AMD B550",Socket:"AM4","Memory support":"DDR4 up to 4400 MHz","M.2 slots":2,"PCIe slot":"PCIe 4.0 x16",Format:"micro-ATX"},warranty:36,cost:4320,bios:"AGESA ComboAM4v2 1.2.0.7"},
  "prd-ram-16":{specs:{Capacity:"16 GB",Type:"DDR4",Speed:"3200 MT/s",Modules:"2 × 8 GB"},warranty:60,cost:1640},
  "prd-rtx3050":{specs:{GPU:"GeForce RTX 3050",Memory:"8 GB GDDR6",Outputs:"HDMI + DisplayPort","Recommended PSU":"550 W"},warranty:36,cost:11950,gpuLength:282,connectors:1},
  "prd-ssd-512":{specs:{Capacity:"512 GB",Interface:"PCIe NVMe",Format:"M.2 2280","Sequential read":"Up to 3,500 MB/s"},warranty:36,cost:1540},
  "prd-psu-650":{specs:{Output:"650 W",Efficiency:"80 Plus Bronze",Modular:"Fixed cable","PCIe connectors":2},warranty:36,cost:2350,connectors:2},
  "prd-case-atx":{specs:{Format:"ATX mid tower",Fans:"3 × ARGB included",Panel:"Tempered glass","GPU clearance":"330 mm","Cooler clearance":"165 mm"},warranty:12,cost:1990,gpuClearance:330,coolerClearance:165,radiatorSupport:360},
  "prd-case-pano":{specs:{Format:"ATX dual chamber",Fans:"ARGB ready",Panel:"Panoramic tempered glass","GPU clearance":"400 mm","Radiator support":"360 mm"},warranty:12,cost:2950,gpuClearance:400,coolerClearance:170,radiatorSupport:360},
  "prd-case-compact":{specs:{Format:"micro-ATX",Panel:"Tempered glass","GPU clearance":"300 mm","Cooler clearance":"155 mm"},warranty:12,cost:2400,gpuClearance:300,coolerClearance:155,radiatorSupport:240},
  "prd-aio360":{specs:{Radiator:"360 mm",Fans:"3 × 120 mm ARGB",Socket:"AM4 compatible",Pump:"PWM"},warranty:36,cost:10600,radiator:360},
  "prd-xg27uq":{specs:{Panel:"27-inch IPS",Resolution:"3840 × 2160",Refresh:"144 Hz",Response:"1 ms",HDR:"DisplayHDR 400"},warranty:36,cost:30200},
  "prd-hik-colorvu":{specs:{Resolution:"2 MP",Imaging:"24/7 ColorVu",Audio:"Built-in microphone",Ingress:"IP67"},warranty:24,cost:1240},
  "prd-reyee-router":{specs:{Ports:"10 × Gigabit",Management:"Cloud managed",VPN:"IPSec / OpenVPN",Rack:"1U"},warranty:36,cost:6300},
  "prd-ups1000":{specs:{Capacity:"1000 VA / 600 W",Topology:"Line interactive",Outlets:4,"AVR":"Yes"},warranty:12,cost:1870},
};

const commerceSeed=[
  {id:"seed-promo-build",type:"promotion",branch:null,reference:"BUILD500",title:"₱500 off a complete PC build",status:"active",payload:{code:"BUILD500",kind:"fixed",value:500,minSpend:30000,description:"Valid on eight required PC components.",expires:"2026-12-31"}},
  {id:"seed-promo-pickup",type:"promotion",branch:"branch-angeles",reference:"NORTH5",title:"5% North Branch pickup offer",status:"active",payload:{code:"NORTH5",kind:"percent",value:5,maxDiscount:1500,minSpend:15000,description:"Demo branch-only pickup discount.",expires:"2026-12-31"}},
  {id:"seed-supplier-amd",type:"supplier",branch:null,reference:"SUP-AMD-01",title:"Northstar Components",status:"active",payload:{contact:"Mara Villanueva",email:"trade@northstar.example",phone:"09170001111",leadDays:5,categories:["Processor","Motherboard","Memory"]}},
  {id:"seed-supplier-sec",type:"supplier",branch:null,reference:"SUP-SEC-02",title:"SecureLink Distribution",status:"active",payload:{contact:"Jun Bautista",email:"sales@securelink.example",phone:"09170002222",leadDays:4,categories:["CCTV","Networking","Power"]}},
  {id:"seed-po-01",type:"purchase_order",branch:"branch-angeles",reference:"PO-DEMO-1042",title:"Restock Ryzen 5 5600G",status:"ordered",payload:{supplier:"Northstar Components",productId:"prd-r5-5600g",productName:"Ryzen 5 5600G",quantity:10,unitCost:5450,eta:"2026-09-05"}},
  {id:"seed-rma-01",type:"return",branch:"branch-san-fernando",customer:"mika@example.com",reference:"RMA-DEMO-017",title:"Intermittent monitor signal",status:"inspection",payload:{orderNumber:"TS-DEMO-1002",productId:"prd-xg27uq",productName:"ROG Strix XG27UQ",reason:"DisplayPort signal drops after warming up",resolution:"Pending technician inspection",evidence:"2 photos attached (simulated)"}},
  {id:"seed-review-01",type:"review",branch:null,customer:"paolo@example.com",reference:"REV-DEMO-01",title:"Great branch pickup experience",status:"published",payload:{productId:"prd-r5-5600g",body:"The staff confirmed compatibility and had the build ready the same afternoon.",rating:5,author:"Paolo R.",verified:true}},
  {id:"seed-cart-01",type:"abandoned_cart",branch:"branch-tarlac",customer:"carlo@example.com",reference:"CART-DEMO-022",title:"Creator build checkout",status:"recoverable",payload:{value:42870,itemCount:7,lastStep:"payment",recoveryChannel:"email",lastActivity:"18 minutes ago"}},
];

export async function POST(request:Request) {
  if(!await requireAdmin(request))return unauthorized();
  try {
    const statements = [
      ...branches.map((b) => env.DB.prepare("INSERT OR IGNORE INTO branches (id, code, name, address, phone, active) VALUES (?, ?, ?, ?, ?, ?)").bind(b.id,b.code,b.name,b.address,b.phone,b.active)),
      ...storeProducts.map((p) => env.DB.prepare("INSERT OR IGNORE INTO products (id, sku, name, brand, category, description, price, power_watts, socket, memory_type, form_factor, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)").bind(p.id,p.sku,p.name,p.brand,p.category,p.description,p.price,p.powerWatts??null,p.socket??null,p.memoryType??null,p.formFactor??null)),
      ...branches.flatMap((b,branchIndex) => storeProducts.map((p,index) => env.DB.prepare("INSERT OR IGNORE INTO inventory (id, branch_id, product_id, quantity, reserved, reorder_level) VALUES (?, ?, ?, ?, 0, 3)").bind(`inv-${b.code.toLowerCase()}-${p.id}`,b.id,p.id,Math.max(1,initialStocks[index]-branchIndex*2)))),
      ...Object.entries(detailSeed).map(([productId,detail])=>env.DB.prepare(`INSERT OR IGNORE INTO product_details (product_id,specs_json,warranty_months,cost,gpu_length_mm,case_gpu_clearance_mm,cooler_height_mm,case_cooler_clearance_mm,radiator_size_mm,case_radiator_support_mm,pcie_connectors,bios_version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(productId,JSON.stringify(detail.specs),detail.warranty,detail.cost,detail.gpuLength??null,detail.gpuClearance??null,detail.coolerHeight??null,detail.coolerClearance??null,detail.radiator??null,detail.radiatorSupport??null,detail.connectors??null,detail.bios??null)),
      ...commerceSeed.map((record)=>env.DB.prepare("INSERT OR IGNORE INTO commerce_records (id,type,branch_id,customer_email,reference,title,status,payload) VALUES (?,?,?,?,?,?,?,?)").bind(record.id,record.type,record.branch??null,(record as {customer?:string}).customer??null,record.reference,record.title,record.status,JSON.stringify(record.payload))),
      ...demoOrders.map((demo)=>env.DB.prepare("INSERT OR IGNORE INTO customers (id,name,email,phone) VALUES (?,?,?,?)").bind(`demo-customer-${demo.suffix}`,demo.customer,demo.email,demo.phone)),
    ];
    await env.DB.batch(statements);

    const currentOrders = await env.DB.prepare("SELECT COUNT(*) AS count FROM orders").first<{ count: number }>();
    let ordersAdded = 0;
    if (!Number(currentOrders?.count ?? 0)) {
      const orderStatements = demoOrders.flatMap((demo) => {
        const product = storeProducts[demo.product]; const branch = branches[demo.branch];
        const orderId = `demo-order-${demo.suffix}`; const orderNumber = `TS-DEMO-${demo.suffix}`; const total = product.price * demo.qty;
        const paymentMethod = demo.payment === "paid" ? (Number(demo.suffix) % 2 ? "gcash" : "card") : "pay-on-pickup";
        const paymentReference = demo.payment === "paid" ? `DEMO-${paymentMethod.toUpperCase()}-${demo.suffix}` : null;
        const movementType = demo.status === "completed" ? "sale" : "reservation";
        const inventoryUpdate = demo.status === "completed"
          ? env.DB.prepare("UPDATE inventory SET quantity=quantity-?, updated_at=CURRENT_TIMESTAMP WHERE branch_id=? AND product_id=?").bind(demo.qty, branch.id, product.id)
          : env.DB.prepare("UPDATE inventory SET reserved=reserved+?, updated_at=CURRENT_TIMESTAMP WHERE branch_id=? AND product_id=?").bind(demo.qty, branch.id, product.id);
        return [
          env.DB.prepare("INSERT INTO orders (id,order_number,customer_name,email,phone,fulfillment,payment_method,branch_id,subtotal,status,payment_status,payment_reference,payment_details,paid_at,created_at) VALUES (?,?,?,?,?,'pickup',?,?,?,?,?,?,?,?,datetime('now',?))")
            .bind(orderId,orderNumber,demo.customer,demo.email,demo.phone,paymentMethod,branch.id,total,demo.status,demo.payment,paymentReference,"Seeded demonstration payment",demo.payment==="paid"?new Date(Date.now()-demo.days*86400000).toISOString():null,`-${demo.days} day`),
          env.DB.prepare("INSERT INTO order_items (id,order_id,product_id,product_name,quantity,unit_price) VALUES (?,?,?,?,?,?)")
            .bind(`demo-item-${demo.suffix}`,orderId,product.id,product.name,demo.qty,product.price),
          inventoryUpdate,
          env.DB.prepare("INSERT INTO stock_movements (id,branch_id,product_id,type,quantity,reference,notes,created_at) VALUES (?,?,?,?,?,?,?,datetime('now',?))")
            .bind(`demo-move-${demo.suffix}`,branch.id,product.id,movementType,-demo.qty,orderNumber,"Demo storefront order",`-${demo.days} day`),
          env.DB.prepare("INSERT INTO notifications (id,order_id,order_number,channel,recipient,subject,body,status,created_at) VALUES (?,?,?,?,?,?,?,'sent',datetime('now',?))")
            .bind(`demo-email-${demo.suffix}`,orderId,orderNumber,"email",demo.email,`Demo order ${orderNumber}`,`Hi ${demo.customer}, your Tech Systems demo order is ${demo.status}.`, `-${demo.days} day`),
          env.DB.prepare("INSERT INTO notifications (id,order_id,order_number,channel,recipient,subject,body,status,created_at) VALUES (?,?,?,?,?,?,?,'sent',datetime('now',?))")
            .bind(`demo-sms-${demo.suffix}`,orderId,orderNumber,"sms",demo.phone,"Tech Systems demo order",`${orderNumber}: ${demo.status}. This is a simulated SMS.`, `-${demo.days} day`),
        ];
      });
      await env.DB.batch(orderStatements); ordersAdded = demoOrders.length;
    }
    return Response.json({ ok:true, branches:branches.length, products:storeProducts.length, ordersAdded });
  } catch (error) { return Response.json({ error:error instanceof Error ? error.message : "Unable to load demo operations data" }, { status:500 }); }
}
