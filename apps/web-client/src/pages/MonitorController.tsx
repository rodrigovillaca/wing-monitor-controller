import React from 'react';
import { VolumeKnob } from '@/components/VolumeKnob';
import { NeuButton } from '@/components/NeuButton';
import { StereoMeter } from '@/components/StereoMeter';
import { SettingsModal } from '@/components/SettingsModal';
import { CommandQueueModal } from '@/components/CommandQueueModal';
import { LogViewerModal } from '@/components/LogViewerModal';
import { useMonitorController } from '@wing-monitor/monitor-frontend';
import { cn } from '@/lib/utils';
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
  Power,
  Settings as SettingsIcon,
  Terminal
} from 'lucide-react';

export default function MonitorController() {
  const {
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
    logs,
    connectionHealth,
    clearQueue,
    disconnect,
    connect,
    toggleMockMode
  } = useMonitorController();

  const [isQueueOpen, setIsQueueOpen] = React.useState(false);
  const [isLogsOpen, setIsLogsOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-neu-base flex items-center justify-center p-8">
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSave={handleSaveSettings}
        initialSettings={settings}
        onOpenQueue={() => {
          setIsSettingsOpen(false);
          setIsQueueOpen(true);
        }}
        onToggleMockMode={toggleMockMode}
      />
      <CommandQueueModal
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        queue={queue}
        onClear={clearQueue}
      />
      <LogViewerModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        logs={logs}
      />
      <div className="neu-flat p-12 max-w-6xl w-full grid grid-cols-12 gap-8 relative overflow-hidden">
        
        {/* Header / Branding */}
        <div className="col-span-12 flex justify-between items-center mb-4 border-b border-gray-300/30 pb-4 z-50 relative">
          <h1 className="font-rajdhani font-bold text-3xl tracking-[0.2em] text-foreground">
            WING <span className="text-accent">MONITOR</span>
          </h1>
          <div className="flex gap-4 items-center">
            <div className="flex gap-2 items-center border-r border-gray-300/30 pr-4">
              {isConnected ? (
                <>
                  <div className={cn(
                    "w-2 h-2 rounded-full shadow-[0_0_5px]",
                    connectionHealth === 'healthy' ? "bg-green-500 shadow-[#48bb78]" :
                    connectionHealth === 'unstable' ? "bg-yellow-500 shadow-[#ecc94b]" :
                    "bg-red-500 shadow-[#f56565]"
                  )} />
                  <span className="font-rajdhani text-xs text-foreground/80">
                    {connectionHealth === 'healthy' ? 'ONLINE' : 
                     connectionHealth === 'unstable' ? 'UNSTABLE' : 'OFFLINE'}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_#f56565]" />
                  <span className="font-rajdhani text-xs text-foreground/80">OFFLINE</span>
                </>
              )}
            </div>

            <button
              onClick={() => isConnected ? disconnect() : connect()}
              className={cn(
                "p-2 rounded-full transition-all duration-300 hover:bg-black/10 active:scale-95 outline-none",
                isConnected ? "text-green-500 hover:text-green-400" : "text-red-500 hover:text-red-400"
              )}
              title={isConnected ? "Disconnect" : "Connect"}
            >
              <Power size={24} className={cn(isConnected && "drop-shadow-[0_0_8px_rgba(72,187,120,0.8)]")} />
            </button>
          </div>
        </div>

        {/* Main Controls Container - Disabled when offline */}
        <div className={cn(
          "col-span-12 grid grid-cols-12 gap-8 transition-all duration-300",
          !isConnected && "opacity-50 pointer-events-none grayscale-[0.5]"
        )}>
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
              
              {/* Aux Volume Knob */}
              <div className="mt-4 flex flex-col items-center">
                <div className="w-24 h-24">
                  <VolumeKnob 
                    value={state.auxLevel} 
                    onChange={(val) => updateState({ auxLevel: val })}
                    className="w-full h-full"
                    displayUnit={settings.volumeUnit}
                    unityLevel={settings.unityLevel}
                  />
                </div>
                <span className="text-xs font-rajdhani text-muted-foreground mt-2">AUX LEVEL</span>
              </div>
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

        {/* Floating Action Buttons - Bottom Right */}
        <div className="absolute bottom-6 right-6 flex gap-2 z-50">
          <button
            onClick={() => setIsLogsOpen(true)}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/10 transition-colors"
            title="Backend Logs"
          >
            <Terminal size={24} />
          </button>
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/10 transition-colors"
            title="Settings"
          >
            <SettingsIcon size={24} />
          </button>
        </div>

      </div>
    </div>
  );
}
