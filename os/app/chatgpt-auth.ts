import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {sqlite} from '@/lib/runtime';
import {hash} from '@/lib/auth';
export type ChatGPTUser={userId:string;displayName:string;email:string;fullName:string|null};
export async function getChatGPTUser():Promise<ChatGPTUser|null>{const t=(await cookies()).get('pixelpro_session')?.value;if(!t)return null;const row=sqlite().prepare('SELECT m.id,m.user_id,m.email,m.name FROM sessions s JOIN members m ON m.id=s.member_id WHERE s.token_hash=? AND s.expires_at>?').get(hash(t),Date.now());if(!row)return null;return {userId:String(row.user_id||row.id),email:String(row.email),displayName:String(row.name||row.email),fullName:String(row.name||'')}}
export async function requireChatGPTUser(_returnTo:string){const u=await getChatGPTUser();if(!u)redirect('/login');return u}
export function chatGPTSignInPath(){return '/login'}
