"use client";

import {
  ArrowRight, Boxes, Check, ChevronRight, Cpu, CreditCard, Gamepad2, Gauge,
  Home as House, MapPin, MemoryStick, Monitor, PackageCheck,
  ShieldCheck, Sparkles, Truck, Video, Wifi, Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ProductVisual } from "@/components/product-visual";
import { StoreHeader } from "@/components/store-header";
import { builderPresetSelections } from "@/lib/builder-presets";
import "./premium-home.css";

const productCategories = [
  { label: "PC Builds", icon: Cpu, count: "Custom & ready", href: "/builder" },
  { label: "Components", icon: MemoryStick, count: "CPU to chassis", href: "/shop?category=Processor" },
  { label: "Laptops", icon: Monitor, count: "Work & gaming", href: "/shop?category=Laptop" },
  { label: "CCTV", icon: Video, count: "Home & business", href: "/cctv" },
  { label: "Networking", icon: Wifi, count: "Routers to 10G", href: "/network" },
  { label: "Smart Home", icon: House, count: "Connected spaces", href: "/smart-home" },
];

const featured = [
  { id:"prd-r5-5600g", tag: "Processor", name: "Ryzen 5 5600G", detail: "6 cores · 12 threads · Radeon graphics", price:"₱6,995", accent: "#ff7a1a" },
  { id:"prd-xg27uq", tag: "Gaming monitor", name: "ROG Strix XG27UQ", detail: "27-inch · 4K · 144Hz · HDR", price:"₱36,915", accent: "#7167ff" },
  { id:"prd-nl150", tag: "Laptop", name: "Ningmei NL150", detail: "Intel N150 · 16GB · 256GB SSD", price:"₱19,995", accent: "#15b77e" },
  { id:"prd-aio360", tag: "Cooling", name: "ROG Strix LC III 360", detail: "360mm AIO · ARGB · LCD display", price:"₱13,995", accent: "#ef426f" },
];

const presets = [
  { id: "gaming", label: "Gaming", icon: Gamepad2, price: 48990, tier: "High FPS", parts: [{slot:"Processor",name:"Ryzen 5 5600"},{slot:"Motherboard",name:"B550M PRO Gen3"},{slot:"Memory",name:"16GB DDR4"},{slot:"Graphics",name:"RTX 3050 8GB"}] },
  { id: "creator", label: "Creator", icon: Sparkles, price: 55990, tier: "Studio ready", parts: [{slot:"Processor",name:"Ryzen 5 5600G"},{slot:"Motherboard",name:"B550M PRO Gen3"},{slot:"Memory",name:"16GB DDR4"},{slot:"Graphics",name:"RTX 3050 8GB"}] },
  { id: "work", label: "Work", icon: Gauge, price: 24990, tier: "Daily fast", parts: [{slot:"Processor",name:"Ryzen 5 5600G"},{slot:"Motherboard",name:"B550M PRO Gen3"},{slot:"Memory",name:"16GB DDR4"},{slot:"Storage",name:"512GB NVMe SSD"}] },
];

const publicBranches = ["North", "Central", "South"];
const formatPeso = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);

export default function Home() {
  const [activePreset, setActivePreset] = useState("gaming");
  const [added, setAdded] = useState(false);
  const selected = useMemo(() => presets.find((preset) => preset.id === activePreset) ?? presets[0], [activePreset]);

  return (
    <main className="site-shell">
      <div className="announcement">
        <span>Interactive commerce demo</span><span className="announcement-dot" />
        <strong>Catalog · Compatibility · Checkout · Operations</strong>
      </div>

      <StoreHeader />

      <nav className="section-rail" aria-label="Homepage sections">
        <a href="#top" data-section-link="top" className="active"><i /><span>Intro</span></a>
        <a href="#builder" data-section-link="builder"><i /><span>Configure</span></a>
        <a href="#featured" data-section-link="featured"><i /><span>Catalog</span></a>
        <a href="#solutions" data-section-link="solutions"><i /><span>Systems</span></a>
        <a href="#branches" data-section-link="branches"><i /><span>Pickup</span></a>
      </nav>

      <section className="hero" id="top">
        <div className="hero-cinematic" data-parallax="0.035" aria-hidden="true">
          <video autoPlay muted loop playsInline poster="/products/tech-systems-poster.jpg">
            <source src="/products/tech-systems-cinematic.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="hero-film-overlay" />
        <div className="hero-grid" />
        <div className="hero-kinetic" aria-hidden="true"><i /><i /><i /><span /></div>
        <div className="hero-copy reveal-up">
          <div className="eyebrow"><span /> Technology systems · designed as one</div>
          <h1><span className="hero-title-solid"><i>Technology,</i></span><span className="hero-title-outline"><i>properly integrated.</i></span></h1>
          <p>Custom computers, surveillance, networks and continuity—connected to one catalog and one operating system.</p>
          <div className="hero-actions"><a href="/builder" className="primary-cta">Configure a PC <ArrowRight size={18} /></a><a href="/shop" className="secondary-cta">Enter the store</a></div>
          <div className="trust-row">
            <div><ShieldCheck /><span><strong>Expert checked</strong>Compatibility verified</span></div>
            <div><PackageCheck /><span><strong>Branch pickup</strong>Reserve ahead</span></div>
            <div><Truck /><span><strong>Delivery options</strong>Branch coordinated</span></div>
          </div>
        </div>
        <div className="hero-scroll-cue" aria-hidden="true"><span>Scroll to explore</span><i /></div>
        <div className="hero-proof-grid" aria-label="Demo platform capabilities">
          <div><strong data-count="3" data-pad="2">03</strong><span>Branch views</span></div>
          <div><strong data-count="19">19</strong><span>Catalog products</span></div>
          <div><strong>LIVE</strong><span>Stock-aware checkout</span></div>
        </div>
        <div className="hero-system-track" aria-label="Technology systems shown in the background animation">
          <span><Cpu /> PC assembly</span><span><Video /> CCTV security</span><span><Wifi /> Network infrastructure</span>
        </div>
      </section>

      <section className="category-strip" id="shop">
        {productCategories.map(({ label, icon: Icon, count, href }, index) => (
          <a className="category-item" href={href} key={label}><b>0{index+1}</b><span className="category-icon"><Icon size={22} /></span><span><strong>{label}</strong><small>{count}</small></span><ChevronRight size={17} /></a>
        ))}
      </section>

      <section className="builder-section" id="builder">
        <div className="section-kicker">Configuration desk</div>
        <div className="section-heading"><h2>Start with the workload.<br /><span>Finish with a compatible system.</span></h2><p>Select a starting profile, review the parts and continue in the full builder. Performance, price and power stay connected.</p></div>
        <div className="builder-workbench">
          <div className="preset-panel">
            <div className="panel-label">01 · Choose your setup</div>
            <div className="preset-list">
              {presets.map(({ id, label, icon: Icon, tier }) => (
                <button key={id} onClick={() => { setActivePreset(id); setAdded(false); }} className={activePreset === id ? "preset-button active" : "preset-button"}>
                  <span><Icon /></span><span><strong>{label}</strong><small>{tier}</small></span><i>{activePreset === id ? <Check size={15} /> : <ChevronRight size={16} />}</i>
                </button>
              ))}
            </div>
            <div className="logic-note"><Sparkles size={17} /><p><strong>Build note</strong>CPU, graphics, memory and power are checked as a complete system.</p></div>
          </div>

          <div className="assembly-stage" key={selected.id}>
            <div className="stage-topline"><span>Live assembly</span><span className="stage-status"><i /> Compatible</span></div>
            <div className="assembly-lanes">
              {selected.parts.map((part, index) => {
                const icons = [Cpu, Boxes, MemoryStick, Monitor]; const Icon = icons[index];
                return <div className="assembly-part" style={{ "--delay": `${index * 90}ms` } as React.CSSProperties} key={`${part.slot}-${part.name}`}><span className="part-index">0{index + 1}</span><span className="part-icon"><Icon /></span><span><small>{part.slot}</small><strong>{part.name}</strong></span><Check size={17} className="part-check" /></div>;
              })}
            </div>
            <div className="power-line"><Zap size={15} /><span>Estimated system load</span><b>412W</b><i><em /></i><small>650W PSU recommended</small></div>
          </div>

          <aside className="build-summary">
            <div className="panel-label">Your starting build</div><span className="summary-type">{selected.label} setup</span><strong className="summary-price">{formatPeso(selected.price)}</strong><small>Indicative package price · final price depends on live stock</small>
            <div className="summary-stats"><div><span>Fit</span><strong>Perfect</strong></div><div><span>Parts</span><strong>4 / 8</strong></div><div><span>Tier</span><strong>{selected.tier}</strong></div></div>
            <a className={added ? "summary-button added" : "summary-button"} href={`/builder?preset=${selected.id}`} onClick={() => {localStorage.setItem("pclogic-builder-preset",JSON.stringify(builderPresetSelections[selected.id]));setAdded(true);}}>{added ? <><Check size={18} /> Build ready</> : <>Continue this build <ArrowRight size={18} /></>}</a>
            <a className="expert-button" href="/ai">Ask the demo advisor</a>
          </aside>
        </div>
      </section>

      <section className="featured-section" id="featured">
        <div className="section-heading compact"><div><div className="section-kicker">From our catalog</div><h2>Featured right now.</h2></div><a href="/shop">View all products <ArrowRight size={17} /></a></div>
        <div className="product-grid">
          {featured.map(({ id, tag, name, detail, price, accent }, index) => (
            <article className="product-card" style={{ "--accent": accent } as React.CSSProperties} key={name}><div className="product-visual"><ProductVisual id={id} name={name}/><span>0{index + 1}</span></div><div className="product-card-copy"><small>{tag}</small><h3>{name}</h3><p>{detail}</p><strong>{price}</strong><a href={`/product/${id}`}>View product <ArrowRight size={16} /></a></div></article>
          ))}
        </div>
      </section>

      <section className="solutions" id="solutions">
        <div className="solutions-copy"><div className="section-kicker light">Infrastructure</div><h2>More than hardware on a shelf.</h2><p>Plan surveillance, network and power systems with the same structured product and branch workflow.</p><a href="/ai">Open the system advisor <ArrowRight size={17} /></a></div>
        <div className="solution-list">
          <a href="/cctv"><Video /><span><strong>CCTV & security</strong><small>Packages, cameras, storage and installation</small></span><ChevronRight /></a>
          <a href="/network"><Wifi /><span><strong>Network infrastructure</strong><small>Routers, managed switches, OLT and cabling</small></span><ChevronRight /></a>
          <a href="/smart-home"><House /><span><strong>Smart home & automation</strong><small>Connected security, sensors and daily routines</small></span><ChevronRight /></a>
          <a href="/power"><Zap /><span><strong>Power & continuity</strong><small>UPS systems and backup power solutions</small></span><ChevronRight /></a>
        </div>
      </section>

      <section className="branches" id="branches">
        <div className="section-heading compact"><div><div className="section-kicker">Demo store network</div><h2>Choose a pickup branch.</h2></div><div className="branch-contact"><span>Demo directory</span><strong>Contact details withheld</strong></div></div>
        <div className="branch-map">
          <div className="map-graphic" data-parallax="0.025"><div className="map-grid" />{publicBranches.map((branch, index) => <span className={`map-pin pin-${index + 1}`} key={branch}><i /><b>{branch}</b></span>)}<div className="map-note">Three fictional branches demonstrate pickup selection without exposing a real store location.</div></div>
          <div className="branch-primary"><div><small>Primary demo location</small><h3>North Branch</h3><p>Demo pickup location A · final address available only after client approval</p></div><div className="branch-meta"><span><MapPin /> Demo pickup</span><span><CreditCard /> Simulated payment</span></div><a href="/shop">Browse the demo catalog <ArrowRight size={16} /></a></div>
        </div>
      </section>

      <footer id="support">
        <div className="footer-brand"><div className="brand footer-logo"><span>TECH <span>SYSTEMS</span></span></div><p>Computers, security and network solutions—configured with care.</p></div>
        <div><strong>Demo contact</strong><span>Phone details withheld</span><span>Address details withheld</span><span>hello@techsystems.example</span></div>
        <div><strong>Customer care</strong><a href="/builder">PC Builder</a><a href="/shop">Online shop</a><a href="/admin">Operations</a></div>
        <div className="footer-cta"><span>Ready to start?</span><a href="/builder">Build your PC <ArrowRight /></a></div>
        <div className="footer-bottom"><span>© 2026 Tech Systems Demo. Fictional identity for presentation purposes.</span><span>Products, inventory, payments and locations are simulated.</span></div>
      </footer>
    </main>
  );
}
