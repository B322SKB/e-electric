export function createClient(base='',getToken=()=> ''){
 async function request(path,options={}){const token=getToken(),headers={...options.headers};if(token)headers.authorization='Bearer '+token;const r=await fetch(base+path,{...options,headers});if(!r.ok)throw new Error('Server request failed: '+r.status);return r.json()}
 return {list:()=>request('/api/projects'),open:id=>request('/api/projects/'+encodeURIComponent(id)),save:(project,revision)=>request('/api/projects/'+encodeURIComponent(project.id),{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({project,revision})})}
}
