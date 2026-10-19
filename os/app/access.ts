import "server-only";
import { env } from "@/lib/runtime";
import { getChatGPTUser } from "./chatgpt-auth";
export type Role="admin"|"collaborator"|"client";
export type Access={id:string;email:string;userId:string;role:Role;name:string;brandIds:string[]};
export async function access():Promise<Access|null>{
 const user=await getChatGPTUser();if(!user||!env.DB)return null;
 const email=user.email.trim().toLowerCase();
 let row=await env.DB.prepare("SELECT id,email,user_id AS userId,role,name FROM members WHERE user_id=? OR email=? LIMIT 1").bind(user.userId,email).first<{id:string;email:string;userId:string|null;role:Role;name:string|null}>();
 if(!row){
  const count=await env.DB.prepare("SELECT count(*) AS n FROM members").first<{n:number}>();
  if(count?.n===0){
   const previous=await env.DB.prepare("SELECT owner_id AS ownerId FROM brands LIMIT 1").first<{ownerId:string}>();
   if(!previous||previous.ownerId===user.userId){const id=crypto.randomUUID();await env.DB.prepare("INSERT OR IGNORE INTO members(id,email,user_id,name,role,created_at) VALUES(?,?,?,?,?,?)").bind(id,email,user.userId,user.displayName,"admin",Date.now()).run();}
  }
  row=await env.DB.prepare("SELECT id,email,user_id AS userId,role,name FROM members WHERE user_id=? OR email=? LIMIT 1").bind(user.userId,email).first<{id:string;email:string;userId:string|null;role:Role;name:string|null}>();
 }
 if(!row)return null;
 if(row.userId&&row.userId!==user.userId)return null;
 if(!row.userId)await env.DB.prepare("UPDATE members SET user_id=?,name=? WHERE id=? AND user_id IS NULL").bind(user.userId,user.displayName,row.id).run();
 const assigned=row.role==="client"?await env.DB.prepare("SELECT brand_id AS brandId FROM member_brands WHERE member_id=?").bind(row.id).all<{brandId:string}>():{results:[]};
 return {id:row.id,email,userId:user.userId,name:row.name||user.displayName,role:row.role,brandIds:assigned.results.map(x=>x.brandId)};
}
export function canView(a:Access,brandId:string){return a.role!=="client"||a.brandIds.includes(brandId)}
export function canEdit(a:Access){return a.role==="admin"||a.role==="collaborator"}
export function denied(message="Sem permissão",status=403){return Response.json({error:message},{status})}
