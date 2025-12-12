import React, { useState, useEffect, useRef } from 'react';
import { VolumeKnob } from '@/components/VolumeKnob';
import { NeuButton } from '@/components/NeuButton';
import { StereoMeter } from '@/components/StereoMeter';
import { SettingsModal } from '@/components/SettingsModal';
import { 
  Mic2, 
  Speaker, 
  Waves, 
  Zap, 
  VolumeX, 
  Volume1, 
  ArrowLeftRight,
  Music2,
  Wifi,
  WifiOff,
  Settings as SettingsIcon
} from 'lucide-react';

interface MonitorState {
  mainLevel: number;
  isMuted: boolean;
  isDimmed: boolean;
  isMono: boolean;
  activeInputIndex: number;
  activeAuxIndices: number[];
  activeOutputIndex: number;
  isSubwooferEnabled: boolean;
  isTalkbackEnabled: boolean;
  isPolarityFlipped: boolean;
}

interface ConfigItem {
  name: string;
  id: number;
}

interface AppSettings {
  volumeUnit: 'percent' | 'db';
  unityLevel: number;
}

export default function MonitorController() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    volumeUnit: 'percent',
    unityLevel: 100
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
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
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

  return (
    <div className="min-h-screen bg-neu-base flex items-center justify-center p-8">
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSave={handleSaveSettings}
        initialSettings={settings}
      />
      <div className="neu-flat p-12 max-w-6xl w-full grid grid-cols-12 gap-8 relative overflow-hidden">
        {/* Settings Button */}
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors"
        >
          <SettingsIcon size={24} />
        </button>
        


        {/* Header / Branding */}
        <div className="col-span-12 flex justify-between items-center mb-4 border-b border-gray-300/30 pb-4">
          <h1 className="font-rajdhani font-bold text-3xl tracking-[0.2em] text-foreground">
            WING <span className="text-accent">MONITOR</span>
          </h1>
          <div className="flex gap-2 items-center">
            {isConnected ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#48bb78]" />
                <span className="font-rajdhani text-xs text-foreground/80">ONLINE</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_#f56565]" />
                <span className="font-rajdhani text-xs text-foreground/80">OFFLINE</span>
              </>
            )}
          </div>
        </div>

        {/* Left Section: Inputs */}
        <div className="col-span-3 flex flex-col gap-4">
          <h2 className="font-rajdhani font-semibold text-foreground/80 tracking-widest mb-2">SOURCES</h2>
          {inputs.length > 0 ? inputs.map((input) => (
            <NeuButton
              key={input.id}
              label={input.name}
              active={state.activeInputIndex === input.id}
              onClick={() => updateState({ activeInputIndex: input.id })}
              className="w-full h-20"
              ledColor="cyan"
              icon={<Music2 size={20} />}
            />
          )) : (
            <div className="text-center text-muted-foreground font-rajdhani py-8">Loading Inputs...</div>
          )}

          {/* Aux Inputs */}
          {auxInputs.length > 0 && (
            <>
              <div className="h-4" /> {/* Spacer */}
              <h2 className="font-rajdhani font-semibold text-foreground/80 tracking-widest mb-2">AUX INPUTS</h2>
              {auxInputs.map((input) => (
                <NeuButton
                  key={`aux-${input.id}`}
                  label={input.name}
                  active={state.activeAuxIndices.includes(input.id)}
                  onClick={() => toggleAux(input.id)}
                  className="w-full h-16"
                  ledColor="amber"
                  icon={<Wifi size={18} />}
                />
              ))}
            </>
          )}
        </div>

        {/* Center Section: Master Control */}
        <div className="col-span-6 flex flex-col items-center justify-between gap-8">
          
          {/* Top Controls */}
          <div className="flex gap-4 w-full justify-center">
            <NeuButton
              label="TALK"
              active={state.isTalkbackEnabled}
              onClick={() => updateState({ isTalkbackEnabled: !state.isTalkbackEnabled })}
              className="w-24 h-24 rounded-full"
              ledColor="red"
              icon={<Mic2 />}
            />
            <NeuButton
              label="MONO"
              active={state.isMono}
              onClick={() => updateState({ isMono: !state.isMono })}
              className="w-24 h-24 rounded-full"
              ledColor="amber"
              icon={<Waves />}
            />
            <NeuButton
              label="Ø FLIP"
              active={state.isPolarityFlipped}
              onClick={() => updateState({ isPolarityFlipped: !state.isPolarityFlipped })}
              className="w-24 h-24 rounded-full"
              ledColor="amber"
              icon={<ArrowLeftRight />}
            />
          </div>

          {/* Big Knob & Meters */}
          <div className="py-4 flex flex-col items-center gap-8 w-full">
            <StereoMeter left={state.mainLevel / 100} right={state.mainLevel / 100} />
            <div className="w-full max-w-[280px] aspect-square">
              <VolumeKnob 
                value={state.mainLevel} 
                onChange={(val) => updateState({ mainLevel: val })}
                className="w-full h-full"
                displayUnit={settings.volumeUnit}
                unityLevel={settings.unityLevel}
              />
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="flex gap-4 w-full justify-center">
            <NeuButton
              label="DIM"
              active={state.isDimmed}
              onClick={() => updateState({ isDimmed: !state.isDimmed })}
              className="w-32 h-20"
              ledColor="amber"
              icon={<Volume1 />}
            />
            <NeuButton
              label="MUTE"
              active={state.isMuted}
              onClick={() => updateState({ isMuted: !state.isMuted })}
              className="w-32 h-20"
              ledColor="red"
              icon={<VolumeX />}
            />
            <NeuButton
              label="SUB"
              active={state.isSubwooferEnabled}
              onClick={() => updateState({ isSubwooferEnabled: !state.isSubwooferEnabled })}
              className="w-32 h-20"
              ledColor="cyan"
              icon={<Zap />}
            />
          </div>
        </div>

        {/* Right Section: Outputs */}
        <div className="col-span-3 flex flex-col gap-4">
          <h2 className="font-rajdhani font-semibold text-foreground/80 tracking-widest mb-2 text-right">SPEAKERS</h2>
          {outputs.length > 0 ? outputs.map((output) => (
            <NeuButton
              key={output.id}
              label={output.name}
              active={state.activeOutputIndex === output.id}
              onClick={() => updateState({ activeOutputIndex: output.id })}
              className="w-full h-20"
              ledColor="cyan"
              icon={<Speaker size={20} />}
            />
          )) : (
            <div className="text-center text-muted-foreground font-rajdhani py-8">Loading Outputs...</div>
          )}
        </div>

      </div>
    </div>
  );
}
