import { createServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

const server = await createServer({ configFile: './vite.config.js' });
await server.listen();
server.printUrls();
