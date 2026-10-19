import {cookies} from 'next/headers';import {sqlite} from '@/lib/runtime';import {hash} from '@/lib/auth';
export async function POST(){const t=(await cookies()).get('pixelpro_session')?.value;if(t)sqlite().prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(t));return Response.json({ok:true},{headers:{'Set-Cookie':'pixelpro_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0'}})}
