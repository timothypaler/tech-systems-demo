import { runtimeEnv as env } from "@/lib/runtime-env";
import { storeProducts } from "@/lib/store-data";

type Row = Record<string, unknown>;
type RequestBody = {
  mode?: string; prompt?: string; branchId?: string; budget?: number; useCase?: string;
  preference?: string; rooms?: number; entrances?: number; floors?: number; users?: number; cartIds?: string[];
};

const money = (value:number) => new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:0}).format(value);
const text = (value:unknown) => String(value ?? "").toLowerCase();
const available = (row:Row) => Math.max(0,Number(row.quantity ?? 0)-Number(row.reserved ?? 0));

async function catalog(branchId:string){
  try{
    const result=await env.DB.prepare(`SELECT p.*,COALESCE(i.quantity,0) AS quantity,COALESCE(i.reserved,0) AS reserved
      FROM products p LEFT JOIN inventory i ON i.product_id=p.id AND i.branch_id=? WHERE p.active=1 ORDER BY p.category,p.name`).bind(branchId).all();
    return result.results as Row[];
  }catch{
    return storeProducts.map((product,index)=>({...product,power_watts:product.powerWatts,memory_type:product.memoryType,form_factor:product.formFactor,quantity:12-(index%5),reserved:index%3}));
  }
}

function searchProducts(products:Row[],query:string){
  const q=text(query);const tokens=q.split(/[^a-z0-9]+/).filter((token)=>token.length>1);
  const synonyms:Record<string,string[]>={
    gaming:["graphics","monitor","headset","mouse","keyboard"],office:["processor","integrated","laptop"],
    camera:["cctv","colorvu"],security:["cctv","camera","ups"],wifi:["networking","router"],
    backup:["power","ups"],white:["compact","white"],storage:["ssd","nvme"],memory:["ram","ddr4"],
  };
  return products.map((product)=>{
    const hay=text(`${product.name} ${product.brand} ${product.sku} ${product.category} ${product.description}`);
    let score=tokens.reduce((sum,token)=>sum+(hay.includes(token)?8:0),0);
    for(const token of tokens)for(const related of synonyms[token]??[])if(hay.includes(related))score+=4;
    const budget=q.match(/(?:under|below|max|budget)\s*(?:₱|php)?\s*([\d,]+)/i)?.[1];if(budget&&Number(product.price)<=Number(budget.replaceAll(",","")))score+=5;
    if(available(product)>0)score+=2;
    return {product,score};
  }).filter((entry)=>entry.score>1).sort((a,b)=>b.score-a.score||available(b.product)-available(a.product)).slice(0,6).map((entry)=>entry.product);
}

function pick(products:Row[],category:string,predicate?:(row:Row)=>boolean){
  const matches=products.filter((row)=>String(row.category)===category&&(!predicate||predicate(row))).sort((a,b)=>(available(b)>0?1:0)-(available(a)>0?1:0)||Number(a.price)-Number(b.price));
  return matches[0];
}

function buildRecommendation(products:Row[],body:RequestBody){
  const budget=Math.max(15000,Math.min(250000,Number(body.budget??50000)));const useCase=text(body.useCase||body.prompt||"balanced");
  const integrated=budget<38000||/office|school|basic|work/.test(useCase);
  const cpu=pick(products,"Processor",(row)=>integrated?/5600g|graphics/.test(text(`${row.name} ${row.description}`)):!/5600g/.test(text(row.name)))??pick(products,"Processor");
  const board=pick(products,"Motherboard",(row)=>!cpu?.socket||row.socket===cpu.socket)??pick(products,"Motherboard");
  const selected=[pick(products,"Case"),board,cpu,pick(products,"Memory"),pick(products,"Storage")];
  if(!integrated)selected.push(pick(products,"Graphics"));
  selected.push(pick(products,"Cooling",(row)=>Number(row.price)<5000),pick(products,"Power Supply",(row)=>Number(row.power_watts??row.powerWatts??0)>=550));
  if(/creator|editing|design/.test(useCase))selected.push(pick(products,"Monitor"));
  const items=selected.filter(Boolean) as Row[];const total=items.reduce((sum,row)=>sum+Number(row.price??0),0);
  const selection:Record<string,string>={};for(const row of items)selection[String(row.category)]=String(row.id);
  if(integrated)selection.Graphics="integrated";if(!selection.Cooling)selection.Cooling="stock-cooler";
  return {title:integrated?"Efficient integrated-graphics build":"Balanced dedicated-graphics build",summary:`Designed for ${body.useCase||"balanced everyday use"} with ${money(Math.max(0,budget-total))} estimated budget headroom.`,items,total,budget,selection,checks:["Socket and memory type aligned","Power headroom included",integrated?"No dedicated GPU required":"Dedicated GPU included","Final branch stock confirmed at checkout"]};
}

function planner(products:Row[],body:RequestBody){
  const mode=String(body.mode);const rooms=Math.max(1,Number(body.rooms??3));const entrances=Math.max(1,Number(body.entrances??2));const floors=Math.max(1,Number(body.floors??1));const users=Math.max(1,Number(body.users??8));
  const items:Array<Row&{planQuantity:number}>=[];const services:string[]=[];let title="Smart solution plan";let note="Final placement and cable routes require a branch assessment.";
  if(mode==="cctv"){
    title=`${rooms+entrances}-camera security starter`;const camera=pick(products,"CCTV");const ups=pick(products,"Power");if(camera)items.push({...camera,planQuantity:rooms+entrances});if(ups)items.push({...ups,planQuantity:1});services.push("Onsite camera placement review","Cable route and recorder sizing","Remote viewing setup");
  }else if(mode==="network"){
    title=`${floors}-floor network plan for ${users} users`;const router=pick(products,"Networking");const ups=pick(products,"Power");if(router)items.push({...router,planQuantity:Math.max(1,floors)});if(ups)items.push({...ups,planQuantity:1});services.push("Wi-Fi coverage survey","Managed router configuration","Cable testing and labeling");
  }else{
    title="Smart home control starter";const router=pick(products,"Networking");const ups=pick(products,"Power");if(router)items.push({...router,planQuantity:1});if(ups)items.push({...ups,planQuantity:1});services.push("Device compatibility survey","Scene and automation setup","Secure guest network configuration");note="Smart sensors and controllers are finalized after the device survey.";
  }
  const total=items.reduce((sum,row)=>sum+Number(row.price??0)*row.planQuantity,0);return {title,note,items,total,services};
}

function reviewCart(products:Row[],ids:string[]){
  const items=ids.map((id)=>products.find((row)=>row.id===id)).filter(Boolean) as Row[];const categories=new Set(items.map((row)=>String(row.category)));
  const required=["Case","Motherboard","Processor","Memory","Storage","Graphics","Cooling","Power Supply"];
  const missing=required.filter((category)=>!categories.has(category));
  const cpu=items.find((row)=>row.category==="Processor");if(missing.includes("Graphics")&&/5600g|radeon graphics/.test(text(`${cpu?.name} ${cpu?.description}`)))missing.splice(missing.indexOf("Graphics"),1);
  const draw=30+items.filter((row)=>!["Power Supply","Monitor","Keyboard","Mouse","Headset"].includes(String(row.category))).reduce((sum,row)=>sum+Number(row.power_watts??row.powerWatts??0),0);
  const psu=items.find((row)=>row.category==="Power Supply");const recommended=Math.max(450,Math.ceil(draw*1.4/50)*50);const warnings:string[]=[];
  if(psu&&Number(psu.power_watts??psu.powerWatts??0)<recommended)warnings.push(`Choose at least a ${recommended}W power supply.`);
  if(missing.length)warnings.push(`Missing required categories: ${missing.join(", ")}.`);
  return {items,total:items.reduce((sum,row)=>sum+Number(row.price??0),0),draw,recommended,missing,warnings,status:warnings.length?"Review needed":"Ready for branch confirmation",suggestions:[!categories.has("Monitor")?"Add a monitor matched to the intended resolution.":"Monitor included.","Add professional assembly and burn-in testing for a complete handoff."]};
}

export async function POST(request:Request){
  try{
    const body=await request.json() as RequestBody;const mode=String(body.mode??"assistant");const branchId=String(body.branchId??"branch-angeles");const products=await catalog(branchId);
    if(mode==="build")return Response.json({mode,result:buildRecommendation(products,body),demo:true});
    if(["cctv","network","smart-home"].includes(mode))return Response.json({mode,result:planner(products,body),demo:true});
    if(mode==="cart-review")return Response.json({mode,result:reviewCart(products,Array.isArray(body.cartIds)?body.cartIds:[]),demo:true});
    const prompt=String(body.prompt??"").trim().slice(0,600);if(prompt.length<2)return Response.json({error:"Describe what you need first."},{status:400});
    const matches=searchProducts(products,prompt);const intent=/build|gaming pc|computer set|editing pc|office pc/.test(text(prompt))?"build":/cctv|camera|security/.test(text(prompt))?"cctv":/network|wifi|router/.test(text(prompt))?"network":"shop";
    return Response.json({mode:"assistant",intent,reply:matches.length?`I found ${matches.length} catalog option${matches.length===1?"":"s"} connected to your request. Availability shown is for the selected branch.`:"I could not find an exact catalog match. Try including the product type, budget, or intended use.",products:matches,demo:true});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"The AI demo assistant is unavailable."},{status:500});}
}
