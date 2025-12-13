import { WebSocketServer, WebSocket } from "ws";
import { WingMonitorController } from "@wing-monitor/wing-controller";
import { MonitorState } from "@wing-monitor/shared-models";
import { config as wingConfig, MOCK_MODE } from "./config";
import { loadSettings, saveSettings, Settings } from "./settings";
import { Server } from "http";

export class MonitorServer {
  private wss: WebSocketServer;
  private wingController: WingMonitorController;
  private settings: Settings | null = null;
  private lastQueueBroadcast = 0;
  private queueBroadcastTimeout: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    
    console.log('Initializing Wing Monitor Controller...');
    console.log(`Using Config: IP=${wingConfig.network.ipAddress}, MockMode=${MOCK_MODE}`);
    
    this.wingController = new WingMonitorController(wingConfig, MOCK_MODE);
  }

  public async start() {
    // Load settings
    this.settings = await loadSettings();

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
          inputs: wingConfig.monitorInputs.map((i, idx) => ({ name: i.name || `Input ${idx+1}`, id: idx })),
          auxInputs: wingConfig.auxInputs ? wingConfig.auxInputs.map((i, idx) => ({ name: i.name || `Aux ${idx+1}`, id: idx })) : [],
          outputs: wingConfig.monitorMatrixOutputs.map((o, idx) => ({ name: o.name || `Output ${idx+1}`, id: idx }))
        }
      }));

      // Send settings
      if (this.settings) {
        ws.send(JSON.stringify({
          type: 'SETTINGS_UPDATE',
          payload: this.settings
        }));
      }

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(data);
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      });
    });
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
    }
  }
}
