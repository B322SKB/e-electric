import pg from 'pg';
import {createApi} from './server.mjs';
import {postgresStore} from './postgres.mjs';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
await pool.query('SELECT 1 FROM projects LIMIT 1');
const server=createApi(postgresStore(pool));
server.listen(Number(process.env.PORT||8081),'127.0.0.1');
