import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject} from '../packages/edm/src/index.mjs';
import {createStore} from '../packages/store/src/index.mjs';
import {createApi} from '../backend/api/server.mjs';
test('HTTP save, read, conflict and invalid input',async()=>{
 const server=createApi(createStore()); await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try {
 const url='http://127.0.0.1:'+server.address().port+'/api/projects';
 const p=createProject('Test');
 const put=(project,revision)=>fetch(url+'/'+p.id,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({project,revision})});
 assert.equal((await put(p,0)).status,200);
 assert.equal((await (await fetch(url+'/'+p.id)).json()).project.name,'Test');
 assert.equal((await put(p,0)).status,409);
 assert.equal((await put({...p,name:''},1)).status,400);
 assert.equal((await fetch(url)).status,200);
 } finally {await new Promise(r=>server.close(r))}
});
