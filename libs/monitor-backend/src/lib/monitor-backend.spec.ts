import { MonitorServer } from './monitor-backend';
import { WebSocketServer } from 'ws';
import { WingMonitorController } from '@wing-monitor/wing-controller';
import { createServer } from 'http';

jest.mock('ws');
jest.mock('@wing-monitor/wing-controller');
jest.mock('./settings', () => ({
  loadSettings: jest.fn().mockResolvedValue({ volumeUnit: 'db', unityLevel: 75 }),
  saveSettings: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('./config', () => ({
  config: {
    network: { ipAddress: '127.0.0.1', wingPort: 1234, localPort: 5678 },
    monitorInputs: [],
    monitorMatrixOutputs: [],
    auxInputs: []
  },
  MOCK_MODE: true
}));

describe('MonitorServer', () => {
  let server: any;
  let monitorServer: MonitorServer;
  let mockWss: any;
  let mockWingController: any;
  let mockWsClient: any;

  beforeEach(() => {
    server = createServer();
    
    // Mock WebSocket Server
    mockWss = {
      on: jest.fn(),
      clients: new Set()
    };
    (WebSocketServer as unknown as jest.Mock).mockImplementation(() => mockWss);
    
    // Mock Wing Controller
    mockWingController = {
      on: jest.fn(),
      getState: jest.fn().mockReturnValue({ mainLevel: 50 }),
      getQueue: jest.fn().mockReturnValue([]),
      setVolume: jest.fn(),
      setMute: jest.fn(),
      setDim: jest.fn(),
      setMono: jest.fn(),
      setInput: jest.fn(),
      setOutput: jest.fn(),
      setSubwoofer: jest.fn(),
      toggleAuxInput: jest.fn()
    };
    (WingMonitorController as unknown as jest.Mock).mockImplementation(() => mockWingController);

    monitorServer = new MonitorServer(server);
  });

  it('should initialize correctly', () => {
    expect(WebSocketServer).toHaveBeenCalledWith({ server });
    expect(WingMonitorController).toHaveBeenCalled();
  });

  it('should start and load settings', async () => {
    await monitorServer.start();
    // Check if event listeners are attached
    expect(mockWingController.on).toHaveBeenCalledWith('ready', expect.any(Function));
    expect(mockWingController.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockWingController.on).toHaveBeenCalledWith('stateChanged', expect.any(Function));
    expect(mockWingController.on).toHaveBeenCalledWith('queueUpdate', expect.any(Function));
    expect(mockWss.on).toHaveBeenCalledWith('connection', expect.any(Function));
  });

  describe('WebSocket Handling', () => {
    beforeEach(async () => {
      await monitorServer.start();
      
      // Extract connection handler
      const connectionHandler = mockWss.on.mock.calls.find((call: any) => call[0] === 'connection')[1];
      
      mockWsClient = {
        send: jest.fn(),
        on: jest.fn(),
        readyState: 1 // OPEN
      };
      
      // Simulate connection
      connectionHandler(mockWsClient);
    });

    it('should send initial state on connection', () => {
      expect(mockWsClient.send).toHaveBeenCalledWith(expect.stringContaining('STATE_UPDATE'));
      expect(mockWsClient.send).toHaveBeenCalledWith(expect.stringContaining('CONFIG_UPDATE'));
      expect(mockWsClient.send).toHaveBeenCalledWith(expect.stringContaining('SETTINGS_UPDATE'));
      expect(mockWsClient.send).toHaveBeenCalledWith(expect.stringContaining('QUEUE_UPDATE'));
    });

    it('should handle SET_VOLUME command', () => {
      const messageHandler = mockWsClient.on.mock.calls.find((call: any) => call[0] === 'message')[1];
      messageHandler(JSON.stringify({ type: 'SET_VOLUME', payload: 80 }));
      expect(mockWingController.setVolume).toHaveBeenCalledWith(80);
    });

    it('should handle SET_MUTE command', () => {
      const messageHandler = mockWsClient.on.mock.calls.find((call: any) => call[0] === 'message')[1];
      messageHandler(JSON.stringify({ type: 'SET_MUTE', payload: true }));
      expect(mockWingController.setMute).toHaveBeenCalledWith(true);
    });
  });
});
