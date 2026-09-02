import { SolutionPage } from "@/components/solution-page";

export default function PowerPage() { return <SolutionPage data={{
  eyebrow:"Power & continuity", title:"Keep working.", accent:"Even when power does not.", query:"UPS",
  intro:"UPS systems, surge protection and right-sized backup plans for computers, CCTV, networks and business-critical equipment.",
  products:[
    {name:"1000VA / 600W UPS",badge:"Desktop protection",detail:"Line-interactive backup power for a computer, monitor, router or compact CCTV system."},
    {name:"Rackmount UPS",badge:"Network & server",detail:"Central protection for switches, storage and server equipment with managed shutdown options."},
    {name:"Automatic voltage regulator",badge:"Stable input",detail:"Voltage correction for locations where fluctuating mains power can stress equipment."},
    {name:"Surge-protected power strip",badge:"Everyday defense",detail:"A practical first layer against spikes for desks, peripherals and home electronics."},
  ],
  services:[
    {title:"Load assessment",detail:"Measure system demand and choose practical runtime and headroom."},
    {title:"Continuity design",detail:"Protect the correct devices in the correct shutdown order."},
    {title:"Battery lifecycle support",detail:"Testing, replacement planning and safe system maintenance."},
  ],
  }} />; }
