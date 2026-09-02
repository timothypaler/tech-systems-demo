import { runtimeEnv as env } from "@/lib/runtime-env";
import { createCustomerSession, destroyCustomerSession, getCustomer, newCustomerPassword, verifyCustomerPassword } from "@/lib/customer-auth";

const validPassword=(value:string)=>value.length>=8&&/[A-Za-z]/.test(value)&&/\d/.test(value);
const cleanEmail=(value:unknown)=>String(value??"").trim().toLowerCase();

export async function GET(request:Request){return Response.json({customer:await getCustomer(request)});}

export async function POST(request:Request){
  try{
    const body=await request.json() as {mode?:string;email?:string;password?:string;name?:string;phone?:string};
    const email=cleanEmail(body.email);const password=String(body.password??"");
    if(!/^\S+@\S+\.\S+$/.test(email)||!password)return Response.json({error:"Enter a valid email and password."},{status:400});
    if(body.mode==="register"){
      const name=String(body.name??"").trim();const phone=String(body.phone??"").trim();
      if(!name||!phone)return Response.json({error:"Name and mobile number are required."},{status:400});
      if(!validPassword(password))return Response.json({error:"Password needs at least 8 characters with a letter and number."},{status:400});
      const {salt,hash}=newCustomerPassword(password);const id=crypto.randomUUID();
      await env.DB.prepare("INSERT INTO customer_accounts (id,email,name,phone,password_hash,password_salt) VALUES (?,?,?,?,?,?)").bind(id,email,name,phone,await hash,salt).run();
      await env.DB.prepare("INSERT OR IGNORE INTO customers (id,name,email,phone) VALUES (?,?,?,?)").bind(id,name,email,phone).run();
      return Response.json({ok:true,customer:{id,email,name,phone,addresses:[]}},{status:201,headers:{"set-cookie":await createCustomerSession(id)}});
    }
    const row=await env.DB.prepare("SELECT id,email,name,phone,password_hash,password_salt,active FROM customer_accounts WHERE email=?").bind(email).first<{id:string;email:string;name:string;phone:string;password_hash:string;password_salt:string;active:number}>();
    if(!row||!row.active||!await verifyCustomerPassword(password,row.password_salt,row.password_hash))return Response.json({error:"Email or password is incorrect."},{status:401});
    return Response.json({ok:true,customer:{id:row.id,email:row.email,name:row.name,phone:row.phone}},{headers:{"set-cookie":await createCustomerSession(row.id)}});
  }catch(error){const message=error instanceof Error?error.message:"Sign-in unavailable";return Response.json({error:message.includes("UNIQUE")?"An account already exists for that email.":message},{status:500});}
}

export async function PATCH(request:Request){
  const customer=await getCustomer(request);if(!customer)return Response.json({error:"Customer sign-in required."},{status:401});
  try{const body=await request.json() as {name?:string;phone?:string;addresses?:string[]};const name=String(body.name??customer.name).trim();const phone=String(body.phone??customer.phone).trim();const addresses=(body.addresses??customer.addresses).map(String).map((item)=>item.trim()).filter(Boolean).slice(0,5);if(!name||!phone)return Response.json({error:"Name and phone are required."},{status:400});await env.DB.prepare("UPDATE customer_accounts SET name=?,phone=?,addresses_json=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(name,phone,JSON.stringify(addresses),customer.id).run();return Response.json({ok:true,customer:{...customer,name,phone,addresses}});}catch(error){return Response.json({error:error instanceof Error?error.message:"Profile update failed"},{status:500});}
}

export async function DELETE(request:Request){return Response.json({ok:true},{headers:{"set-cookie":await destroyCustomerSession(request)}});}
