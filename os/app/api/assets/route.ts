import {access,canEdit,denied} from '../../access';import {uploadAsset} from '@/lib/upload';
export async function POST(req:Request){const a=await access();if(!a||!canEdit(a))return denied();return uploadAsset(req)}
