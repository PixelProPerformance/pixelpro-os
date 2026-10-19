import { requireChatGPTUser } from "./chatgpt-auth";
import { access } from "./access";
import { env } from "@/lib/runtime";
import { Workspace } from "./workspace";
export const dynamic="force-dynamic";
export default async function Home(){
 await requireChatGPTUser("/");
 try{
 const a=await access();if(!a)return <main className="error-page"><h1>Acesso pendente</h1><p>O administrador da PixelPro precisa adicionar o seu e-mail e dar-lhe acesso a uma marca.</p></main>;
 const brandRows=await env.DB!.prepare(a.role==="client"?"SELECT b.id,b.name,b.color FROM brands b JOIN member_brands mb ON mb.brand_id=b.id WHERE mb.member_id=? ORDER BY b.created_at":"SELECT id,name,color FROM brands ORDER BY created_at").bind(...(a.role==="client"?[a.id]:[])).all();
 const postRows=await env.DB!.prepare(a.role==="client"?"SELECT p.id,p.brand_id AS brandId,p.title,p.caption,p.channels,p.scheduled_at AS scheduledAt,p.status,p.version,p.feedback,p.updated_at AS updatedAt FROM posts p JOIN member_brands mb ON mb.brand_id=p.brand_id WHERE mb.member_id=? AND p.status NOT IN ('draft','cancelled') ORDER BY COALESCE(p.scheduled_at,'9999'),p.created_at DESC":"SELECT id,brand_id AS brandId,title,caption,channels,scheduled_at AS scheduledAt,status,version,feedback,updated_at AS updatedAt FROM posts ORDER BY COALESCE(scheduled_at,'9999'),created_at DESC").bind(...(a.role==="client"?[a.id]:[])).all();
 const ideas=await env.DB!.prepare(a.role==="client"?"SELECT i.id,i.brand_id AS brandId,i.title,i.angle,i.format,i.status,i.created_at AS createdAt FROM ideas i JOIN member_brands mb ON mb.brand_id=i.brand_id WHERE mb.member_id=? ORDER BY i.created_at DESC":"SELECT id,brand_id AS brandId,title,angle,format,status,created_at AS createdAt FROM ideas ORDER BY created_at DESC").bind(...(a.role==="client"?[a.id]:[])).all();
 const templates=await env.DB!.prepare(a.role==="client"?"SELECT t.id,t.brand_id AS brandId,t.name,t.background,t.foreground,t.accent,t.font_family AS fontFamily FROM templates t JOIN member_brands mb ON mb.brand_id=t.brand_id WHERE mb.member_id=?":"SELECT id,brand_id AS brandId,name,background,foreground,accent,font_family AS fontFamily FROM templates").bind(...(a.role==="client"?[a.id]:[])).all();
 const activity=a.role!=="client"?await env.DB!.prepare("SELECT c.id,c.body,c.created_at AS createdAt,p.title,p.id AS postId,b.name AS brandName,m.name,m.email FROM comments c JOIN members m ON m.id=c.member_id JOIN posts p ON p.id=c.post_id JOIN brands b ON b.id=p.brand_id WHERE m.role='client' ORDER BY c.created_at DESC LIMIT 20").all():{results:[]};
 const members=a.role==="admin"?await env.DB!.prepare("SELECT m.id,m.email,m.name,m.role,group_concat(mb.brand_id) AS brandIds FROM members m LEFT JOIN member_brands mb ON mb.member_id=m.id GROUP BY m.id ORDER BY m.created_at").all():{results:[]};
 return <Workspace user={a.name} role={a.role} initialBrands={brandRows.results as never} initialPosts={postRows.results as never} initialIdeas={ideas.results as never} initialTemplates={templates.results as never} initialMembers={members.results as never} initialActivity={activity.results as never}/>;
 }catch{return <main className="error-page"><h1>O PixelPro OS está temporariamente indisponível.</h1><p>Tente atualizar a página dentro de alguns instantes.</p></main>}
}
