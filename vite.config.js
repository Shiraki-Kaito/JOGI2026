import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  publicDir: 'public',
  build: { outDir: '../dist/client', emptyOutDir: true },
  server: { host: '0.0.0.0', port: 4173, allowedHosts: true },
  plugins: [{
    name: 'guest-only-api-guidance',
    configureServer(server) {
      // Vite serves the guest game. The Worker serves both assets and authenticated APIs.
      server.middlewares.use((req,res,next)=>{
        if(!req.url?.startsWith('/api/'))return next();
        res.statusCode=503;
        res.setHeader('Content-Type','application/json; charset=utf-8');
        res.setHeader('Cache-Control','no-store');
        res.end(JSON.stringify({code:'AUTH_API_UNAVAILABLE',error:'認証にはWorkerのURLを開いてください。Viteではゲストで遊べます。'}));
      });
    }
  }]
});
