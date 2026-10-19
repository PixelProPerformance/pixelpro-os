import {copyFile,mkdir} from 'node:fs/promises';
await mkdir('public/tools/conversor',{recursive:true});
await copyFile('node_modules/@imagemagick/magick-wasm/dist/x86/magick.wasm','public/tools/conversor/magick.wasm');
await copyFile('node_modules/@pbk20191/icodec/dist/heic-enc.wasm','public/tools/conversor/heic-enc.wasm');
