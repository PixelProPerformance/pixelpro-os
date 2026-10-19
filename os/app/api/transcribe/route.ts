import { access,canEdit,denied } from '../../access';
import { env } from '@/lib/runtime';
import { transcribe } from '../../../server/transcribe.mjs';
export async function POST(req:Request){const a=await access();if(!a||!canEdit(a))return denied();return transcribe(req,(env as unknown as Record<string,string>).OPENAI_API_KEY)}
