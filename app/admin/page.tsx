"use client";

import {
  Activity, AlertTriangle, Archive, ArrowLeft, ArrowUpRight, BadgePercent, Barcode, BarChart3, Boxes, Camera, ClipboardList, Download, Eye, EyeOff,
  Bell, Check, ChevronDown, ChevronUp, CircleDollarSign, CirclePlay, Clock3, Globe2, ImagePlus, LayoutDashboard, ListChecks, LoaderCircle,
  KeyRound, LockKeyhole, LogOut, Package, Pencil, Plus, Printer, RefreshCw, RotateCcw, Search, Settings, ShieldCheck, ShoppingCart, Store, Trash2,
  ScanLine, Sparkles, Truck, Upload, UserPlus, Users, Warehouse, Wrench, X,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import "./admin-dashboard.css";
import "./admin-commerce.css";
import "./admin-ai.css";

type Row = Record<string, string | number | boolean | null>;
type Metrics = { products:number; orders:number; sales:number; completed_sales:number; open_orders:number; low_stock:number; avg_order:number; customers:number };
type Summary = {
  metrics: Metrics; branches: Row[]; products: Row[]; stock: Row[]; orders: Row[]; orderItems: Row[]; movements: Row[]; notifications: Row[];
  salesTrend: Row[]; orderStatus: Row[]; branchPerformance: Row[]; categoryMix: Row[]; topProducts: Row[]; syncedAt?:string; error?:string;
};
type View = "overview" | "orders" | "products" | "inventory" | "commerce" | "ai" | "notifications" | "activity" | "settings";
type ProductForm = { id?:string; sku:string; name:string; brand:string; category:string; description:string; price:string; powerWatts:string; socket:string; memoryType:string; formFactor:string; imageKey:string; active:boolean };
type ProductScanResult = { confidence:number; matchedExistingId:string; duplicate:boolean; source:string; suggestion:Omit<ProductForm,"id"|"imageKey"|"active">; imageCandidate:string; imageSearchUrl:string; imageSearchQuery:string };
type AdminIdentity={id:string;username:string;displayName:string;role:string;active:number;mustChangePassword:number};
type SettingsPayload={user:AdminIdentity;settings:Record<string,string>;users:Row[];audits:Row[];canManageUsers:boolean};
type CommercePayload={records:Row[];customers:Row[];funnel:Row[];paymentMix:Row[];categorySales:Row[];inventoryValue:Row;syncedAt?:string;error?:string};
type AiInsight={label:string;value:string|number;currency?:boolean;detail:string;tone:string};
type AiForecast=Row&{daysCoverage:number|null;suggestedOrder:number;urgency:string};
type AiOperations={insights:AiInsight[];forecast:AiForecast[];topProducts:Row[];generatedAt?:string;error?:string};

const emptySummary: Summary = {
  metrics:{products:0,orders:0,sales:0,completed_sales:0,open_orders:0,low_stock:0,avg_order:0,customers:0},
  branches:[],products:[],stock:[],orders:[],orderItems:[],movements:[],notifications:[],salesTrend:[],orderStatus:[],branchPerformance:[],categoryMix:[],topProducts:[],
};
const blankProduct: ProductForm = {sku:"",name:"",brand:"",category:"Processor",description:"",price:"",powerWatts:"",socket:"",memoryType:"",formFactor:"",imageKey:"",active:true};
const emptyCommerce:CommercePayload={records:[],customers:[],funnel:[],paymentMix:[],categorySales:[],inventoryValue:{}};
const categories = ["Processor","Motherboard","Memory","Storage","Graphics","Cooling","Power Supply","Case","Monitor","Keyboard","Mouse","Headset","Laptop","CCTV","Networking","Smart Home","Power"];
const statusColors:Record<string,string> = {new:"#ff6500",ready:"#4f8cff",completed:"#22c77a",cancelled:"#6c7480"};
const money=(n:number)=>new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:0}).format(n||0);
const compact=(n:number)=>new Intl.NumberFormat("en-PH",{notation:"compact",maximumFractionDigits:1}).format(n||0);
const dateTime=(value:unknown)=>value?new Intl.DateTimeFormat("en-PH",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(String(value).replace(" ","T")+"Z")):"—";
const parseOrderServices=(value:unknown)=>{try{return JSON.parse(String(value??"[]")) as Array<{id:string;name:string;price:number}>;}catch{return [];}};

function fillWeek(rows:Row[]) {
  const byDay = new Map(rows.map((row)=>[String(row.day),row]));
  return Array.from({length:7},(_,index)=>{
    const date=new Date(); date.setUTCDate(date.getUTCDate()-(6-index));
    const key=date.toISOString().slice(0,10); const row=byDay.get(key);
    return {day:key,label:new Intl.DateTimeFormat("en-PH",{weekday:"short"}).format(date),sales:Number(row?.sales??0),orders:Number(row?.orders??0)};
  });
}

function PasswordInput({value,onChange,visible,onToggle,autoComplete="new-password",placeholder,required=true,minLength,disabled=false}:{value:string;onChange:(value:string)=>void;visible:boolean;onToggle:()=>void;autoComplete?:string;placeholder?:string;required?:boolean;minLength?:number;disabled?:boolean}){
  return <div className="ops-password-input"><input value={value} onChange={(event)=>onChange(event.target.value)} type={visible?"text":"password"} autoComplete={autoComplete} placeholder={placeholder} required={required} minLength={minLength} disabled={disabled}/><button type="button" onClick={onToggle} aria-label={visible?"Hide password":"Show password"} title={visible?"Hide password":"Show password"}>{visible?<EyeOff/>:<Eye/>}</button></div>;
}

export default function AdminPage(){
  const [auth,setAuth]=useState<"checking"|"signed-out"|"signed-in">("checking");
  const [admin,setAdmin]=useState<AdminIdentity|null>(null);
  const [loginForm,setLoginForm]=useState({username:"",password:""});
  const [loginError,setLoginError]=useState("");
  const [data,setData]=useState<Summary>(emptySummary);
  const [view,setView]=useState<View>("overview");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [query,setQuery]=useState("");
  const [branch,setBranch]=useState("all");
  const [adjustments,setAdjustments]=useState<Record<string,string>>({});
  const [editor,setEditor]=useState<ProductForm|null>(null);
  const [mediaFile,setMediaFile]=useState<File|null>(null);
  const [mediaPreview,setMediaPreview]=useState("");
  const [scanQuery,setScanQuery]=useState("");
  const [scanResult,setScanResult]=useState<ProductScanResult|null>(null);
  const [scanError,setScanError]=useState("");
  const [scanning,setScanning]=useState(false);
  const [expandedOrder,setExpandedOrder]=useState<string|null>(null);
  const [lastSynced,setLastSynced]=useState<Date|null>(null);
  const [syncing,setSyncing]=useState(false);
  const [showGuide,setShowGuide]=useState(false);
  const [showReset,setShowReset]=useState(false);
  const [settingsData,setSettingsData]=useState<SettingsPayload|null>(null);
  const [commerce,setCommerce]=useState<CommercePayload>(emptyCommerce);
  const [commerceTab,setCommerceTab]=useState<"insights"|"customers"|"promotions"|"purchasing"|"transfers"|"aftersales"|"engagement">("insights");
  const [promoForm,setPromoForm]=useState({title:"",code:"",kind:"fixed",value:"500",minSpend:"10000",maxDiscount:"1500",branchId:""});
  const [supplierForm,setSupplierForm]=useState({title:"",contact:"",email:"",phone:"",leadDays:"5"});
  const [poForm,setPoForm]=useState({supplier:"",productId:"",quantity:"10",unitCost:"",branchId:"branch-angeles",eta:""});
  const [transferForm,setTransferForm]=useState({fromBranchId:"branch-angeles",toBranchId:"branch-san-fernando",productId:"",quantity:"1"});
  const [profileForm,setProfileForm]=useState({username:"",displayName:""});
  const [passwordForm,setPasswordForm]=useState({currentPassword:"",newPassword:"",confirmPassword:""});
  const [systemForm,setSystemForm]=useState<Record<string,string>>({});
  const [newUser,setNewUser]=useState({username:"",displayName:"",password:"",role:"staff"});
  const [resetPasswords,setResetPasswords]=useState<Record<string,string>>({});
  const [visiblePasswords,setVisiblePasswords]=useState<Record<string,boolean>>({});
  const [aiOperations,setAiOperations]=useState<AiOperations>({insights:[],forecast:[],topProducts:[]});
  const [aiQuestion,setAiQuestion]=useState("");
  const [aiAnswer,setAiAnswer]=useState<{answer:string;sources:string[]}|null>(null);
  const [aiBusy,setAiBusy]=useState(false);
  const togglePassword=(key:string)=>setVisiblePasswords((current)=>({...current,[key]:!current[key]}));

  const syncSeconds=Math.max(5,Number(settingsData?.settings.autoSyncSeconds??15)||15);

  const load=useCallback(async(silent=false)=>{
    if(silent)setSyncing(true);else setLoading(true);
    try{
      const response=await fetch(`/api/admin/summary?branch=${encodeURIComponent(branch)}`,{cache:"no-store"});
      const body=await response.json() as Summary;
      if(response.status===401){setAuth("signed-out");setAdmin(null);return;}
      setData(response.ok?{...body,orders:body.orders.map((order)=>({...order,subtotal:order.grand_total??order.subtotal}))}:{...emptySummary,error:body.error??"Dashboard unavailable"});
      if(response.ok)setLastSynced(new Date(body.syncedAt??Date.now()));
    }catch{setData({...emptySummary,error:"Dashboard unavailable"});}
    finally{setLoading(false);setSyncing(false);}
  },[branch]);
  const loadCommerce=useCallback(async()=>{try{const response=await fetch(`/api/admin/commerce?branch=${encodeURIComponent(branch)}`,{cache:"no-store"});const body=await response.json() as CommercePayload;if(response.ok)setCommerce(body);else if(response.status===401)setAuth("signed-out");}catch{}},[branch]);
  useEffect(()=>{
    if(auth!=="signed-in")return;
    const timer=window.setTimeout(()=>{void load();void loadCommerce();},0);
    const interval=window.setInterval(()=>{if(document.visibilityState==="visible"){void load(true);void loadCommerce();}},syncSeconds*1000);
    const onFocus=()=>{void load(true);void loadCommerce();};
    window.addEventListener("focus",onFocus);
    return()=>{window.clearTimeout(timer);window.clearInterval(interval);window.removeEventListener("focus",onFocus);};
  },[auth,load,loadCommerce,syncSeconds]);

  useEffect(()=>{const timer=window.setTimeout(()=>{void fetch("/api/admin/auth",{cache:"no-store"}).then(async(response)=>{const body=await response.json() as {user?:AdminIdentity};if(response.ok&&body.user){setAdmin(body.user);setAuth("signed-in");setProfileForm({username:body.user.username,displayName:body.user.displayName});}else setAuth("signed-out");}).catch(()=>setAuth("signed-out"));},0);return()=>window.clearTimeout(timer);},[]);

  const loadSettings=useCallback(async()=>{
    const response=await fetch("/api/admin/settings",{cache:"no-store"});const body=await response.json() as SettingsPayload&{error?:string};
    if(response.status===401){setAuth("signed-out");return;}
    if(response.ok){setSettingsData(body);setSystemForm(body.settings);setProfileForm({username:body.user.username,displayName:body.user.displayName});setAdmin(body.user);}else setMessage(body.error??"Settings unavailable");
  },[]);
  useEffect(()=>{if(auth!=="signed-in")return;const timer=window.setTimeout(()=>void loadSettings(),0);return()=>window.clearTimeout(timer);},[auth,loadSettings]);

  const loadAiOperations=useCallback(async()=>{
    setAiBusy(true);
    try{
      const response=await fetch("/api/admin/ai",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"insights",branch})});
      const body=await response.json() as AiOperations;
      if(response.status===401){setAuth("signed-out");return;}
      setAiOperations(response.ok?body:{insights:[],forecast:[],topProducts:[],error:body.error??"AI operations are unavailable"});
    }catch{setAiOperations({insights:[],forecast:[],topProducts:[],error:"AI operations are unavailable"});}
    finally{setAiBusy(false);}
  },[branch]);
  useEffect(()=>{if(auth!=="signed-in"||view!=="ai")return;const timer=window.setTimeout(()=>void loadAiOperations(),0);return()=>window.clearTimeout(timer);},[auth,view,loadAiOperations]);

  async function signIn(event:React.FormEvent){event.preventDefault();setBusy(true);setLoginError("");const response=await fetch("/api/admin/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(loginForm)});const body=await response.json() as {error?:string;user?:AdminIdentity};if(response.ok&&body.user){setAdmin(body.user);setAuth("signed-in");setProfileForm({username:body.user.username,displayName:body.user.displayName});setLoginForm({username:"",password:""});}else setLoginError(body.error??"Sign-in failed");setBusy(false);}
  async function signOut(){await fetch("/api/admin/auth",{method:"DELETE"});setAuth("signed-out");setAdmin(null);setSettingsData(null);setData(emptySummary);}

  async function updateSetting(action:string,payload:Record<string,unknown>){setBusy(true);const response=await fetch("/api/admin/settings",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({action,...payload})});const body=await response.json() as {error?:string;reauthenticate?:boolean};setMessage(response.ok?"Settings saved successfully.":body.error??"Settings update failed");if(response.ok&&body.reauthenticate){setAuth("signed-out");setAdmin(null);}else if(response.ok)await loadSettings();setBusy(false);return response.ok;}
  async function saveProfile(event:React.FormEvent){event.preventDefault();await updateSetting("profile",profileForm);}
  async function changePassword(event:React.FormEvent){event.preventDefault();if(passwordForm.newPassword!==passwordForm.confirmPassword){setMessage("New password confirmation does not match.");return;}const ok=await updateSetting("password",{currentPassword:passwordForm.currentPassword,newPassword:passwordForm.newPassword});if(ok)setPasswordForm({currentPassword:"",newPassword:"",confirmPassword:""});}
  async function saveSystemSettings(event:React.FormEvent){event.preventDefault();await updateSetting("settings",{settings:systemForm});}
  async function addAdminUser(event:React.FormEvent){event.preventDefault();setBusy(true);const response=await fetch("/api/admin/settings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(newUser)});const body=await response.json() as {error?:string};setMessage(response.ok?`${newUser.displayName} can now sign in.`:body.error??"User could not be added");if(response.ok){setNewUser({username:"",displayName:"",password:"",role:"staff"});await loadSettings();}setBusy(false);}
  async function updateUserAccess(row:Row,active:boolean,role=String(row.role)){await updateSetting("user_access",{userId:row.id,active,role});}
  async function resetUserPassword(row:Row){const password=resetPasswords[String(row.id)]??"";const ok=await updateSetting("reset_password",{userId:row.id,newPassword:password});if(ok)setResetPasswords((current)=>({...current,[String(row.id)]:""}));}

  async function seed(){
    setBusy(true);setMessage("Loading demo catalog, inventory and sales…");
    const response=await fetch("/api/admin/seed",{method:"POST"});
    const body=await response.json() as {error?:string;ordersAdded?:number};
    setMessage(response.ok?(body.ordersAdded?`${body.ordersAdded} demo orders added. Dashboard is ready.`:"Catalog is synced. Existing orders were kept."):body.error??"Could not load demo data");
    await Promise.all([load(),loadCommerce()]);setBusy(false);
  }

  async function generateDemoOrder(){
    setBusy(true);setMessage("Generating a realistic demo order…");
    const response=await fetch("/api/admin/demo-order",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({branchId:branch})});
    const body=await response.json() as {error?:string;orderNumber?:string;branch?:string;paymentMethod?:string};
    if(response.ok){setMessage(`${body.orderNumber} was generated for ${body.branch} with simulated ${String(body.paymentMethod).replaceAll("-"," ")} payment.`);setExpandedOrder(body.orderNumber??null);setView("orders");}
    else setMessage(body.error??"Could not generate a demo order");
    await load();setBusy(false);
  }

  async function resetDemoData(){
    setBusy(true);
    const response=await fetch("/api/admin/reset-demo",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({confirm:"RESET_DEMO"})});
    const body=await response.json() as {error?:string;message?:string};
    setMessage(response.ok?body.message??"Demo activity was reset.":body.error??"Demo data could not be reset");
    if(response.ok){setExpandedOrder(null);setShowReset(false);setView("overview");}
    await Promise.all([load(),loadCommerce()]);setBusy(false);
  }

  async function adjust(row:Row){
    const quantity=Number(adjustments[String(row.id)]??0);if(!Number.isInteger(quantity)||quantity===0){setMessage("Enter a non-zero whole number for the stock adjustment.");return;}
    setBusy(true);
    const response=await fetch("/api/inventory/adjust",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({branchId:row.branch_id,productId:row.product_id,quantity,notes:"Dashboard adjustment"})});
    const body=await response.json() as {error?:string};
    setMessage(response.ok?`Stock updated for ${row.name} at ${row.branch}.`:body.error??"Adjustment failed");
    setAdjustments((current)=>({...current,[String(row.id)]:""}));await load();setBusy(false);
  }

  async function updateOrder(orderNumber:string,status:string){
    setBusy(true);
    const response=await fetch("/api/orders",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({orderNumber,status})});
    const body=await response.json() as {error?:string};
    setMessage(response.ok?`${orderNumber} moved to ${status}. Inventory updated automatically.`:body.error??"Order update failed");
    await load();setBusy(false);
  }

  function editProduct(row:Row){
    setMediaFile(null);setMediaPreview("");setScanQuery("");setScanResult(null);setScanError("");
    setEditor({id:String(row.id),sku:String(row.sku),name:String(row.name),brand:String(row.brand),category:String(row.category),description:String(row.description??""),price:String(row.price??""),powerWatts:String(row.power_watts??""),socket:String(row.socket??""),memoryType:String(row.memory_type??""),formFactor:String(row.form_factor??""),imageKey:String(row.image_key??""),active:Boolean(row.active)});
  }

  async function runProductScan(rawQuery=scanQuery){
    const value=rawQuery.trim();if(!value){setScanError("Enter a SKU, barcode, or model name first.");return;}
    setScanning(true);setScanError("");setScanResult(null);
    try{
      const response=await fetch("/api/admin/product-scan",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({query:value})});
      const body=await response.json() as ProductScanResult&{error?:string};
      if(!response.ok){setScanError(body.error??"The product could not be identified.");return;}
      setScanResult(body);setScanQuery(value);setEditor((current)=>current?{...current,...body.suggestion}:current);
    }catch{setScanError("The scanner is temporarily unavailable. You can still enter the product manually.");}
    finally{setScanning(false);}
  }

  async function readProductLabel(file:File){
    const detectorWindow=window as typeof window&{
      BarcodeDetector?:new(options?:{formats?:string[]})=>{detect(source:ImageBitmap):Promise<Array<{rawValue?:string}>>};
      TextDetector?:new()=>{detect(source:ImageBitmap):Promise<Array<{rawValue?:string}>>};
    };
    let bitmap:ImageBitmap|null=null;
    try{
      bitmap=await createImageBitmap(file);
      if(detectorWindow.BarcodeDetector){const codes=await new detectorWindow.BarcodeDetector().detect(bitmap);const barcode=codes.map((code)=>code.rawValue??"").find(Boolean);if(barcode)return barcode;}
      if(detectorWindow.TextDetector){const text=await new detectorWindow.TextDetector().detect(bitmap);const readable=text.map((line)=>line.rawValue??"").filter(Boolean).join(" ");if(readable.length>2)return readable;}
    }catch{}finally{bitmap?.close();}
    const filename=file.name.replace(/\.(jpe?g|png|webp|avif)$/i,"").replace(/[_-]+/g," ").trim();
    return filename&&!/^(image|photo|camera|img)\s*\d*$/i.test(filename)?filename:"";
  }

  async function scanPhoto(file:File|null){
    if(!file)return;if(file.size>8*1024*1024){setScanError("Use a product photo smaller than 8 MB.");return;}
    const preview=URL.createObjectURL(file);setMediaFile(file);setMediaPreview(preview);setScanError("");setScanning(true);
    const detected=await readProductLabel(file);setScanning(false);
    if(detected){setScanQuery(detected);await runProductScan(detected);}
    else setScanError("The photo was added, but no readable barcode or label was found. Enter the SKU or model, then choose Analyze.");
  }

  async function applyCatalogImage(){
    if(!scanResult?.imageCandidate)return;
    try{const response=await fetch(scanResult.imageCandidate);const blob=await response.blob();const file=new File([blob],`${scanResult.suggestion.sku||"product"}.${blob.type.includes("png")?"png":"jpg"}`,{type:blob.type||"image/jpeg"});setMediaFile(file);setMediaPreview(URL.createObjectURL(file));setMessage("Catalog image prepared. Review it before saving the product.");}
    catch{setScanError("The suggested image could not be prepared. Use the web search or upload another photo.");}
  }

  async function improveProductCopy(){
    if(!editor)return;setScanning(true);setScanError("");
    try{
      const response=await fetch("/api/admin/ai",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"content",product:editor})});
      const body=await response.json() as {description?:string;error?:string};
      if(!response.ok)throw new Error(body.error??"Product copy could not be prepared");
      setEditor({...editor,description:body.description??editor.description});setMessage("AI product copy prepared. Review it before saving.");
    }catch(error){setScanError(error instanceof Error?error.message:"Product copy could not be prepared");}
    finally{setScanning(false);}
  }

  async function askStaffAssistant(event:React.FormEvent){
    event.preventDefault();if(!aiQuestion.trim())return;setAiBusy(true);setAiAnswer(null);
    try{
      const response=await fetch("/api/admin/ai",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"knowledge",question:aiQuestion,branch})});
      const body=await response.json() as {answer?:string;sources?:string[];error?:string};
      if(!response.ok)throw new Error(body.error??"The staff assistant is unavailable");
      setAiAnswer({answer:body.answer??"No answer is available.",sources:body.sources??[]});
    }catch(error){setAiAnswer({answer:error instanceof Error?error.message:"The staff assistant is unavailable",sources:[]});}
    finally{setAiBusy(false);}
  }

  async function saveProduct(event:React.FormEvent){
    event.preventDefault();if(!editor)return;setBusy(true);
    const method=editor.id?"PATCH":"POST";
    const payload={...editor,price:Number(editor.price),powerWatts:editor.powerWatts===""?null:Number(editor.powerWatts)};
    const response=await fetch("/api/catalog",{method,headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
    const body=await response.json() as {error?:string;id?:string};
    if(response.ok){
      const productId=editor.id??body.id;
      if(mediaFile&&productId){
        const media=new FormData();media.append("productId",productId);media.append("file",mediaFile);
        const upload=await fetch("/api/catalog/media",{method:"POST",body:media});
        const uploadBody=await upload.json() as {error?:string};
        if(!upload.ok){setEditor({...editor,id:productId});setMessage(`Product saved, but the image failed: ${uploadBody.error??"Please try again."}`);await load();setBusy(false);return;}
      }
      setMessage(editor.id?`${editor.name} and its media were updated across the store.`:`${editor.name} was added to the live catalog.`);setEditor(null);setMediaFile(null);setMediaPreview("");await load();
    } else setMessage(body.error??"Product could not be saved");
    setBusy(false);
  }

  async function removeProductMedia(){
    if(!editor?.id||!editor.imageKey)return;setBusy(true);
    const response=await fetch("/api/catalog/media",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({productId:editor.id})});
    const body=await response.json() as {error?:string};
    if(response.ok){setEditor({...editor,imageKey:""});setMessage("Product image removed from the storefront.");await load();}
    else setMessage(body.error??"Image could not be removed");
    setBusy(false);
  }

  async function archiveProduct(row:Row){
    setBusy(true);
    const response=await fetch("/api/catalog",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({id:row.id})});
    const body=await response.json() as {error?:string};
    setMessage(response.ok?`${row.name} archived and removed from the storefront.`:body.error??"Product could not be archived");
    await load();setBusy(false);
  }

  async function restoreProduct(row:Row){
    setBusy(true);
    const payload={id:row.id,sku:row.sku,name:row.name,brand:row.brand,category:row.category,description:row.description,price:row.price,powerWatts:row.power_watts,socket:row.socket,memoryType:row.memory_type,formFactor:row.form_factor,active:true};
    const response=await fetch("/api/catalog",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
    const body=await response.json() as {error?:string};
    setMessage(response.ok?`${row.name} restored to the storefront.`:body.error??"Product could not be restored");
    await load();setBusy(false);
  }

  async function createCommerceRecord(type:string,title:string,branchId:string,payload:Record<string,unknown>){
    setBusy(true);const response=await fetch("/api/admin/commerce",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type,title,branchId:branchId||null,payload})});const body=await response.json() as {error?:string;reference?:string};setMessage(response.ok?`${body.reference} created and synced.`:body.error??"Operation could not be created");if(response.ok){await Promise.all([load(),loadCommerce()]);}setBusy(false);return response.ok;
  }
  async function createPromotion(event:React.FormEvent){event.preventDefault();const ok=await createCommerceRecord("promotion",promoForm.title,promoForm.branchId,{code:promoForm.code.toUpperCase(),kind:promoForm.kind,value:Number(promoForm.value),minSpend:Number(promoForm.minSpend),maxDiscount:Number(promoForm.maxDiscount),expires:"2026-12-31",description:promoForm.title});if(ok)setPromoForm({title:"",code:"",kind:"fixed",value:"500",minSpend:"10000",maxDiscount:"1500",branchId:""});}
  async function createSupplier(event:React.FormEvent){event.preventDefault();const ok=await createCommerceRecord("supplier",supplierForm.title,"",{contact:supplierForm.contact,email:supplierForm.email,phone:supplierForm.phone,leadDays:Number(supplierForm.leadDays)});if(ok)setSupplierForm({title:"",contact:"",email:"",phone:"",leadDays:"5"});}
  async function createPurchaseOrder(event:React.FormEvent){event.preventDefault();const product=data.products.find((row)=>row.id===poForm.productId);const ok=await createCommerceRecord("purchase_order",`Restock ${String(product?.name??"product")}`,poForm.branchId,{supplier:poForm.supplier,productId:poForm.productId,productName:product?.name,quantity:Number(poForm.quantity),unitCost:Number(poForm.unitCost),eta:poForm.eta});if(ok)setPoForm({...poForm,productId:"",quantity:"10",unitCost:"",eta:""});}
  async function createTransfer(event:React.FormEvent){event.preventDefault();const product=data.products.find((row)=>row.id===transferForm.productId);const ok=await createCommerceRecord("stock_transfer",`Transfer ${String(product?.name??"stock")}`,transferForm.toBranchId,{...transferForm,productName:product?.name,quantity:Number(transferForm.quantity)});if(ok)setTransferForm({...transferForm,productId:"",quantity:"1"});}
  async function updateCommerceStatus(row:Row,status:string,action?:string){setBusy(true);const response=await fetch("/api/admin/commerce",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id:row.id,status,action})});const body=await response.json() as {error?:string};setMessage(response.ok?`${row.reference} moved to ${status}.`:body.error??"Status update failed");if(response.ok)await Promise.all([load(),loadCommerce()]);setBusy(false);}
  function exportCommerceCsv(){const rows=[["Type","Reference","Title","Status","Branch","Customer","Updated"],...commerce.records.map((row)=>[row.type,row.reference,row.title,row.status,row.branch??"Storewide",row.customer_email??"",row.updated_at])];const csv=rows.map((row)=>row.map((cell)=>`"${String(cell??"").replaceAll('"','""')}"`).join(",")).join("\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));const anchor=document.createElement("a");anchor.href=url;anchor.download=`tech-systems-commerce-${new Date().toISOString().slice(0,10)}.csv`;anchor.click();URL.revokeObjectURL(url);}

  const salesTrend=useMemo(()=>fillWeek(data.salesTrend),[data.salesTrend]);
  const search= query.trim().toLowerCase();
  const products=useMemo(()=>data.products.filter((row)=>!search||`${row.name} ${row.sku} ${row.brand} ${row.category}`.toLowerCase().includes(search)),[data.products,search]);
  const orders=useMemo(()=>data.orders.filter((row)=>(branch==="all"||row.branch_id===branch)&&(!search||`${row.order_number} ${row.customer_name} ${row.email}`.toLowerCase().includes(search))),[data.orders,branch,search]);
  const stock=useMemo(()=>data.stock.filter((row)=>(branch==="all"||row.branch_id===branch)&&(!search||`${row.name} ${row.sku} ${row.branch}`.toLowerCase().includes(search))),[data.stock,branch,search]);
  const movements=useMemo(()=>data.movements.filter((row)=>(branch==="all"||row.branch_id===branch)&&(!search||`${row.product} ${row.reference} ${row.branch}`.toLowerCase().includes(search))),[data.movements,branch,search]);
  const notifications=useMemo(()=>data.notifications.filter((row)=>(branch==="all"||row.branch_id===branch)&&(!search||`${row.order_number} ${row.recipient} ${row.subject} ${row.channel}`.toLowerCase().includes(search))),[data.notifications,branch,search]);
  const itemsByOrder=useMemo(()=>data.orderItems.reduce<Record<string,Row[]>>((grouped,item)=>{const key=String(item.order_number);(grouped[key]??=[]).push(item);return grouped;},{}),[data.orderItems]);
  const lowStock=data.stock.filter((row)=>Number(row.quantity)-Number(row.reserved)<=Number(row.reorder_level)).slice(0,5);
  const commerceRecords=(type:string)=>commerce.records.filter((row)=>row.type===type);
  const grossMarginEstimate=Math.round(Number(data.metrics.sales)*.22);
  const retailValue=Number(commerce.inventoryValue?.retail_value??0);const costValue=Number(commerce.inventoryValue?.cost_value??0);
  const selectedBranchName=branch==="all"?"All branches":String(data.branches.find((row)=>row.id===branch)?.name??"Selected branch");
  const navItems:[View,string,typeof LayoutDashboard][]=[
    ["overview","Overview",LayoutDashboard],["orders","Orders",ShoppingCart],["products","Products",Package],
    ["inventory","Inventory",Warehouse],["commerce","Commerce suite",ClipboardList],["ai","AI operations",Sparkles],["notifications","Notifications",Bell],["activity","Activity",Activity],["settings","Settings",Settings],
  ];

  if(auth==="checking")return <main className="ops-auth-page"><section className="ops-auth-card ops-auth-checking"><strong className="ops-auth-wordmark">TECH SYSTEMS</strong><span><i/> Securing command center</span><h1>Checking your admin session…</h1></section></main>;
  if(auth==="signed-out")return <main className="ops-auth-page"><section className="ops-auth-card"><Link href="/" className="ops-auth-brand"><span>TECH <strong>SYSTEMS</strong></span></Link><div className="ops-auth-icon"><LockKeyhole/></div><span className="ops-eyebrow">Protected operations</span><h1>Sign in to the command center.</h1><p>Manage sales, orders, inventory, products, branches, customer previews, and store access.</p><form onSubmit={signIn}><label>Username<input autoComplete="username" required value={loginForm.username} onChange={(event)=>setLoginForm({...loginForm,username:event.target.value})}/></label><label>Password<PasswordInput autoComplete="current-password" visible={Boolean(visiblePasswords.login)} onToggle={()=>togglePassword("login")} value={loginForm.password} onChange={(password)=>setLoginForm({...loginForm,password})}/></label>{loginError&&<div className="ops-auth-error"><AlertTriangle/>{loginError}</div>}<button disabled={busy}>{busy?"Signing in…":"Sign in securely"}</button></form><small><ShieldCheck/> Eight-hour secure session · credentials are never stored in the browser</small><Link href="/"><ArrowLeft/> Return to storefront</Link></section></main>;

  return <main className="ops-admin">
    <aside className="ops-sidebar">
      <Link href="/" className="ops-brand"><span>TECH <strong>SYSTEMS</strong></span></Link>
      <div className="ops-sidebar-label">Store operations</div>
      <nav>{navItems.map(([key,label,Icon])=><button key={key} onClick={()=>setView(key)} className={view===key?"active":""}><Icon/><span>{label}</span>{key==="orders"&&Number(data.metrics.open_orders)>0&&<b>{data.metrics.open_orders}</b>}</button>)}</nav>
      <div className="ops-sidebar-status"><span><i/>Live database</span><strong>3 branches connected</strong><small>Catalog, stock and orders sync with the storefront.</small></div>
      <Link className="ops-store-link" href="/"><ArrowLeft/> Back to storefront</Link>
    </aside>

    <section className="ops-main">
      <header className="ops-topbar">
        <div><span className="ops-eyebrow">Tech Systems demo · {selectedBranchName}</span><h1>{navItems.find(([key])=>key===view)?.[1]}</h1></div>
        <div className="ops-top-actions">
          <div className="ops-auto-sync"><i className={syncing?"syncing":""}/><span><strong>{syncing?"Syncing now":"Auto sync on"}</strong><small>{lastSynced?`Updated ${lastSynced.toLocaleTimeString("en-PH",{hour:"numeric",minute:"2-digit",second:"2-digit"})}`:"Connecting…"}</small></span></div>
          <label className="ops-search"><Search/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search orders, products, SKU"/></label>
          <select value={branch} onChange={(event)=>setBranch(event.target.value)} aria-label="Filter branch"><option value="all">All branches</option>{data.branches.map((row)=><option key={String(row.id)} value={String(row.id)}>{String(row.name)}</option>)}</select>
          <button className="ops-icon-button" onClick={()=>void load()} disabled={loading} aria-label="Refresh dashboard"><RefreshCw className={loading?"spin":""}/></button>
          <button className="ops-account-button" onClick={()=>setView("settings")} aria-label="Open account settings"><span>{admin?.displayName.slice(0,1).toUpperCase()}</span><span><strong>{admin?.displayName}</strong><small>{admin?.role}</small></span></button>
          <button className="ops-icon-button ops-logout-button" onClick={signOut} aria-label="Sign out"><LogOut/></button>
        </div>
      </header>

      {message&&<div className="ops-message"><Check/><span>{message}</span><button onClick={()=>setMessage("")}><X/></button></div>}
      {admin?.mustChangePassword===1&&<div className="ops-password-warning"><KeyRound/><span><strong>Change your temporary password.</strong> Your account is active, but a private password is required before handoff.</span><button onClick={()=>setView("settings")}>Open security settings</button></div>}
      {data.error&&<div className="ops-error"><AlertTriangle/><span><strong>Dashboard connection issue</strong>{data.error}</span><button onClick={seed} disabled={busy}>Initialize demo data</button></div>}

      {view==="overview"&&<>
        <section className="ops-hero-card">
          <div><span className="ops-eyebrow">Live business pulse</span><h2>Your store, in one clear view.</h2><p>Every order placed on the website flows here. Product and stock changes publish back to the customer experience immediately.</p></div>
          <div className="ops-demo-actions"><button className="ops-secondary-dark" onClick={()=>setShowGuide(true)}><ListChecks/> Demo guide</button><button className="ops-secondary-dark" onClick={generateDemoOrder} disabled={busy}><CirclePlay/>{busy?"Working…":"Generate order"}</button><button onClick={seed} disabled={busy}><Boxes/>{busy?"Syncing…":"Sync demo data"}</button></div>
        </section>
        <section className="ops-kpi-grid">
          <article><div><span>Gross sales</span><CircleDollarSign/></div><strong>{loading?"—":money(data.metrics.sales)}</strong><small><ArrowUpRight/> Non-cancelled website orders</small></article>
          <article><div><span>Orders</span><ShoppingCart/></div><strong>{loading?"—":data.metrics.orders}</strong><small><Clock3/> {data.metrics.open_orders} need attention</small></article>
          <article><div><span>Average order</span><BarChart3/></div><strong>{loading?"—":money(data.metrics.avg_order)}</strong><small><Users/> {data.metrics.customers} unique customers</small></article>
          <article className={data.metrics.low_stock?"warning":""}><div><span>Low-stock lines</span><AlertTriangle/></div><strong>{loading?"—":data.metrics.low_stock}</strong><small><Warehouse/> {selectedBranchName}</small></article>
        </section>
        <section className="ops-chart-grid">
          <article className="ops-card ops-sales-chart"><header><div><span>Sales performance</span><h3>Last 7 days</h3></div><strong>{money(data.metrics.completed_sales)}<small>completed revenue</small></strong></header>
            <div className="ops-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={salesTrend} margin={{top:12,right:8,left:-10,bottom:0}}><defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff6500" stopOpacity={0.36}/><stop offset="100%" stopColor="#ff6500" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e7e4df"/><XAxis dataKey="label" axisLine={false} tickLine={false}/><YAxis axisLine={false} tickLine={false} tickFormatter={compact}/><Tooltip formatter={(value)=>money(Number(value))} contentStyle={{borderRadius:12,border:"1px solid #dedbd5"}}/><Area type="monotone" dataKey="sales" stroke="#ff6500" strokeWidth={3} fill="url(#salesFill)"/></AreaChart></ResponsiveContainer></div>
          </article>
          <article className="ops-card ops-status-card"><header><div><span>Order pipeline</span><h3>Status mix</h3></div></header>
            <div className="ops-donut-wrap"><div className="ops-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.orderStatus} dataKey="value" nameKey="status" innerRadius={58} outerRadius={82} paddingAngle={4} stroke="none">{data.orderStatus.map((row)=><Cell key={String(row.status)} fill={statusColors[String(row.status)]??"#999"}/>)}</Pie><Tooltip formatter={(value)=>[value,"Orders"]}/></PieChart></ResponsiveContainer><span><strong>{data.metrics.orders}</strong>orders</span></div><div className="ops-legend">{data.orderStatus.map((row)=><div key={String(row.status)}><i style={{background:statusColors[String(row.status)]??"#999"}}/><span>{String(row.status)}</span><strong>{Number(row.value)}</strong></div>)}</div></div>
          </article>
        </section>
        <section className="ops-lower-grid">
          <article className="ops-card"><header><div><span>Branch performance</span><h3>Sales by location</h3></div></header><div className="ops-branch-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.branchPerformance} layout="vertical" margin={{left:12,right:18}}><CartesianGrid horizontal={false} stroke="#ece9e3"/><XAxis type="number" hide/><YAxis type="category" dataKey="code" axisLine={false} tickLine={false} width={42}/><Tooltip formatter={(value)=>money(Number(value))}/><Bar dataKey="sales" fill="#17191c" radius={[0,7,7,0]} barSize={20}/></BarChart></ResponsiveContainer></div>{data.branchPerformance.map((row)=><div className="ops-branch-row" key={String(row.id)}><span><strong>{String(row.name)}</strong><small>{Number(row.available)} items available</small></span><b>{money(Number(row.sales))}</b></div>)}</article>
          <article className="ops-card"><header><div><span>Top products</span><h3>Best sellers</h3></div></header><div className="ops-ranked">{data.topProducts.length?data.topProducts.map((row,index)=><div key={String(row.name)}><em>{index+1}</em><span><strong>{String(row.name)}</strong><small>{Number(row.units)} units sold</small></span><b>{money(Number(row.sales))}</b></div>):<p className="ops-empty">Product sales appear after orders are placed.</p>}</div></article>
          <article className="ops-card"><header><div><span>Inventory watch</span><h3>Reorder soon</h3></div><button className="ops-text-button" onClick={()=>setView("inventory")}>View all</button></header><div className="ops-stock-watch">{lowStock.length?lowStock.map((row)=><div key={String(row.id)}><span><strong>{String(row.name)}</strong><small>{String(row.branch)}</small></span><b>{Number(row.quantity)-Number(row.reserved)} left</b></div>):<p className="ops-empty">All inventory is above its reorder level.</p>}</div></article>
        </section>
      </>}

      {view==="orders"&&<section className="ops-card ops-table-card"><header><div><span>Order management · {selectedBranchName}</span><h2>Website orders</h2><p>Open an order to double-check every product, build service, quantity, and charge before fulfillment.</p></div><b>{orders.length} records</b></header><div className="ops-table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Branch / method</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Next action</th></tr></thead><tbody>{orders.map((row)=>{const orderNumber=String(row.order_number);const detailItems=itemsByOrder[orderNumber]??[];const orderServices=parseOrderServices(row.services_json);const expanded=expandedOrder===orderNumber;return <Fragment key={orderNumber}><tr><td><strong>{orderNumber}</strong><small>{dateTime(row.created_at)}</small></td><td><strong>{String(row.customer_name)}</strong><small>{String(row.email)}</small></td><td>{String(row.branch??row.fulfillment)}<small>{String(row.fulfillment)}</small></td><td><button className="ops-items-button" onClick={()=>setExpandedOrder(expanded?null:orderNumber)}>{Number(row.item_count)||detailItems.length} product{Number(row.item_count)===1?"":"s"}{orderServices.length?` + ${orderServices.length} service${orderServices.length===1?"":"s"}`:""}{expanded?<ChevronUp/>:<ChevronDown/>}</button></td><td><strong>{money(Number(row.subtotal))}</strong></td><td><span className={`ops-pill ${row.payment_status}`}>{String(row.payment_status)}</span></td><td><span className={`ops-pill ${row.status}`}>{String(row.status)}</span></td><td><div className="ops-row-actions">{row.status==="new"&&<button onClick={()=>updateOrder(orderNumber,"ready")} disabled={busy}>Mark ready</button>}{row.status==="ready"&&<button onClick={()=>updateOrder(orderNumber,"completed")} disabled={busy}>Complete</button>}{!["completed","cancelled"].includes(String(row.status))&&<button className="quiet" onClick={()=>updateOrder(orderNumber,"cancelled")} disabled={busy}>Cancel</button>}</div></td></tr>{expanded&&<tr className="ops-order-detail-row"><td colSpan={8}><div className="ops-order-detail"><header><div><span>Order contents</span><strong>{orderNumber}</strong></div><div><span>Customer contact</span><strong>{String(row.phone)}</strong></div><div><span>Payment method</span><strong>{String(row.payment_method).replaceAll("-"," ")}</strong></div><div><span>Demo payment reference</span><strong>{String(row.payment_reference??"Pay at pickup")}</strong></div>{row.delivery_address&&<div><span>Delivery address</span><strong>{String(row.delivery_address)}</strong></div>}</header><div className="ops-order-lines">{detailItems.map((item)=><article key={`${orderNumber}-${item.product_id}`}><Package/><span><strong>{String(item.product_name)}</strong><small>{money(Number(item.unit_price))} each</small></span><b>{Number(item.quantity)} ×</b><em>{money(Number(item.line_total))}</em></article>)}{orderServices.map((service)=><article className="ops-order-service" key={`${orderNumber}-${service.id}`}><Wrench/><span><strong>{service.name}</strong><small>Build service</small></span><b>1 ×</b><em>{money(Number(service.price))}</em></article>)}</div><div className="ops-order-totals"><span>Products <b>{money(Number(row.subtotal)-Number(row.service_total??0)-Number(row.shipping_fee??0)+Number(row.discount??0))}</b></span>{Number(row.service_total)>0&&<span>Build services <b>{money(Number(row.service_total))}</b></span>}{Number(row.shipping_fee)>0&&<span>Delivery <b>{money(Number(row.shipping_fee))}</b></span>}{Number(row.discount)>0&&<span>Discount <b>−{money(Number(row.discount))}</b></span>}</div><footer><span>{detailItems.reduce((sum,item)=>sum+Number(item.quantity),0)} product units · {orderServices.length} services</span><strong>Order total {money(Number(row.subtotal))}</strong></footer></div></td></tr>}</Fragment>})}</tbody></table></div>{!orders.length&&<p className="ops-empty">No matching orders found for {selectedBranchName.toLowerCase()}.</p>}</section>}

      {view==="products"&&<section className="ops-card ops-table-card"><header><div><span>Catalog management · {selectedBranchName}</span><h2>Products</h2><p>Add product details and a high-quality storefront image in one place.</p></div><button className="ops-primary" onClick={()=>{setMediaFile(null);setMediaPreview("");setScanQuery("");setScanResult(null);setScanError("");setEditor({...blankProduct});}}><Plus/> Add product</button></header><div className="ops-product-grid">{products.map((row)=><article className={row.active?"":"archived"} key={String(row.id)}><div className="ops-product-icon">{row.image_key?<img src={`/api/catalog/media?key=${encodeURIComponent(String(row.image_key))}`} alt=""/>:<Package/>}</div><div className="ops-product-copy"><span>{String(row.category)} · {String(row.sku)}</span><h3>{String(row.name)}</h3><p>{String(row.brand)} · {Number(row.total_stock)-Number(row.total_reserved)} available at {selectedBranchName.toLowerCase()}</p></div><strong>{money(Number(row.price))}</strong><div className="ops-product-actions"><button onClick={()=>editProduct(row)}><Pencil/> Edit</button>{row.active?<button onClick={()=>archiveProduct(row)} disabled={busy}><Archive/> Archive</button>:<button onClick={()=>restoreProduct(row)} disabled={busy}><RotateCcw/> Restore</button>}</div></article>)}</div>{!products.length&&<p className="ops-empty">No matching products found.</p>}</section>}

      {view==="inventory"&&<section className="ops-card ops-table-card"><header><div><span>Branch inventory</span><h2>Stock control</h2><p>Use positive numbers for received stock and negative numbers for corrections or write-offs.</p></div><b>{stock.length} stock lines</b></header><div className="ops-table-wrap"><table><thead><tr><th>Product / SKU</th><th>Branch</th><th>On hand</th><th>Reserved</th><th>Available</th><th>Reorder at</th><th>Adjustment</th></tr></thead><tbody>{stock.map((row)=><tr key={String(row.id)}><td><strong>{String(row.name)}</strong><small>{String(row.sku)} · {String(row.category)}</small></td><td>{String(row.branch)}</td><td>{Number(row.quantity)}</td><td>{Number(row.reserved)}</td><td><span className={Number(row.quantity)-Number(row.reserved)<=Number(row.reorder_level)?"ops-stock-low":"ops-stock-ok"}>{Number(row.quantity)-Number(row.reserved)}</span></td><td>{Number(row.reorder_level)}</td><td><div className="ops-adjust"><input type="number" placeholder="+ / −" value={adjustments[String(row.id)]??""} onChange={(event)=>setAdjustments((current)=>({...current,[String(row.id)]:event.target.value}))}/><button onClick={()=>adjust(row)} disabled={busy}>Apply</button></div></td></tr>)}</tbody></table></div>{!stock.length&&<p className="ops-empty">No matching inventory found.</p>}</section>}

      {view==="commerce"&&<section className="ops-commerce-shell"><header className="ops-commerce-head"><div><span className="ops-eyebrow">Revenue, customers & operations · {selectedBranchName}</span><h2>Commerce suite</h2><p>Promotions, purchasing, transfers, after-sales, customer activity, and commercial analytics share the live store data.</p></div><div><button onClick={exportCommerceCsv}><Download/>Export CSV</button><button onClick={()=>window.print()}><Printer/>Print report</button><button onClick={()=>void loadCommerce()}><RefreshCw/>Refresh</button></div></header><nav className="ops-commerce-tabs">{[["insights","Insights",BarChart3],["customers","Customers",Users],["promotions","Promotions",BadgePercent],["purchasing","Purchasing",Boxes],["transfers","Transfers",Truck],["aftersales","After-sales",RotateCcw],["engagement","Engagement",Bell]] .map(([key,label,Icon])=><button key={String(key)} className={commerceTab===key?"active":""} onClick={()=>setCommerceTab(key as typeof commerceTab)}><Icon/>{String(label)}</button>)}</nav>
        {commerceTab==="insights"&&<><section className="ops-commerce-kpis"><article><span>Estimated gross profit</span><strong>{money(grossMarginEstimate)}</strong><small>Demo 22% blended margin model</small></article><article><span>Inventory at cost</span><strong>{money(costValue)}</strong><small>{Number(commerce.inventoryValue?.units??0)} units across view</small></article><article><span>Retail inventory value</span><strong>{money(retailValue)}</strong><small>{money(Math.max(0,retailValue-costValue))} potential gross margin</small></article><article><span>Returning customers</span><strong>{commerce.customers.filter((row)=>Number(row.orders)>1).length}</strong><small>{commerce.customers.length} known customer records</small></article></section><section className="ops-commerce-charts"><article className="ops-card"><header><div><span>Conversion funnel</span><h3>Demo customer journey</h3></div></header><div className="ops-commerce-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={commerce.funnel} layout="vertical" margin={{left:25,right:20}}><CartesianGrid horizontal={false}/><XAxis type="number" hide/><YAxis type="category" dataKey="stage" width={92} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="value" fill="#ff6500" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer></div></article><article className="ops-card"><header><div><span>Payment mix</span><h3>Simulated tender share</h3></div></header><div className="ops-commerce-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={commerce.paymentMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>{commerce.paymentMix.map((row,index)=><Cell key={String(row.name)} fill={["#ff6500","#17191d","#4f8cff","#24bb78"][index%4]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div><div className="ops-commerce-legend">{commerce.paymentMix.map((row)=><span key={String(row.name)}><b>{String(row.name).replaceAll("-"," ")}</b>{Number(row.value)} orders</span>)}</div></article></section><article className="ops-card ops-table-card"><header><div><span>Category economics</span><h3>Sales contribution</h3></div></header><div className="ops-table-wrap"><table><thead><tr><th>Category</th><th>Units</th><th>Sales</th><th>Estimated margin</th></tr></thead><tbody>{commerce.categorySales.map((row)=><tr key={String(row.name)}><td><strong>{String(row.name)}</strong></td><td>{Number(row.units)}</td><td>{money(Number(row.sales))}</td><td>{money(Math.round(Number(row.sales)*.22))}</td></tr>)}</tbody></table></div></article></>}
        {commerceTab==="customers"&&<article className="ops-card ops-table-card"><header><div><span>Customer directory</span><h3>Accounts & purchase history</h3><p>Lifetime value, last order, and branch-filtered activity.</p></div><b>{commerce.customers.length} customers</b></header><div className="ops-table-wrap"><table><thead><tr><th>Customer</th><th>Contact</th><th>Orders</th><th>Lifetime spend</th><th>Last order</th><th>Segment</th></tr></thead><tbody>{commerce.customers.map((row)=><tr key={String(row.id)}><td><strong>{String(row.name)}</strong><small>Since {dateTime(row.created_at)}</small></td><td>{String(row.email)}<small>{String(row.phone)}</small></td><td>{Number(row.orders)}</td><td><strong>{money(Number(row.spend))}</strong></td><td>{dateTime(row.last_order)}</td><td><span className="ops-pill ready">{Number(row.orders)>1?"returning":"new"}</span></td></tr>)}</tbody></table></div></article>}
        {commerceTab==="promotions"&&<div className="ops-commerce-grid"><article className="ops-card ops-commerce-form"><header><div><span>Storefront offer</span><h3>Create promotion</h3></div><BadgePercent/></header><form onSubmit={createPromotion}><label className="wide">Campaign name<input required value={promoForm.title} onChange={(e)=>setPromoForm({...promoForm,title:e.target.value})} placeholder="Complete build weekend"/></label><label>Code<input required value={promoForm.code} onChange={(e)=>setPromoForm({...promoForm,code:e.target.value.toUpperCase()})} placeholder="BUILD500"/></label><label>Type<select value={promoForm.kind} onChange={(e)=>setPromoForm({...promoForm,kind:e.target.value})}><option value="fixed">Fixed amount</option><option value="percent">Percentage</option></select></label><label>Value<input required type="number" min="1" value={promoForm.value} onChange={(e)=>setPromoForm({...promoForm,value:e.target.value})}/></label><label>Minimum spend<input type="number" min="0" value={promoForm.minSpend} onChange={(e)=>setPromoForm({...promoForm,minSpend:e.target.value})}/></label><label>Maximum discount<input type="number" min="0" value={promoForm.maxDiscount} onChange={(e)=>setPromoForm({...promoForm,maxDiscount:e.target.value})}/></label><label>Branch<select value={promoForm.branchId} onChange={(e)=>setPromoForm({...promoForm,branchId:e.target.value})}><option value="">Storewide</option>{data.branches.map((row)=><option value={String(row.id)} key={String(row.id)}>{String(row.name)}</option>)}</select></label><button className="ops-primary" disabled={busy}>Publish offer</button></form></article><RecordList title="Active campaigns" rows={commerceRecords("promotion")} action={(row)=><button onClick={()=>void updateCommerceStatus(row,row.status==="active"?"archived":"active")}>{row.status==="active"?"Pause":"Activate"}</button>}/></div>}
        {commerceTab==="purchasing"&&<div className="ops-commerce-grid"><article className="ops-card ops-commerce-form"><header><div><span>Vendor master</span><h3>Add supplier</h3></div><Boxes/></header><form onSubmit={createSupplier}><label className="wide">Supplier name<input required value={supplierForm.title} onChange={(e)=>setSupplierForm({...supplierForm,title:e.target.value})}/></label><label>Contact person<input required value={supplierForm.contact} onChange={(e)=>setSupplierForm({...supplierForm,contact:e.target.value})}/></label><label>Email<input required type="email" value={supplierForm.email} onChange={(e)=>setSupplierForm({...supplierForm,email:e.target.value})}/></label><label>Phone<input required value={supplierForm.phone} onChange={(e)=>setSupplierForm({...supplierForm,phone:e.target.value})}/></label><label>Lead time (days)<input type="number" min="1" value={supplierForm.leadDays} onChange={(e)=>setSupplierForm({...supplierForm,leadDays:e.target.value})}/></label><button className="ops-primary" disabled={busy}>Add supplier</button></form></article><article className="ops-card ops-commerce-form"><header><div><span>Inbound stock</span><h3>Create purchase order</h3></div><ClipboardList/></header><form onSubmit={createPurchaseOrder}><label className="wide">Supplier<select required value={poForm.supplier} onChange={(e)=>setPoForm({...poForm,supplier:e.target.value})}><option value="">Choose supplier</option>{commerceRecords("supplier").map((row)=><option key={String(row.id)}>{String(row.title)}</option>)}</select></label><label className="wide">Product<select required value={poForm.productId} onChange={(e)=>setPoForm({...poForm,productId:e.target.value})}><option value="">Choose product</option>{data.products.filter((row)=>row.active).map((row)=><option value={String(row.id)} key={String(row.id)}>{String(row.name)}</option>)}</select></label><label>Quantity<input required type="number" min="1" value={poForm.quantity} onChange={(e)=>setPoForm({...poForm,quantity:e.target.value})}/></label><label>Unit cost<input required type="number" min="0" value={poForm.unitCost} onChange={(e)=>setPoForm({...poForm,unitCost:e.target.value})}/></label><label>Receiving branch<select value={poForm.branchId} onChange={(e)=>setPoForm({...poForm,branchId:e.target.value})}>{data.branches.map((row)=><option value={String(row.id)} key={String(row.id)}>{String(row.name)}</option>)}</select></label><label>ETA<input type="date" value={poForm.eta} onChange={(e)=>setPoForm({...poForm,eta:e.target.value})}/></label><button className="ops-primary" disabled={busy}>Create PO</button></form></article><RecordList title="Purchase orders" rows={commerceRecords("purchase_order")} action={(row)=><button disabled={row.status==="received"} onClick={()=>void updateCommerceStatus(row,"received","receive_po")}>{row.status==="received"?"Received":"Receive stock"}</button>}/><RecordList title="Suppliers" rows={commerceRecords("supplier")}/></div>}
        {commerceTab==="transfers"&&<div className="ops-commerce-grid"><article className="ops-card ops-commerce-form"><header><div><span>Branch movement</span><h3>Transfer stock</h3></div><Truck/></header><form onSubmit={createTransfer}><label>From<select value={transferForm.fromBranchId} onChange={(e)=>setTransferForm({...transferForm,fromBranchId:e.target.value})}>{data.branches.map((row)=><option value={String(row.id)} key={String(row.id)}>{String(row.name)}</option>)}</select></label><label>To<select value={transferForm.toBranchId} onChange={(e)=>setTransferForm({...transferForm,toBranchId:e.target.value})}>{data.branches.map((row)=><option value={String(row.id)} key={String(row.id)}>{String(row.name)}</option>)}</select></label><label className="wide">Product<select required value={transferForm.productId} onChange={(e)=>setTransferForm({...transferForm,productId:e.target.value})}><option value="">Choose product</option>{data.products.filter((row)=>row.active).map((row)=><option value={String(row.id)} key={String(row.id)}>{String(row.name)}</option>)}</select></label><label>Quantity<input required type="number" min="1" value={transferForm.quantity} onChange={(e)=>setTransferForm({...transferForm,quantity:e.target.value})}/></label><button className="ops-primary" disabled={busy}>Transfer now</button></form></article><RecordList title="Transfer history" rows={commerceRecords("stock_transfer")}/></div>}
        {commerceTab==="aftersales"&&<div className="ops-commerce-grid"><RecordList title="Returns & RMA" rows={commerceRecords("return")} action={(row)=><div className="ops-record-actions"><button onClick={()=>void updateCommerceStatus(row,"inspection")}>Inspect</button><button onClick={()=>void updateCommerceStatus(row,"approved")}>Approve</button><button onClick={()=>void updateCommerceStatus(row,"resolved")}>Resolve</button></div>}/><RecordList title="Warranty cases" rows={commerceRecords("warranty")} action={(row)=><button onClick={()=>void updateCommerceStatus(row,"resolved")}>Resolve</button>}/><RecordList title="Service bookings" rows={commerceRecords("service_booking")} action={(row)=><button onClick={()=>void updateCommerceStatus(row,"scheduled")}>Schedule</button>}/></div>}
        {commerceTab==="engagement"&&<div className="ops-commerce-grid"><RecordList title="Reviews" rows={commerceRecords("review")} action={(row)=><button onClick={()=>void updateCommerceStatus(row,row.status==="published"?"hidden":"published")}>{row.status==="published"?"Hide":"Publish"}</button>}/><RecordList title="Product questions" rows={commerceRecords("question")} action={(row)=><button onClick={()=>void updateCommerceStatus(row,"answered")}>Mark answered</button>}/><RecordList title="Recoverable carts" rows={commerceRecords("abandoned_cart")} action={(row)=><button onClick={()=>void updateCommerceStatus(row,"recovered")}>Simulate recovery</button>}/></div>}
      </section>}

      {view==="ai"&&<section className="ops-ai-command">
        <header className="ops-ai-command-head"><div><span className="ops-eyebrow">Catalog-grounded demo intelligence</span><h2>Decisions with the live store in view.</h2><p>Sales signals, demand estimates, product content, customer quotes, and staff answers use the selected branch and the records already connected to the storefront.</p></div><button onClick={()=>void loadAiOperations()} disabled={aiBusy}><RefreshCw className={aiBusy?"spin":""}/>Refresh analysis</button></header>
        {aiOperations.error&&<div className="ops-ai-alert"><AlertTriangle/><span>{aiOperations.error}</span></div>}
        <div className="ops-ai-insight-grid">{aiOperations.insights.map((insight)=><article className={insight.tone} key={insight.label}><span>{insight.label}</span><strong>{insight.currency?money(Number(insight.value)):String(insight.value)}</strong><p>{insight.detail}</p></article>)}{aiBusy&&!aiOperations.insights.length&&[1,2,3,4].map((item)=><article className="loading" key={item}><span>Analyzing branch data…</span><strong>—</strong><p>Connecting sales and inventory.</p></article>)}</div>
        <div className="ops-ai-main-grid">
          <article className="ops-card ops-ai-forecast"><header><div><span>Demand forecast</span><h3>Reorder watchlist</h3><p>Estimates use available stock and the last 30 days of demo sales. Review supplier lead time before purchasing.</p></div><Warehouse/></header><div className="ops-ai-forecast-list">{aiOperations.forecast.map((row)=><article key={`${row.branch}-${row.id}`}><span className={`urgency ${row.urgency}`}>{row.urgency}</span><div><strong>{String(row.name)}</strong><small>{String(row.sku)} · {String(row.branch)}</small></div><span><small>Available</small><b>{Number(row.available)}</b></span><span><small>Coverage</small><b>{row.daysCoverage===null?"No sales":`${row.daysCoverage} days`}</b></span><span><small>Suggested</small><b>+{Number(row.suggestedOrder)}</b></span></article>)}</div>{!aiBusy&&!aiOperations.forecast.length&&<p className="ops-empty">No reorder risks were detected for this branch view.</p>}</article>
          <article className="ops-card ops-ai-staff"><header><div><span>Staff knowledge assistant</span><h3>Ask an operations question</h3><p>Answers are grounded in the demo&apos;s catalog, orders, inventory, compatibility, and safety rules.</p></div><Sparkles/></header><form onSubmit={askStaffAssistant}><textarea rows={4} value={aiQuestion} onChange={(event)=>setAiQuestion(event.target.value)} placeholder="Example: What should I verify before approving a warranty request?"/><button className="ops-primary" disabled={aiBusy||!aiQuestion.trim()}>{aiBusy?"Reviewing…":"Ask assistant"}</button></form>{aiAnswer&&<div className="ops-ai-answer"><strong>Suggested answer</strong><p>{aiAnswer.answer}</p>{aiAnswer.sources.length>0&&<div>{aiAnswer.sources.map((source)=><span key={source}>{source}</span>)}</div>}<small>Demo guidance only · staff should confirm the exact record before promising an outcome.</small></div>}</article>
        </div>
        <div className="ops-ai-capabilities"><article><Sparkles/><span><strong>Product onboarding</strong>Scan a SKU or package photo in Products, then generate review-ready copy and exact-image search guidance.</span><button onClick={()=>setView("products")}>Open products</button></article><article><Printer/><span><strong>Quote intelligence</strong>Customer planners create itemized CCTV, network, smart-home, and PC build drafts that flow into the quote page.</span><Link href="/ai">Open AI Center</Link></article><article><ShieldCheck/><span><strong>Human-controlled publishing</strong>AI prepares suggestions; stock, price, compatibility, orders, and publishing remain deterministic and reviewable.</span></article></div>
      </section>}

      {view==="notifications"&&<section className="ops-card ops-table-card"><header><div><span>Customer communications · {selectedBranchName}</span><h2>Notification previews</h2><p>These are simulated email and SMS messages. Nothing is sent outside this demo.</p></div><b>{notifications.length} messages</b></header><div className="ops-notification-list">{notifications.map((notice,index)=><article key={`${notice.order_number}-${notice.channel}-${index}`}><div className={`ops-notification-icon ${notice.channel}`}><Bell/></div><div><span>{String(notice.channel)} · {String(notice.branch??"Storewide")}</span><strong>{String(notice.subject)}</strong><p>{String(notice.body)}</p><small>To {String(notice.recipient)} · {dateTime(notice.created_at)}</small></div><aside><b>{String(notice.status)}</b><strong>{String(notice.order_number)}</strong></aside></article>)}</div>{!notifications.length&&<p className="ops-empty">No matching notification previews found.</p>}</section>}

      {view==="activity"&&<section className="ops-card ops-table-card"><header><div><span>Audit trail</span><h2>Stock activity</h2><p>Reservations, sales, releases and manual adjustments are recorded here.</p></div><b>{movements.length} events</b></header><div className="ops-activity-list">{movements.map((row,index)=><article key={`${row.reference}-${index}`}><div className={`ops-activity-icon ${Number(row.quantity)>0?"in":"out"}`}>{Number(row.quantity)>0?<ArrowUpRight/>:<ArrowLeft/>}</div><span><strong>{String(row.product)}</strong><small>{String(row.notes||row.type)} · {String(row.branch)}</small></span><b className={Number(row.quantity)>0?"in":"out"}>{Number(row.quantity)>0?"+":""}{Number(row.quantity)}</b><em>{String(row.reference)}<small>{dateTime(row.created_at)}</small></em></article>)}</div>{!movements.length&&<p className="ops-empty">No matching activity found.</p>}</section>}

      {view==="settings"&&<section className="ops-settings-shell">
        <div className="ops-settings-intro"><div><span className="ops-eyebrow">Administration & security</span><h2>Settings that stay with the store.</h2><p>Account access, business details, dashboard behavior, roles, and security history are stored in the same live system as the catalog and orders.</p></div><div><ShieldCheck/><span><strong>Protected session</strong><small>{admin?.role} access · expires after 8 hours</small></span></div></div>
        <div className="ops-settings-grid">
          <article className="ops-card ops-settings-card"><header><div><span>My account</span><h3>Profile & sign-in</h3></div><KeyRound/></header><form onSubmit={saveProfile}><div className="ops-settings-fields"><label>Display name<input required value={profileForm.displayName} onChange={(event)=>setProfileForm({...profileForm,displayName:event.target.value})}/></label><label>Username<input required autoComplete="username" value={profileForm.username} onChange={(event)=>setProfileForm({...profileForm,username:event.target.value.toLowerCase()})}/><small>3–32 lowercase letters, numbers, dots, dashes, or underscores.</small></label></div><button className="ops-primary" disabled={busy}>Save profile</button></form><div className="ops-settings-divider"/><form onSubmit={changePassword}><div className="ops-settings-fields"><label>Current password<PasswordInput autoComplete="current-password" visible={Boolean(visiblePasswords.current)} onToggle={()=>togglePassword("current")} value={passwordForm.currentPassword} onChange={(currentPassword)=>setPasswordForm({...passwordForm,currentPassword})}/></label><label>New password<PasswordInput minLength={10} visible={Boolean(visiblePasswords.new)} onToggle={()=>togglePassword("new")} value={passwordForm.newPassword} onChange={(newPassword)=>setPasswordForm({...passwordForm,newPassword})}/><small>10+ characters with upper, lower, and a number.</small></label><label>Confirm new password<PasswordInput minLength={10} visible={Boolean(visiblePasswords.confirm)} onToggle={()=>togglePassword("confirm")} value={passwordForm.confirmPassword} onChange={(confirmPassword)=>setPasswordForm({...passwordForm,confirmPassword})}/></label></div><button className="ops-primary" disabled={busy}><LockKeyhole/> Change password</button></form></article>

          <article className="ops-card ops-settings-card"><header><div><span>Store configuration</span><h3>Business & dashboard</h3></div><Settings/></header><form onSubmit={saveSystemSettings}><div className="ops-settings-fields"><label className="wide">Business name<input required value={systemForm.businessName??""} onChange={(event)=>setSystemForm({...systemForm,businessName:event.target.value})}/></label><label>Support email<input required type="email" value={systemForm.supportEmail??""} onChange={(event)=>setSystemForm({...systemForm,supportEmail:event.target.value})}/></label><label>Support phone<input required value={systemForm.supportPhone??""} onChange={(event)=>setSystemForm({...systemForm,supportPhone:event.target.value})}/></label><label>Default branch<select value={systemForm.defaultBranch??"branch-angeles"} onChange={(event)=>setSystemForm({...systemForm,defaultBranch:event.target.value})}>{data.branches.map((row)=><option key={String(row.id)} value={String(row.id)}>{String(row.name)}</option>)}</select></label><label>Currency<select value={systemForm.currency??"PHP"} onChange={(event)=>setSystemForm({...systemForm,currency:event.target.value})}><option value="PHP">Philippine peso (PHP)</option></select></label><label>Auto-sync interval<input type="number" min="5" max="300" value={systemForm.autoSyncSeconds??"15"} onChange={(event)=>setSystemForm({...systemForm,autoSyncSeconds:event.target.value})}/><small>Seconds between dashboard updates.</small></label><label>Low-stock threshold<input type="number" min="0" max="999" value={systemForm.lowStockThreshold??"3"} onChange={(event)=>setSystemForm({...systemForm,lowStockThreshold:event.target.value})}/></label></div><button className="ops-primary" disabled={busy}>Save store settings</button></form></article>
        </div>

        {settingsData?.canManageUsers&&<article className="ops-card ops-team-card"><header><div><span>Access control</span><h3>Admin users & roles</h3><p>Add staff, pause access instantly, assign permissions, and issue a temporary password.</p></div><Users/></header><div className="ops-team-layout"><form className="ops-new-user" onSubmit={addAdminUser}><div className="ops-team-title"><UserPlus/><span><strong>Add a user</strong><small>They will be required to change the temporary password.</small></span></div><label>Display name<input required value={newUser.displayName} onChange={(event)=>setNewUser({...newUser,displayName:event.target.value})}/></label><label>Username<input required value={newUser.username} onChange={(event)=>setNewUser({...newUser,username:event.target.value.toLowerCase()})}/></label><label>Temporary password<PasswordInput minLength={10} visible={Boolean(visiblePasswords.create)} onToggle={()=>togglePassword("create")} value={newUser.password} onChange={(password)=>setNewUser({...newUser,password})}/></label><label>Role<select value={newUser.role} onChange={(event)=>setNewUser({...newUser,role:event.target.value})}><option value="staff">Staff · daily operations</option><option value="admin">Admin · settings and users</option>{admin?.role==="owner"&&<option value="owner">Owner · full control</option>}</select></label><button className="ops-primary" disabled={busy}><UserPlus/> Add user</button></form><div className="ops-user-list">{settingsData.users.map((row)=>{const own=String(row.id)===admin?.id;const resetKey=`reset-${String(row.id)}`;return <article key={String(row.id)} className={Number(row.active)===1?"":"inactive"}><div className="ops-user-avatar">{String(row.display_name).slice(0,1).toUpperCase()}</div><div className="ops-user-copy"><strong>{String(row.display_name)}</strong><span>@{String(row.username)} · {String(row.role)}</span><small>{row.last_login_at?`Last sign-in ${dateTime(row.last_login_at)}`:"Has not signed in yet"}{Number(row.must_change_password)===1?" · Password change required":""}</small></div>{own?<span className="ops-you-badge">You</span>:<><label className="ops-role-select"><span>Role</span><select value={String(row.role)} onChange={(event)=>void updateUserAccess(row,Boolean(row.active),event.target.value)} disabled={busy||admin?.role!=="owner"&&String(row.role)!=="staff"}><option value="staff">Staff</option><option value="admin">Admin</option>{admin?.role==="owner"&&<option value="owner">Owner</option>}</select></label><label className="ops-access-toggle"><input type="checkbox" checked={Boolean(row.active)} onChange={(event)=>void updateUserAccess(row,event.target.checked)} disabled={busy}/><span>{Number(row.active)===1?"Active":"Paused"}</span></label><div className="ops-reset-password"><PasswordInput required={false} minLength={10} placeholder="New temporary password" visible={Boolean(visiblePasswords[resetKey])} onToggle={()=>togglePassword(resetKey)} value={resetPasswords[String(row.id)]??""} onChange={(password)=>setResetPasswords((current)=>({...current,[String(row.id)]:password}))}/><button type="button" onClick={()=>void resetUserPassword(row)} disabled={busy||!(resetPasswords[String(row.id)]??"")}>Reset</button></div></>}</article>})}</div></div></article>}

        {settingsData?.canManageUsers&&<article className="ops-card ops-security-log"><header><div><span>Security history</span><h3>Recent admin actions</h3></div><ListChecks/></header><div>{settingsData.audits.map((row,index)=><article key={`${row.created_at}-${index}`}><ShieldCheck/><span><strong>{String(row.action).replaceAll("_"," ")}</strong><small>{String(row.username)} · {String(row.details||"No additional detail")}</small></span><time>{dateTime(row.created_at)}</time></article>)}</div>{!settingsData.audits.length&&<p className="ops-empty">Security actions will appear here.</p>}</article>}
      </section>}
    </section>

    {editor&&<div className="ops-modal-backdrop" role="presentation"><section className="ops-modal" role="dialog" aria-modal="true" aria-labelledby="product-editor-title"><header><div><span>{editor.id?"Catalog update":"New catalog item"}</span><h2 id="product-editor-title">{editor.id?"Edit product":"Add product"}</h2></div><button onClick={()=>setEditor(null)} aria-label="Close product editor"><X/></button></header><form onSubmit={saveProduct}>
      <section className="ops-ai-scanner" aria-label="AI product scanner"><header><div className="ops-ai-icon"><Sparkles/></div><div><span>AI product scanner</span><strong>Scan once. Review before publishing.</strong><p>Read a barcode or package label, match the live catalog, and prepare an exact-product image search.</p></div><b>Demo intelligence</b></header><div className="ops-ai-controls"><label><Barcode/><input value={scanQuery} onChange={(event)=>setScanQuery(event.target.value)} placeholder="SKU, barcode, model, or product name"/></label><button type="button" onClick={()=>void runProductScan()} disabled={scanning}>{scanning?<LoaderCircle className="ops-spin"/>:<ScanLine/>}{scanning?"Analyzing…":"Analyze"}</button></div><div className="ops-ai-capture"><label><Camera/> Take product photo<input type="file" accept="image/*" capture="environment" onChange={(event)=>void scanPhoto(event.target.files?.[0]??null)}/></label><label><Upload/> Upload package photo<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event)=>void scanPhoto(event.target.files?.[0]??null)}/></label><span>Barcode and on-device label reading depend on browser support.</span></div>{scanError&&<p className="ops-ai-error">{scanError}</p>}{scanResult&&<div className="ops-ai-result"><div><Check/><span><strong>{scanResult.confidence}% match · {scanResult.source}</strong><small>{scanResult.duplicate?"This SKU already exists. Use the filled fields to review it, then avoid creating a duplicate.":"Suggested fields were filled automatically. Confirm price and specifications before saving."}</small></span></div><div className="ops-ai-actions">{scanResult.imageCandidate&&<button type="button" onClick={()=>void applyCatalogImage()}><ImagePlus/> Use catalog photo</button>}<a href={scanResult.imageSearchUrl} target="_blank" rel="noreferrer"><Globe2/> Search exact web images</a></div><p>Image query: <b>{scanResult.imageSearchQuery}</b>. Choose a clear manufacturer-authorized image and verify it matches the exact SKU.</p></div>}</section>
      <div className="ops-form-grid"><label>Product name<input required value={editor.name} onChange={(event)=>setEditor({...editor,name:event.target.value})}/></label><label>SKU<input required value={editor.sku} onChange={(event)=>setEditor({...editor,sku:event.target.value})}/></label><label>Brand<input required value={editor.brand} onChange={(event)=>setEditor({...editor,brand:event.target.value})}/></label><label>Category<select value={editor.category} onChange={(event)=>setEditor({...editor,category:event.target.value})}>{categories.map((item)=><option key={item}>{item}</option>)}</select></label><label>Price (PHP)<input required min="0" type="number" value={editor.price} onChange={(event)=>setEditor({...editor,price:event.target.value})}/></label><label>Power / capacity (W)<input min="0" type="number" value={editor.powerWatts} onChange={(event)=>setEditor({...editor,powerWatts:event.target.value})}/></label><label>CPU socket<input placeholder="AM4, AM5, LGA1700" value={editor.socket} onChange={(event)=>setEditor({...editor,socket:event.target.value})}/></label><label>Memory type<input placeholder="DDR4 or DDR5" value={editor.memoryType} onChange={(event)=>setEditor({...editor,memoryType:event.target.value})}/></label><label>Form factor<input placeholder="ATX or mATX" value={editor.formFactor} onChange={(event)=>setEditor({...editor,formFactor:event.target.value})}/></label><label className="wide ops-description-field"><span>Description <button type="button" onClick={()=>void improveProductCopy()} disabled={scanning||!editor.name}><Sparkles/>{scanning?"Preparing…":"Improve with AI"}</button></span><textarea required rows={4} value={editor.description} onChange={(event)=>setEditor({...editor,description:event.target.value})}/></label></div>
      <section className="ops-media-field"><div className="ops-media-preview">{mediaPreview?<img src={mediaPreview} alt="New product preview"/>:editor.imageKey?<img src={`/api/catalog/media?key=${encodeURIComponent(editor.imageKey)}`} alt="Current product"/>:<ImagePlus/>}</div><div><span>Product media</span><strong>{mediaFile?mediaFile.name:editor.imageKey?"Current storefront image":"Add a storefront image"}</strong><p>JPG, PNG, WebP or AVIF. Maximum 8 MB. A clean square or landscape product photo works best.</p><label className="ops-file-button"><ImagePlus/> Choose image<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event)=>{const file=event.target.files?.[0]??null;setMediaFile(file);setMediaPreview(file?URL.createObjectURL(file):"");}}/></label>{editor.imageKey&&<button type="button" className="ops-remove-media" onClick={removeProductMedia} disabled={busy}><Trash2/> Remove current image</button>}</div></section>
      <div className="ops-modal-note"><Store/> Compatibility fields are used by the PC Builder. New products begin with zero stock in every branch.</div>
      <footer><button type="button" className="ops-secondary" onClick={()=>setEditor(null)}>Cancel</button><button type="submit" className="ops-primary" disabled={busy}>{busy?"Saving…":editor.id?"Save changes":"Add to catalog"}</button></footer>
    </form></section></div>}

    {showGuide&&<div className="ops-modal-backdrop" role="presentation"><section className="ops-modal ops-guide" role="dialog" aria-modal="true" aria-labelledby="demo-guide-title"><header><div><span>Presentation mode</span><h2 id="demo-guide-title">Tech Systems demo walkthrough</h2></div><button onClick={()=>setShowGuide(false)} aria-label="Close demo guide"><X/></button></header><div className="ops-guide-body"><div className="ops-guide-note"><Check/><span><strong>Everything here is safely simulated.</strong>No real charge, financing application, shipment, email, or SMS is created.</span></div><ol><li><b>1</b><span><strong>Shop or build</strong>Choose products in the shop or assemble a compatible PC.</span></li><li><b>2</b><span><strong>Simulate checkout</strong>Use GCash, test card, Home Credit, or pay on pickup.</span></li><li><b>3</b><span><strong>Watch the dashboard sync</strong>The order, sales, stock reservation, and previews appear automatically.</span></li><li><b>4</b><span><strong>Inspect every order</strong>Expand the row to verify products, quantities, totals, and payment reference.</span></li><li><b>5</b><span><strong>Move fulfillment forward</strong>Mark it ready or complete and watch inventory and customer previews update.</span></li><li><b>6</b><span><strong>Filter by branch</strong>Sales, orders, stock, charts, activity, and messages follow the selected branch.</span></li></ol><div className="ops-guide-links"><Link href="/shop">Open demo shop</Link><Link href="/track">Open order tracker</Link><button onClick={()=>{setShowGuide(false);void generateDemoOrder();}}>Generate sample order</button></div></div><footer className="ops-guide-footer"><button className="ops-danger-link" onClick={()=>{setShowGuide(false);setShowReset(true);}}>Reset demo activity</button><button className="ops-primary" onClick={()=>setShowGuide(false)}>Got it</button></footer></section></div>}

    {showReset&&<div className="ops-modal-backdrop" role="presentation"><section className="ops-modal ops-reset" role="alertdialog" aria-modal="true" aria-labelledby="reset-demo-title"><header><div><span>Protected demo control</span><h2 id="reset-demo-title">Reset demo activity?</h2></div><button onClick={()=>setShowReset(false)} aria-label="Close reset confirmation"><X/></button></header><div className="ops-reset-body"><AlertTriangle/><div><strong>Orders, customers, message previews, and stock activity will be cleared.</strong><p>Your product catalog, uploaded media, branches, and baseline stock will be preserved.</p></div></div><footer><button className="ops-secondary" onClick={()=>setShowReset(false)}>Keep demo data</button><button className="ops-danger" onClick={resetDemoData} disabled={busy}>{busy?"Resetting…":"Reset demo activity"}</button></footer></section></div>}
  </main>;
}

function RecordList({title,rows,action}:{title:string;rows:Row[];action?:(row:Row)=>React.ReactNode}){
  return <article className="ops-card ops-record-list"><header><div><span>Live records</span><h3>{title}</h3></div><b>{rows.length}</b></header><div>{rows.map((row)=>{let payload:Record<string,unknown>={};try{payload=JSON.parse(String(row.payload??"{}")) as Record<string,unknown>;}catch{}return <article key={String(row.id)}><span><strong>{String(row.title)}</strong><small>{String(row.reference)} · {String(row.branch??"Storewide")} · {dateTime(row.updated_at)}</small><p>{Object.entries(payload).slice(0,4).map(([key,value])=>`${key.replaceAll("Id","")}: ${Array.isArray(value)?value.join(", "):typeof value==="object"?"saved details":String(value)}`).join(" · ")}</p></span><aside><b className={`ops-pill ${row.status}`}>{String(row.status)}</b>{action?.(row)}</aside></article>})}</div>{!rows.length&&<p className="ops-empty">No {title.toLowerCase()} match this branch view.</p>}</article>;
}
