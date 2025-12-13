import { useState, useEffect, useRef } from 'react';
import { MonitorState } from '@wing-monitor/shared-models';

export interface ConfigItem {
  name: string;
  id: number;
}

export interface AppSettings {
  volumeUnit: 'percent' | 'db';
  unityLevel: number;
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

  useEffect(() => {
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
      return;
    }

    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // In development (port 3000), connect to backend on port 3001
    // In production, connect to same host/port
    const host = window.location.port === '3000' 
      ? `${window.location.hostname}:3001` 
      : window.location.host;
    const wsUrl = `${protocol}//${host}`;
    
    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to server');
        setIsConnected(true);
      };

      ws.onclose = () => {
        console.log('Disconnected from server');
        setIsConnected(false);
        // Reconnect after 2 seconds
        setTimeout(connect, 2000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'STATE_UPDATE') {
            setState(data.payload);
          } else if (data.type === 'CONFIG_UPDATE') {
            setInputs(data.payload.inputs);
            setAuxInputs(data.payload.auxInputs || []);
            setOutputs(data.payload.outputs);
          } else if (data.type === 'SETTINGS_UPDATE') {
            setSettings(data.payload);
          } else if (data.type === 'QUEUE_UPDATE') {
            setQueue(data.payload);
          }
        } catch (e) {
          console.error('Error parsing message', e);
        }
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendCommand = (type: string, payload: any) => {
    if (import.meta.env.VITE_MOCK_MODE === 'true') {
      console.log('Mock Command:', type, payload);
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
    clearQueue: () => sendCommand('CLEAR_QUEUE', null)
  };
}
