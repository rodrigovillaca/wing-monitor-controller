import { WebSocketServer, WebSocket } from "ws";
import { WingMonitorController } from "@wing-monitor/wing-controller";
import { MonitorState, WingMonitorConfig } from "@wing-monitor/shared-models";
import { loadSettings, saveSettings, Settings } from "./settings";
import express, { Express } from "express";
import { createServer, Server } from "http";
import path from "path";

export class MonitorServer {
  private app: Express;
  private server: Server;
  private wss: WebSocketServer;
  private wingController: WingMonitorController;
  private settings: Settings | null = null;
  private lastQueueBroadcast = 0;
  private queueBroadcastTimeout: NodeJS.Timeout | null = null;
  private config: WingMonitorConfig;
  private port: number;
  private mockMode: boolean;
  private staticPath: string;
  private logs: string[] = [];
  private maxLogs = 100;

  constructor(
    config: WingMonitorConfig, 
    port: number, 
    mockMode: boolean,
    staticPath: string
  ) {
    this.config = config;
    this.port = port;
    this.mockMode = mockMode;
    this.staticPath = staticPath;

    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    
    // Override console.log and console.error to capture logs
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      this.addLog('INFO', message);
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      this.addLog('ERROR', message);
      originalError.apply(console, args);
    };

    console.log('Initializing Wing Monitor Controller...');
    console.log(`Using Config: IP=${config.network.ipAddress}, MockMode=${mockMode}`);
    
    this.wingController = new WingMonitorController(config, mockMode);
    
    this.setupExpress();
  }

  private setupExpress() {
    // Serve static files
    this.app.use(express.static(this.staticPath));

    // Handle client-side routing
    this.app.get("*", (_req, res) => {
      res.sendFile(path.join(this.staticPath, "index.html"));
    });
  }

  public async start() {
    // Load settings
    this.settings = await loadSettings();
    
    // Override initial config with settings if available
    if (this.settings && this.settings.wing) {
      console.log('Loading saved Wing configuration...');
      this.config = this.settings.wing;
      // Re-initialize controller with saved config
      this.wingController = new WingMonitorController(this.config, this.mockMode);
    }

    this.wingController.on('ready', () => {
      console.log('Wing Controller connected and ready');
      this.broadcastState(this.wingController.getState());
    });

    this.wingController.on("error", (err: unknown) => {
      console.error("Wing Controller Error:", err);
    });

    this.wingController.on("stateChanged", () => {
      this.broadcastState(this.wingController.getState());
    });

    this.wingController.on("queueUpdate", (queue) => {
      this.throttledBroadcastQueue(queue);
    });

    this.wingController.on("healthUpdate", (health) => {
      this.broadcastHealth(health);
    });

    this.wingController.on("pingUpdate", (ping) => {
      this.broadcastPing(ping);
    });

    this.wingController.on("trafficUpdate", (rate) => {
      this.broadcastTraffic(rate);
    });

    // WebSocket handling
    this.wss.on('connection', (ws) => {
      console.log('Client connected');
      
      // Send current state immediately
      ws.send(JSON.stringify({
        type: 'STATE_UPDATE',
        payload: this.wingController.getState()
      }));

      // Send current queue
      ws.send(JSON.stringify({
        type: 'QUEUE_UPDATE',
        payload: this.wingController.getQueue()
      }));

      // Send configuration so UI knows input/output names
      ws.send(JSON.stringify({
        type: 'CONFIG_UPDATE',
        payload: {
          inputs: this.config.monitorInputs.map((i, idx) => ({ name: i.name || `Input ${idx+1}`, id: idx })),
          auxInputs: this.config.auxInputs ? this.config.auxInputs.map((i, idx) => ({ name: i.name || `Aux ${idx+1}`, id: idx })) : [],
          outputs: this.config.monitorMatrixOutputs.map((o, idx) => ({ name: o.name || `Output ${idx+1}`, id: idx }))
        }
      }));

      // Send settings
      if (this.settings) {
        ws.send(JSON.stringify({
          type: 'SETTINGS_UPDATE',
          payload: this.settings
        }));
      }

      // Send existing logs
      ws.send(JSON.stringify({
        type: 'LOGS_UPDATE',
        payload: this.logs
      }));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(data);
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      });
    });

    // Start listening
    return new Promise<void>((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`Server running on http://localhost:${this.port}/`);
        resolve();
      });
    });
  }

  public stop() {
    if (this.server) {
      this.server.close();
    }
    if (this.wingController) {
      this.wingController.disconnect();
    }
  }

  private broadcastState(state: MonitorState) {
    const message = JSON.stringify({
      type: 'STATE_UPDATE',
      payload: state
    });
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private throttledBroadcastQueue(queue: any[]) {
    const now = Date.now();
    if (now - this.lastQueueBroadcast > 100) {
      this.broadcastQueue(queue);
      this.lastQueueBroadcast = now;
    } else {
      if (this.queueBroadcastTimeout) clearTimeout(this.queueBroadcastTimeout);
      this.queueBroadcastTimeout = setTimeout(() => {
        this.broadcastQueue(queue);
        this.lastQueueBroadcast = Date.now();
      }, 100);
    }
  }

  private broadcastQueue(queue: any[]) {
    const message = JSON.stringify({
      type: 'QUEUE_UPDATE',
      payload: queue
    });
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private broadcastHealth(health: string) {
    const message = JSON.stringify({
      type: 'HEALTH_UPDATE',
      payload: health
    });
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private broadcastPing(ping: number) {
    const message = JSON.stringify({
      type: 'PING_UPDATE',
      payload: ping
    });
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private broadcastTraffic(rate: number) {
    const message = JSON.stringify({
      type: 'TRAFFIC_UPDATE',
      payload: rate
    });
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private addLog(level: 'INFO' | 'ERROR', message: string) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Broadcast new log
    const updateMessage = JSON.stringify({
      type: 'LOG_ENTRY',
      payload: logEntry
    });

    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(updateMessage);
      }
    });
  }

  private handleClientMessage(data: unknown): void {
    if (typeof data !== "object" || data === null) return;

    const record = data as Record<string, unknown>;
    const type = record["type"];
    const payload = record["payload"];

    if (typeof type !== "string") return;

    switch (type) {
      case "SET_VOLUME":
        if (typeof payload === "number") {
          this.wingController.setVolume(payload);
        }
        break;
      case "SET_AUX_VOLUME":
        if (typeof payload === "number") {
          this.wingController.setAuxVolume(payload);
        }
        break;
      case "SET_MUTE":
        if (typeof payload === "boolean") {
          this.wingController.setMute(payload);
        }
        break;
      case "SET_DIM":
        if (typeof payload === "boolean") {
          this.wingController.setDim(payload);
        }
        break;
      case "SET_MONO":
        if (typeof payload === "boolean") {
          this.wingController.setMono(payload);
        }
        break;
      case "SET_INPUT":
        if (typeof payload === "number") {
          this.wingController.setInput(payload);
        }
        break;
      case "SET_OUTPUT":
        if (typeof payload === "number") {
          this.wingController.setOutput(payload);
        }
        break;
      case "SET_SUBWOOFER":
        if (typeof payload === "boolean") {
          this.wingController.setSubwoofer(payload);
        }
        break;
      case "TOGGLE_AUX":
        if (typeof payload === "number") {
          this.wingController.toggleAuxInput(payload);
        }
        break;
      case "SAVE_SETTINGS":
        if (
          typeof payload === "object" &&
          payload !== null &&
          "volumeUnit" in payload &&
          "unityLevel" in payload
        ) {
          this.settings = payload as Settings;
          
          // If wing config is included, update it
          if ("wing" in payload) {
            this.config = payload.wing as WingMonitorConfig;
            // Re-initialize controller with new config
            // Note: In a real scenario we might want to be more careful about hot-reloading
            // but for now we'll disconnect and reconnect
            this.wingController.disconnect();
            this.wingController = new WingMonitorController(this.config, this.mockMode);
            
            // Re-attach listeners
            this.wingController.on('ready', () => {
              this.broadcastState(this.wingController.getState());
            });
            this.wingController.on("stateChanged", () => {
              this.broadcastState(this.wingController.getState());
            });
            this.wingController.on("queueUpdate", (queue) => {
              this.throttledBroadcastQueue(queue);
            });
            
            this.wingController.connect();
            
            // Broadcast new config to clients
            this.wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'CONFIG_UPDATE',
                  payload: {
                    inputs: this.config.monitorInputs.map((i, idx) => ({ name: i.name || `Input ${idx+1}`, id: idx })),
                    auxInputs: this.config.auxInputs ? this.config.auxInputs.map((i, idx) => ({ name: i.name || `Aux ${idx+1}`, id: idx })) : [],
                    outputs: this.config.monitorMatrixOutputs.map((o, idx) => ({ name: o.name || `Output ${idx+1}`, id: idx }))
                  }
                }));
              }
            });
          }

          saveSettings(this.settings).catch((err: unknown) =>
            console.error("Failed to save settings:", err)
          );

          // Broadcast new settings to all clients
          this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(
                JSON.stringify({
                  type: "SETTINGS_UPDATE",
                  payload: this.settings,
                })
              );
            }
          });
        }
        break;
      case "CLEAR_QUEUE":
        this.wingController.clearHistory();
        break;
      case "DISCONNECT":
        this.wingController.disconnect();
        break;
      case "CONNECT":
        this.wingController.connect();
        break;
    }
  }
}
