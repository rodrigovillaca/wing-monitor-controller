export interface NetworkConfig {
  ipAddress: string;
  wingPort?: number;
  localPort?: number;
  retryAttempts?: number; // Number of retries for failed commands
  retryDelay?: number;    // Delay in ms between retries
}

export interface AudioChannel {
  path: string;
  trim?: number;
  name?: string;
}

export interface SubwooferConfig extends AudioChannel {
  // Crossover frequency is handled manually on the console
  // This config just enables/disables the subwoofer matrix
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
