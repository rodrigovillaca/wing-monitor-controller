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
    
    // Also control Aux Monitor Channel Fader if it exists
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
          // isConnected will be set in 'ready' event
        } catch (e) {
          console.error('Error opening UDP port:', e);
        }
      }
    }
  }

  // --- Internal Logic ---

  private setMonitorSource(inputIndex: number) {
    const input = this.config.monitorInputs[inputIndex];
    if (!input) return;

    const monitorChannelPath = this.config.monitorMain.path;
    const chNum = this.extractIndexFromPath(monitorChannelPath);
    
    if (chNum) {
        this.sendOsc(`/ch/${chNum}/in/conn/grp`, [{ type: 's', value: input.sourceGroup }]);
        this.sendOsc(`/ch/${chNum}/in/conn/in`, [{ type: 'i', value: input.sourceIndex }]);
        this.sendOsc(`/ch/${chNum}/mute`, [{ type: 'i', value: 0 }]);
    }
  }

  private setAuxSource(auxIndex: number) {
    if (!this.config.auxInputs || !this.config.auxMonitor) return;
    const input = this.config.auxInputs[auxIndex];
    if (!input) return;

    const auxChannelPath = this.config.auxMonitor.path;
    const chNum = this.extractIndexFromPath(auxChannelPath);
    
    if (chNum) {
        this.sendOsc(`/ch/${chNum}/in/conn/grp`, [{ type: 's', value: input.sourceGroup }]);
        this.sendOsc(`/ch/${chNum}/in/conn/in`, [{ type: 'i', value: input.sourceIndex }]);
        this.sendOsc(`/ch/${chNum}/mute`, [{ type: 'i', value: 0 }]);
    }
  }

  private setActiveSpeaker(outputIndex: number) {
    const output = this.config.monitorMatrixOutputs[outputIndex];
    if (!output) return;
    
    const mtxNum = this.extractIndexFromPath(output.path);
    if (mtxNum) {
      this.sendOsc(`/mtx/${mtxNum}/dir/on`, [{ type: 'i', value: 1 }]);
      this.sendOsc(`/mtx/${mtxNum}/mute`, [{ type: 'i', value: 0 }]);
    }
  }

  private disableSpeaker(outputIndex: number) {
    const output = this.config.monitorMatrixOutputs[outputIndex];
    if (!output) return;
    
    const mtxNum = this.extractIndexFromPath(output.path);
    if (mtxNum) {
      this.sendOsc(`/mtx/${mtxNum}/dir/on`, [{ type: 'i', value: 0 }]);
      this.sendOsc(`/mtx/${mtxNum}/mute`, [{ type: 'i', value: 1 }]);
    }
  }

  private applyCrossoverToSpeakers(enabled: boolean) {
    const activeOutput = this.config.monitorMatrixOutputs[this.state.activeOutputIndex];
    if (activeOutput) {
      const mtxNum = this.extractIndexFromPath(activeOutput.path);
      if (mtxNum) {
        this.sendOsc(`/mtx/${mtxNum}/eq/on`, [{ type: 'i', value: enabled ? 1 : 0 }]);
      }
    }
  }

  // --- Helper Methods ---

  private sendOsc(address: string, args: any[]) {
    const command = {
      id: Math.random().toString(36).substring(7),
      address,
      args,
      status: 'pending' as const,
      timestamp: Date.now()
    };
    this.commandQueue.push(command);
    this.emit('queueUpdate', [...this.commandHistory, ...this.commandQueue]);
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.commandQueue.length > 0) {
      const command = this.commandQueue[0]; // Peek
      if (!command) break;

      if (!this.isConnected) {
        // If not connected, maybe drop or wait? For now, drop to avoid buildup
        this.commandQueue.shift();
        continue;
      }

      try {
        if (this.isMockMode) {
          this.log('debug', `[MOCK] Sent OSC: ${command.address} ${JSON.stringify(command.args)}`);
        } else {
          this.udpPort.send({
            address: command.address,
            args: command.args
          });
        }
        command.status = 'sent';
      } catch (err: any) {
        this.log('error', `Failed to send OSC: ${err.message}`);
        command.status = 'failed';
      }

      // Move to history
      this.commandQueue.shift();
      this.commandHistory.push(command);
      
      // Enforce limits: Max 100 items, Max 5 minutes age
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      this.commandHistory = this.commandHistory.filter(cmd => cmd.timestamp > fiveMinutesAgo);
      
      if (this.commandHistory.length > 100) {
        this.commandHistory = this.commandHistory.slice(this.commandHistory.length - 100);
      }

      this.emit('queueUpdate', [...this.commandHistory, ...this.commandQueue]);

      // Wait a bit before sending the next command to ensure order and prevent flooding
      await new Promise(resolve => setTimeout(resolve, this.queueInterval));
    }

    this.isProcessingQueue = false;
  }

  public getQueue() {
    return [...this.commandHistory, ...this.commandQueue];
  }

  public clearHistory() {
    this.commandHistory = [];
    this.emit('queueUpdate', [...this.commandHistory, ...this.commandQueue]);
  }

  private startKeepAlive() {
    if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
    this.keepAliveInterval = setInterval(() => {
      if (this.isConnected) {
        this.sendOsc('/xremote', []);
      }
    }, 9000); // Send every 9 seconds
  }

  private handleOscMessage(oscMsg: any) {
    const address = oscMsg.address;
    const args = oscMsg.args;
    const value = args && args.length > 0 ? args[0].value : null;

    // Monitor Main Fader
    if (address === `${this.config.monitorMain.path}/fdr`) {
      const level = Math.round(value * 100);
      if (this.state.mainLevel !== level) {
        this.state.mainLevel = level;
        this.emitStateChange();
      }
    }
    // Monitor Main Mute
    else if (address === `${this.config.monitorMain.path}/mute`) {
      const isMuted = value === 1;
      if (this.state.isMuted !== isMuted) {
        this.state.isMuted = isMuted;
        this.emitStateChange();
      }
    }
    // Dim
    else if (address === '/outputs/main/dim') {
      const isDimmed = value === 1;
      if (this.state.isDimmed !== isDimmed) {
        this.state.isDimmed = isDimmed;
        this.emitStateChange();
      }
    }
    // Mono
    else if (address === '/outputs/main/mono') {
      const isMono = value === 1;
      if (this.state.isMono !== isMono) {
        this.state.isMono = isMono;
        this.emitStateChange();
      }
    }
    // Meters
    else if (address === '/meters/1') {
      // Parse meter blob if available
      // This requires knowing the blob format (usually float32 array)
      // For now, we skip complex blob parsing to avoid crashes without proper testing
    }
  }

  private emitStateChange() {
    this.emit('stateChange', this.state);
  }

  private log(level: LogLevel, message: string) {
    this.emit('log', { level, message, timestamp: new Date() });
    if (this.isMockMode) {
      console.log(`[${level.toUpperCase()}] ${message}`);
    }
  }

  private extractIndexFromPath(path: string): number | null {
    const match = path.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }
}
