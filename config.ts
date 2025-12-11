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
    path: '/main/4',
    trim: 0
  },
  monitorInputs: [
    { name: 'DAW 1-2', path: '/ch/1' },
    { name: 'REF TRACK', path: '/ch/2' },
    { name: 'CLIENT', path: '/ch/3' },
    { name: 'BT AUDIO', path: '/ch/4' }
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
