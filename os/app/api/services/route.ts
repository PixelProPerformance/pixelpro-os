import { access,denied } from '../../access';
import { env } from '@/lib/runtime';
export async function GET(){if(!await access())return denied();return Response.json({ai:Boolean((env as unknown as Record<string,string>).OPENAI_API_KEY),transcription:Boolean((env as unknown as Record<string,string>).OPENAI_API_KEY),social:false,checkedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}})}
