import { createApi } from './server.mjs';
import { fileStore } from './file-store.mjs';
import { resolve } from 'node:path';

const dir = resolve(process.env.EE_DATA_DIR || 'data/alpha');
const port = Number(process.env.PORT || 8081);
const server = createApi(fileStore(dir));
server.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  const address = server.address();
  console.log(`E-Electric Alpha: http://localhost:${address.port}\nData: ${dir}`);
});