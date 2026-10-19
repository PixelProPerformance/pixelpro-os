import {equal} from '@/lib/auth';
import {sqlite,env} from '@/lib/runtime';
export async function GET(req:Request){
 const expected=process.env.MIGRATION_TOKEN;
 if(!expected||!equal(req.headers.get('authorization')||'',`Bearer ${expected}`))return Response.json({error:'Sem permissão'},{status:403});
 const db=sqlite();const counts:Record<string,number>={};
 for(const table of ['brands','members','posts','templates','studio_documents','assets'])counts[table]=Number(db.prepare(`SELECT count(*) AS n FROM ${table}`).get()?.n);
 let readableAssets=0;for(const asset of db.prepare('SELECT object_key FROM assets').all()){const file=await env.BUCKET.get(String(asset.object_key));if(file?.body.length)readableAssets++}
 return Response.json({counts,readableAssets,imported:!!db.prepare("SELECT value FROM metadata WHERE key='sites_imported'").get()},{headers:{'Cache-Control':'no-store'}});
}
