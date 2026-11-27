import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject} from '../packages/edm/src/index.mjs';
import {createStore} from '../packages/store/src/index.mjs';
import {createApi} from '../backend/api/server.mjs';

const token='e-electric-test-token-0123456789abcdef';

test('shared API token protects project reads and writes while health and editor remain public',async()=>{
 assert.throws(()=>createApi(createStore(),{apiToken:'too-short'}),/at least 32 characters/);
 const server=createApi(createStore(),{apiToken:token});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  const project=createProject('Protected');
  const endpoint=base+'/api/projects/'+project.id;
  const put=(authorization)=>fetch(endpoint,{method:'PUT',headers:{'content-type':'application/json',...(authorization?{authorization}:{})},body:JSON.stringify({project,revision:0})});
  for(const response of [await fetch(base+'/api/projects'),await fetch(endpoint),await put(),await fetch(base+'/api/projects',{headers:{authorization:'Bearer wrong-token'}})]){
   assert.equal(response.status,401);
   assert.equal(response.headers.get('www-authenticate'),'Bearer');
  }
  assert.equal((await fetch(base+'/health')).status,200);
  assert.equal((await fetch(base+'/')).status,200);
  assert.equal((await put('Bearer '+token)).status,200);
  const read=await fetch(endpoint,{headers:{authorization:'Bearer '+token}});
  assert.equal((await read.json()).project.name,'Protected');
 }finally{await new Promise(resolve=>server.close(resolve))}
});
