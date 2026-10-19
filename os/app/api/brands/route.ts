import { access,denied } from "../../access";
import { env } from "@/lib/runtime";
export async function POST(req:Request){const a=await access();if(!a||a.role!=="admin")return denied();const b=await req.json().catch(()=>null) as {name?:string}|null;const name=b?.name?.trim();if(!name||name.length>80)return denied("Nome inválido",400);const brand={id:crypto.randomUUID(),name,color:"#7c5cff"};await env.DB!.prepare("INSERT INTO brands(id,owner_id,name,color,created_at) VALUES(?,?,?,?,?)").bind(brand.id,a.userId,name,brand.color,Date.now()).run();return Response.json(brand,{status:201})}
