export interface NetworkConfig {
  ipAddress: string;
  wingPort?: number;
  localPort?: number;
}

export interface AudioChannel {
  path: string;
  trim?: number;
  name?: string;
}

export interface SubwooferConfig extends AudioChannel {
  crossover?: number; // Frequency in Hz
}

export interface WingMonitorConfig {
  network: NetworkConfig;
  monitorMain: {
    path: string;
    trim?: number;
  };
  monitorInputs: AudioChannel[];
  monitorMatrixOutputs: AudioChannel[];
  subwoofer?: SubwooferConfig;
}

export interface MonitorState {
  mainLevel: number; // 0-100%
  isMuted: boolean;
  isDimmed: boolean;
  isMono: boolean;
  activeInputIndex: number;
  activeOutputIndex: number;
  isSubwooferEnabled: boolean;
  isTalkbackEnabled: boolean;
  isPolarityFlipped: boolean;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
