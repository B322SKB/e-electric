import {validateProject} from '../../edm/src/index.mjs';
export function createStore(){
 const records=new Map();
 return {
  save(project,expectedRevision){
   const errors=validateProject(project);if(errors.length)throw new Error(errors.join('; '));
   const current=records.get(project.id);
   if(expectedRevision!==(current?.revision??0))throw new Error('Revision conflict');
   const record={revision:expectedRevision+1,project:structuredClone(project)};
   records.set(project.id,record);return structuredClone(record);
  },
  get(id){const record=records.get(id);return record?structuredClone(record):null},
  list(){return Array.from(records.values(),r=>({id:r.project.id,name:r.project.name,revision:r.revision}))}
 };
}
