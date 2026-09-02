import { ArrowLeft, ArrowRight, Cable, Check, Cloud, Network, Router, Server, Wifi, Workflow } from "lucide-react";
import Link from "next/link";
import { StoreHeader } from "@/components/store-header";
import "../solutions-v2.css";

const layers = [
  ["Gateway", "Managed routing, multi-WAN and secure traffic control.", Router],
  ["Switching", "PoE and managed ports for cameras, phones and access points.", Network],
  ["Wireless", "Wi-Fi 6 coverage designed for capacity—not guesswork.", Wifi],
  ["Backbone", "Structured copper and fiber links with clear endpoint labeling.", Cable],
] as const;

export default function NetworkPage() {
  return <main className="network-page">
    <StoreHeader />
    <section className="network-hero">
      <div className="network-copy"><Link href="/"><ArrowLeft /> Back to home</Link><span>Network infrastructure</span><h1>A network that<br /><em>simply stays up.</em></h1><p>Business routers, managed switching, Wi-Fi and structured cabling designed around your actual floor plan, users and devices.</p><div><a href="/shop?q=Networking">Browse network products <ArrowRight /></a><Link href="/account">Plan a demo deployment</Link></div></div>
      <div className="network-map" aria-label="Sample network topology"><div className="network-grid" /><span className="node node-cloud"><Cloud /><b>Internet</b></span><span className="node node-router"><Router /><b>Gateway</b></span><span className="node node-switch"><Network /><b>PoE switch</b></span><span className="node node-wifi"><Wifi /><b>Wi-Fi 6</b></span><span className="node node-server"><Server /><b>Servers</b></span><i className="link l1" /><i className="link l2" /><i className="link l3" /><i className="link l4" /><div className="network-readout"><span>UPLINK STATUS</span><strong>1.0 Gbps</strong><small><i /> All systems operational</small></div></div>
    </section>
    <section className="network-layers"><div className="network-section-head"><span>Built in layers</span><h2>From internet edge<br />to every endpoint.</h2></div><div className="layer-list">{layers.map(([name, detail, Icon], index) => <article key={name}><b>0{index + 1}</b><Icon /><div><h3>{name}</h3><p>{detail}</p></div><Check /></article>)}</div></section>
    <section className="network-delivery"><div><Workflow /><span>Coverage design</span><p>Capacity planning, access-point placement and interference review.</p></div><div><Cable /><span>Structured installation</span><p>Clean racks, labeled endpoints and tested cable runs.</p></div><div><Server /><span>Managed handover</span><p>Configuration, documentation and support after deployment.</p></div></section>
    <footer className="service-footer network-footer"><div><Network /> <strong>Network Solutions</strong></div><p>Reliable connectivity for homes, offices, retail and security systems.</p><a href="/shop?q=Networking">See available equipment <ArrowRight /></a></footer>
  </main>;
}
