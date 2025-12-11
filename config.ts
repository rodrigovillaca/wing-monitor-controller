import { WingMonitorConfig } from './wing-studio-monitor-controller/src/types';

export const config: WingMonitorConfig = {
  network: {
    ipAddress: '192.168.1.70', // Replace with your WING's IP address
    wingPort: 10024,           // Default OSC port for WING
    localPort: 9000,           // Local UDP port for listening
    retryAttempts: 3,          // Number of retries for failed commands
    retryDelay: 100,           // Delay in ms between retries
  },
  monitorMain: {
    path: '/ch/40', // Fixed channel used for Monitor Input
    trim: 0
  },
  auxMonitor: {
    path: '/aux/8', // Fixed channel used for Aux Input
    trim: 0
  },
  monitorInputs: [
    { name: 'DAW 1-2', sourceGroup: 'USB', sourceIndex: 1 }, // USB 1/2
    { name: 'REF TRACK', sourceGroup: 'USB', sourceIndex: 3 }, // USB 3/4
    { name: 'CLIENT', sourceGroup: 'AES50A', sourceIndex: 1 }, // AES50 A 1/2
  ],
  auxInputs: [
    { name: 'BLUETOOTH', sourceGroup: 'AUX', sourceIndex: 1 }, // AUX 1/2
    { name: 'MINI JACK', sourceGroup: 'AUX', sourceIndex: 3 }, // AUX 3/4
  ],
  monitorMatrixOutputs: [
    { name: 'MAIN MON', path: '/mtx/1' },
    { name: 'NEARFIELD', path: '/mtx/2' },
    { name: 'MINI CUBE', path: '/mtx/3' }
  ],
  subwoofer: {
    path: '/mtx/4',
    trim: 0,
    // Crossover is now handled manually on the console.
    // This config just enables/disables the subwoofer matrix.
  }
};

// Set to true to test the UI without a physical console connection
export const MOCK_MODE = true;
