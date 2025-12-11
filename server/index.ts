import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { WingMonitorController, WingMonitorConfig, MonitorState } from "../wing-studio-monitor-controller/src/index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration for Wing Console
// In a real app, this would come from a config file or environment variables
const wingConfig: WingMonitorConfig = {
  network: {
    ipAddress: process.env.WING_IP || '192.168.1.70',
    wingPort: parseInt(process.env.WING_PORT || '10024'),
    localPort: parseInt(process.env.LOCAL_PORT || '9000')
  },
  monitorMain: {
    path: '/main/4',
    trim: 0
  },
  monitorInputs: [
    { name: 'DAW 1-2', path: '/ch/1' },
    { name: 'REF TRACK', path: '/ch/2' },
    { name: 'CLIENT', path: '/ch/3' },
    { name: 'BT AUDIO', path: '/ch/4' }
  ],
  monitorMatrixOutputs: [
    { name: 'MAIN MON', path: '/mtx/1' },
    { name: 'NEARFIELD', path: '/mtx/2' },
    { name: 'MINI CUBE', path: '/mtx/3' }
  ],
  subwoofer: {
    path: '/mtx/4',
    trim: 0,
    crossover: 80 // 80Hz crossover
  }
};

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // Initialize Wing Controller
  console.log('Initializing Wing Monitor Controller...');
  // Enable mock mode if MOCK_MODE env var is set or if we can't connect
  const isMockMode = process.env.MOCK_MODE === 'true' || true; // Default to true for demo
  const wingController = new WingMonitorController(wingConfig, isMockMode);
  
  wingController.on('ready', () => {
    console.log('Wing Controller connected and ready');
    broadcastState(wingController.getState());
  });

  wingController.on('error', (err) => {
    console.error('Wing Controller Error:', err);
  });

  wingController.on('stateChanged', (state) => {
    broadcastState(state);
  });

  // Start OSC connection
  wingController.connect();

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
        outputs: wingConfig.monitorMatrixOutputs.map((o, idx) => ({ name: o.name || `Output ${idx+1}`, id: idx }))
      }
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

  function handleClientMessage(data: any) {
    switch (data.type) {
      case 'SET_VOLUME':
        wingController.setVolume(data.payload);
        break;
      case 'SET_MUTE':
        wingController.setMute(data.payload);
        break;
      case 'SET_DIM':
        wingController.setDim(data.payload);
        break;
      case 'SET_MONO':
        wingController.setMono(data.payload);
        break;
      case 'SET_INPUT':
        wingController.setInputSource(data.payload);
        break;
      case 'SET_OUTPUT':
        wingController.setOutputSpeaker(data.payload);
        break;
      case 'SET_SUBWOOFER':
        wingController.setSubwoofer(data.payload);
        break;
      case 'SET_POLARITY':
        wingController.setPolarity(data.payload);
        break;
      case 'SET_TALKBACK':
        // Talkback logic not fully implemented in library yet, but we can track state
        // wingController.setTalkback(data.payload);
        break;
    }
  }

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
