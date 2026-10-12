import {mkdir,copyFile,cp} from 'node:fs/promises';
import {build} from 'vite';
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
// Use the same installed Vite/Rollup pipeline as the client. Direct esbuild
// resolution traversed an inaccessible parent directory in this workspace.
await build({
 configFile:false,publicDir:false,
 build:{outDir:'dist/server',emptyOutDir:false,minify:false,target:'es2022',
  lib:{entry:'worker/index.js',formats:['es'],fileName:()=> 'index.js'},
  rollupOptions:{output:{banner:'/* @noble/hashes: Copyright (c) 2022 Paul Miller. MIT License; see NOBLE-HASHES-LICENSE.txt. */'}}
 }
});
await copyFile('NOBLE-HASHES-LICENSE.txt','dist/server/NOBLE-HASHES-LICENSE.txt');
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
await cp('drizzle','dist/.openai/drizzle',{recursive:true});
