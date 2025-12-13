import * as osc from 'osc';
import { EventEmitter } from 'events';
import { WingMonitorConfig, MonitorState, LogLevel } from '@wing-monitor/shared-models';

export class WingMonitorController extends EventEmitter {
  private config: WingMonitorConfig;
  private state: MonitorState;
  private udpPort: any;
  private isConnected: boolean = false;
  private isMockMode: boolean = false;
  private meterInterval: NodeJS.Timeout | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  
  // Command Queue
  private commandQueue: { id: string, address: string, args: any[], status: 'pending' | 'sent' | 'failed', timestamp: number }[] = [];
  private commandHistory: { id: string, address: string, args: any[], status: 'pending' | 'sent' | 'failed', timestamp: number }[] = [];
  private isProcessingQueue: boolean = false;
  private queueInterval: number = 10; // ms between commands

  constructor(config: WingMonitorConfig, mockMode: boolean = false) {
    super();
    this.config = config;
    this.isMockMode = mockMode;
    
    // Initialize state
    this.state = {
      mainLevel: 0,
      auxLevel: 0,
      isMuted: true,
      isDimmed: false,
      isMono: false,
      activeInputIndex: 0,
      activeOutputIndex: 0,
      isSubwooferEnabled: false,
      activeAuxIndices: [],
      isTalkbackEnabled: false,
      isPolarityFlipped: false,
      meters: { left: 0, right: 0 }
    };

    if (!this.isMockMode) {
      this.setupOsc();
    } else {
      this.isConnected = true;
      this.log('info', 'Running in MOCK MODE');
      // Emit ready event in mock mode
      setTimeout(() => this.emit('ready'), 100);
      this.startMockMetering();
    }
  }

  private setupOsc() {
    this.udpPort = new osc.UDPPort({
      localAddress: "0.0.0.0",
      localPort: this.config.network.localPort,
      remoteAddress: this.config.network.ipAddress,
      remotePort: this.config.network.wingPort,
      metadata: true
    });

    this.udpPort.on("ready", () => {
      this.isConnected = true;
      this.log('info', `OSC Port Ready. Listening on port ${this.config.network.localPort}, sending to ${this.config.network.ipAddress}:${this.config.network.wingPort}`);
      this.emit('ready');
      this.refreshConsoleState();
      this.startMetering();
      this.startKeepAlive();
    });

    this.udpPort.on("message", (oscMsg: any) => {
      this.handleOscMessage(oscMsg);
    });

    this.udpPort.on("error", (err: any) => {
      this.log('error', `OSC Error: ${err.message}`);
      this.emit('error', err);
    });

    try {
      this.udpPort.open();
    } catch (err: any) {
      this.log('error', `Failed to open UDP port: ${err.message}`);
      this.emit('error', err);
    }
  }

  private refreshConsoleState() {
    // Subscribe to updates
    this.sendOsc('/xremote', []);
    
    // Request current state for key parameters
    // We rely on xremote to send us the current values, but we can also force query if needed.
    // For now, xremote should trigger the console to send current values of active pages/channels.
    // However, xremote typically sends updates for *changes*. To get initial state, we might need to query.
    // But since we don't know the exact query paths for everything without a massive dump, 
    // we'll assume xremote + manual queries for our specific channels.
    
    // Query Monitor Main
    this.sendOsc(this.config.monitorMain.path + '/fdr', []);
    this.sendOsc(this.config.monitorMain.path + '/mute', []);
    
    // Query Main Bus if configured
    if (this.config.monitorMain.busPath) {
      this.sendOsc(this.config.monitorMain.busPath + '/fdr', []);
      this.sendOsc(this.config.monitorMain.busPath + '/mute', []);
    }
    
    // Query Aux Monitor
    if (this.config.auxMonitor) {
      this.sendOsc(this.config.auxMonitor.path + '/fdr', []);
      this.sendOsc(this.config.auxMonitor.path + '/mute', []);
    }
    
    // Query Global States
    this.sendOsc('/outputs/main/dim', []);
    this.sendOsc('/outputs/main/mono', []);
    
    // We push our initial state only if we want to enforce it. 
    // But usually, a controller should reflect the console state first.
    // So we WON'T call updateConsole() here, we let the console tell us its state.
  }

  private updateConsole() {
    // Apply current state to console
    this.setVolume(this.state.mainLevel);
    this.setAuxVolume(this.state.auxLevel);
    this.setMute(this.state.isMuted);
    this.setDim(this.state.isDimmed);
    this.setMono(this.state.isMono);
    this.setInput(this.state.activeInputIndex);
    this.setOutput(this.state.activeOutputIndex);
    this.setSubwoofer(this.state.isSubwooferEnabled);
    
    // Apply Aux Inputs state
    if (this.config.auxInputs) {
      this.config.auxInputs.forEach((_, index) => {
        const isActive = this.state.activeAuxIndices.includes(index);
        if (isActive) {
             this.setAuxSource(index);
        }
      });
    }
  }

  private startMetering() {
    if (this.meterInterval) clearInterval(this.meterInterval);
    
    this.meterInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendOsc('/meters/1', []);
      }
    }, 100);
  }

  private startMockMetering() {
    if (this.meterInterval) clearInterval(this.meterInterval);
    
    this.meterInterval = setInterval(() => {
      // Generate fake meter data based on volume and mute state
      if (this.state.isMuted) {
        this.state.meters = { left: 0, right: 0 };
      } else {
        // Base signal level scaled by volume
        const volumeScale = this.state.mainLevel / 100;
        const noise = Math.random() * 0.05;
        // Create a stereo signal that bounces around
        const signalL = (0.4 + Math.sin(Date.now() / 300) * 0.3) * volumeScale;
        const signalR = (0.4 + Math.cos(Date.now() / 320) * 0.3) * volumeScale;
        
        this.state.meters = {
          left: Math.max(0, Math.min(1, signalL + noise)),
          right: Math.max(0, Math.min(1, signalR + noise))
        };
      }
      
      this.emit('meterUpdate', this.state.meters);
    }, 100);
  }

  // --- Public Control Methods ---

  public getState(): MonitorState {
    return { ...this.state };
  }

  public setVolume(percent: number) {
    this.state.mainLevel = Math.max(0, Math.min(100, percent));
    this.emitStateChange();
    
    // Map 0-100% to Wing Fader value (float 0.0 - 1.0)
    const faderValue = this.state.mainLevel / 100; 
    
    // Control the Monitor Main Channel Fader
    const monitorChannelPath = this.config.monitorMain.path;
    this.sendOsc(`${monitorChannelPath}/fdr`, [{ type: 'f', value: faderValue }]);

    // Also control the Main Bus Fader if configured
    if (this.config.monitorMain.busPath) {
      this.sendOsc(`${this.config.monitorMain.busPath}/fdr`, [{ type: 'f', value: faderValue }]);
    }
  }

  public setAuxVolume(percent: number) {
    this.state.auxLevel = Math.max(0, Math.min(100, percent));
    this.emitStateChange();

    // Map 0-100% to Wing Fader value (float 0.0 - 1.0)
    const faderValue = this.state.auxLevel / 100;

    // Control Aux Monitor Channel Fader if it exists
    if (this.config.auxMonitor) {
        const auxChannelPath = this.config.auxMonitor.path;
        this.sendOsc(`${auxChannelPath}/fdr`, [{ type: 'f', value: faderValue }]);
    }
  }

  public setMute(muted: boolean) {
    this.state.isMuted = muted;
    this.emitStateChange();
    
    const monitorChannelPath = this.config.monitorMain.path;
    this.sendOsc(`${monitorChannelPath}/mute`, [{ type: 'i', value: muted ? 1 : 0 }]); // 1 is muted

    // Also mute the Main Bus if configured
    if (this.config.monitorMain.busPath) {
      this.sendOsc(`${this.config.monitorMain.busPath}/mute`, [{ type: 'i', value: muted ? 1 : 0 }]);
    }
    
    if (this.config.auxMonitor) {
        const auxChannelPath = this.config.auxMonitor.path;
        this.sendOsc(`${auxChannelPath}/mute`, [{ type: 'i', value: muted ? 1 : 0 }]);
    }
  }

  public setDim(dimmed: boolean) {
    this.state.isDimmed = dimmed;
    this.emitStateChange();
    this.sendOsc(`/outputs/main/dim`, [{ type: 'i', value: dimmed ? 1 : 0 }]); 
  }

  public setMono(mono: boolean) {
    this.state.isMono = mono;
    this.emitStateChange();
    this.sendOsc(`/outputs/main/mono`, [{ type: 'i', value: mono ? 1 : 0 }]);
  }

  public setInput(index: number) {
    if (index < 0 || index >= this.config.monitorInputs.length) return;
    this.state.activeInputIndex = index;
    this.emitStateChange();
    
    // Patch the selected source to the Monitor Main Channel
    this.setMonitorSource(index);
  }

  public setOutput(index: number) {
    if (index < 0 || index >= this.config.monitorMatrixOutputs.length) return;
    
    // Disable current output
    this.disableSpeaker(this.state.activeOutputIndex);
    
    this.state.activeOutputIndex = index;
    this.emitStateChange();
    
    // Enable new output
    this.setActiveSpeaker(index);
    
    // Re-apply sub crossover if needed
    if (this.state.isSubwooferEnabled) {
      this.applyCrossoverToSpeakers(true);
    }
  }

  public setSubwoofer(enabled: boolean) {
    this.state.isSubwooferEnabled = enabled;
    this.emitStateChange();
    
    const subConfig = this.config.subwoofer;
    if (subConfig) {
      const subMtxNum = this.extractIndexFromPath(subConfig.path);
      if (subMtxNum) {
        // Enable/Disable Sub Matrix
        this.sendOsc(`/mtx/${subMtxNum}/mute`, [{ type: 'i', value: enabled ? 0 : 1 }]);
        
        // Apply Crossover to Main Speakers
        this.applyCrossoverToSpeakers(enabled);
      }
    }
  }

  public toggleAuxInput(index: number) {
    if (!this.config.auxInputs || index < 0 || index >= this.config.auxInputs.length) return;
    
    const currentIndex = this.state.activeAuxIndices.indexOf(index);
    if (currentIndex === -1) {
      // Enable Aux
      this.state.activeAuxIndices = [index]; 
      this.setAuxSource(index);
    } else {
      // Disable Aux
      this.state.activeAuxIndices = [];
      if (this.config.auxMonitor) {
          const auxChannelPath = this.config.auxMonitor.path;
          this.sendOsc(`${auxChannelPath}/mute`, [{ type: 'i', value: 1 }]);
      }
    }
    this.emitStateChange();
  }

  public disconnect() {
    if (this.isConnected) {
      this.isConnected = false;
      if (!this.isMockMode && this.udpPort) {
        try {
          this.udpPort.close();
        } catch (e) {
          console.error('Error closing UDP port:', e);
        }
      }
      this.log('info', 'Disconnected from Wing Console');
      this.emitStateChange();
    }
  }

  public connect() {
    if (!this.isConnected) {
      if (this.isMockMode) {
        this.isConnected = true;
        this.log('info', 'Reconnected to Mock Wing Console');
        this.emitStateChange();
      } else {
        // Re-open UDP port
        try {
          this.udpPort.open();
        } catch (err: any) {
          this.log('error', `Failed to open UDP port: ${err.message}`);
          this.emit('error', err);
        }
      }
    }
  }

  public clearHistory() {
    this.commandHistory = [];
    this.emit('queueUpdate', this.getQueue());
  }

  public getQueue() {
    return [...this.commandHistory, ...this.commandQueue];
  }

  // --- Private Helper Methods ---

  private sendOsc(address: string, args: any[]) {
    const id = Math.random().toString(36).substring(7);
    const command = { 
      id, 
      address, 
      args, 
      status: 'pending' as const, 
      timestamp: Date.now() 
    };
    
    this.commandQueue.push(command);
    this.processQueue();
  }

  private processQueue() {
    if (this.isProcessingQueue || this.commandQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    const command = this.commandQueue.shift();
    
    if (command) {
      if (this.isConnected) {
        try {
          if (!this.isMockMode) {
            this.udpPort.send({
              address: command.address,
              args: command.args
            });
          }
          command.status = 'sent';
          this.log('debug', `Sent OSC: ${command.address} ${JSON.stringify(command.args)}`);
        } catch (err: any) {
          command.status = 'failed';
          this.log('error', `Failed to send OSC: ${err.message}`);
        }
      } else {
        command.status = 'failed';
        this.log('warn', `Dropped OSC (Disconnected): ${command.address}`);
      }
      
      // Add to history
      this.commandHistory.unshift(command);
      if (this.commandHistory.length > 50) this.commandHistory.pop();
      
      this.emit('queueUpdate', this.getQueue());
      
      setTimeout(() => {
        this.isProcessingQueue = false;
        this.processQueue();
      }, this.queueInterval);
    } else {
      this.isProcessingQueue = false;
    }
  }

  private handleOscMessage(msg: any) {
    // Handle meter updates
    if (msg.address === '/meters/1') {
      // Parse meter blob... complex on Wing, skipping for now
      return;
    }
    
    // Handle fader updates
    if (msg.address.endsWith('/fdr')) {
      const val = msg.args[0].value;
      if (msg.address.includes(this.config.monitorMain.path) || (this.config.monitorMain.busPath && msg.address.includes(this.config.monitorMain.busPath))) {
        this.state.mainLevel = Math.round(val * 100);
        this.emitStateChange();
      } else if (this.config.auxMonitor && msg.address.includes(this.config.auxMonitor.path)) {
        this.state.auxLevel = Math.round(val * 100);
        this.emitStateChange();
      }
    }
    
    // Handle mute updates
    if (msg.address.endsWith('/mute')) {
      const val = msg.args[0].value;
      if (msg.address.includes(this.config.monitorMain.path) || (this.config.monitorMain.busPath && msg.address.includes(this.config.monitorMain.busPath))) {
        this.state.isMuted = val === 1;
        this.emitStateChange();
      }
    }
  }

  private setMonitorSource(inputIndex: number) {
    const input = this.config.monitorInputs[inputIndex];
    if (!input) return;
    
    // Routing logic: Patch input source to Monitor Channel
    // This is highly specific to Wing routing commands
    // Assuming we are routing to a specific channel strip
    
    // Example: /ch/40/config/name "My Source"
    // Example: /routing/source/ch/40 ... (This is complex on Wing)
    
    // For now, we'll just log it as we need specific routing commands
    this.log('info', `Routing ${input.name} (${input.sourceGroup}/${input.sourceIndex}) to Monitor Main`);
  }

  private setAuxSource(inputIndex: number) {
    const input = this.config.auxInputs?.[inputIndex];
    if (!input) return;
    
    this.log('info', `Routing ${input.name} (${input.sourceGroup}/${input.sourceIndex}) to Aux Monitor`);
  }

  private setActiveSpeaker(outputIndex: number) {
    const output = this.config.monitorMatrixOutputs[outputIndex];
    if (!output) return;
    
    const mtxNum = this.extractIndexFromPath(output.path);
    if (mtxNum) {
      this.sendOsc(`/mtx/${mtxNum}/mute`, [{ type: 'i', value: 0 }]); // Unmute
    }
  }

  private disableSpeaker(outputIndex: number) {
    const output = this.config.monitorMatrixOutputs[outputIndex];
    if (!output) return;
    
    const mtxNum = this.extractIndexFromPath(output.path);
    if (mtxNum) {
      this.sendOsc(`/mtx/${mtxNum}/mute`, [{ type: 'i', value: 1 }]); // Mute
    }
  }

  private applyCrossoverToSpeakers(enableSub: boolean) {
    // On Wing, we might toggle EQ bands or change routing
    // For this implementation, we assume the console has presets or we just toggle the sub matrix
    // Real crossover control via OSC is complex (EQ parameters)
    this.log('info', `Applying crossover: Sub ${enableSub ? 'Enabled' : 'Disabled'}`);
  }

  private extractIndexFromPath(path: string): number | null {
    const match = path.match(/\d+$/);
    return match ? parseInt(match[0]) : null;
  }

  private startKeepAlive() {
    if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
    this.keepAliveInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendOsc('/xremote', []);
      }
    }, 9000);
  }

  private emitStateChange() {
    this.emit('stateChanged', this.state);
  }

  private log(level: LogLevel, message: string) {
    console.log(`[${level.toUpperCase()}] ${message}`);
  }
}
