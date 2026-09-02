import { runtimeEnv as env } from "@/lib/runtime-env";
import { requireAdmin, unauthorized } from "@/lib/admin-auth";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const extensions: Record<string, string> = { "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp", "image/avif":"avif" };

export async function GET(request: Request) {
  try {
    const key = new URL(request.url).searchParams.get("key");
    if (!key || !key.startsWith("products/")) return new Response("Not found", { status: 404 });
    const object = await env.BUCKET.get(key);
    if (!object) return new Response("Not found", { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=86400, immutable");
    return new Response(object.body, { headers });
  } catch { return new Response("Media unavailable", { status: 500 }); }
}

export async function POST(request: Request) {
  if(!await requireAdmin(request))return unauthorized();
  try {
    const formData = await request.formData();
    const productId = String(formData.get("productId") ?? "");
    const file = formData.get("file");
    if (!productId || !(file instanceof File)) return Response.json({ error:"Choose a product image." }, { status:400 });
    if (!allowedTypes.has(file.type)) return Response.json({ error:"Use a JPG, PNG, WebP or AVIF image." }, { status:400 });
    if (file.size > 8 * 1024 * 1024) return Response.json({ error:"Product images must be 8 MB or smaller." }, { status:400 });
    const product = await env.DB.prepare("SELECT image_key FROM products WHERE id=?").bind(productId).first<{image_key:string|null}>();
    if (!product) return Response.json({ error:"Product not found." }, { status:404 });
    const key = `products/${productId}/${crypto.randomUUID()}.${extensions[file.type]}`;
    await env.BUCKET.put(key, await file.arrayBuffer(), { httpMetadata:{ contentType:file.type } });
    await env.DB.prepare("UPDATE products SET image_key=? WHERE id=?").bind(key, productId).run();
    if (product.image_key) await env.BUCKET.delete(product.image_key).catch(()=>undefined);
    return Response.json({ ok:true, imageKey:key, url:`/api/catalog/media?key=${encodeURIComponent(key)}` });
  } catch (error) { return Response.json({ error:error instanceof Error?error.message:"Unable to upload product image" }, { status:500 }); }
}

export async function DELETE(request: Request) {
  if(!await requireAdmin(request))return unauthorized();
  try {
    const body = await request.json() as { productId?:string };
    if (!body.productId) return Response.json({ error:"Product ID is required." }, { status:400 });
    const product = await env.DB.prepare("SELECT image_key FROM products WHERE id=?").bind(body.productId).first<{image_key:string|null}>();
    if (!product) return Response.json({ error:"Product not found." }, { status:404 });
    await env.DB.prepare("UPDATE products SET image_key=NULL WHERE id=?").bind(body.productId).run();
    if (product.image_key) await env.BUCKET.delete(product.image_key).catch(()=>undefined);
    return Response.json({ ok:true });
  } catch (error) { return Response.json({ error:error instanceof Error?error.message:"Unable to remove product image" }, { status:500 }); }
}
