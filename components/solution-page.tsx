import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { StoreHeader } from "@/components/store-header";

export type SolutionPageData = {
  eyebrow: string;
  title: string;
  accent: string;
  intro: string;
  query: string;
  products: Array<{ name: string; detail: string; badge: string }>;
  services: Array<{ title: string; detail: string }>;
};

export function SolutionPage({ data }: { data: SolutionPageData }) {
  return <main className="solution-page">
    <StoreHeader dark />
    <section className="solution-hero">
      <div className="solution-hero-art"><img src="/products/solutions-showcase.png" alt="CCTV, networking, smart home and backup power product samples" /><span className="solution-scan" /></div>
      <div className="solution-hero-copy">
        <Link href="/" className="back-link"><ArrowLeft /> Back to home</Link>
        <span className="solution-eyebrow">{data.eyebrow}</span>
        <h1>{data.title}<em>{data.accent}</em></h1>
        <p>{data.intro}</p>
        <div className="solution-actions"><Link href={`/shop?q=${encodeURIComponent(data.query)}`}>Browse available products <ArrowRight /></Link><Link href="/account">Request a demo assessment</Link></div>
      </div>
    </section>
    <section className="solution-catalog">
      <div className="solution-section-head"><span>Available product samples</span><h2>Built for real sites,<br />not just spec sheets.</h2></div>
      <div className="solution-product-grid">{data.products.map((product, index) => <article key={product.name}><div><span>0{index + 1}</span><ShieldCheck /></div><small>{product.badge}</small><h3>{product.name}</h3><p>{product.detail}</p><Link href={`/shop?q=${encodeURIComponent(product.name)}`}>Check availability <ArrowRight /></Link></article>)}</div>
    </section>
    <section className="solution-services">
      <div><span>Project support</span><h2>Supply, setup and after-sales support.</h2><p>Our team can help scope the right equipment, confirm branch stock, install the system and keep it dependable.</p></div>
      <div className="service-list">{data.services.map((service, index) => <article key={service.title}><b>0{index + 1}</b><span><strong>{service.title}</strong><small>{service.detail}</small></span><Check /></article>)}</div>
    </section>
    <footer className="solution-footer"><Link className="brand" href="/"><span>TECH <span>SYSTEMS</span></span></Link><p>Computers, security and networks—configured with care.</p><Link href="/shop">Open the store <ArrowRight /></Link></footer>
  </main>;
}
