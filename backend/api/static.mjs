import {readFile} from 'node:fs/promises';
const files={'/':['index.html','text/html'],'/main.js':['main.js','text/javascript'],'/client.mjs':['client.mjs','text/javascript']};
export async function serveEditor(path,res){if(!Object.hasOwn(files,path))return false;const [file,type]=files[path];const data=await readFile(new URL('../../apps/web/'+file,import.meta.url));res.writeHead(200,{'content-type':type+'; charset=utf-8','x-content-type-options':'nosniff','cache-control':'no-store'});res.end(data);return true}
