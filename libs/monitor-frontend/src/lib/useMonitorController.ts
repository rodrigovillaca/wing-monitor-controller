import { useState, useEffect, useRef, useCallback } from 'react';
import { MonitorState, WingMonitorConfig } from '@wing-monitor/shared-models';

export interface ConfigItem {
  name: string;
  id: number;
}

export interface AppSettings {
  volumeUnit: 'percent' | 'db';
  unityLevel: number;
  wing?: WingMonitorConfig;
}

export interface CommandQueueItem {
  id: string;
  address: string;
  args: any[];
  status: 'pending' | 'sent' | 'failed';
  timestamp: number;
}

export function useMonitorController() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    volumeUnit: 'db',
    unityLevel: 75
  });

  const [state, setState] = useState<MonitorState>({
    mainLevel: 0,
    isMuted: false,
    isDimmed: false,
    isMono: false,
    activeInputIndex: 0,
    activeAuxIndices: [],
    activeOutputIndex: 0,
    isSubwooferEnabled: false,
    isTalkbackEnabled: false,
    isPolarityFlipped: false
  });

  const [inputs, setInputs] = useState<ConfigItem[]>([]);
  const [auxInputs, setAuxInputs] = useState<ConfigItem[]>([]);
  const [outputs, setOutputs] = useState<ConfigItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [queue, setQueue] = useState<CommandQueueItem[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const shouldReconnect = useRef(true);

  const connect = useCallback(() => {
    // Check for Mock Mode
    if (import.meta.env.VITE_MOCK_MODE === 'true') {
      console.log('Running in MOCK MODE');
      setIsConnected(true);
      setInputs([
        { id: 0, name: 'DAW 1-2' },
        { id: 1, name: 'Mac System' },
        { id: 2, name: 'Reference' }
      ]);
      setOutputs([
        { id: 0, name: 'Main Monitors' },
        { id: 1, name: 'Nearfields' },
        { id: 2, name: 'Mini Cube' }
      ]);
      setAuxInputs([
        { id: 10, name: 'Bluetooth' },
        { id: 11, name: 'Talkback Mic' }
      ]);
      
      // Initialize mock settings
      setSettings({
        volumeUnit: 'db',
        unityLevel: 75,
        wing: {
          network: {
            ipAddress: '192.168.1.70',
            wingPort: 10024,
            localPort: 9000,
            retryAttempts: 3,
            retryDelay: 100,
          },
          monitorMain: {
            path: '/ch/40',
            trim: 0
          },
          auxMonitor: {
            path: '/aux/8',
            trim: 0
          },
          monitorInputs: [
            { name: 'DAW 1-2', sourceGroup: 'USB', sourceIndex: 1 },
            { name: 'Mac System', sourceGroup: 'USB', sourceIndex: 3 },
            { name: 'Reference', sourceGroup: 'AES50A', sourceIndex: 1 },
          ],
          auxInputs: [
            { name: 'Bluetooth', sourceGroup: 'AUX', sourceIndex: 1 },
            { name: 'Talkback Mic', sourceGroup: 'AUX', sourceIndex: 3 },
          ],
          monitorMatrixOutputs: [
            { name: 'Main Monitors', path: '/mtx/1' },
            { name: 'Nearfields', path: '/mtx/2' },
            { name: 'Mini Cube', path: '/mtx/3' }
          ],
          subwoofer: {
            path: '/mtx/4',
            trim: 0,
          }
        }
      });
      return;
    }

    shouldReconnect.current = true;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // In development (port 3000), connect to backend on port 3001
    // In production, connect to same host/port
    const host = window.location.port === '3000' 
      ? `${window.location.hostname}:3001` 
      : window.location.host;
    const wsUrl = `${protocol}//${host}`;

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to server');
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log('Disconnected from server');
      setIsConnected(false);
      // Reconnect after 2 seconds only if allowed
      if (shouldReconnect.current) {
        setTimeout(connect, 2000);
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'STATE_UPDATE') {
          setState(data.payload);
        } else if (data.type === 'CONFIG_UPDATE') {
          console.log('Received CONFIG_UPDATE:', data.payload);
          setInputs(data.payload.inputs);
          setAuxInputs(data.payload.auxInputs || []);
          setOutputs(data.payload.outputs);
        } else if (data.type === 'SETTINGS_UPDATE') {
          console.log('Received SETTINGS_UPDATE:', data.payload);
          setSettings(data.payload);
        } else if (data.type === 'QUEUE_UPDATE') {
          setQueue(data.payload);
        }
      } catch (e) {
        console.error('Error parsing message', e);
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    if (import.meta.env.VITE_MOCK_MODE === 'true') {
      setIsConnected(false);
      return;
    }
    shouldReconnect.current = false;
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      shouldReconnect.current = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendCommand = (type: string, payload: any) => {
    if (import.meta.env.VITE_MOCK_MODE === 'true') {
      console.log('Mock Command:', type, payload);
      // Update local settings in mock mode
      if (type === 'SAVE_SETTINGS') {
        setSettings(payload);
        // Also update inputs/outputs if they changed
        if (payload.wing) {
          setInputs(payload.wing.monitorInputs.map((i: any, idx: number) => ({ id: idx, name: i.name })));
          setAuxInputs(payload.wing.auxInputs.map((i: any, idx: number) => ({ id: idx + 10, name: i.name })));
          setOutputs(payload.wing.monitorMatrixOutputs.map((o: any, idx: number) => ({ id: idx, name: o.name })));
        }
      }
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  };

  // Optimistic updates
  const updateState = (updates: Partial<MonitorState>) => {
    setState(prev => ({ ...prev, ...updates }));
    
    // Send commands based on updates
    if (updates.mainLevel !== undefined) sendCommand('SET_VOLUME', updates.mainLevel);
    if (updates.isMuted !== undefined) sendCommand('SET_MUTE', updates.isMuted);
    if (updates.isDimmed !== undefined) sendCommand('SET_DIM', updates.isDimmed);
    if (updates.isMono !== undefined) sendCommand('SET_MONO', updates.isMono);
    if (updates.activeInputIndex !== undefined) sendCommand('SET_INPUT', updates.activeInputIndex);
    if (updates.activeOutputIndex !== undefined) sendCommand('SET_OUTPUT', updates.activeOutputIndex);
    if (updates.isSubwooferEnabled !== undefined) sendCommand('SET_SUBWOOFER', updates.isSubwooferEnabled);
    if (updates.isPolarityFlipped !== undefined) sendCommand('SET_POLARITY', updates.isPolarityFlipped);
    if (updates.isTalkbackEnabled !== undefined) sendCommand('SET_TALKBACK', updates.isTalkbackEnabled);
  };

  const toggleAux = (index: number) => {
    // Optimistic update
    setState(prev => {
      const isActive = prev.activeAuxIndices.includes(index);
      const newIndices = isActive 
        ? prev.activeAuxIndices.filter(i => i !== index)
        : [...prev.activeAuxIndices, index];
      return { ...prev, activeAuxIndices: newIndices };
    });
    
    sendCommand('TOGGLE_AUX', index);
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    sendCommand('SAVE_SETTINGS', newSettings);
    setIsSettingsOpen(false);
  };

  return {
    state,
    settings,
    inputs,
    auxInputs,
    outputs,
    isConnected,
    isSettingsOpen,
    setIsSettingsOpen,
    updateState,
    toggleAux,
    handleSaveSettings,
    queue,
    clearQueue: () => sendCommand('CLEAR_QUEUE', null),
    disconnect,
    connect
  };
}
