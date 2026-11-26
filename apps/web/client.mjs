export function createClient(base=''){
 async function request(path,options){const r=await fetch(base+path,options);if(!r.ok)throw new Error('Server request failed: '+r.status);return r.json()}
 return {list:()=>request('/api/projects'),open:id=>request('/api/projects/'+encodeURIComponent(id)),save:(project,revision)=>request('/api/projects/'+encodeURIComponent(project.id),{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({project,revision})})}
}
