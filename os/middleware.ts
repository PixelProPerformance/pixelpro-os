import {NextRequest,NextResponse} from 'next/server';
export function middleware(req:NextRequest){if(['POST','PUT','PATCH','DELETE'].includes(req.method)){const origin=req.headers.get('origin');if(origin&&origin!==(process.env.APP_URL||req.nextUrl.origin))return NextResponse.json({error:'Origem não permitida'},{status:403})}return NextResponse.next()}
export const config={matcher:'/api/:path*'};
