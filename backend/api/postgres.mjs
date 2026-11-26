import {validateProject} from '../../packages/edm/src/index.mjs';
export function postgresStore(pool){
 return {
 async save(project,revision){
 const errors=validateProject(project);if(errors.length)throw new Error(errors.join('; '));
 if(!Number.isSafeInteger(revision)||revision<0)throw new Error('Invalid revision');
 const result=revision===0
 ?await pool.query('INSERT INTO projects(id,revision,payload) VALUES($1,1,$2::jsonb) ON CONFLICT DO NOTHING RETURNING revision,payload',[project.id,JSON.stringify(project)])
 :await pool.query('UPDATE projects SET revision=revision+1,payload=$2::jsonb,updated_at=now() WHERE id=$1 AND revision=$3 RETURNING revision,payload',[project.id,JSON.stringify(project),revision]);
 if(!result.rowCount)throw new Error('Revision conflict');
 return {revision:Number(result.rows[0].revision),project:result.rows[0].payload};
 },
 async get(id){const r=await pool.query('SELECT revision,payload FROM projects WHERE id=$1',[id]);return r.rowCount?{revision:Number(r.rows[0].revision),project:r.rows[0].payload}:null},
 async list(){const r=await pool.query("SELECT id,revision,payload->>'name' AS name FROM projects ORDER BY id");return r.rows.map(x=>({...x,revision:Number(x.revision)}))}
 };
}
