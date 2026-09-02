import { requireAdmin, unauthorized } from "@/lib/admin-auth";
import { runtimeEnv as env } from "@/lib/runtime-env";
import { storeProducts } from "@/lib/store-data";

type CatalogRow = Record<string, unknown>;

const categorySignals: Array<[string, RegExp]> = [
  ["Processor", /\b(cpu|processor|ryzen|core\s*i[3579]|athlon)\b/i],
  ["Motherboard", /\b(motherboard|mainboard|b[4567]\d{2}|x[4567]\d{2}|h[56]\d{2}|z[679]\d{2})\b/i],
  ["Memory", /\b(ram|memory|ddr[345]|dimm|sodimm)\b/i],
  ["Storage", /\b(ssd|nvme|m\.2|hard\s*drive|hdd)\b/i],
  ["Graphics", /\b(gpu|graphics|geforce|radeon|rtx|gtx|arc\s+[a-z]\d+)\b/i],
  ["Cooling", /\b(cooler|cooling|aio|radiator|heatsink)\b/i],
  ["Power Supply", /\b(psu|power\s*supply|80\s*plus)\b/i],
  ["Case", /\b(case|chassis|tower|micro-?atx)\b/i],
  ["Monitor", /\b(monitor|display|\d{2}(?:\.\d)?\s*(?:inch|\"))\b/i],
  ["Keyboard", /\b(keyboard|keycaps?|mechanical\s*keys?)\b/i],
  ["Mouse", /\b(mouse|gaming\s*mouse)\b/i],
  ["Headset", /\b(headset|headphones?|earphones?)\b/i],
  ["Laptop", /\b(laptop|notebook)\b/i],
  ["CCTV", /\b(cctv|camera|dvr|nvr|colorvu)\b/i],
  ["Networking", /\b(router|switch|access\s*point|wifi|wi-fi|ethernet|poe)\b/i],
  ["Smart Home", /\b(smart\s*home|sensor|smart\s*plug|doorbell)\b/i],
  ["Power", /\b(ups|avr|surge|backup\s*power)\b/i],
];

const brandSignals = ["AMD", "Intel", "MSI", "ASUS", "Gigabyte", "AORUS", "TeamGroup", "Gamdias", "Logitech", "Hikvision", "Ruijie", "Reyee", "AIDE", "Samsung", "Kingston", "Corsair", "Crucial", "Seagate", "Western Digital", "Acer", "Lenovo", "HP", "Dell"];

function normalized(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function scoreProduct(row: CatalogRow, query: string) {
  const needle = normalized(query);
  if (!needle) return 0;
  const sku = normalized(row.sku);
  const name = normalized(row.name);
  const haystack = normalized(`${row.sku} ${row.name} ${row.brand} ${row.category}`);
  if (needle === sku) return 100;
  if (needle.includes(sku) && sku.length > 3) return 96;
  if (needle === name) return 94;
  if (needle.includes(name) && name.length > 4) return 90;
  const tokens = needle.split(" ").filter((token) => token.length > 1);
  if (!tokens.length) return 0;
  const hits = tokens.filter((token) => haystack.includes(token)).length;
  return Math.round((hits / tokens.length) * 82);
}

function guessedSku(query: string) {
  const candidate = query.toUpperCase().match(/[A-Z0-9][A-Z0-9._/-]{3,}/g)?.sort((a, b) => b.length - a.length)[0] ?? "";
  return candidate.replaceAll("/", "-").slice(0, 48);
}

function titleFromQuery(query: string) {
  return query.replace(/\.(jpe?g|png|webp|avif)$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 10).map((word) => word.length > 3 ? word[0].toUpperCase() + word.slice(1) : word.toUpperCase()).join(" ");
}

export async function POST(request: Request) {
  if (!await requireAdmin(request)) return unauthorized();
  try {
    const body = await request.json() as { query?: string };
    const query = String(body.query ?? "").trim().slice(0, 500);
    if (query.length < 3) return Response.json({ error: "Enter a SKU, barcode, model, or scan a readable product label." }, { status: 400 });

    let products: CatalogRow[];
    try {
      const result = await env.DB.prepare("SELECT id, sku, name, brand, category, description, price, power_watts, socket, memory_type, form_factor, image_key, active FROM products WHERE active=1").all();
      products = result.results as CatalogRow[];
    } catch {
      products = storeProducts.map((product) => ({ ...product, power_watts: product.powerWatts, memory_type: product.memoryType, form_factor: product.formFactor }));
    }

    const ranked = products.map((row) => ({ row, score: scoreProduct(row, query) })).sort((a, b) => b.score - a.score);
    const match = ranked[0]?.score >= 45 ? ranked[0] : null;
    const detectedCategory = categorySignals.find(([, signal]) => signal.test(query))?.[0] ?? "Processor";
    const detectedBrand = brandSignals.find((brand) => new RegExp(`\\b${brand.replace(" ", "\\s*")}\\b`, "i").test(query)) ?? "";
    const row = match?.row;
    const sku = row ? String(row.sku ?? "") : guessedSku(query);
    const name = row ? String(row.name ?? "") : titleFromQuery(query);
    const brand = row ? String(row.brand ?? "") : detectedBrand;
    const category = row ? String(row.category ?? detectedCategory) : detectedCategory;
    const imageKey = row ? String(row.image_key ?? "") : "";
    const exactSearch = `${brand} ${name || sku} ${sku} official product image white background`.replace(/\s+/g, " ").trim();

    return Response.json({
      confidence: match ? Math.min(99, Math.max(70, match.score)) : 58,
      matchedExistingId: row ? String(row.id ?? "") : "",
      duplicate: Boolean(row && match && match.score >= 90),
      source: row ? "Live store catalog match" : "SKU and label inference",
      suggestion: {
        sku,
        name,
        brand,
        category,
        description: row ? String(row.description ?? "") : `${name || "Product"} identified from the scanned SKU or package label. Verify specifications before publishing.`,
        price: row ? String(row.price ?? "") : "",
        powerWatts: row ? String(row.power_watts ?? row.powerWatts ?? "") : "",
        socket: row ? String(row.socket ?? "") : "",
        memoryType: row ? String(row.memory_type ?? row.memoryType ?? "") : "",
        formFactor: row ? String(row.form_factor ?? row.formFactor ?? "") : "",
      },
      imageCandidate: imageKey ? `/api/catalog/media?key=${encodeURIComponent(imageKey)}` : "",
      imageSearchUrl: `https://www.google.com/search?tbm=isch&safe=active&q=${encodeURIComponent(exactSearch)}`,
      imageSearchQuery: exactSearch,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The product scan could not be completed." }, { status: 500 });
  }
}
