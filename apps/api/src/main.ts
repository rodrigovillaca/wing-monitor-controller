import express from "express";
import { createServer } from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { WingMonitorController } from "@wing-monitor/wing-controller";
import { MonitorState, APP_CONFIG } from "@wing-monitor/shared-models";
import { config as wingConfig, MOCK_MODE } from "./config";
import { loadSettings, saveSettings, Settings } from "./settings";

// Prefer CommonJS globals when available; fall back to cwd for dev runners.
// (Do not use import.meta here because the API build outputs CJS.)
const runtimeDirname: string =
  typeof __dirname !== "undefined" ? __dirname : process.cwd();

async function startServer() {
  // Load settings
  let settings: Settings = await loadSettings();
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // Initialize Wing Controller
  console.log('Initializing Wing Monitor Controller...');
  console.log(`Using Config: IP=${wingConfig.network.ipAddress}, MockMode=${MOCK_MODE}`);
  
  const wingController = new WingMonitorController(wingConfig, MOCK_MODE);
  
  wingController.on('ready', () => {
    console.log('Wing Controller connected and ready');
    broadcastState(wingController.getState());
  });

  wingController.on("error", (err: unknown) => {
    console.error("Wing Controller Error:", err);
  });

  wingController.on("stateChanged", () => {
    // Prefer the controller's strongly-typed state when broadcasting.
    broadcastState(wingController.getState());
  });

  // Start OSC connection (Already connected in constructor)
  // wingController.connect();

  // WebSocket handling
  wss.on('connection', (ws) => {
    console.log('Client connected');
    
    // Send current state immediately
    ws.send(JSON.stringify({
      type: 'STATE_UPDATE',
      payload: wingController.getState()
    }));

    // Send configuration so UI knows input/output names
    ws.send(JSON.stringify({
      type: 'CONFIG_UPDATE',
      payload: {
        inputs: wingConfig.monitorInputs.map((i, idx) => ({ name: i.name || `Input ${idx+1}`, id: idx })),
        auxInputs: wingConfig.auxInputs ? wingConfig.auxInputs.map((i, idx) => ({ name: i.name || `Aux ${idx+1}`, id: idx })) : [],
        outputs: wingConfig.monitorMatrixOutputs.map((o, idx) => ({ name: o.name || `Output ${idx+1}`, id: idx }))
      }
    }));

    // Send settings
    ws.send(JSON.stringify({
      type: 'SETTINGS_UPDATE',
      payload: settings
    }));

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleClientMessage(data);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    });
  });

  function broadcastState(state: MonitorState) {
    const message = JSON.stringify({
      type: 'STATE_UPDATE',
      payload: state
    });
    
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  function handleClientMessage(data: unknown): void {
    if (typeof data !== "object" || data === null) return;

    const record = data as Record<string, unknown>;
    const type = record["type"];
    const payload = record["payload"];

    if (typeof type !== "string") return;

    switch (type) {
      case "SET_VOLUME":
        if (typeof payload === "number") {
          wingController.setVolume(payload);
        }
        break;
      case "SET_MUTE":
        if (typeof payload === "boolean") {
          wingController.setMute(payload);
        }
        break;
      case "SET_DIM":
        if (typeof payload === "boolean") {
          wingController.setDim(payload);
        }
        break;
      case "SET_MONO":
        if (typeof payload === "boolean") {
          wingController.setMono(payload);
        }
        break;
      case "SET_INPUT":
        if (typeof payload === "number") {
          wingController.setInput(payload);
        }
        break;
      case "SET_OUTPUT":
        if (typeof payload === "number") {
          wingController.setOutput(payload);
        }
        break;
      case "SET_SUBWOOFER":
        if (typeof payload === "boolean") {
          wingController.setSubwoofer(payload);
        }
        break;
      case "TOGGLE_AUX":
        if (typeof payload === "number") {
          wingController.toggleAuxInput(payload);
        }
        break;
      case "SAVE_SETTINGS":
        if (
          typeof payload === "object" &&
          payload !== null &&
          "volumeUnit" in payload &&
          "unityLevel" in payload
        ) {
          settings = payload as Settings;
          saveSettings(settings).catch((err: unknown) =>
            console.error("Failed to save settings:", err)
          );

          // Broadcast new settings to all clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: "SETTINGS_UPDATE",
                  payload: settings,
                })
              );
            }
          });
        }
        break;
    }
  }

  // Serve static files from dist/apps/web-client
  // We assume the app is run from the workspace root or the built output structure matches
  const staticPath = path.join(process.cwd(), 'dist/apps/web-client');

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  // Use port 3001 for backend to avoid conflict with Vite (3000)
  const port = APP_CONFIG?.API_PORT || 3001;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
