import {createServer} from 'node:http';
import {validateProject} from '../../packages/edm/src/index.mjs';
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createApi(store){
 return createServer(async(req,res)=>{
 const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data))};
 try {
 const path=new URL(req.url,'http://localhost').pathname;
 if(req.method==='GET'&&path==='/health')return send(200,{status:'ok'});
 if(req.method==='GET'&&path==='/api/projects')return send(200,await store.list());
 const id=path.match(/^\/api\/projects\/([^/]+)$/)?.[1];
 if(!id||!idPattern.test(id))return send(404,{error:'Not found'});
 if(req.method==='GET'){const record=await store.get(id);return send(record?200:404,record??{error:'Not found'})}
 if(req.method!=='PUT')return send(405,{error:'Method not allowed'});
 let body='',bytes=0;
 for await(const chunk of req){bytes+=chunk.length;if(bytes>2_000_000){send(413,{error:'Payload too large'});return}body+=chunk.toString('utf8')}
 let input;try{input=JSON.parse(body)}catch{return send(400,{error:'Invalid JSON'})}
 if(!input||input.project?.id!==id||!Number.isSafeInteger(input.revision)||input.revision<0)return send(400,{error:'Invalid project or revision'});
 const errors=validateProject(input.project);if(errors.length)return send(400,{errors});
 try{return send(200,await store.save(input.project,input.revision))}catch(e){if(e.message==='Revision conflict')return send(409,{error:'Revision conflict'});throw e}
 }catch{return send(500,{error:'Internal error'})}
 });
}
