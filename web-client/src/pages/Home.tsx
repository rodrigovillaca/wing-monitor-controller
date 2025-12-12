import React, { useEffect, useState, useRef } from 'react';
import { Knob } from '@/components/Knob';
import { Button } from '@/components/ui/button';
import { StereoMeter } from '@/components/StereoMeter';
import { MonitorState, WingMonitorConfig } from '@wing-monitor/shared-models';

// Define WebSocket message types
type WSMessage = 
  | { type: 'STATE_UPDATE'; payload: MonitorState }
  | { type: 'CONFIG_UPDATE'; payload: any };

export default function Home() {
  const [state, setState] = useState<MonitorState | null>(null);
  const [config, setConfig] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    // In dev, Vite runs on 3000 but server on 3001. In prod, same port.
    const port = process.env.NODE_ENV === 'development' ? '3001' : window.location.port;
    
    const ws = new WebSocket(`${protocol}//${host}:${port}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to Wing Monitor Server');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSMessage;
        if (data.type === 'STATE_UPDATE') {
          setState(data.payload);
        } else if (data.type === 'CONFIG_UPDATE') {
          setConfig(data.payload);
        }
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const sendCommand = (type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  };

  if (!state || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-xl">Connecting to Wing Console...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 p-8 font-sans select-none">
      <div className="max-w-6xl mx-auto grid grid-cols-12 gap-8">
        
        {/* Left Column: Source Selection */}
        <div className="col-span-3 flex flex-col gap-6">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Monitor Source</h2>
            <div className="flex flex-col gap-3">
              {config.inputs.map((input: any) => (
                <Button
                  key={input.id}
                  variant={state.activeInputIndex === input.id ? "default" : "secondary"}
                  className={`w-full justify-start h-12 text-lg transition-all ${
                    state.activeInputIndex === input.id 
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                  onClick={() => sendCommand('SET_INPUT', input.id)}
                >
                  <div className={`w-2 h-2 rounded-full mr-3 ${state.activeInputIndex === input.id ? 'bg-white' : 'bg-gray-500'}`} />
                  {input.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Aux Inputs</h2>
            <div className="flex flex-col gap-3">
              {config.auxInputs.map((input: any) => (
                <Button
                  key={input.id}
                  variant={state.activeAuxIndices.includes(input.id) ? "default" : "secondary"}
                  className={`w-full justify-start h-12 text-lg transition-all ${
                    state.activeAuxIndices.includes(input.id)
                      ? 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(22,163,74,0.5)]' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                  onClick={() => sendCommand('TOGGLE_AUX', input.id)}
                >
                  <div className={`w-2 h-2 rounded-full mr-3 ${state.activeAuxIndices.includes(input.id) ? 'bg-white' : 'bg-gray-500'}`} />
                  {input.name}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Column: Metering & Volume */}
        <div className="col-span-6 flex flex-col items-center justify-center gap-8 bg-gray-800/50 p-8 rounded-2xl border border-gray-700/50">
          
          {/* Stereo Meter */}
          <div className="w-full max-w-md mb-4">
             <StereoMeter left={state.meters?.left || 0} right={state.meters?.right || 0} />
          </div>

          {/* Big Volume Knob */}
          <div className="relative">
            <Knob 
              value={state.mainLevel} 
              onChange={(val) => sendCommand('SET_VOLUME', val)} 
              size={200}
            />
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-4xl font-bold text-blue-400 tabular-nums">
              {state.isMuted ? 'MUTE' : `${Math.round(state.mainLevel)}%`}
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex gap-4 mt-8">
            <Button
              variant={state.isDimmed ? "destructive" : "secondary"}
              className={`w-24 h-16 text-xl font-bold rounded-lg transition-all ${
                state.isDimmed ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-[0_0_15px_rgba(202,138,4,0.5)]' : 'bg-gray-700'
              }`}
              onClick={() => sendCommand('SET_DIM', !state.isDimmed)}
            >
              DIM
            </Button>
            <Button
              variant={state.isMuted ? "destructive" : "secondary"}
              className={`w-24 h-16 text-xl font-bold rounded-lg transition-all ${
                state.isMuted ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]' : 'bg-gray-700'
              }`}
              onClick={() => sendCommand('SET_MUTE', !state.isMuted)}
            >
              MUTE
            </Button>
            <Button
              variant={state.isMono ? "destructive" : "secondary"}
              className={`w-24 h-16 text-xl font-bold rounded-lg transition-all ${
                state.isMono ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_15px_rgba(234,88,12,0.5)]' : 'bg-gray-700'
              }`}
              onClick={() => sendCommand('SET_MONO', !state.isMono)}
            >
              MONO
            </Button>
          </div>
        </div>

        {/* Right Column: Output Selection */}
        <div className="col-span-3 flex flex-col gap-6">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Speakers</h2>
            <div className="flex flex-col gap-3">
              {config.outputs.map((output: any) => (
                <Button
                  key={output.id}
                  variant={state.activeOutputIndex === output.id ? "default" : "secondary"}
                  className={`w-full justify-start h-12 text-lg transition-all ${
                    state.activeOutputIndex === output.id 
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                  onClick={() => sendCommand('SET_OUTPUT', output.id)}
                >
                  <div className={`w-2 h-2 rounded-full mr-3 ${state.activeOutputIndex === output.id ? 'bg-white' : 'bg-gray-500'}`} />
                  {output.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Subwoofer</h2>
            <Button
              variant={state.isSubwooferEnabled ? "default" : "secondary"}
              className={`w-full justify-start h-12 text-lg transition-all ${
                state.isSubwooferEnabled 
                  ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-[0_0_15px_rgba(13,148,136,0.5)]' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              onClick={() => sendCommand('SET_SUBWOOFER', !state.isSubwooferEnabled)}
            >
              <div className={`w-2 h-2 rounded-full mr-3 ${state.isSubwooferEnabled ? 'bg-white' : 'bg-gray-500'}`} />
              SUB ENABLED
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
