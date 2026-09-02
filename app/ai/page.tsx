"use client";

import { ArrowLeft, Bot, Boxes, Camera, Check, Cpu, Gauge, Home, LoaderCircle, Network, Search, ShieldCheck, ShoppingBag, Sparkles, Store, WandSparkles, Wifi, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { branches } from "@/lib/store-data";
import { ProductVisual } from "@/components/product-visual";
import "./ai.css";

type Row=Record<string,unknown>;
type Mode="assistant"|"build"|"cctv"|"network"|"smart-home"|"cart-review";
type Result=Record<string,unknown>;
const money=(value:number)=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:0}).format(value||0);

export default function AiCenter(){
  const [mode,setMode]=useState<Mode>("assistant");const [branchId,setBranchId]=useState(branches[0].id);const [prompt,setPrompt]=useState("");const [budget,setBudget]=useState(50000);const [useCase,setUseCase]=useState("1080p gaming and everyday work");
  const [rooms,setRooms]=useState(3);const [entrances,setEntrances]=useState(2);const [floors,setFloors]=useState(1);const [users,setUsers]=useState(8);const [loading,setLoading]=useState(false);const [response,setResponse]=useState<Record<string,unknown>|null>(null);const [error,setError]=useState("");
  const result=(response?.result??{}) as Result;const products=(response?.products??result.items??[]) as Row[];
  useEffect(()=>{const timer=window.setTimeout(()=>{const params=new URLSearchParams(location.search);const requested=params.get("mode") as Mode|null;if(requested)setMode(requested);const q=params.get("q");if(q)setPrompt(q);},0);return()=>window.clearTimeout(timer);},[]);
  const modeCopy=useMemo(()=>({assistant:["Store Assistant","Ask naturally. Results come from the live catalog.",Bot],build:["PC Build Advisor","Set the budget and workload. Compatibility remains rule-based.",Cpu],cctv:["CCTV Planner","Size a camera starter plan for rooms and entrances.",Camera],network:["Network Planner","Plan coverage around floors and connected users.",Wifi],["smart-home"]:["Smart Home Planner","Create a secure starting package for connected devices.",Home],["cart-review"]:["Build & Cart Review","Check saved builder selections before checkout.",ShieldCheck]}[mode] as [string,string,typeof Bot]),[mode]);

  async function run(){
    setLoading(true);setError("");setResponse(null);let cartIds:string[]=[];try{cartIds=JSON.parse(localStorage.getItem("pclogic-build-cart")??"[]") as string[];}catch{}
    try{const request=await fetch("/api/ai",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode,prompt,branchId,budget,useCase,rooms,entrances,floors,users,cartIds})});const body=await request.json() as Record<string,unknown>;if(!request.ok)throw new Error(String(body.error??"The assistant could not complete that request."));setResponse(body);}catch(caught){setError(caught instanceof Error?caught.message:"The assistant is unavailable.");}finally{setLoading(false);}
  }
  function applyBuild(){localStorage.setItem("pclogic-builder-preset",JSON.stringify(result.selection??{}));location.href="/builder?preset=ai";}
  function saveQuote(){const items=products.map((row)=>({name:String(row.name),quantity:Number(row.planQuantity??1),price:Number(row.price??0)}));localStorage.setItem("pclogic-quote-draft",JSON.stringify({source:`AI ${mode} plan`,branch:branches.find((branch)=>branch.id===branchId)?.name,items,services:result.services??[],subtotal:Number(result.total??0),discount:0,shippingFee:0,total:Number(result.total??0)}));location.href="/quote";}
  const Icon=modeCopy[2];
  const modes:[Mode,string,typeof Bot][]=[["assistant","Ask Tech Systems",Bot],["build","PC build",Cpu],["cctv","CCTV",Camera],["network","Network",Network],["smart-home","Smart home",Home],["cart-review","Cart review",ShieldCheck]];
  return <main className="ai-center"><header><Link href="/" className="brand"><span>TECH <span>SYSTEMS</span></span></Link><div><span><i/>Demo intelligence online</span><strong>AI Center</strong></div><Link href="/shop"><ArrowLeft/>Store</Link></header>
    <section className="ai-hero"><div><span>Guided by live store data</span><h1>Ask. Plan.<br/><em>Decide clearly.</em></h1><p>Product choices use the connected catalog. Compatibility, stock, prices and publishing remain controlled by the store system.</p></div><label><Store/><span>Working branch</span><select value={branchId} onChange={(event)=>setBranchId(event.target.value)}>{branches.map((branch)=><option value={branch.id} key={branch.id}>{branch.name}</option>)}</select></label></section>
    <nav className="ai-mode-nav">{modes.map(([key,label,ModeIcon])=><button className={mode===key?"active":""} onClick={()=>{setMode(key);setResponse(null);setError("");}} key={key}><ModeIcon/><span>{label}</span></button>)}</nav>
    <section className="ai-workspace"><aside><div className="ai-panel-title"><Icon/><span><small>AI workflow</small><strong>{modeCopy[0]}</strong><p>{modeCopy[1]}</p></span></div>
      {mode==="assistant"&&<label className="ai-large-input">What are you looking for?<textarea value={prompt} onChange={(event)=>setPrompt(event.target.value)} placeholder="Example: I need a white gaming PC under ₱50,000, or a backup power solution for four CCTV cameras."/></label>}
      {mode==="build"&&<><label>Target budget <strong>{money(budget)}</strong><input type="range" min="20000" max="150000" step="5000" value={budget} onChange={(event)=>setBudget(Number(event.target.value))}/></label><label>Primary use<textarea value={useCase} onChange={(event)=>setUseCase(event.target.value)} placeholder="Gaming, editing, office work…"/></label></>}
      {mode==="cctv"&&<div className="ai-number-grid"><label>Rooms<input type="number" min="1" max="32" value={rooms} onChange={(event)=>setRooms(Number(event.target.value))}/></label><label>Entrances<input type="number" min="1" max="16" value={entrances} onChange={(event)=>setEntrances(Number(event.target.value))}/></label></div>}
      {mode==="network"&&<div className="ai-number-grid"><label>Floors<input type="number" min="1" max="12" value={floors} onChange={(event)=>setFloors(Number(event.target.value))}/></label><label>Users/devices<input type="number" min="1" max="500" value={users} onChange={(event)=>setUsers(Number(event.target.value))}/></label></div>}
      {mode==="smart-home"&&<label>Priority<textarea value={prompt} onChange={(event)=>setPrompt(event.target.value)} placeholder="Security, energy control, convenience or a mix"/></label>}
      {mode==="cart-review"&&<div className="ai-cart-source"><ShoppingBag/><span><strong>Saved builder selection</strong><small>The latest build on this device will be checked. No cart data is changed.</small></span></div>}
      <button className="ai-run" onClick={run} disabled={loading}>{loading?<LoaderCircle className="spin"/>:<Sparkles/>}{loading?"Reviewing store data…":"Run AI workflow"}</button><div className="ai-guardrail"><ShieldCheck/><span><strong>Human-controlled results</strong><small>Recommendations are drafts. Branch staff confirms stock, price and onsite requirements.</small></span></div>
    </aside>
    <div className="ai-results">{!response&&!error&&<div className="ai-empty"><WandSparkles/><h2>Your result will appear here.</h2><p>Choose a workflow, enter the requirement and run the assistant.</p><div><span><Check/>Catalog grounded</span><span><Check/>Compatibility protected</span><span><Check/>Quote ready</span></div></div>}{error&&<div className="ai-error">{error}</div>}{response&&<>
      <header><div><span>{response.demo?"Demo AI result":"AI result"}</span><h2>{String(result.title??(response.intent==="build"?"Build recommendation":"Catalog matches"))}</h2><p>{String(result.summary??response.reply??result.note??"")}</p></div>{result.total!==undefined&&<strong>{money(Number(result.total))}</strong>}</header>
      {Array.isArray(result.checks)&&<div className="ai-checks">{(result.checks as string[]).map((item)=><span key={item}><Check/>{item}</span>)}</div>}
      {result.status&&<div className={Array.isArray(result.warnings)&&(result.warnings as unknown[]).length?"ai-review-status warning":"ai-review-status"}><Gauge/><span><small>Review status</small><strong>{String(result.status)}</strong><p>{Array.isArray(result.warnings)?(result.warnings as string[]).join(" "):"System rules found no blocking issue."}</p></span></div>}
      <div className="ai-product-results">{products.map((product)=><article key={String(product.id)}><ProductVisual id={String(product.id)} name={String(product.name)} imageKey={product.image_key?String(product.image_key):undefined}/><div><span>{String(product.brand)} · {String(product.category)}</span><h3>{String(product.name)}</h3><p>{String(product.description??"")}</p><strong>{money(Number(product.price??0))}{product.planQuantity?` × ${product.planQuantity}`:""}</strong></div><Link href={`/product/${product.id}`}>Details</Link></article>)}</div>
      {Array.isArray(result.services)&&<section className="ai-services"><strong>Recommended services</strong>{(result.services as string[]).map((service)=><span key={service}><Check/>{service}</span>)}</section>}
      {Array.isArray(result.suggestions)&&<section className="ai-services"><strong>Assistant suggestions</strong>{(result.suggestions as string[]).map((service)=><span key={service}><Zap/>{service}</span>)}</section>}
      <footer>{mode==="build"&&<button onClick={applyBuild}><Boxes/>Open this build</button>}{["cctv","network","smart-home"].includes(mode)&&<button onClick={saveQuote}><ShoppingBag/>Create quotation</button>}{mode==="assistant"&&response.intent==="build"&&<button onClick={()=>setMode("build")}><Cpu/>Build it</button>}<Link href="/shop"><Search/>Continue shopping</Link></footer>
    </>}</div></section>
  </main>;
}
