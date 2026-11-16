import { fileURLToPath } from 'node:url';
import { buildWorker } from './worker-bundle.mjs';

const outputDirectory = fileURLToPath(new URL('../dist/server/', import.meta.url));
await buildWorker(outputDirectory, { emptyOutDir: false });
