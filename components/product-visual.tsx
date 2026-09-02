import { Package } from "lucide-react";

const dedicated:Record<string,string>={
  "prd-r5-5600g":"/products/amd-ryzen-5-5600g.webp","prd-r5-5600":"/products/amd-ryzen-5-5600.webp",
  "prd-b550m":"/products/msi-b550m-pro-gen3.webp","prd-ram-16":"/products/teamgroup-elite-16gb-ddr4.webp",
  "prd-rtx3050":"/products/aorus-rtx-3050-8gb.webp","prd-ssd-512":"/products/teamgroup-512gb-nvme.webp",
  "prd-psu-650":"/products/gamdias-650w-bronze-psu.webp","prd-case-atx":"/products/gamdias-airflow-argb-case.webp",
  "prd-nl150":"/products/ningmei-nl150.webp","prd-aio360":"/products/asus-rog-lc3-360.webp",
  "prd-hik-colorvu":"/products/hikvision-colorvu-2mp.webp","prd-reyee-router":"/products/reyee-eg210g-e.webp",
  "prd-ups1000":"/products/aide-1000va-ups.webp","prd-case-pano":"/products/demo-panorama-case.webp",
  "prd-case-compact":"/products/demo-compact-matx-case.webp",
  "prd-xg27uq":"/products/asus-xg27uqr.webp","prd-g213":"/products/logitech-g213.png",
  "prd-g502":"/products/logitech-g502.png","prd-g435":"/products/logitech-g435.png",
};

export function ProductVisual({id,name,imageKey,className=""}:{id:string;name:string;imageKey?:string;className?:string}){
  if(imageKey)return <span className={`pcl-product-visual uploaded ${className}`}><img src={`/api/catalog/media?key=${encodeURIComponent(imageKey)}`} alt={name}/></span>;
  if(dedicated[id])return <span className={`pcl-product-visual dedicated ${className}`}><img src={dedicated[id]} alt={name}/></span>;
  return <span className={`pcl-product-visual placeholder ${className}`}><Package/><small>Media ready</small></span>;
}
