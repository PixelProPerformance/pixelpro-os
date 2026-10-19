import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import path from 'node:path';
import {env,sqlite} from '../lib/runtime.ts';
test('SQLite rows cross the React Server Component boundary as plain objects',async()=>{
 const dir=mkdtempSync(path.join(process.cwd(),'.runtime-test-'));process.env.DATA_DIR=dir;
 try{
  const row=await env.DB.prepare('SELECT ? AS name').bind('Cliente').first();
  assert.equal(Object.getPrototypeOf(row),Object.prototype);
  assert.deepEqual(row,{name:'Cliente'});
  const rows=await env.DB.prepare('SELECT 1 AS id UNION ALL SELECT 2 AS id').all();
  assert.deepEqual(rows.results,[{id:1},{id:2}]);
  for(const item of rows.results)assert.equal(Object.getPrototypeOf(item),Object.prototype);
  assert.equal(await env.DB.prepare('SELECT 1 WHERE 0').first(),null);
 }finally{sqlite().close();rmSync(dir,{recursive:true,force:true})}
});
