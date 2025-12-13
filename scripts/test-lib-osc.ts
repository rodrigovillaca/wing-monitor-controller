import { WingMonitorController } from '../libs/wing-controller/src/lib/wing-controller';
import { WingMonitorConfig } from '../libs/shared-models/src/lib/shared-models';

// Configuration
const config: WingMonitorConfig = {
  network: {
    ipAddress: '192.168.1.50', // Change to your Wing IP
    wingPort: 2223,
    localPort: 9001 // Use a different port to avoid conflict
  },
  monitorMain: {
    path: '/ch/40',
    busPath: '/bus/4',
    trim: 0
  },
  monitorInputs: [],
  monitorMatrixOutputs: [],
  auxInputs: []
};

console.log('--- Wing Console Library Test ---');
console.log(`Target: ${config.network.ipAddress}:${config.network.wingPort}`);

const controller = new WingMonitorController(config, false);

controller.on('ready', () => {
  console.log('Controller Ready!');

  // Test Volume Control
  console.log('Setting Volume to 50%...');
  controller.setVolume(50);

  setTimeout(() => {
    console.log('Setting Volume to 0%...');
    controller.setVolume(0);
  }, 2000);

  setTimeout(() => {
    console.log('Disconnecting...');
    controller.disconnect();
    process.exit(0);
  }, 4000);
});

controller.on('error', (err) => {
  console.error('Controller Error:', err);
});

controller.on('stateChanged', (state) => {
  console.log('State Updated:', state);
});

// Start connection
controller.connect();
