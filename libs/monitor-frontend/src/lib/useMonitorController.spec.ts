import { renderHook, act } from '@testing-library/react';
import { useMonitorController } from './useMonitorController';

let mockWsInstance: any;

class MockWebSocket {
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  send = jest.fn();
  close = jest.fn();
  readyState = 1; // OPEN

  constructor(public url: string) {
    mockWsInstance = this;
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }
}

global.WebSocket = MockWebSocket as any;

describe('useMonitorController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWsInstance = null;
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useMonitorController());
    expect(result.current.state.mainLevel).toBe(0);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.queue).toEqual([]);
  });

  it('should handle state updates from WebSocket', async () => {
    const { result } = renderHook(() => useMonitorController());

    // Wait for connection
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.isConnected).toBe(true);

    // Simulate incoming STATE_UPDATE
    act(() => {
      if (mockWsInstance && mockWsInstance.onmessage) {
        mockWsInstance.onmessage({
          data: JSON.stringify({
            type: 'STATE_UPDATE',
            payload: { mainLevel: 75, isMuted: true }
          })
        });
      }
    });

    expect(result.current.state.mainLevel).toBe(75);
    expect(result.current.state.isMuted).toBe(true);
  });

  it('should handle queue updates', async () => {
    const { result } = renderHook(() => useMonitorController());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const mockQueue = [{ address: '/test', args: [1] }];

    act(() => {
      if (mockWsInstance && mockWsInstance.onmessage) {
        mockWsInstance.onmessage({
          data: JSON.stringify({
            type: 'QUEUE_UPDATE',
            payload: mockQueue
          })
        });
      }
    });

    expect(result.current.queue).toEqual(mockQueue);
  });

  it('should send commands via WebSocket', async () => {
    const { result } = renderHook(() => useMonitorController());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    act(() => {
      result.current.updateState({ mainLevel: 50 });
    });

    expect(mockWsInstance.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'SET_VOLUME', payload: 50 })
    );
  });
});
