import {scryptSync,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {sqlite} from './runtime';
export const token=()=>randomBytes(32).toString('base64url');
export const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
export function equal(a:string,b:string){return timingSafeEqual(Buffer.from(hash(a)),Buffer.from(hash(b)))}
export function passwordHash(password:string){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(password,salt,64).toString('hex')}
export function passwordOK(password:string,stored:string){try{const [salt,value]=stored.split(':');return timingSafeEqual(Buffer.from(value,'hex'),scryptSync(password,salt,64))}catch{return false}}
export function limited(key:string){const db=sqlite(),now=Date.now();db.prepare('DELETE FROM auth_attempts WHERE expires_at<?').run(now);db.prepare('INSERT INTO auth_attempts VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(hash(key),now+900000);const row=db.prepare('SELECT count FROM auth_attempts WHERE key=?').get(hash(key));return Number(row?.count)>12}
export function newSession(memberId:string){const t=token();sqlite().prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());sqlite().prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(t),memberId,Date.now()+7*86400000);return t}
export function sessionCookie(t:string){return `pixelpro_session=${t}; HttpOnly; Path=/; SameSite=Strict; Max-Age=604800${process.env.NODE_ENV==='production'?'; Secure':''}`}
