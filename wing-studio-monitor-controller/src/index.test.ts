import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WingMonitorController } from './index';
import { WingMonitorConfig } from './types';

// Mock the osc library
vi.mock('osc', () => {
  return {
    default: {
      UDPPort: vi.fn().mockImplementation(() => ({
        open: vi.fn(),
        send: vi.fn(),
        on: vi.fn(),
        close: vi.fn(),
      })),
    },
  };
});

describe('WingMonitorController', () => {
  let controller: WingMonitorController;
  const mockConfig: WingMonitorConfig = {
    network: {
      ipAddress: '127.0.0.1',
      localPort: 5000,
      remotePort: 5001,
    },
    monitorInputs: [
      { name: 'Input 1', sourceGroup: 'USB', sourceIndex: 1 },
      { name: 'Input 2', sourceGroup: 'USB', sourceIndex: 3 },
    ],
    auxInputs: [
      { name: 'Aux 1', sourceGroup: 'AUX', sourceIndex: 1 },
    ],
    monitorMatrixOutputs: [
      { name: 'Output 1', path: '/mtx/1' },
      { name: 'Output 2', path: '/mtx/2' },
    ],
    fixedMonitorChannels: {
      left: 39,
      right: 40,
    },
    monitorMain: {
      name: 'Monitor Main',
      path: '/ch/40', // Example path
    },
  };

  beforeEach(() => {
    // Reset mocks and create new instance
    vi.clearAllMocks();
    controller = new WingMonitorController(mockConfig, true); // Enable mock mode
  });

  it('should initialize with default state', () => {
    const state = controller.getState();
    expect(state.mainLevel).toBe(0);
    expect(state.isMuted).toBe(true); // Should start muted
    expect(state.isDimmed).toBe(false);
    expect(state.isMono).toBe(false);
    expect(state.activeInputIndex).toBe(0);
    expect(state.activeOutputIndex).toBe(0);
  });

  it('should set volume correctly', () => {
    controller.setVolume(75);
    expect(controller.getState().mainLevel).toBe(75);

    controller.setVolume(150); // Should clamp to 100
    expect(controller.getState().mainLevel).toBe(100);

    controller.setVolume(-10); // Should clamp to 0
    expect(controller.getState().mainLevel).toBe(0);
  });

  it('should toggle mute state', () => {
    controller.setMute(true);
    expect(controller.getState().isMuted).toBe(true);

    controller.setMute(false);
    expect(controller.getState().isMuted).toBe(false);
  });

  it('should toggle dim state', () => {
    controller.setDim(true);
    expect(controller.getState().isDimmed).toBe(true);

    controller.setDim(false);
    expect(controller.getState().isDimmed).toBe(false);
  });

  it('should toggle mono state', () => {
    controller.setMono(true);
    expect(controller.getState().isMono).toBe(true);

    controller.setMono(false);
    expect(controller.getState().isMono).toBe(false);
  });

  it('should change active input', () => {
    controller.setInput(1);
    expect(controller.getState().activeInputIndex).toBe(1);

    // Should ignore invalid index
    controller.setInput(99);
    expect(controller.getState().activeInputIndex).toBe(1);
  });

  it('should change active output', () => {
    controller.setOutput(1);
    expect(controller.getState().activeOutputIndex).toBe(1);

    // Should ignore invalid index
    controller.setOutput(99);
    expect(controller.getState().activeOutputIndex).toBe(1);
  });

  it('should toggle aux inputs', () => {
    controller.toggleAuxInput(0);
    expect(controller.getState().activeAuxIndices).toContain(0);

    controller.toggleAuxInput(0);
    expect(controller.getState().activeAuxIndices).not.toContain(0);
  });

  it('should toggle subwoofer', () => {
    controller.setSubwoofer(true);
    expect(controller.getState().isSubwooferEnabled).toBe(true);

    controller.setSubwoofer(false);
    expect(controller.getState().isSubwooferEnabled).toBe(false);
  });
});
