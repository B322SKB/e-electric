import {createClient} from './client.mjs';
import {symbolDefinition} from './library.mjs';
const client=createClient('',()=>document.querySelector('#api-token').value);let revision=0,busy=false;
// Browser-only demonstrator; project format follows the EDM v0.1 contract.
const uuid=()=>crypto.randomUUID();
const canvas=document.querySelector('#canvas'),status=document.querySelector('#status');
const tree=document.querySelector('#tree'),props=document.querySelector('#properties');
const makeProject=()=>({schemaVersion:'0.1.0',id:uuid(),name:'New Electrical Project',pages:[{id:uuid(),name:'Control 1',kind:'schematic',symbols:[]}],devices:[],connections:[]});
let project=makeProject(),tool='select',selected=null,wireStart=null,drag=null;
const icons={coil:'▣',switch:'⟋',motor:'M',terminal:'○'};
const grid=n=>Math.round(n/20)*20;
const findDevice=id=>project.devices.find(d=>d.id===id);
const terminalPosition=(key,index,count)=>key==='motor'&&count===4?(index<3?{x:-40,y:(index-1)*16}:{x:40,y:0}):{x:index===0?-40:40,y:0};
const svg=(tag,attrs={})=>{const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el};
const point=e=>{const p=canvas.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(canvas.getScreenCTM().inverse())};
function setStatus(message){status.textContent=message}
function render(){
 canvas.replaceChildren();
 const page=project.pages[0];
 const positions=new Map();
 for(const s of page.symbols){
  const device=findDevice(s.deviceId);if(!device)continue;
  const g=svg('g',{class:'symbol'+(selected===s.id?' selected':''),transform:`translate(${s.position.x},${s.position.y})`});
  const box=svg('rect',{x:-34,y:-24,width:68,height:48,rx:5,fill:'#1e293b',stroke:'#60a5fa','stroke-width':2});
  g.append(box);
  const icon=svg('text',{x:0,y:8,'text-anchor':'middle',fill:'#e2e8f0','font-size':24});icon.textContent=icons[s.symbolKey]||'?';g.append(icon);
  const label=svg('text',{x:0,y:-33,'text-anchor':'middle',class:'tag'});label.textContent=device.tag;g.append(label);
  device.terminals.forEach((t,i)=>{const pos=terminalPosition(s.symbolKey,i,device.terminals.length);const pin=svg('circle',{cx:pos.x,cy:pos.y,r:6,class:'pin','data-device':device.id,'data-terminal':t.id});g.append(pin);positions.set(device.id+'/'+t.id,{x:s.position.x+pos.x,y:s.position.y+pos.y});});
  g.addEventListener('pointerdown',e=>{
   if(e.target.classList.contains('pin')){e.stopPropagation();pinClick(e.target.dataset.device,e.target.dataset.terminal);return}
   if(tool!=='select')return;
   selected=s.id;const p=point(e);drag={id:s.id,dx:p.x-s.position.x,dy:p.y-s.position.y};canvas.setPointerCapture(e.pointerId);render();
  });
  canvas.append(g);
 }
 for(const c of project.connections){const a=positions.get(c.from.deviceId+'/'+c.from.terminalId),b=positions.get(c.to.deviceId+'/'+c.to.terminalId);if(a&&b){const wire=svg('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'wire'});canvas.insertBefore(wire,canvas.firstChild);}}
 tree.textContent=`${project.name} · ${project.devices.length} devices · ${project.connections.length} wires`;
 document.querySelector('#print-title').textContent=project.name;
 const symbol=page.symbols.find(s=>s.id===selected),device=symbol&&findDevice(symbol.deviceId);
 props.replaceChildren();
 if(device){const label=document.createElement('label');label.textContent='Device tag';const input=document.createElement('input');input.value=device.tag;input.addEventListener('change',()=>{const v=input.value.trim();if(!v||project.devices.some(d=>d!==device&&d.tag===v)){setStatus('Tag required and must be unique');input.value=device.tag;return}device.tag=v;render()});props.append(label,input);const detail=document.createElement('p');detail.className='hint';detail.textContent=`Type: ${symbol.symbolKey} · Terminals: ${device.terminals.map(t=>t.name).join(', ')}`;props.append(detail)}
 else {const p=document.createElement('p');p.className='hint';p.textContent='Select a symbol to edit its tag.';props.append(p)}
}
function pinClick(deviceId,terminalId){
 if(tool!=='wire')return;
 const endpoint={deviceId,terminalId};
 if(!wireStart){wireStart=endpoint;setStatus('Select destination pin');return}
 if(wireStart.deviceId===deviceId&&wireStart.terminalId===terminalId){wireStart=null;setStatus('Cannot wire pin to itself');return}
 const key=e=>e.deviceId+'/'+e.terminalId;
 if(project.connections.some(c=>(key(c.from)===key(wireStart)&&key(c.to)===key(endpoint))||(key(c.to)===key(wireStart)&&key(c.from)===key(endpoint)))){setStatus('Wire already exists');wireStart=null;return}
 project.connections.push({id:uuid(),from:wireStart,to:endpoint});wireStart=null;setStatus('Wire added');render();
}
canvas.addEventListener('pointerdown',e=>{
 if(e.target!==canvas||tool==='select'||tool==='wire')return;
 const p=point(e),x=grid(p.x),y=grid(p.y),definition=symbolDefinition(tool),tag='-'+definition.prefix+String(project.devices.length+1);
 const device={id:uuid(),tag,terminals:definition.terminals.map(name=>({id:uuid(),name}))};
 project.devices.push(device);project.pages[0].symbols.push({id:uuid(),deviceId:device.id,symbolKey:tool,position:{x,y}});
 selected=null;setStatus('Placed '+tag);render();
});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const p=point(e),s=project.pages[0].symbols.find(s=>s.id===drag.id);if(s){s.position={x:grid(p.x-drag.dx),y:grid(p.y-drag.dy)};render()}});
canvas.addEventListener('pointerup',()=>drag=null);
document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>{tool=b.dataset.tool;wireStart=null;document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('active',x===b));setStatus('Tool: '+tool)}));
document.querySelector('#new').addEventListener('click',()=>{if(!confirm('Discard current drawing?'))return;project=makeProject();revision=0;wireStart=null;selected=null;render()});
document.querySelector('#save').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='e-electric-project.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
document.querySelector('#export-pdf').addEventListener('click',()=>window.print());
document.querySelector('#load').addEventListener('click',()=>document.querySelector('#file').click());
document.querySelector('#file').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(data.schemaVersion!=='0.1.0'||!Array.isArray(data.pages)||!Array.isArray(data.devices)||!Array.isArray(data.connections)||!data.pages[0]?.symbols)throw new Error('Invalid project structure');data.id=uuid();project=data;revision=0;wireStart=null;selected=null;render();setStatus('Imported JSON project (structural checks only)')}catch(err){setStatus('Import error: '+err.message)}e.target.value=''});
render();

async function serverAction(fn){if(busy)return;busy=true;const id=project.id;try{await fn(id)}catch(e){setStatus(e.message)}finally{busy=false}}
document.querySelector('#server-save').addEventListener('click',()=>serverAction(async id=>{const record=await client.save(structuredClone(project),revision);if(project.id===id){revision=record.revision;setStatus('Snapshot saved, revision '+revision)}}));
document.querySelector('#server-open').addEventListener('click',()=>serverAction(async id=>{const list=await client.list();if(!list.length){setStatus('No saved projects');return}const choice=prompt(list.map((p,i)=>(i+1)+': '+p.name).join('\n')+'\nChoose project number');if(choice===null)return;const item=list[Number(choice)-1];if(!item)throw new Error('Invalid selection');if(!confirm('Replace current drawing?'))return;const record=await client.open(item.id);if(project.id!==id)return;if(!record.project.pages[0])throw new Error('Project has no drawing page');project=record.project;revision=record.revision;selected=null;wireStart=null;drag=null;render();setStatus('Opened revision '+revision)}));
