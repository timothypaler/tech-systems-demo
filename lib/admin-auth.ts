import { runtimeEnv as env } from "@/lib/runtime-env";

export type AdminUser={id:string;username:string;displayName:string;role:string;active:number;mustChangePassword:number};
const cookieName="pclogic_admin_session";
const encoder=new TextEncoder();

const bytesToHex=(bytes:ArrayBuffer|Uint8Array)=>Array.from(bytes instanceof Uint8Array?bytes:new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,"0")).join("");
const randomHex=(length=24)=>{const bytes=new Uint8Array(length);crypto.getRandomValues(bytes);return bytesToHex(bytes);};
const sha256=async(value:string)=>bytesToHex(await crypto.subtle.digest("SHA-256",encoder.encode(value)));

export async function hashPassword(password:string,salt:string){
  const material=await crypto.subtle.importKey("raw",encoder.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:encoder.encode(salt),iterations:100000},material,256);
  return bytesToHex(bits);
}

export function newPasswordRecord(password:string){const salt=randomHex(16);return {salt,hash:hashPassword(password,salt)};}

function readCookie(request:Request){
  const cookie=request.headers.get("cookie")??"";
  return cookie.split(";").map((part)=>part.trim()).find((part)=>part.startsWith(`${cookieName}=`))?.slice(cookieName.length+1)??"";
}

export async function getAdminUser(request:Request):Promise<AdminUser|null>{
  const token=readCookie(request);if(!token)return null;
  const tokenHash=await sha256(token);
  return await env.DB.prepare(`SELECT u.id,u.username,u.display_name AS displayName,u.role,u.active,u.must_change_password AS mustChangePassword
    FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id
    WHERE s.token_hash=? AND u.active=1 AND datetime(s.expires_at)>datetime('now')`).bind(tokenHash).first<AdminUser>();
}

export async function requireAdmin(request:Request,roles?:string[]){
  const user=await getAdminUser(request);
  if(!user||roles&&!roles.includes(user.role))return null;
  return user;
}

export function unauthorized(){return Response.json({error:"Admin sign-in required."},{status:401});}
export function forbidden(){return Response.json({error:"You do not have permission for that action."},{status:403});}

export async function createAdminSession(userId:string){
  const token=randomHex(32);const tokenHash=await sha256(token);const expires=new Date(Date.now()+8*60*60*1000);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM admin_sessions WHERE datetime(expires_at)<=datetime('now')"),
    env.DB.prepare("INSERT INTO admin_sessions (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)").bind(crypto.randomUUID(),userId,tokenHash,expires.toISOString()),
  ]);
  return `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${8*60*60}`;
}

export async function destroyAdminSession(request:Request){
  const token=readCookie(request);if(token)await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash=?").bind(await sha256(token)).run();
  return `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function ensureBootstrapAdmin(username:string,password:string){
  const count=await env.DB.prepare("SELECT COUNT(*) AS count FROM admin_users").first<{count:number}>();
  if(Number(count?.count??0)>0)return;
  const runtime=env as unknown as Record<string,string|undefined>;
  if(username!==runtime.ADMIN_BOOTSTRAP_USERNAME||password!==runtime.ADMIN_BOOTSTRAP_PASSWORD)return;
  const {salt,hash}=newPasswordRecord(password);const passwordHash=await hash;
  await env.DB.prepare("INSERT OR IGNORE INTO admin_users (id,username,display_name,password_hash,password_salt,role,active,must_change_password) VALUES (?,?,?,?,?,'owner',1,1)")
    .bind(crypto.randomUUID(),username,"Store Owner",passwordHash,salt).run();
}

export async function verifyPassword(password:string,salt:string,expected:string){
  const actual=await hashPassword(password,salt);if(actual.length!==expected.length)return false;
  let mismatch=0;for(let index=0;index<actual.length;index++)mismatch|=actual.charCodeAt(index)^expected.charCodeAt(index);
  return mismatch===0;
}

export async function audit(user:AdminUser,action:string,details=""){
  await env.DB.prepare("INSERT INTO admin_audit_logs (id,user_id,username,action,details) VALUES (?,?,?,?,?)")
    .bind(crypto.randomUUID(),user.id,user.username,action,details.slice(0,500)).run();
}
