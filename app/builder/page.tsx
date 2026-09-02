"use client";

import {
  ArrowLeft, ArrowRight, Boxes, Check, CircleAlert, Cpu, Fan, HardDrive,
  Headphones, Keyboard, MemoryStick, Monitor, Mouse, Package, RotateCcw,
  Gauge, MapPin, Printer, Save, Share2, ShoppingBag, Sparkles, Store, Undo2, Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { branches, storeProducts, type StoreProduct } from "@/lib/store-data";
import { builderPresetSelections } from "@/lib/builder-presets";
import "./builder-v2.css";

type Choice = Partial<StoreProduct> & { id: string; name: string; image?: string; quantity?:number; reserved?:number; gpuLengthMm?:number; caseGpuClearanceMm?:number; coolerHeightMm?:number; caseCoolerClearanceMm?:number; radiatorSizeMm?:number; caseRadiatorSupportMm?:number; pcieConnectors?:number; biosVersion?:string };
type ApiProduct = Record<string, string | number | null>;
type Selection = Record<string, Choice | undefined>;
type Slot = { key: string; label: string; short: string; icon: typeof Package; required: boolean };

const slots: Slot[] = [
  { key: "Case", label: "Case", short: "Chassis", icon: Package, required: true },
  { key: "Motherboard", label: "Motherboard", short: "Mainboard", icon: Boxes, required: true },
  { key: "Processor", label: "Processor", short: "CPU", icon: Cpu, required: true },
  { key: "Memory", label: "Memory", short: "RAM", icon: MemoryStick, required: true },
  { key: "Storage", label: "Storage", short: "SSD", icon: HardDrive, required: true },
  { key: "Graphics", label: "Graphics", short: "GPU", icon: Monitor, required: true },
  { key: "Cooling", label: "Cooling", short: "CPU cooler", icon: Fan, required: true },
  { key: "Power Supply", label: "Power Supply", short: "PSU", icon: Zap, required: true },
  { key: "Monitor", label: "Monitor", short: "Optional", icon: Monitor, required: false },
  { key: "Keyboard", label: "Keyboard", short: "Optional", icon: Keyboard, required: false },
  { key: "Mouse", label: "Mouse", short: "Optional", icon: Mouse, required: false },
  { key: "Headset", label: "Headset", short: "Optional", icon: Headphones, required: false },
];

const productImages: Record<string, string> = {
  "prd-xg27uq": "/products/asus-xg27uqr.webp",
  "prd-g213": "/products/logitech-g213.png",
  "prd-g502": "/products/logitech-g502.png",
  "prd-g435": "/products/logitech-g435.png",
};

const included: Choice[] = [
  { id: "integrated", name: "Integrated Radeon Graphics", brand: "AMD", price: 0, powerWatts: 0, description: "Uses compatible processor graphics. No dedicated graphics card is installed." },
  { id: "stock-cooler", name: "AMD Stock Air Cooler", brand: "AMD", price: 0, powerWatts: 3, socket: "AM4", description: "Included top-down air cooler for supported AM4 processors." },
];
const buildServices=[
  {id:"assembly",name:"Professional assembly",price:1200},
  {id:"os",name:"OS & driver installation",price:850},
  {id:"burnin",name:"24-hour burn-in test",price:650},
];

const normalizeProduct=(product:ApiProduct):StoreProduct=>({
  id:String(product.id),sku:String(product.sku),name:String(product.name),brand:String(product.brand),category:String(product.category),
  description:String(product.description??""),price:Number(product.price??0),powerWatts:Number(product.power_watts??product.powerWatts??0),
  socket:product.socket?String(product.socket):undefined,memoryType:product.memory_type?String(product.memory_type):undefined,
  formFactor:product.form_factor?String(product.form_factor):undefined,imageKey:product.image_key?String(product.image_key):undefined,
});
const normalizeChoice=(product:ApiProduct):Choice=>({...normalizeProduct(product),quantity:Number(product.quantity??0),reserved:Number(product.reserved??0),gpuLengthMm:Number(product.gpu_length_mm??0)||undefined,caseGpuClearanceMm:Number(product.case_gpu_clearance_mm??0)||undefined,coolerHeightMm:Number(product.cooler_height_mm??0)||undefined,caseCoolerClearanceMm:Number(product.case_cooler_clearance_mm??0)||undefined,radiatorSizeMm:Number(product.radiator_size_mm??0)||undefined,caseRadiatorSupportMm:Number(product.case_radiator_support_mm??0)||undefined,pcieConnectors:Number(product.pcie_connectors??0)||undefined,biosVersion:product.bios_version?String(product.bios_version):undefined});

const peso = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);
const supportsIntegrated = (product?: Choice) => Boolean(product && (/\d+G\b/i.test(product.name) || /integrated|radeon graphics/i.test(String(product.description ?? ""))));
const towerLoadKeys = new Set(["Processor", "Motherboard", "Memory", "Storage", "Graphics", "Cooling"]);

export default function BuilderPage() {
  const [catalog,setCatalog]=useState<Choice[]>(storeProducts);
  const [branchId,setBranchId]=useState(branches[0].id);
  const [budget,setBudget]=useState(50000);
  const [services,setServices]=useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<Selection>({});
  const [history, setHistory] = useState<Selection[]>([]);
  const [notice, setNotice] = useState("");
  const [presetLoaded,setPresetLoaded]=useState(false);
  const slot = slots[active];
  const requiredSlots = slots.filter((item) => item.required);
  const completedRequired = requiredSlots.filter(({ key }) => selected[key]).length;
  const total = Object.values(selected).reduce((sum, product) => sum + Number(product?.price ?? 0), 0);
  const serviceTotal=buildServices.filter((service)=>services.includes(service.id)).reduce((sum,service)=>sum+service.price,0);
  const grandTotal=total+serviceTotal;
  const systemLoad = 30 + Object.entries(selected).filter(([key]) => towerLoadKeys.has(key)).reduce((sum, [, product]) => sum + Number(product?.powerWatts ?? 0), 0);
  const recommendedPsu = Math.max(450, Math.ceil((systemLoad * 1.4) / 50) * 50);
  const choices=useMemo(()=>{
    const grouped:Record<string,Choice[]>=Object.fromEntries(slots.map(({key})=>[key,catalog.filter((product)=>product.category===key).map((product)=>({...product,image:product.imageKey?`/api/catalog/media?key=${encodeURIComponent(product.imageKey)}`:productImages[product.id]}))]));
    grouped.Graphics=[included[0],...(grouped.Graphics??[])];
    grouped.Cooling=[included[1],...(grouped.Cooling??[])];
    return grouped;
  },[catalog]);

  useEffect(()=>{let cancelled=false;void fetch(`/api/catalog?branch=${encodeURIComponent(branchId)}`,{cache:"no-store"}).then((response)=>response.json()).then((body:{products?:ApiProduct[]})=>{if(!cancelled&&body.products?.length)setCatalog(body.products.map(normalizeChoice));}).catch(()=>{});return()=>{cancelled=true};},[branchId]);

  useEffect(()=>{
    if(presetLoaded)return;
    const timer=window.setTimeout(()=>{
      const params=new URLSearchParams(window.location.search);const presetId=params.get("preset")??"";
      let preset=builderPresetSelections[presetId];
      if(!preset){try{preset=JSON.parse(localStorage.getItem("pclogic-builder-preset")??"null") as Record<string,string>;}catch{preset=undefined;}}
      if(!preset){setPresetLoaded(true);return;}
      const allChoices=Object.values(choices).flat();const next:Selection={};
      for(const [key,id] of Object.entries(preset)){const product=allChoices.find((item)=>item.id===id);if(product)next[key]=product;}
      setSelected(next);const firstMissing=slots.findIndex(({required,key})=>required&&!next[key]);setActive(firstMissing>=0?firstMissing:0);
      setNotice(`${presetId?`${presetId[0].toUpperCase()}${presetId.slice(1)} build`:"Saved build"} loaded with ${Object.keys(next).length} selections`);
      localStorage.removeItem("pclogic-builder-preset");setPresetLoaded(true);
    },0);
    return()=>window.clearTimeout(timer);
  },[choices,presetLoaded]);

  function compatibilityReason(key: string, product: Choice) {
    const cpu = key === "Processor" ? product : selected.Processor;
    const board = key === "Motherboard" ? product : selected.Motherboard;
    const memory = key === "Memory" ? product : selected.Memory;
    const selectedCase = key === "Case" ? product : selected.Case;
    const cooler = key === "Cooling" ? product : selected.Cooling;
    const graphics = key === "Graphics" ? product : selected.Graphics;
    const power = key === "Power Supply" ? product : selected["Power Supply"];
    if (cpu && board && cpu.socket && board.socket && cpu.socket !== board.socket) return `Requires ${cpu.socket}; motherboard uses ${board.socket}`;
    if (memory && board && memory.memoryType && board.memoryType && memory.memoryType !== board.memoryType) return `Requires ${memory.memoryType}; motherboard uses ${board.memoryType}`;
    if (selectedCase?.formFactor === "mATX" && board?.formFactor && board.formFactor !== "mATX") return "This compact case requires a micro-ATX motherboard";
    if (cooler && cpu && cooler.socket && cpu.socket && cooler.socket !== cpu.socket) return `Cooler does not support ${cpu.socket}`;
    if (key === "Graphics" && product.id === "integrated" && cpu && !supportsIntegrated(cpu)) return "Requires a processor with integrated graphics (such as a G-series CPU)";
    if(graphics?.id!=="integrated"&&graphics?.gpuLengthMm&&selectedCase?.caseGpuClearanceMm&&graphics.gpuLengthMm>selectedCase.caseGpuClearanceMm)return `GPU is ${graphics.gpuLengthMm} mm; case clearance is ${selectedCase.caseGpuClearanceMm} mm`;
    if(cooler?.radiatorSizeMm&&selectedCase?.caseRadiatorSupportMm&&cooler.radiatorSizeMm>selectedCase.caseRadiatorSupportMm)return `${cooler.radiatorSizeMm} mm radiator does not fit the case’s ${selectedCase.caseRadiatorSupportMm} mm support`;
    if(cooler?.coolerHeightMm&&selectedCase?.caseCoolerClearanceMm&&cooler.coolerHeightMm>selectedCase.caseCoolerClearanceMm)return `Air cooler is taller than the case clearance`;
    if(graphics?.id!=="integrated"&&graphics?.pcieConnectors&&power?.pcieConnectors&&power.pcieConnectors<graphics.pcieConnectors)return "Power supply does not have enough PCIe power connectors";
    if (key === "Power Supply" && Number(product.powerWatts ?? 0) < recommendedPsu) return `At least ${recommendedPsu}W is recommended for this build`;
    if(product.quantity!==undefined&&Number(product.quantity)-Number(product.reserved??0)<=0)return "Out of stock at the selected branch";
    return "";
  }

  const issues = useMemo(() => {
    const list: string[] = [];
    for (const { key } of slots) {
      const product = selected[key];
      if (!product) continue;
      const issue = compatibilityReason(key, product);
      if (issue && !list.includes(issue)) list.push(issue);
    }
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, recommendedPsu]);

  function choose(product: Choice) {
    setHistory((current) => [...current.slice(-19), selected]);
    setSelected((current) => ({ ...current, [slot.key]: product }));
    setNotice(`${product.name} selected`);
    if (active < slots.length - 1) setActive((current) => current + 1);
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setSelected(previous);
    setHistory((current) => current.slice(0, -1));
    setNotice("Last change undone");
  }

  function clearBuild() {
    setHistory((current) => [...current.slice(-19), selected]);
    setSelected({});
    setActive(0);
    setNotice("Build cleared");
  }

  function saveBuild() {
    localStorage.setItem("pclogic-builder-selection", JSON.stringify(selected));
    void fetch("/api/customer/portal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"saved_build",title:"Custom PC build",branchId,payload:{selection:selected,productTotal:total,serviceTotal,total:grandTotal,systemLoad,recommendedPsu,services,budget}})}).then((response)=>setNotice(response.ok?"Build saved to your customer account":"Build saved on this device · sign in to sync"));
  }

  function printQuote(){const selectedItems=slots.filter(({key})=>selected[key]).map(({key})=>({name:selected[key]!.name,quantity:1,price:Number(selected[key]!.price??0)}));const serviceItems=buildServices.filter((item)=>services.includes(item.id)).map((item)=>({...item,quantity:1}));localStorage.setItem("pclogic-quote-draft",JSON.stringify({source:"PC Builder",branch:branches.find((item)=>item.id===branchId)?.name,items:selectedItems,services:serviceItems,subtotal:total,discount:0,shippingFee:0,total:grandTotal}));window.location.assign("/quote");}

  async function shareBuild() {
    const summary = slots.filter(({ key }) => selected[key]).map(({ label, key }) => `${label}: ${selected[key]?.name}`).join("\n");
    try {
      const canShare = typeof navigator.share === "function";
      if (canShare) await navigator.share({ title: "My custom PC build", text: summary });
      else await navigator.clipboard.writeText(summary);
      setNotice(canShare ? "Share sheet opened" : "Build copied");
    } catch { setNotice("Sharing cancelled"); }
  }

  const ready = completedRequired === requiredSlots.length && issues.length === 0;
  const checkoutIds = slots.map(({ key }) => selected[key]?.id).filter((id): id is string => Boolean(id));
  const checkoutHref = ready ? `/shop?build=${encodeURIComponent(checkoutIds.join(","))}&branch=${encodeURIComponent(branchId)}#cart` : "#";
  const performance=selected.Graphics?.id==="integrated"?"Office / esports at modest settings":selected.Graphics?.id?"Strong 1080p gaming and creator acceleration":"Select graphics for an estimate";
  const overBudget=Math.max(0,grandTotal-budget);

  return <main className="simple-builder">
    <header className="simple-builder-header">
      <Link href="/" className="brand"><span>TECH <span>SYSTEMS</span></span></Link>
      <div><strong>PC Builder</strong><span>Select products. We check the fit.</span></div>
      <Link href="/"><ArrowLeft /> Home</Link>
    </header>

    <section className="simple-builder-intro">
      <div><span>Compatibility builder</span><h1>Build your PC,<br />one product at a time.</h1></div>
      <div className="builder-intro-controls"><label><Store/>Branch stock<select value={branchId} onChange={(event)=>setBranchId(event.target.value)}>{branches.map((branch)=><option value={branch.id} key={branch.id}>{branch.name}</option>)}</select></label><div className="simple-builder-progress"><span>{completedRequired} of {requiredSlots.length} required parts selected</span><div><i style={{ width: `${(completedRequired / requiredSlots.length) * 100}%` }} /></div></div></div>
    </section>

    <div className="simple-builder-layout">
      <nav className="simple-builder-slots" aria-label="PC part categories">
        <strong>Categories</strong>
        {slots.map(({ key, label, short, icon: Icon, required }, index) => <button key={key} onClick={() => setActive(index)} className={active === index ? "active" : ""}>
          <span>{selected[key] ? <Check /> : <Icon />}</span><div><b>{label}</b><small>{selected[key]?.name ?? (required ? short : "Optional")}</small></div><em>{required ? String(index + 1).padStart(2, "0") : "+"}</em>
        </button>)}
      </nav>

      <section className="simple-builder-products">
        <div className="simple-builder-products-head"><div><span>{slot.required ? "Required component" : "Optional add-on"}</span><h2>Choose your {slot.label.toLowerCase()}</h2></div><b>{choices[slot.key].length} product{choices[slot.key].length === 1 ? "" : "s"}</b></div>
        <div className="simple-product-grid">
          {choices[slot.key].map((product) => {
            const reason = compatibilityReason(slot.key, product);
            const selectedProduct = selected[slot.key]?.id === product.id;
            const Icon = slot.icon;
            return <article className={`${selectedProduct ? "selected" : ""} ${reason ? "incompatible" : ""}`} key={product.id}>
              <div className="simple-product-image">{product.image ? <img src={product.image} alt={product.name} /> : <Icon />}</div>
              <div className="simple-product-copy"><small>{String(product.brand ?? "Store Select")}</small><h3>{product.name}</h3><p>{String(product.description ?? "")}</p><strong>{Number(product.price) ? peso(Number(product.price)) : "Included"}</strong>{product.quantity!==undefined&&<span className="builder-branch-stock"><MapPin/>{Math.max(0,Number(product.quantity)-Number(product.reserved??0))} available at branch</span>}{!product.id.startsWith("integrated")&&!product.id.startsWith("stock-")&&<Link href={`/product/${product.id}`}>Full specifications</Link>}</div>
              {reason ? <p className="product-compatibility"><CircleAlert /> {reason}</p> : <p className="product-compatibility good"><Check /> Compatible with current selections</p>}
              <button disabled={Boolean(reason)} onClick={() => choose(product)}>{selectedProduct ? <><Check /> Selected</> : <>Select product <ArrowRight /></>}</button>
            </article>;
          })}
        </div>
        {!slot.required && <button className="skip-optional" onClick={() => setActive((current) => Math.min(slots.length - 1, current + 1))}>Skip this optional item <ArrowRight /></button>}
      </section>

      <aside className="simple-build-summary">
        <div className="summary-title"><span>Your build</span><strong>{issues.length ? "Needs attention" : "Compatible"}</strong></div>
        <div className="selected-parts">
          {slots.map(({ key, label, icon: Icon }, index) => <button onClick={() => setActive(index)} key={key}>
            <span>{selected[key] ? <Check /> : <Icon />}</span><div><small>{label}</small><strong>{selected[key]?.name ?? "Not selected"}</strong></div>{selected[key] && <b>{peso(Number(selected[key]?.price ?? 0))}</b>}
          </button>)}
        </div>
        <div className="compatibility-panel">
          <div><span>Estimated system load</span><strong>{systemLoad}W</strong></div><div><span>Recommended PSU</span><strong>{recommendedPsu}W+</strong></div>
          <div><span>Performance estimate</span><strong className="performance-copy">{performance}</strong></div>
          {issues.length ? issues.map((issue) => <p key={issue}><CircleAlert /> {issue}</p>) : <p className="compatible"><Check /> All selected parts work together</p>}
        </div>
        <section className="builder-budget-panel"><label><Gauge/>Target budget <strong>{peso(budget)}</strong></label><input aria-label="Target PC build budget" type="range" min="15000" max="150000" step="5000" value={budget} onChange={(event)=>setBudget(Number(event.target.value))}/>{overBudget?<p><CircleAlert/>Build is {peso(overBudget)} over target. Consider integrated graphics or fewer optional peripherals.</p>:<p className="compatible"><Check/>{peso(budget-grandTotal)} budget headroom remains.</p>}</section>
        <section className="builder-service-panel"><strong>Assembly options</strong>{buildServices.map((service)=><label key={service.id}><input type="checkbox" checked={services.includes(service.id)} onChange={()=>setServices((current)=>current.includes(service.id)?current.filter((id)=>id!==service.id):[...current,service.id])}/><span>{service.name}</span><b>{peso(service.price)}</b></label>)}</section>
        <div className="build-total"><span>Build total<small>{serviceTotal?`${peso(total)} parts + ${peso(serviceTotal)} services`:"Final stock and price confirmed by branch."}</small></span><strong>{peso(grandTotal)}</strong></div>
        <Link href={checkoutHref} aria-disabled={!ready} onClick={(event)=>{if(!ready){event.preventDefault();return;}localStorage.setItem("pclogic-build-cart",JSON.stringify(checkoutIds));localStorage.setItem("pclogic-cart-services",JSON.stringify(services));}} className={`complete-build ${ready ? "" : "disabled"}`}><ShoppingBag /> Add build to order</Link>
        <div className="build-actions"><button onClick={undo} disabled={!history.length}><Undo2 /> Undo</button><button onClick={saveBuild}><Save /> Save</button><button onClick={shareBuild}><Share2 /> Share</button><button onClick={printQuote}><Printer/> Quote</button><button onClick={clearBuild}><RotateCcw /> Clear</button></div>
        {notice && <p className="builder-notice"><Sparkles /> {notice}</p>}
      </aside>
    </div>
  </main>;
}
