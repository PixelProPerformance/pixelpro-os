export const MAX_BYTES=20*1024*1024;
export const missingService='O serviço de transcrição no servidor ainda não foi ativado. Configure a chave do serviço para continuar.';
const languageCodes={portuguese:'pt',english:'en',spanish:'es',french:'fr'};
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function transcribe(request,key,send=fetch){
 if(!key)return json({error:missingService},503);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Origem não permitida.'},403);
 const length=Number(request.headers.get('content-length')||0);if(length>MAX_BYTES+65536)return json({error:'Envie um arquivo de até 20 MB.'},413);
 try{
  const input=await request.formData(),file=input.get('file');
  if(!file||typeof file==='string'||!file.size)return json({error:'Selecione um arquivo de vídeo ou áudio.'},400);
  if(file.size>MAX_BYTES)return json({error:'Envie um arquivo de até 20 MB. Para vídeos maiores, envie apenas o áudio comprimido.'},413);
  if(!/\.(mp3|mp4|mpeg|mpga|m4a|wav|webm|ogg|flac)$/i.test(file.name))return json({error:'Formato não aceito. Use MP4, WEBM, MP3, M4A, WAV, OGG ou FLAC.'},400);
  const body=new FormData();body.set('file',file,file.name);body.set('model','whisper-1');body.set('response_format','verbose_json');body.append('timestamp_granularities[]','segment');
  const language=input.get('language');if(languageCodes[language])body.set('language',languageCodes[language]);
  const response=await send('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:'Bearer '+key},body,signal:AbortSignal.timeout(180000)});
  if(!response.ok){const error= response.status===401?'A chave do serviço de transcrição precisa ser corrigida.':response.status===429?'O serviço atingiu o limite ou está sem saldo. Verifique a conta de transcrição.':response.status===400?'O serviço não conseguiu ler este arquivo. Tente enviar o áudio em MP3 ou WAV.':'O serviço de transcrição está indisponível. Tente novamente.';return json({error},response.status===400?400:502)}
  const result=await response.json();return json({text:result.text||'',duration:result.duration||0,chunks:(result.segments||[]).map(s=>({text:s.text,timestamp:[s.start,s.end]}))});
 }catch(e){return json({error:e.name==='TimeoutError'?'A transcrição excedeu o tempo de espera. Tente um arquivo menor.':'Não foi possível concluir a transcrição. Confira o arquivo e tente novamente.'},502)}
}
