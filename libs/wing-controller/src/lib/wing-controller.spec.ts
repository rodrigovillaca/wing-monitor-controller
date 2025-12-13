import { WingMonitorController } from './wing-controller';
import { WingMonitorConfig } from '@wing-monitor/shared-models';
import { EventEmitter } from 'events';

// Mock osc library
const mockUdpPort = new EventEmitter() as any;
mockUdpPort.open = jest.fn();
mockUdpPort.close = jest.fn();
mockUdpPort.send = jest.fn();

jest.mock('osc', () => ({
  UDPPort: jest.fn(() => mockUdpPort)
}));

const mockConfig: WingMonitorConfig = {
  network: {
    ipAddress: '192.168.1.10',
    wingPort: 2223,
    localPort: 2224
  },
  monitorInputs: [
    { name: 'DAW', sourceGroup: 'AES50 A', sourceIndex: 1 },
    { name: 'Mac', sourceGroup: 'AES50 A', sourceIndex: 3 }
  ],
  monitorMatrixOutputs: [
    { name: 'Main', path: '/mtx/1' },
    { name: 'Alt', path: '/mtx/2' }
  ],
  monitorMain: { path: '/ch/40' },
  auxMonitor: { path: '/ch/39' },
  auxInputs: [
    { name: 'Bluetooth', sourceGroup: 'AUX', sourceIndex: 1 }
  ]
};

describe('WingMonitorController', () => {
  let controller: WingMonitorController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new WingMonitorController(mockConfig, false);
  });

  it('should initialize and open UDP port', () => {
    expect(mockUdpPort.open).toHaveBeenCalled();
  });

  it('should handle ready event', (done) => {
    controller.on('ready', () => {
      expect(controller.getState().mainLevel).toBe(0);
      done();
    });
    mockUdpPort.emit('ready');
  });

  it('should update state on incoming OSC message (Fader)', () => {
    mockUdpPort.emit('ready');
    
    mockUdpPort.emit('message', {
      address: '/ch/40/fdr',
      args: [{ value: 0.75 }]
    });

    expect(controller.getState().mainLevel).toBe(75);
  });

  it('should update state on incoming OSC message (Mute)', () => {
    mockUdpPort.emit('ready');
    
    mockUdpPort.emit('message', {
      address: '/ch/40/mute',
      args: [{ value: 1 }]
    });

    expect(controller.getState().isMuted).toBe(true);
    
    mockUdpPort.emit('message', {
      address: '/ch/40/mute',
      args: [{ value: 0 }]
    });

    expect(controller.getState().isMuted).toBe(false);
  });

  it('should send OSC commands when setting volume', () => {
    mockUdpPort.emit('ready');
    controller.setVolume(50);
    
    // Should queue command
    expect(controller.getQueue().length).toBeGreaterThan(0);
    
    // Should process queue (async)
    setTimeout(() => {
      expect(mockUdpPort.send).toHaveBeenCalledWith(expect.objectContaining({
        address: '/ch/40/fdr',
        args: [{ type: 'f', value: 0.5 }]
      }));
    }, 20);
  });

  it('should send keep-alive messages', () => {
    jest.useFakeTimers();
    mockUdpPort.emit('ready');
    
    jest.advanceTimersByTime(9000);
    
    // Should queue /xremote
    expect(controller.getQueue().some(cmd => cmd.address === '/xremote')).toBe(true);
    
    jest.useRealTimers();
  });
});
