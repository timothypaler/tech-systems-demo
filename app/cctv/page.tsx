import { ArrowLeft, ArrowRight, Camera, Eye, HardDrive, RadioTower, ShieldCheck, Smartphone, Video } from "lucide-react";
import Link from "next/link";
import { StoreHeader } from "@/components/store-header";
import "../solutions-v2.css";

const products = [
  ["2MP ColorVu Camera", "Full-color night monitoring with a built-in microphone.", Camera],
  ["4-camera starter package", "Recorder, surveillance storage, cabling and four cameras.", Video],
  ["Network video recorder", "Expandable IP recording with remote viewing and playback.", HardDrive],
  ["24/7 surveillance storage", "Purpose-built drives for continuous camera workloads.", ShieldCheck],
] as const;

export default function CCTVPage() {
  return <main className="cctv-page">
    <StoreHeader dark />
    <section className="cctv-hero">
      <div className="cctv-copy"><Link href="/"><ArrowLeft /> Back to home</Link><span>Security systems</span><h1>Every angle.<br /><em>Always visible.</em></h1><p>Camera systems for homes, stores, offices and multi-site operations—with recording, remote viewing and installation support.</p><div><a href="/shop?q=CCTV">View CCTV products <ArrowRight /></a><Link href="/account">Request a demo survey</Link></div></div>
      <div className="cctv-monitor" aria-label="CCTV coverage overview">
        <div className="cctv-monitor-top"><span><i /> LIVE COVERAGE</span><b>04 CAMERAS</b></div>
        <div className="camera-grid">{["Main entrance", "Sales floor", "Stock room", "Parking area"].map((zone, index) => <article key={zone}><span>CAM 0{index + 1}</span><Camera /><strong>{zone}</strong><small>Recording · Motion detection</small></article>)}</div>
        <div className="cctv-monitor-bottom"><span><RadioTower /> Remote viewing ready</span><span><Eye /> Coverage reviewed</span></div>
      </div>
    </section>
    <section className="cctv-products"><div className="cctv-section-head"><span>Recommended equipment</span><h2>Start with the right coverage.</h2></div><div className="cctv-product-grid">{products.map(([name, detail, Icon], index) => <article key={name}><b>0{index + 1}</b><Icon /><h3>{name}</h3><p>{detail}</p><a href={`/shop?q=${encodeURIComponent(name)}`}>Check availability <ArrowRight /></a></article>)}</div></section>
    <section className="cctv-process"><div><span>01</span><strong>Survey the site</strong><p>Review blind spots, lighting and cable routes.</p></div><div><span>02</span><strong>Install the system</strong><p>Mount, cable, configure and test every camera.</p></div><div><span>03</span><strong>View from anywhere</strong><p>Set up recorder access and mobile monitoring.</p></div></section>
    <footer className="service-footer"><div><ShieldCheck /> <strong>Security Solutions</strong></div><p>Demonstration supply, installation and after-sales workflows.</p><Link href="/account"><Smartphone /> Open demo support</Link></footer>
  </main>;
}
