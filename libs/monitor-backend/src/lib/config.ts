import { WingMonitorConfig } from '@wing-monitor/shared-models';

export const config: WingMonitorConfig = {
  network: {
    ipAddress: '192.168.1.70', // Replace with your WING's IP address
    wingPort: 10024,           // Default OSC port for WING
    localPort: 9000,           // Local UDP port for listening
    retryAttempts: 3,          // Number of retries for failed commands
    retryDelay: 100,           // Delay in ms between retries
  },
  monitorMain: {
    path: '/ch/40', // Fixed channel used for Monitor Input (Source Patching Destination)
    busPath: '/bus/4', // Main bus path
    trim: 0
  },
  auxMonitor: {
    path: '/aux/8', // Fixed channel used for Aux Input (Source Patching Destination)
    trim: 0
  },
  // INPUTS: Sources that will be patched to the Monitor Main channel
  monitorInputs: [
    { name: 'DAW 1-2', sourceGroup: 'USB', sourceIndex: 1 },   // USB 1/2
    { name: 'REF TRACK', sourceGroup: 'USB', sourceIndex: 3 }, // USB 3/4
    { name: 'CLIENT', sourceGroup: 'AES50A', sourceIndex: 1 }, // AES50 A 1/2
    // Example: Local Inputs (Microphones / Line In)
    // { name: 'MIC 1', sourceGroup: 'LCL', sourceIndex: 1 },   // Local Input 1
    // { name: 'LINE IN', sourceGroup: 'LCL', sourceIndex: 5 }, // Local Input 5
  ],
  // AUX INPUTS: Sources that will be patched to the Aux Monitor channel
  auxInputs: [
    { name: 'BLUETOOTH', sourceGroup: 'AUX', sourceIndex: 1 }, // AUX 1/2
    { name: 'MINI JACK', sourceGroup: 'AUX', sourceIndex: 3 }, // AUX 3/4
  ],
  // OUTPUTS: Matrix buses that feed your speakers
  // NOTE: You must route these Matrices to the physical outputs on your console:
  // Matrix 1 -> Local 1/2 (KH120)
  // Matrix 2 -> Local 3/4 (JBL)
  // Matrix 3 -> AES50 A 7/8 (Auratone)
  monitorMatrixOutputs: [
    { name: 'KH120', path: '/mtx/1' },
    { name: 'JBL', path: '/mtx/2' },
    { name: 'AURATONE', path: '/mtx/3' }
  ],
  subwoofer: {
    path: '/mtx/4',
    trim: 0,
    // Crossover is handled manually on the console EQ
  }
};

// Set to true to test the UI without a physical console connection
export const MOCK_MODE = true;
