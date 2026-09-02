import { runtimeEnv as env } from "@/lib/runtime-env";
import { createAdminSession, destroyAdminSession, ensureBootstrapAdmin, getAdminUser, verifyPassword } from "@/lib/admin-auth";

export async function GET(request:Request){
  try{const user=await getAdminUser(request);return user?Response.json({authenticated:true,user}):Response.json({authenticated:false},{status:401});}
  catch{return Response.json({authenticated:false},{status:401});}
}

export async function POST(request:Request){
  try{
    const body=await request.json() as {username?:string;password?:string};const username=String(body.username??"").trim().toLowerCase();const password=String(body.password??"");
    if(!username||!password)return Response.json({error:"Enter your username and password."},{status:400});
    await ensureBootstrapAdmin(username,password);
    const user=await env.DB.prepare("SELECT id,username,display_name,password_hash,password_salt,role,active,must_change_password FROM admin_users WHERE lower(username)=?")
      .bind(username).first<{id:string;username:string;display_name:string;password_hash:string;password_salt:string;role:string;active:number;must_change_password:number}>();
    if(!user||!user.active||!await verifyPassword(password,user.password_salt,user.password_hash))return Response.json({error:"Incorrect username or password."},{status:401});
    const cookie=await createAdminSession(user.id);
    await env.DB.batch([
      env.DB.prepare("UPDATE admin_users SET last_login_at=CURRENT_TIMESTAMP WHERE id=?").bind(user.id),
      env.DB.prepare("INSERT INTO admin_audit_logs (id,user_id,username,action,details) VALUES (?,?,?,'login','Admin signed in')").bind(crypto.randomUUID(),user.id,user.username),
    ]);
    return Response.json({authenticated:true,user:{id:user.id,username:user.username,displayName:user.display_name,role:user.role,active:user.active,mustChangePassword:user.must_change_password}},{headers:{"set-cookie":cookie}});
  }catch(error){console.error("Admin sign-in failed",error);return Response.json({error:"Sign-in is temporarily unavailable. Please try again."},{status:500});}
}

export async function DELETE(request:Request){
  const user=await getAdminUser(request);const cookie=await destroyAdminSession(request);
  if(user)await env.DB.prepare("INSERT INTO admin_audit_logs (id,user_id,username,action,details) VALUES (?,?,?,'logout','Admin signed out')").bind(crypto.randomUUID(),user.id,user.username).run();
  return Response.json({ok:true},{headers:{"set-cookie":cookie}});
}
