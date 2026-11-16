import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const licenseFile = 'NOBLE-HASHES-LICENSE.txt';

export async function buildWorker(outputDirectory, { emptyOutDir }) {
  await build({
    root: projectRoot,
    configFile: false,
    publicDir: false,
    build: {
      outDir: outputDirectory,
      emptyOutDir,
      minify: false,
      target: 'es2022',
      lib: {
        entry: join(projectRoot, 'worker/index.js'),
        formats: ['es'],
        fileName: () => 'index.js',
      },
      rollupOptions: {
        output: {
          banner: '/* @noble/hashes: Copyright (c) 2022 Paul Miller. MIT License; see NOBLE-HASHES-LICENSE.txt. */',
        },
      },
    },
  });
  await copyFile(join(projectRoot, licenseFile), join(outputDirectory, licenseFile));
}
