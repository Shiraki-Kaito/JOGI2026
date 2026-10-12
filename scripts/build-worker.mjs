import {mkdir,copyFile,cp} from 'node:fs/promises';
import {build} from 'esbuild';
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await build({entryPoints:['worker/index.js'],outfile:'dist/server/index.js',bundle:true,platform:'browser',format:'esm',target:'es2022',banner:{js:'/* @noble/hashes: Copyright (c) 2022 Paul Miller. MIT License; see NOBLE-HASHES-LICENSE.txt. */'}});
await copyFile('NOBLE-HASHES-LICENSE.txt','dist/server/NOBLE-HASHES-LICENSE.txt');
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
await cp('drizzle','dist/.openai/drizzle',{recursive:true});
