import { createServer } from "http";
import express from "express";
import path from "path";
import { MonitorServer } from "@wing-monitor/monitor-backend";
import { APP_CONFIG } from "@wing-monitor/shared-models";

// Prefer CommonJS globals when available; fall back to cwd for dev runners.
const runtimeDirname: string =
  typeof __dirname !== "undefined" ? __dirname : process.cwd();

async function bootstrap() {
  const app = express();
  const server = createServer(app);

  // Initialize Monitor Server (Backend Logic)
  const monitorServer = new MonitorServer(server);
  await monitorServer.start();

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // Serve static files from dist/apps/web-client
  const staticPath = path.join(process.cwd(), 'dist/apps/web-client');
  app.use(express.static(staticPath));

  // Handle client-side routing
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  // Use port 3001 for backend
  const port = APP_CONFIG?.API_PORT || 3001;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

bootstrap().catch(console.error);
