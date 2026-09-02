import { runtimeEnv as env } from "@/lib/runtime-env";

export type CustomerIdentity={id:string;email:string;name:string;phone:string;addresses:string[]};
const cookieName="pclogic_customer_session";
const encoder=new TextEncoder();
const hex=(bytes:ArrayBuffer|Uint8Array)=>Array.from(bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,"0")).join("");
const randomHex=(length=24)=>{const bytes=new Uint8Array(length);crypto.getRandomValues(bytes);return hex(bytes);};
const sha256=async(value:string)=>hex(await crypto.subtle.digest("SHA-256",encoder.encode(value)));

function cookie(request:Request){return (request.headers.get("cookie")??"").split(";").map((part)=>part.trim()).find((part)=>part.startsWith(`${cookieName}=`))?.slice(cookieName.length+1)??"";}

export async function hashCustomerPassword(password:string,salt:string){
  const key=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:encoder.encode(salt),iterations:100000},key,256));
}

export function newCustomerPassword(password:string){const salt=randomHex(16);return {salt,hash:hashCustomerPassword(password,salt)};}

export async function verifyCustomerPassword(password:string,salt:string,expected:string){
  const actual=await hashCustomerPassword(password,salt);if(actual.length!==expected.length)return false;
  let mismatch=0;for(let index=0;index<actual.length;index++)mismatch|=actual.charCodeAt(index)^expected.charCodeAt(index);
  return mismatch===0;
}

export async function getCustomer(request:Request):Promise<CustomerIdentity|null>{
  const token=cookie(request);if(!token)return null;
  const row=await env.DB.prepare(`SELECT a.id,a.email,a.name,a.phone,a.addresses_json
    FROM customer_sessions s JOIN customer_accounts a ON a.id=s.customer_id
    WHERE s.token_hash=? AND a.active=1 AND datetime(s.expires_at)>datetime('now')`).bind(await sha256(token)).first<{id:string;email:string;name:string;phone:string;addresses_json:string}>();
  if(!row)return null;let addresses:string[]=[];try{addresses=JSON.parse(row.addresses_json) as string[];}catch{}
  return {id:row.id,email:row.email,name:row.name,phone:row.phone,addresses};
}

export async function createCustomerSession(customerId:string){
  const token=randomHex(32);const expires=new Date(Date.now()+30*24*60*60*1000);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM customer_sessions WHERE datetime(expires_at)<=datetime('now')"),
    env.DB.prepare("INSERT INTO customer_sessions (id,customer_id,token_hash,expires_at) VALUES (?,?,?,?)").bind(crypto.randomUUID(),customerId,await sha256(token),expires.toISOString()),
  ]);
  return `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30*24*60*60}`;
}

export async function destroyCustomerSession(request:Request){const token=cookie(request);if(token)await env.DB.prepare("DELETE FROM customer_sessions WHERE token_hash=?").bind(await sha256(token)).run();return `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;}

export function customerUnauthorized(){return Response.json({error:"Customer sign-in required."},{status:401});}
