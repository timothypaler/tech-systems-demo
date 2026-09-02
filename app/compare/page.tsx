"use client";

import { ArrowLeft, Boxes, Check, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductVisual } from "@/components/product-visual";
import type { StoreProduct } from "@/lib/store-data";
import "../commerce-pages.css";

type Product=StoreProduct&Record<string,string|number|null>;
const peso=(n:number)=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:0}).format(n||0);
const parse=(value:unknown)=>{try{return JSON.parse(String(value??"{}")) as Record<string,string|number>;}catch{return {};}};

export default function ComparePage(){
  const [catalog,setCatalog]=useState<Product[]>([]);const [ids,setIds]=useState<string[]>([]);
  useEffect(()=>{const timer=window.setTimeout(()=>{const params=new URLSearchParams(window.location.search);let requested=(params.get("ids")??"").split(",").filter(Boolean);if(!requested.length)try{requested=JSON.parse(localStorage.getItem("pclogic-compare")??"[]") as string[];}catch{}setIds(requested.slice(0,4));void fetch("/api/catalog",{cache:"no-store"}).then((r)=>r.json()).then((b:{products?:Product[]})=>setCatalog(b.products??[]));},0);return()=>window.clearTimeout(timer);},[]);
  const products=ids.map((id)=>catalog.find((p)=>p.id===id)).filter((p):p is Product=>Boolean(p));const specKeys=useMemo(()=>Array.from(new Set(products.flatMap((p)=>Object.keys(parse(p.specs_json))))).slice(0,10),[products]);
  function remove(id:string){const next=ids.filter((item)=>item!==id);setIds(next);localStorage.setItem("pclogic-compare",JSON.stringify(next));history.replaceState(null,"",`/compare?ids=${next.join(",")}`);}
  function addAll(){const cart=JSON.parse(localStorage.getItem("pclogic-cart-v2")??"{}") as Record<string,number>;for(const product of products)cart[product.id]=(cart[product.id]??0)+1;localStorage.setItem("pclogic-cart-v2",JSON.stringify(cart));location.href="/shop#cart";}
  function sendToBuilder(){const preset:Record<string,string>={};for(const product of products)preset[product.category]=product.id;localStorage.setItem("pclogic-builder-preset",JSON.stringify(preset));location.href="/builder";}
  return <main className="commerce-page"><header className="commerce-page-header"><Link href="/" className="brand"><span>TECH <span>SYSTEMS</span></span></Link><nav><Link href="/shop"><ArrowLeft/>Back to catalog</Link><Link href="/account">My account</Link></nav></header><section className="commerce-page-hero"><span>Side-by-side decisions</span><h1>Compare the details that matter.</h1><p>Select up to four products in the shop. Price, branch availability, warranty, compatibility fields, and full specifications stay aligned here.</p></section>
    {products.length?<><div className="compare-actions"><Link href="/shop"><ArrowLeft/>Add more products</Link><button onClick={sendToBuilder}><Boxes/>Send compatible parts to builder</button><button onClick={addAll}><ShoppingBag/>Add all to cart</button></div><section className="compare-shell"><div className="compare-table" style={{"--columns":products.length} as React.CSSProperties}><div className="compare-row"><strong>Product</strong>{products.map((p)=><article className="compare-product-head" key={p.id}><button onClick={()=>remove(p.id)} aria-label={`Remove ${p.name}`}><X/> Remove</button><ProductVisual id={p.id} name={p.name} imageKey={p.image_key?String(p.image_key):p.imageKey}/><small>{p.brand} · {p.sku}</small><h2>{p.name}</h2><b>{peso(Number(p.price))}</b></article>)}</div>{[["Category",(p:Product)=>p.category],["Branch stock",(p:Product)=>`${Math.max(0,Number(p.quantity)-Number(p.reserved))} available`],["Warranty",(p:Product)=>`${Number(p.warranty_months??12)} months`],["CPU socket",(p:Product)=>String(p.socket??"—")],["Memory",(p:Product)=>String(p.memory_type??p.memoryType??"—")],["Form factor",(p:Product)=>String(p.form_factor??p.formFactor??"—")],["Power / capacity",(p:Product)=>p.power_watts?`${p.power_watts}W`:"—"]] .map(([label,getter])=><div className="compare-row" key={String(label)}><strong>{String(label)}</strong>{products.map((p)=><span key={p.id}>{(getter as (p:Product)=>string)(p)}</span>)}</div>)}{specKeys.map((key)=><div className="compare-row" key={key}><strong>{key}</strong>{products.map((p)=><span key={p.id}>{String(parse(p.specs_json)[key]??"—")}</span>)}</div>)}<div className="compare-row"><strong>Compatibility ready</strong>{products.map((p)=><span key={p.id}><Check/> Builder fields included</span>)}</div></div></section></>:<section className="account-shell"><div className="account-empty"><Boxes/><h2>No products selected yet.</h2><p>Use the Compare checkboxes in the catalog to select up to four products.</p><Link href="/shop">Browse products</Link></div></section>}
  </main>;
}
