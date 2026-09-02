import { ArrowLeft, ArrowRight, BellRing, Camera, Check, Home, Lamp, LockKeyhole, PlugZap, Smartphone, Thermometer, Wifi } from "lucide-react";
import Link from "next/link";
import { StoreHeader } from "@/components/store-header";
import "../solutions-v2.css";

const routines = [
  ["Arrive home", "Lights welcome you, selected plugs turn on and entry alerts pause.", Lamp],
  ["Secure the house", "Doors, cameras and motion sensors report one clear status.", LockKeyhole],
  ["Save energy", "Schedule appliances and monitor everyday power use.", PlugZap],
] as const;

export default function SmartHomePage() {
  return <main className="smart-page">
    <StoreHeader />
    <section className="smart-hero">
      <div className="smart-copy"><Link href="/"><ArrowLeft /> Back to home</Link><span>Connected living</span><h1>Your home,<br /><em>quietly smarter.</em></h1><p>Connected security, sensors, Wi-Fi and useful automations brought together in a system the whole household can understand.</p><div><a href="/shop?q=Smart">Explore smart devices <ArrowRight /></a><Link href="/account">Design a demo setup</Link></div></div>
      <div className="smart-dashboard" aria-label="Smart home control preview"><div className="smart-welcome"><span>Good evening</span><strong>Everything at home is okay.</strong><small><i /> 8 devices online</small></div><div className="smart-device-grid"><article><span><LockKeyhole /> Front door</span><strong>Locked</strong><Check /></article><article><span><Thermometer /> Living room</span><strong>24°C</strong><small>Comfortable</small></article><article><span><Camera /> Outdoor camera</span><strong>Watching</strong><small>No motion</small></article><article><span><Lamp /> Evening scene</span><strong>Active</strong><small>3 lights on</small></article></div><div className="smart-quick"><button><BellRing /> Away mode</button><button><PlugZap /> Energy view</button><button><Wifi /> Wi-Fi</button></div></div>
    </section>
    <section className="smart-routines"><div><span>Automation that makes sense</span><h2>Helpful routines.<br />No unnecessary complexity.</h2></div><div className="routine-grid">{routines.map(([name, detail, Icon]) => <article key={name}><Icon /><h3>{name}</h3><p>{detail}</p><Link href="/account">Ask about this routine <ArrowRight /></Link></article>)}</div></section>
    <section className="smart-steps"><article><b>01</b><span><strong>Choose the moments</strong><small>Identify what should become easier, safer or more efficient.</small></span></article><article><b>02</b><span><strong>Connect the devices</strong><small>Pair sensors, cameras, plugs and household access.</small></span></article><article><b>03</b><span><strong>Keep control simple</strong><small>Receive a clear handover for everyday use.</small></span></article></section>
    <footer className="service-footer smart-footer"><div><Home /> <strong>Smart Home Solutions</strong></div><p>Practical connected living, configured for the people who use it.</p><Link href="/account"><Smartphone /> Open demo support</Link></footer>
  </main>;
}
