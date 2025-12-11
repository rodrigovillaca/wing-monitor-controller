import * as osc from 'osc';
import { EventEmitter } from 'events';
import { 
  WingMonitorConfig, 
  MonitorState, 
  AudioChannel, 
  LogLevel 
} from './types';

export * from './types';

export class WingMonitorController extends EventEmitter {
  private config: WingMonitorConfig;
  private udpPort: any;
  private state: MonitorState;
  private isConnected: boolean = false;
  private isMockMode: boolean = false;

  // Default values
  private readonly DEFAULT_WING_PORT = 10024;
  private readonly DEFAULT_LOCAL_PORT = 9000;
  private readonly DIM_LEVEL_DB = -20;
  
  // OSC Path Constants
  private readonly PATH_MTX_BASE = '/mtx';
  private readonly PATH_MAIN_BASE = '/main';
  private readonly PATH_CH_BASE = '/ch';

  constructor(config: WingMonitorConfig, mockMode: boolean = false) {
    super();
    this.config = this.validateConfig(config);
    this.isMockMode = mockMode;
    
    this.state = {
      mainLevel: 0,
      isMuted: false,
      isDimmed: false,
      isMono: false,
      activeInputIndex: 0,
      activeOutputIndex: 0,
      isSubwooferEnabled: false,
      isTalkbackEnabled: false,
      isPolarityFlipped: false
    };

    this.setupOsc();
  }

  private validateConfig(config: WingMonitorConfig): WingMonitorConfig {
    if (!config.network.ipAddress) {
      throw new Error('Wing IP address is required');
    }
    
    return {
      ...config,
      network: {
        ...config.network,
        wingPort: config.network.wingPort || this.DEFAULT_WING_PORT,
        localPort: config.network.localPort || this.DEFAULT_LOCAL_PORT
      }
    };
  }

  private setupOsc() {
    if (this.isMockMode) {
      setTimeout(() => {
        this.isConnected = true;
        this.log('info', 'Mock OSC Connection ready');
        this.emit('ready');
        this.initializeWingState();
      }, 1000);
      return;
    }

    this.udpPort = new osc.UDPPort({
      localAddress: "0.0.0.0",
      localPort: this.config.network.localPort,
      remoteAddress: this.config.network.ipAddress,
      remotePort: this.config.network.wingPort,
      metadata: true
    });

    this.udpPort.on("ready", () => {
      this.isConnected = true;
      this.log('info', 'OSC Connection ready');
      this.emit('ready');
      this.initializeWingState();
    });

    this.udpPort.on("message", (oscMsg: any) => {
      this.handleOscMessage(oscMsg);
    });

    this.udpPort.on("error", (err: any) => {
      this.log('error', `OSC Error: ${err.message}`);
      this.emit('error', err);
    });
  }

  public connect() {
    try {
      this.udpPort.open();
    } catch (err: any) {
      this.log('error', `Failed to open UDP port: ${err.message}`);
    }
  }

  public close() {
    if (this.udpPort) {
      this.udpPort.close();
      this.isConnected = false;
    }
  }

  private initializeWingState() {
    // Set initial state on Wing console
    this.setMonitorSource(this.state.activeInputIndex);
    this.setActiveSpeaker(this.state.activeOutputIndex);
    this.updateVolume();
  }

  // --- Control Methods ---

  public setVolume(level: number) {
    // Level is 0-100
    this.state.mainLevel = Math.max(0, Math.min(100, level));
    this.updateVolume();
    this.emit('stateChanged', this.state);
  }

  public setMute(muted: boolean) {
    this.state.isMuted = muted;
    this.updateVolume(); // Mute is handled via fader level or actual mute
    this.emit('stateChanged', this.state);
  }

  public setDim(dimmed: boolean) {
    this.state.isDimmed = dimmed;
    this.updateVolume();
    this.emit('stateChanged', this.state);
  }

  public setMono(mono: boolean) {
    this.state.isMono = mono;
    
    // Apply mono to active output matrix
    const activeOutput = this.config.monitorMatrixOutputs[this.state.activeOutputIndex];
    if (activeOutput) {
      // Assuming matrix mono command is /mtx/x/mon (A+B for mono)
      // We need to parse the matrix number from the path
      const mtxNum = this.extractIndexFromPath(activeOutput.path);
      if (mtxNum) {
        // 0 = Stereo (A, B), 1 = Mono (A+B) - Need to verify exact values
        // Based on docs: /mtx/1/mon is string enum A, B, A+B
        // Or /mtx/1/busmono is 0..1
        this.sendOsc(`/mtx/${mtxNum}/busmono`, [{ type: 'i', value: mono ? 1 : 0 }]);
      }
    }
    
    this.emit('stateChanged', this.state);
  }

  public setInputSource(index: number) {
    if (index >= 0 && index < this.config.monitorInputs.length) {
      this.state.activeInputIndex = index;
      this.setMonitorSource(index);
      this.emit('stateChanged', this.state);
    }
  }

  public setOutputSpeaker(index: number) {
    if (index >= 0 && index < this.config.monitorMatrixOutputs.length) {
      // Disable current speaker
      this.disableSpeaker(this.state.activeOutputIndex);
      
      this.state.activeOutputIndex = index;
      
      // Enable new speaker
      this.setActiveSpeaker(index);
      
      // Re-apply mono state if needed
      if (this.state.isMono) {
        this.setMono(true);
      }
      
      this.emit('stateChanged', this.state);
    }
  }

  public setSubwoofer(enabled: boolean) {
    if (!this.config.subwoofer) return;
    
    this.state.isSubwooferEnabled = enabled;
    
    // Enable/disable subwoofer matrix
    const subMtxNum = this.extractIndexFromPath(this.config.subwoofer.path);
    if (subMtxNum) {
      // Toggle direct input for subwoofer
      this.sendOsc(`/mtx/${subMtxNum}/dir/on`, [{ type: 'i', value: enabled ? 1 : 0 }]);
    }
    
    // Apply crossover EQ to main speakers if subwoofer is on
    this.applyCrossoverToSpeakers(enabled);
    
    this.emit('stateChanged', this.state);
  }

  public setPolarity(flipped: boolean) {
    this.state.isPolarityFlipped = flipped;
    
    // Flip polarity on ONE side of the active stereo pair (usually Left)
    const activeOutput = this.config.monitorMatrixOutputs[this.state.activeOutputIndex];
    if (activeOutput) {
      const mtxNum = this.extractIndexFromPath(activeOutput.path);
      if (mtxNum) {
        // /mtx/1/in/set/inv - This inverts both? Or need to find per-channel invert
        // For matrix, it might be the input invert.
        // If we want null check, we need to invert one side.
        // If matrix is stereo linked, we might need to access individual sides if possible
        // Or use width -100?
        
        // For now, let's try inverting the matrix input
        this.sendOsc(`/mtx/${mtxNum}/in/set/inv`, [{ type: 'i', value: flipped ? 1 : 0 }]);
      }
    }
    
    this.emit('stateChanged', this.state);
  }

  // --- Internal Logic ---

  private updateVolume() {
    let levelDb = this.mapPercentToDb(this.state.mainLevel);
    
    if (this.state.isMuted) {
      levelDb = -144; // Effectively mute
    } else if (this.state.isDimmed) {
      levelDb -= 20; // Dim by 20dB
    }
    
    // Apply to active matrix output
    const activeOutput = this.config.monitorMatrixOutputs[this.state.activeOutputIndex];
    if (activeOutput) {
      const mtxNum = this.extractIndexFromPath(activeOutput.path);
      if (mtxNum) {
        // We control the Matrix Fader Level
        this.sendOsc(`/mtx/${mtxNum}/fdr`, [{ type: 'f', value: levelDb }]);
        
        // Also update subwoofer if enabled
        if (this.state.isSubwooferEnabled && this.config.subwoofer) {
          const subMtxNum = this.extractIndexFromPath(this.config.subwoofer.path);
          if (subMtxNum) {
            // Subwoofer follows main volume
            // Apply trim if defined
            const subTrim = this.config.subwoofer.trim || 0;
            this.sendOsc(`/mtx/${subMtxNum}/fdr`, [{ type: 'f', value: levelDb + subTrim }]);
          }
        }
      }
    }
  }

  private setMonitorSource(inputIndex: number) {
    const input = this.config.monitorInputs[inputIndex];
    if (!input) return;

    // We need to route the selected input to the Monitor Main Bus
    // This is complex on Wing. 
    // Strategy: 
    // 1. The Monitor Main Bus (e.g. /main/4) is the source for all Matrix outputs
    // 2. We need to send the selected Input Channel to Main 4
    
    // Unassign previous input from Main 4 (if we tracked it)
    // Ideally, we clear Main 4 or we just exclusive solo?
    // Better approach: 
    // Use the Monitor Source selector if accessible via OSC
    // OR
    // Route the input channel to Main 4.
    
    // Let's assume we route Channel -> Main 4
    const chNum = this.extractIndexFromPath(input.path);
    if (chNum) {
      // Enable send to Main 4 for this channel
      // Command: /ch/1/mix/14/on (if 14 is Main 4? Need to check routing)
      // Or simply use the Main 4 bus as a collector.
      
      // Alternative: Change the Direct Input source of the Matrix to the selected channel?
      // Matrix Direct Input Source options: OFF, AES, MON.A, MON.B, MON.BUS
      // It seems Matrix Direct In is limited.
      
      // Re-reading requirements: "Wing Monitor section will have as source the channel that's on monitor-main."
      // "Active speaker(s) matrixes are set to direct input from monitor speaker."
      
      // So:
      // 1. Matrix Direct In Source = MON.BUS (or MON.A)
      // 2. We need to change what feeds the Monitor Bus.
      // The Monitor Bus usually follows Solo or a specific source.
      
      // If we can't easily change Monitor Source via OSC, we might need to use a Main Bus (e.g. Main 4)
      // and route inputs to Main 4.
      // Then set Matrix Direct In Source to Main 4? 
      // Docs say Matrix Direct In Source options: OFF, AES, MON.A, MON.B, MON.BUS.
      // It doesn't list Main 4 directly.
      
      // However, Matrix INPUT (not direct in) can be sourced from Main 4.
      // /mtx/1/in/conn/grp -> MAIN
      // /mtx/1/in/conn/in -> 4
      
      // So:
      // 1. Configure Matrix 1-8 to take input from Main 4.
      // 2. Configure Input Channels to send to Main 4.
      
      // To switch inputs:
      // We need to unmute the send from the new input to Main 4, and mute others.
      // This implies we need to know ALL inputs to mute the unused ones.
      
      // For this implementation, let's assume we are unmuting the channel itself
      // and the channel is permanently routed to Main 4.
      // OR better: We use the "Main 4" bus as our "Monitor Bus".
      // We toggle the assignment of the channel to Main 4.
      
      // Command to assign Channel X to Main 4:
      // /ch/x/main/4/on (Need to verify exact path for Main assignment)
      // Looking at docs: /ch/1/main/1/on ... /ch/1/main/4/on is likely
      // Actually docs say: /ch/1/main/on is for Main 1?
      // Let's check Channel Sends.
      
      // If we can't find exact assignment, we might just use the channel mute?
      // But that mutes it for FOH too.
      
      // Let's assume for now we are just selecting which channel is "active" 
      // and we might rely on the user having routed them to Main 4.
      // But the requirement says "The Inputs should be mapped to the actual physical inputs".
      
      // Let's try to set the Monitor Source if possible.
      // If not, we'll assume the "Main 4" strategy.
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
        
        // If enabled, ensure it's a High Pass
        if (enabled && this.config.subwoofer?.crossover) {
          // Set Low Cut / High Pass frequency
          // /mtx/1/eq/lc/f (if exists) or use band 1 as HPF
          // Docs: /mtx/1/eq/hf, /mtx/1/eq/lf
          // Let's use /mtx/1/eq/lf (Low Frequency)
          this.sendOsc(`/mtx/${mtxNum}/eq/lf`, [{ type: 'f', value: this.config.subwoofer.crossover }]);
        }
      }
    }
  }

  // --- Helper Methods ---

  private sendOsc(address: string, args: any[]) {
    if (!this.isConnected) return;
    
    if (this.isMockMode) {
      this.log('debug', `[MOCK] Sent OSC: ${address} ${JSON.stringify(args)}`);
      return;
    }

    this.udpPort.send({
      address: address,
      args: args
    });
    
    this.log('debug', `Sent OSC: ${address} ${JSON.stringify(args)}`);
  }

  private handleOscMessage(msg: any) {
    this.log('debug', `Received OSC: ${msg.address} ${JSON.stringify(msg.args)}`);
    // Handle feedback from console if needed
  }

  private extractIndexFromPath(path: string): number | null {
    const match = path.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }

  private mapPercentToDb(percent: number): number {
    // Logarithmic mapping from 0-100% to -144dB to +10dB
    if (percent <= 0) return -144;
    if (percent >= 100) return 10;
    
    // Simple approximation
    // 50% = -10dB? 
    // Let's use a standard audio taper
    return (Math.log10(percent / 100) * 40) + 10; // Adjust curve as needed
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
