export type StoreProduct = { id:string; sku:string; name:string; brand:string; category:string; description:string; price:number; powerWatts?:number; socket?:string; memoryType?:string; formFactor?:string; imageKey?:string };

export const branches = [
  { id:"branch-angeles", code:"NTH", name:"North Branch", address:"Demo pickup location A · address withheld", phone:"Contact withheld for demo", active:1 },
  { id:"branch-san-fernando", code:"CTR", name:"Central Branch", address:"Demo pickup location B · address withheld", phone:"Contact withheld for demo", active:1 },
  { id:"branch-tarlac", code:"STH", name:"South Branch", address:"Demo pickup location C · address withheld", phone:"Contact withheld for demo", active:1 },
];

export const storeProducts: StoreProduct[] = [
  { id:"prd-r5-5600g",sku:"CPU-AMD-5600G",name:"Ryzen 5 5600G",brand:"AMD",category:"Processor",description:"6-core AM4 desktop processor with Radeon graphics.",price:6995,powerWatts:65,socket:"AM4" },
  { id:"prd-r5-5600",sku:"CPU-AMD-5600",name:"Ryzen 5 5600",brand:"AMD",category:"Processor",description:"6-core AM4 processor for balanced gaming builds.",price:6495,powerWatts:65,socket:"AM4" },
  { id:"prd-b550m",sku:"MB-MSI-B550M-G3",name:"B550M PRO Gen3",brand:"MSI",category:"Motherboard",description:"AM4 micro-ATX motherboard with DDR4 support.",price:5695,powerWatts:45,socket:"AM4",memoryType:"DDR4",formFactor:"mATX" },
  { id:"prd-ram-16",sku:"RAM-TG-16D4-3200",name:"Elite 16GB DDR4 3200",brand:"TeamGroup",category:"Memory",description:"16GB DDR4 memory for work and gaming.",price:2295,powerWatts:6,memoryType:"DDR4" },
  { id:"prd-rtx3050",sku:"GPU-AOR-3050-8G",name:"AORUS RTX 3050 8GB",brand:"Gigabyte",category:"Graphics",description:"Dedicated 8GB graphics card for 1080p gaming.",price:14995,powerWatts:130 },
  { id:"prd-ssd-512",sku:"SSD-TG-512",name:"512GB NVMe SSD",brand:"TeamGroup",category:"Storage",description:"Fast NVMe storage for operating system and applications.",price:2195,powerWatts:6 },
  { id:"prd-psu-650",sku:"PSU-650-BR",name:"650W Bronze PSU",brand:"Gamdias",category:"Power Supply",description:"80 Plus Bronze power supply with GPU headroom.",price:3295,powerWatts:650 },
  { id:"prd-case-atx",sku:"CASE-ATX-AIR",name:"Airflow ARGB Case",brand:"Gamdias",category:"Case",description:"Tempered-glass ATX case with included ARGB fans.",price:2995,formFactor:"ATX" },
  { id:"prd-xg27uq",sku:"MON-ROG-XG27UQ",name:"ROG Strix XG27UQ",brand:"ASUS",category:"Monitor",description:"27-inch 4K 144Hz HDR gaming display.",price:36915,powerWatts:90 },
  { id:"prd-g213",sku:"KEY-LOG-G213",name:"G213 Prodigy RGB",brand:"Logitech G",category:"Keyboard",description:"Full-size RGB gaming keyboard with integrated palm rest.",price:3495,powerWatts:3 },
  { id:"prd-g502",sku:"MSE-LOG-G502",name:"G502 HERO",brand:"Logitech G",category:"Mouse",description:"HERO 25K wired gaming mouse with programmable controls.",price:2995,powerWatts:2 },
  { id:"prd-g435",sku:"HST-LOG-G435",name:"G435 LIGHTSPEED",brand:"Logitech G",category:"Headset",description:"Lightweight wireless gaming headset with Bluetooth.",price:4995,powerWatts:2 },
  { id:"prd-nl150",sku:"LAP-NING-NL150",name:"Ningmei NL150",brand:"Ningmei",category:"Laptop",description:"Intel N150 laptop with 16GB memory and 256GB SSD.",price:19995,powerWatts:45 },
  { id:"prd-aio360",sku:"COOL-ROG-LC3-360",name:"ROG Strix LC III 360",brand:"ASUS",category:"Cooling",description:"360mm ARGB all-in-one CPU cooler with LCD.",price:13995,powerWatts:18,socket:"AM4" },
  { id:"prd-hik-colorvu",sku:"CCTV-HIK-CV2MP",name:"2MP ColorVu Camera",brand:"Hikvision",category:"CCTV",description:"ColorVu analog camera with built-in microphone.",price:1765,powerWatts:8 },
  { id:"prd-reyee-router",sku:"NET-REY-EG210",name:"RG-EG210G-E Managed Router",brand:"Ruijie Reyee",category:"Networking",description:"10-port gigabit managed rackmount router.",price:8585,powerWatts:24 },
  { id:"prd-ups1000",sku:"PWR-AIDE-1000",name:"1000VA / 600W UPS",brand:"AIDE",category:"Power",description:"Line-interactive backup power for computers and CCTV.",price:2700,powerWatts:600 },
  { id:"prd-case-pano",sku:"CASE-ATX-PANO",name:"Panorama Glass ARGB Case",brand:"Store Select",category:"Case",description:"Dual-chamber panoramic glass case with an open showcase layout.",price:4295,formFactor:"ATX" },
  { id:"prd-case-compact",sku:"CASE-MATX-MESH",name:"Compact Mesh mATX Case",brand:"Store Select",category:"Case",description:"Space-saving white mesh case with tempered glass and strong airflow.",price:3495,formFactor:"mATX" },
];
export const initialStocks=[18,14,9,24,6,19,12,8,2,6,8,5,5,3,22,7,11,6,7];
