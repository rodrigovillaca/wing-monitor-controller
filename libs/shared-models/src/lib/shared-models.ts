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

export interface InputSource {
  name: string;
  sourceGroup: string; // e.g., 'USB', 'AES50A', 'LCL'
  sourceIndex: number; // 1-based index
}

export interface SubwooferConfig extends AudioChannel {
  // Crossover frequency is handled manually on the console
  // This config just enables/disables the subwoofer matrix
}

export interface WingMonitorConfig {
  network: NetworkConfig;
  monitorMain: {
    path: string; // The fixed channel used for main monitor input (e.g., /ch/40)
    busPath: string; // The main bus path (e.g., /bus/4)
    trim?: number;
  };
  auxMonitor?: {
    path: string; // The fixed channel used for aux monitor input (e.g., /aux/8)
    trim?: number;
  };
  monitorInputs: InputSource[]; // List of physical sources to patch to monitorMain
  auxInputs?: InputSource[];    // List of physical sources to patch to auxMonitor
  monitorMatrixOutputs: AudioChannel[];
  subwoofer?: SubwooferConfig;
}

export interface MonitorState {
  mainLevel: number; // 0-100%
  auxLevel: number;  // 0-100%
  isMuted: boolean;
  isDimmed: boolean;
  isMono: boolean;
  activeInputIndex: number;
  activeAuxIndices: number[]; // Indices of active aux inputs
  activeOutputIndex: number;
  isSubwooferEnabled: boolean;
  isTalkbackEnabled: boolean;
  isPolarityFlipped: boolean;
  meters?: {
    left: number;  // Linear 0.0 - 1.0
    right: number; // Linear 0.0 - 1.0
  };
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const APP_CONFIG = {
  API_PORT: 3001,
  WEB_PORT: 3000,
};

export interface WebSocketMessage {
  type: 'STATE_UPDATE' | 'SETTINGS_UPDATE' | 'QUEUE_UPDATE' | 'LOGS_UPDATE' | 'LOG_ENTRY' | 'HEALTH_UPDATE';
  payload: any;
}
