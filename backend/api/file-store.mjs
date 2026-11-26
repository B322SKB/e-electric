import {mkdir,readFile,writeFile,rename,readdir,rm} from 'node:fs/promises';import {join} from 'node:path';import {randomUUID} from 'node:crypto';import {validateProject} from '../../packages/edm/src/index.mjs';
export function fileStore(dir){
 let queue=Promise.resolve();
 const path=id=>{if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Invalid ID');return join(dir,id+'.json')};
 async function get(id){try{return JSON.parse(await readFile(path(id),'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}}
 return {get,async list(){await mkdir(dir,{recursive:true});const names=await readdir(dir);const records=await Promise.all(names.filter(n=>/^[0-9a-f-]{36}\.json$/i.test(n)).map(n=>get(n.slice(0,-5))));return records.filter(Boolean).map(r=>({id:r.project.id,name:r.project.name,revision:r.revision}))},
 save(project,revision){const snapshot=structuredClone(project);const job=queue.then(async()=>{const errors=validateProject(snapshot);if(errors.length)throw new Error(errors.join('; '));await mkdir(dir,{recursive:true});const old=await get(snapshot.id);if(revision!==(old?.revision??0))throw new Error('Revision conflict');const record={project:snapshot,revision:revision+1};const temp=join(dir,randomUUID()+'.tmp');try{await writeFile(temp,JSON.stringify(record),{flag:'wx'});await rename(temp,path(snapshot.id))}finally{await rm(temp,{force:true})}return record});queue=job.catch(()=>{});return job}};
}
