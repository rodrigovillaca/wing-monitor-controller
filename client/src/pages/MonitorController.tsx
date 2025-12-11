import React, { useState, useEffect, useRef } from 'react';
import { VolumeKnob } from '@/components/VolumeKnob';
import { NeuButton } from '@/components/NeuButton';
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
  WifiOff
} from 'lucide-react';

interface MonitorState {
  mainLevel: number;
  isMuted: boolean;
  isDimmed: boolean;
  isMono: boolean;
  activeInputIndex: number;
  activeOutputIndex: number;
  isSubwooferEnabled: boolean;
  isTalkbackEnabled: boolean;
  isPolarityFlipped: boolean;
}

interface ConfigItem {
  name: string;
  id: number;
}

export default function MonitorController() {
  const [state, setState] = useState<MonitorState>({
    mainLevel: 0,
    isMuted: false,
    isDimmed: false,
    isMono: false,
    activeInputIndex: 0,
    activeOutputIndex: 0,
    isSubwooferEnabled: false,
    isTalkbackEnabled: false,
    isPolarityFlipped: false
  });

  const [inputs, setInputs] = useState<ConfigItem[]>([]);
  const [outputs, setOutputs] = useState<ConfigItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
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
            setOutputs(data.payload.outputs);
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

  return (
    <div className="min-h-screen bg-neu-base flex items-center justify-center p-8">
      <div className="neu-flat p-12 max-w-6xl w-full grid grid-cols-12 gap-8 relative overflow-hidden">
        
        {/* Decorative Screws */}
        <div className="absolute top-4 left-4 w-4 h-4 rounded-full bg-neu-base shadow-[inset_2px_2px_4px_var(--neu-shadow-dark),inset_-2px_-2px_4px_var(--neu-shadow-light)] flex items-center justify-center">
          <div className="w-full h-[1px] bg-gray-400 rotate-45" />
          <div className="h-full w-[1px] bg-gray-400 rotate-45 absolute" />
        </div>
        <div className="absolute top-4 right-4 w-4 h-4 rounded-full bg-neu-base shadow-[inset_2px_2px_4px_var(--neu-shadow-dark),inset_-2px_-2px_4px_var(--neu-shadow-light)] flex items-center justify-center">
          <div className="w-full h-[1px] bg-gray-400 rotate-45" />
          <div className="h-full w-[1px] bg-gray-400 rotate-45 absolute" />
        </div>
        <div className="absolute bottom-4 left-4 w-4 h-4 rounded-full bg-neu-base shadow-[inset_2px_2px_4px_var(--neu-shadow-dark),inset_-2px_-2px_4px_var(--neu-shadow-light)] flex items-center justify-center">
          <div className="w-full h-[1px] bg-gray-400 rotate-45" />
          <div className="h-full w-[1px] bg-gray-400 rotate-45 absolute" />
        </div>
        <div className="absolute bottom-4 right-4 w-4 h-4 rounded-full bg-neu-base shadow-[inset_2px_2px_4px_var(--neu-shadow-dark),inset_-2px_-2px_4px_var(--neu-shadow-light)] flex items-center justify-center">
          <div className="w-full h-[1px] bg-gray-400 rotate-45" />
          <div className="h-full w-[1px] bg-gray-400 rotate-45 absolute" />
        </div>

        {/* Header / Branding */}
        <div className="col-span-12 flex justify-between items-center mb-4 border-b border-gray-300/30 pb-4">
          <h1 className="font-rajdhani font-bold text-3xl tracking-[0.2em] text-foreground/80">
            WING <span className="text-accent">MONITOR</span>
          </h1>
          <div className="flex gap-2 items-center">
            {isConnected ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#48bb78]" />
                <span className="font-rajdhani text-xs text-muted-foreground">ONLINE</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_#f56565]" />
                <span className="font-rajdhani text-xs text-muted-foreground">OFFLINE</span>
              </>
            )}
          </div>
        </div>

        {/* Left Section: Inputs */}
        <div className="col-span-3 flex flex-col gap-4">
          <h2 className="font-rajdhani font-semibold text-muted-foreground tracking-widest mb-2">SOURCES</h2>
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

          {/* Big Knob */}
          <div className="py-8">
            <VolumeKnob 
              value={state.mainLevel} 
              onChange={(val) => updateState({ mainLevel: val })}
              size={280}
            />
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
          <h2 className="font-rajdhani font-semibold text-muted-foreground tracking-widest mb-2 text-right">SPEAKERS</h2>
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
