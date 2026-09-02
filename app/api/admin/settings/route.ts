import { runtimeEnv as env } from "@/lib/runtime-env";
import { audit, forbidden, newPasswordRecord, requireAdmin, unauthorized, verifyPassword } from "@/lib/admin-auth";

const defaults={businessName:"TECH SYSTEMS",supportEmail:"hello@techsystems.example",supportPhone:"Contact withheld for demo",defaultBranch:"branch-angeles",currency:"PHP",autoSyncSeconds:"15",lowStockThreshold:"3"};
const validSettingKeys=new Set(Object.keys(defaults));
const validRoles=new Set(["owner","admin","staff"]);
const validUsername=(value:string)=>/^[a-z0-9._-]{3,32}$/.test(value);
const validPassword=(value:string)=>value.length>=10&&/[A-Z]/.test(value)&&/[a-z]/.test(value)&&/\d/.test(value);

export async function GET(request:Request){
  const user=await requireAdmin(request);if(!user)return unauthorized();
  try{
    const settingsResult=await env.DB.prepare("SELECT key,value,updated_at FROM store_settings").all<{key:string;value:string;updated_at:string}>();
    const settings={...defaults,...Object.fromEntries(settingsResult.results.map((row)=>[row.key,row.value]))};
    const canManageUsers=["owner","admin"].includes(user.role);
    const users=canManageUsers?(await env.DB.prepare("SELECT id,username,display_name,role,active,must_change_password,last_login_at,created_at FROM admin_users ORDER BY active DESC,role,username").all()).results:[];
    const audits=canManageUsers?(await env.DB.prepare("SELECT username,action,details,created_at FROM admin_audit_logs ORDER BY created_at DESC LIMIT 40").all()).results:[];
    return Response.json({user,settings,users,audits,canManageUsers});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Settings unavailable"},{status:500});}
}

export async function POST(request:Request){
  const user=await requireAdmin(request,["owner","admin"]);if(!user)return forbidden();
  try{
    const body=await request.json() as {username?:string;displayName?:string;password?:string;role?:string};
    const username=String(body.username??"").trim().toLowerCase();const displayName=String(body.displayName??"").trim();const password=String(body.password??"");let role=String(body.role??"staff");
    if(user.role!=="owner"&&role!=="staff")role="staff";
    if(!validUsername(username))return Response.json({error:"Username must be 3–32 characters using letters, numbers, dots, dashes or underscores."},{status:400});
    if(!displayName)return Response.json({error:"Enter the user’s display name."},{status:400});
    if(!validPassword(password))return Response.json({error:"Temporary password needs 10+ characters with upper, lower and a number."},{status:400});
    if(!validRoles.has(role))return Response.json({error:"Choose a valid role."},{status:400});
    const {salt,hash}=newPasswordRecord(password);const passwordHash=await hash;
    await env.DB.prepare("INSERT INTO admin_users (id,username,display_name,password_hash,password_salt,role,active,must_change_password) VALUES (?,?,?,?,?,?,1,1)")
      .bind(crypto.randomUUID(),username,displayName,passwordHash,salt,role).run();
    await audit(user,"user_created",`${username} added as ${role}`);return Response.json({ok:true});
  }catch(error){const message=error instanceof Error?error.message:"User could not be added";return Response.json({error:message.includes("UNIQUE")?"That username is already in use.":message},{status:500});}
}

export async function PATCH(request:Request){
  const user=await requireAdmin(request);if(!user)return unauthorized();
  try{
    const body=await request.json() as {action?:string;username?:string;displayName?:string;currentPassword?:string;newPassword?:string;settings?:Record<string,string>;userId?:string;role?:string;active?:boolean};
    if(body.action==="profile"){
      const username=String(body.username??"").trim().toLowerCase();const displayName=String(body.displayName??"").trim();
      if(!validUsername(username)||!displayName)return Response.json({error:"Enter a valid username and display name."},{status:400});
      await env.DB.prepare("UPDATE admin_users SET username=?,display_name=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(username,displayName,user.id).run();
      await audit({...user,username},"profile_updated","Username or display name updated");return Response.json({ok:true});
    }
    if(body.action==="password"){
      const current=String(body.currentPassword??"");const next=String(body.newPassword??"");
      if(!validPassword(next))return Response.json({error:"New password needs 10+ characters with upper, lower and a number."},{status:400});
      const record=await env.DB.prepare("SELECT password_hash,password_salt FROM admin_users WHERE id=?").bind(user.id).first<{password_hash:string;password_salt:string}>();
      if(!record||!await verifyPassword(current,record.password_salt,record.password_hash))return Response.json({error:"Current password is incorrect."},{status:400});
      const {salt,hash}=newPasswordRecord(next);await env.DB.batch([
        env.DB.prepare("UPDATE admin_users SET password_hash=?,password_salt=?,must_change_password=0,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(await hash,salt,user.id),
        env.DB.prepare("DELETE FROM admin_sessions WHERE user_id=?").bind(user.id),
      ]);await audit(user,"password_changed","Password changed and sessions cleared");return Response.json({ok:true,reauthenticate:true});
    }
    if(body.action==="settings"){
      if(!["owner","admin"].includes(user.role))return forbidden();const entries=Object.entries(body.settings??{}).filter(([key])=>validSettingKeys.has(key));
      if(!entries.length)return Response.json({error:"No valid settings were supplied."},{status:400});
      await env.DB.batch(entries.map(([key,value])=>env.DB.prepare("INSERT INTO store_settings (key,value,updated_by,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP").bind(key,String(value).slice(0,200),user.id)));
      await audit(user,"settings_updated",entries.map(([key])=>key).join(", "));return Response.json({ok:true});
    }
    if(body.action==="user_access"){
      if(!["owner","admin"].includes(user.role))return forbidden();if(!body.userId||body.userId===user.id)return Response.json({error:"You cannot change your own access here."},{status:400});
      const target=await env.DB.prepare("SELECT username,role FROM admin_users WHERE id=?").bind(body.userId).first<{username:string;role:string}>();if(!target)return Response.json({error:"User not found."},{status:404});
      if(target.role==="owner"&&user.role!=="owner")return forbidden();let role=String(body.role??target.role);if(!validRoles.has(role))role=target.role;if(user.role!=="owner"&&role!=="staff")role=target.role;
      await env.DB.batch([
        env.DB.prepare("UPDATE admin_users SET role=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(role,body.active===false?0:1,body.userId),
        ...(body.active===false?[env.DB.prepare("DELETE FROM admin_sessions WHERE user_id=?").bind(body.userId)]:[]),
      ]);await audit(user,"user_access_updated",`${target.username}: ${role}, ${body.active===false?"inactive":"active"}`);return Response.json({ok:true});
    }
    if(body.action==="reset_password"){
      if(!["owner","admin"].includes(user.role)||!body.userId)return forbidden();const next=String(body.newPassword??"");
      if(!validPassword(next))return Response.json({error:"Temporary password needs 10+ characters with upper, lower and a number."},{status:400});
      const target=await env.DB.prepare("SELECT username,role FROM admin_users WHERE id=?").bind(body.userId).first<{username:string;role:string}>();if(!target)return Response.json({error:"User not found."},{status:404});if(target.role==="owner"&&user.role!=="owner")return forbidden();
      const {salt,hash}=newPasswordRecord(next);await env.DB.batch([
        env.DB.prepare("UPDATE admin_users SET password_hash=?,password_salt=?,must_change_password=1,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(await hash,salt,body.userId),
        env.DB.prepare("DELETE FROM admin_sessions WHERE user_id=?").bind(body.userId),
      ]);await audit(user,"password_reset",`${target.username} received a temporary password`);return Response.json({ok:true});
    }
    return Response.json({error:"Unknown settings action."},{status:400});
  }catch(error){const message=error instanceof Error?error.message:"Settings update failed";return Response.json({error:message.includes("UNIQUE")?"That username is already in use.":message},{status:500});}
}
