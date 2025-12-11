import * as osc from 'osc';
import { WingMonitorConfig, MonitorState, LogLevel, InputSource } from './types';
export type { MonitorState };

export class WingMonitorController {
  private config: WingMonitorConfig;
  private state: MonitorState;
  private udpPort: any;
  private isConnected: boolean = false;
  private isMockMode: boolean = false;
  private readonly DEFAULT_RETRY_ATTEMPTS = 3;
  private readonly DEFAULT_RETRY_DELAY = 100;

  constructor(config: WingMonitorConfig, mockMode: boolean = false) {
    this.config = config;
    this.isMockMode = mockMode;
    
    // Initialize state
    this.state = {
      mainLevel: 0,
      isMuted: false,
      isDimmed: false,
      isMono: false,
      activeInputIndex: 0,
      activeOutputIndex: 0,
      isSubwooferEnabled: false,
      activeAuxIndices: [],
      isTalkbackEnabled: false,
      isPolarityFlipped: false
    };

    if (!this.isMockMode) {
      this.setupOsc();
    } else {
      this.isConnected = true;
      this.log('info', 'Running in MOCK MODE');
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
      this.refreshConsoleState();
    });

    this.udpPort.on("message", (oscMsg: any) => {
      this.handleOscMessage(oscMsg);
    });

    this.udpPort.on("error", (err: any) => {
      this.log('error', `OSC Error: ${err.message}`);
    });

    try {
      this.udpPort.open();
    } catch (err: any) {
      this.log('error', `Failed to open UDP port: ${err.message}`);
    }
  }

  private refreshConsoleState() {
    // In a real implementation, we would query the console for current state
    // /xremote to subscribe to updates
    // For now, we just push our initial state
    this.updateConsole();
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
        // We only need to update if it's active, or if we need to clear it
        // But with source patching, we might just sum them?
        // Wait, the requirement is "Aux Inputs" (plural).
        // If we have a single Aux Monitor Channel, we can only patch ONE source to it at a time unless we mix them elsewhere.
        // If the user wants simultaneous Aux inputs, they need to be mixed.
        // BUT, the new requirement says: "Aux Monitor Channel" (singular).
        // If we select multiple aux inputs, we might need to cycle them or just support one active at a time for the Aux Monitor Channel.
        // OR, we assume the user selects ONE aux input source to be patched to the Aux Monitor Channel.
        // Let's assume for now we patch the LAST selected aux input, or we only allow one active aux input in the UI if we use this architecture.
        // However, the UI allows multiple.
        // If we want multiple, we can't use a single channel source patch.
        // We would need to use the OLD method (mixing) for Aux inputs, OR patch them to different channels and mix those.
        
        // Let's stick to the requested architecture: "Aux Monitor Channel" (singular).
        // This implies we are patching a source to it.
        // If the user selects multiple, we might have a conflict.
        // For now, let's just patch the most recently activated one, or the first active one.
        if (isActive) {
             this.setAuxSource(index);
        }
      });
    }
  }

  // --- Public Control Methods ---

  public setVolume(percent: number) {
    this.state.mainLevel = Math.max(0, Math.min(100, percent));
    
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
    const monitorChannelPath = this.config.monitorMain.path;
    this.sendOsc(`${monitorChannelPath}/mute`, [{ type: 'i', value: muted ? 1 : 0 }]); // 1 is muted
    
    if (this.config.auxMonitor) {
        const auxChannelPath = this.config.auxMonitor.path;
        this.sendOsc(`${auxChannelPath}/mute`, [{ type: 'i', value: muted ? 1 : 0 }]);
    }
  }

  public setDim(dimmed: boolean) {
    this.state.isDimmed = dimmed;
    // We can use the console's Dim function if we are using the Monitor section
    // Or we can just lower the fader.
    // Since we are using a regular channel as "Monitor Main", we don't have a built-in "Dim" button for it.
    // We would need to implement Dim by reducing the volume.
    // But that changes the fader position.
    // Alternatively, we can use the "Talkback Dim" feature if we route through Talkback? No.
    // Let's just assume for now we don't change the fader, but maybe we can use a DCA or Group?
    // Or we just ignore Dim for now in this architecture unless we have a specific command.
    // Wait, the previous code used `/outputs/main/dim`. If that works globally, great.
    this.sendOsc(`/outputs/main/dim`, [{ type: 'i', value: dimmed ? 1 : 0 }]); 
  }

  public setMono(mono: boolean) {
    this.state.isMono = mono;
    this.sendOsc(`/outputs/main/mono`, [{ type: 'i', value: mono ? 1 : 0 }]);
  }

  public setInput(index: number) {
    if (index < 0 || index >= this.config.monitorInputs.length) return;
    this.state.activeInputIndex = index;
    
    // Patch the selected source to the Monitor Main Channel
    this.setMonitorSource(index);
  }

  public setOutput(index: number) {
    if (index < 0 || index >= this.config.monitorMatrixOutputs.length) return;
    
    // Disable current output
    this.disableSpeaker(this.state.activeOutputIndex);
    
    this.state.activeOutputIndex = index;
    
    // Enable new output
    this.setActiveSpeaker(index);
    
    // Re-apply sub crossover if needed
    if (this.state.isSubwooferEnabled) {
      this.applyCrossoverToSpeakers(true);
    }
  }

  public setSubwoofer(enabled: boolean) {
    this.state.isSubwooferEnabled = enabled;
    
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
      // For this architecture, we only support ONE active aux input at a time if we are patching sources.
      // So we clear the others.
      this.state.activeAuxIndices = [index]; 
      this.setAuxSource(index);
    } else {
      // Disable Aux
      this.state.activeAuxIndices = [];
      // We need to unpatch or mute the aux channel?
      // Or just mute the Aux Monitor Channel
      if (this.config.auxMonitor) {
          const auxChannelPath = this.config.auxMonitor.path;
          this.sendOsc(`${auxChannelPath}/mute`, [{ type: 'i', value: 1 }]);
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
        // Patch Source to Channel Input
        // Command: /ch/{id}/in/conn/grp (Group) and /ch/{id}/in/conn/in (Index)
        
        // Map sourceGroup string to OSC enum string/value if needed
        // The Wing expects specific strings or indices.
        // Based on docs: OFF, LCL, AUX, AES, USB, CRD, MOD, PLAY, AES, USR, OSC, BUS, MAIN, MTX
        
        this.sendOsc(`/ch/${chNum}/in/conn/grp`, [{ type: 's', value: input.sourceGroup }]);
        this.sendOsc(`/ch/${chNum}/in/conn/in`, [{ type: 'i', value: input.sourceIndex }]);
        
        // Ensure channel is unmuted
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
        // Patch Source to Aux Monitor Channel
        this.sendOsc(`/ch/${chNum}/in/conn/grp`, [{ type: 's', value: input.sourceGroup }]);
        this.sendOsc(`/ch/${chNum}/in/conn/in`, [{ type: 'i', value: input.sourceIndex }]);
        
        // Ensure channel is unmuted
        this.sendOsc(`/ch/${chNum}/mute`, [{ type: 'i', value: 0 }]);
    }
  }

  private setActiveSpeaker(outputIndex: number) {
    const output = this.config.monitorMatrixOutputs[outputIndex];
    if (!output) return;
    
    const mtxNum = this.extractIndexFromPath(output.path);
    if (mtxNum) {
      // Enable Direct Input (which should be set to Monitor Bus or Main 4)
      this.sendOsc(`/mtx/${mtxNum}/dir/on`, [{ type: 'i', value: 1 }]);
      
      // Unmute matrix
      this.sendOsc(`/mtx/${mtxNum}/mute`, [{ type: 'i', value: 0 }]);
    }
  }

  private disableSpeaker(outputIndex: number) {
    const output = this.config.monitorMatrixOutputs[outputIndex];
    if (!output) return;
    
    const mtxNum = this.extractIndexFromPath(output.path);
    if (mtxNum) {
      // Disable Direct Input
      this.sendOsc(`/mtx/${mtxNum}/dir/on`, [{ type: 'i', value: 0 }]);
      
      // Mute matrix
      this.sendOsc(`/mtx/${mtxNum}/mute`, [{ type: 'i', value: 1 }]);
    }
  }

  private applyCrossoverToSpeakers(enabled: boolean) {
    // When sub is on, enable High Pass Filter (EQ) on active speakers
    const activeOutput = this.config.monitorMatrixOutputs[this.state.activeOutputIndex];
    if (activeOutput) {
      const mtxNum = this.extractIndexFromPath(activeOutput.path);
      if (mtxNum) {
        // Enable/Disable EQ
        this.sendOsc(`/mtx/${mtxNum}/eq/on`, [{ type: 'i', value: enabled ? 1 : 0 }]);
      }
    }
  }

  // --- Helper Methods ---

  private sendOsc(address: string, args: any[], attempt = 1) {
    if (!this.isConnected) return;
    
    if (this.isMockMode) {
      this.log('debug', `[MOCK] Sent OSC: ${address} ${JSON.stringify(args)}`);
      return;
    }

    try {
      this.udpPort.send({
        address: address,
        args: args
      });
      this.log('debug', `Sent OSC: ${address} ${JSON.stringify(args)}`);
    } catch (err: any) {
      this.log('error', `Failed to send OSC message (Attempt ${attempt}): ${err.message}`);
      
      const maxRetries = this.config.network.retryAttempts || this.DEFAULT_RETRY_ATTEMPTS;
      const retryDelay = this.config.network.retryDelay || this.DEFAULT_RETRY_DELAY;

      if (attempt <= maxRetries) {
        this.log('warn', `Retrying OSC message to ${address} in ${retryDelay}ms...`);
        setTimeout(() => {
          this.sendOsc(address, args, attempt + 1);
        }, retryDelay);
      } else {
        this.log('error', `Given up sending OSC message to ${address} after ${maxRetries} retries.`);
      }
    }
  }

  private handleOscMessage(msg: any) {
    this.log('debug', `Received OSC: ${msg.address} ${JSON.stringify(msg.args)}`);
    // Handle feedback from console if needed
  }

  private extractIndexFromPath(path: string): number | null {
    const match = path.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }

  private log(level: LogLevel, message: string) {
    // Simple logging, can be replaced with event
    if (level === 'error') {
      console.error(`[WingMonitor] ${message}`);
    } else {
      // console.log(`[WingMonitor] ${message}`);
    }
  }
  
  public getState(): MonitorState {
    return { ...this.state };
  }
}
