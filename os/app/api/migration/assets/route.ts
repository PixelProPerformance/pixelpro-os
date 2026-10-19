import {equal} from '@/lib/auth';import {uploadAsset} from '@/lib/upload';
export async function POST(req:Request){const expected=process.env.MIGRATION_TOKEN;if(!expected||!equal(req.headers.get('authorization')||'',`Bearer ${expected}`))return Response.json({error:'Sem permissão'},{status:403});return uploadAsset(req)}
