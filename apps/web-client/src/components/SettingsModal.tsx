import React, { useState, useEffect } from 'react';
import { X, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WingMonitorConfig } from '@wing-monitor/shared-models';

interface Settings {
  volumeUnit: 'percent' | 'db';
  unityLevel: number;
  wing?: WingMonitorConfig;
  mockMode?: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: Settings) => void;
  initialSettings: Settings;
  onOpenQueue: () => void;
  onToggleMockMode?: () => void;
}

export function SettingsModal({ isOpen, onClose, onSave, initialSettings, onOpenQueue, onToggleMockMode }: SettingsModalProps) {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [activeTab, setActiveTab] = useState<'general' | 'network' | 'inputs' | 'outputs' | 'subwoofer'>('general');

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings, isOpen]);

  if (!isOpen) return null;

  const updateWingConfig = (path: string, value: any) => {
    if (!settings.wing) return;
    
    const newWing = { ...settings.wing };
    const parts = path.split('.');
    let current: any = newWing;
    
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
    setSettings({ ...settings, wing: newWing });
  };

  const updateInput = (index: number, field: string, value: any) => {
    if (!settings.wing) return;
    const newInputs = [...settings.wing.monitorInputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    setSettings({
      ...settings,
      wing: { ...settings.wing, monitorInputs: newInputs }
    });
  };

  const updateOutput = (index: number, field: string, value: any) => {
    if (!settings.wing) return;
    const newOutputs = [...settings.wing.monitorMatrixOutputs];
    newOutputs[index] = { ...newOutputs[index], [field]: value };
    setSettings({
      ...settings,
      wing: { ...settings.wing, monitorMatrixOutputs: newOutputs }
    });
  };

  const renderGeneralTab = () => (
    <div className="space-y-6">
      {/* Mock Mode Toggle */}
      <div className="space-y-2 p-4 bg-neu-base neu-flat rounded-xl border border-accent/20">
        <div className="flex justify-between items-center">
          <div>
            <label className="font-rajdhani font-bold text-accent block">MOCK MODE</label>
            <p className="text-xs text-muted-foreground font-rajdhani">Simulate console connection for testing</p>
          </div>
          <button
            onClick={onToggleMockMode}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              settings.mockMode ? "bg-accent" : "bg-gray-700"
            )}
          >
            <div className={cn(
              "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
              settings.mockMode ? "left-7" : "left-1"
            )} />
          </button>
        </div>
      </div>

      {/* Volume Unit Setting */}
      <div className="space-y-2">
        <label className="font-rajdhani font-semibold text-foreground/80 block">Volume Display Unit</label>
        <div className="flex gap-4">
          <button
            onClick={() => setSettings({ ...settings, volumeUnit: 'percent' })}
            className={cn(
              "flex-1 py-3 rounded-xl font-rajdhani font-bold transition-all neu-btn",
              settings.volumeUnit === 'percent' && "active text-accent"
            )}
          >
            PERCENT (%)
          </button>
          <button
            onClick={() => setSettings({ ...settings, volumeUnit: 'db' })}
            className={cn(
              "flex-1 py-3 rounded-xl font-rajdhani font-bold transition-all neu-btn",
              settings.volumeUnit === 'db' && "active text-accent"
            )}
          >
            DECIBELS (dB)
          </button>
        </div>
      </div>

      {/* Unity Level Setting */}
      <div className="space-y-2">
        <label className="font-rajdhani font-semibold text-foreground/80 block">
          Unity Gain Level (0-100)
          <span className="ml-2 text-xs text-muted-foreground font-normal">
            Raw value that equals 0dB / 100%
          </span>
        </label>
        <input
          type="number"
          min="0"
          max="100"
          value={settings.unityLevel}
          onChange={(e) => setSettings({ ...settings, unityLevel: Number(e.target.value) })}
          className="w-full bg-neu-base neu-pressed p-3 rounded-xl text-foreground font-rajdhani font-bold outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>

      {/* Advanced Section */}
      <div className="pt-6 border-t border-gray-800/50">
        <h3 className="font-rajdhani font-semibold text-foreground/60 tracking-widest mb-4 text-sm">ADVANCED</h3>
        <button
          onClick={onOpenQueue}
          className="w-full bg-neu-base neu-flat hover:bg-gray-800/30 text-accent py-3 rounded-xl font-rajdhani font-bold transition-all border border-accent/20 hover:border-accent/50"
        >
          VIEW COMMAND QUEUE
        </button>
      </div>
    </div>
  );

  const renderNetworkTab = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="font-rajdhani font-semibold text-foreground/80 block">Wing IP Address</label>
        <input
          type="text"
          value={settings.wing?.network.ipAddress || ''}
          onChange={(e) => updateWingConfig('network.ipAddress', e.target.value)}
          className="w-full bg-neu-base neu-pressed p-3 rounded-xl text-foreground font-rajdhani font-bold outline-none focus:ring-2 focus:ring-accent/50"
          placeholder="192.168.1.70"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="font-rajdhani font-semibold text-foreground/80 block">Wing Port</label>
          <input
            type="number"
            value={settings.wing?.network.wingPort || 10024}
            onChange={(e) => updateWingConfig('network.wingPort', Number(e.target.value))}
            className="w-full bg-neu-base neu-pressed p-3 rounded-xl text-foreground font-rajdhani font-bold outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
        <div className="space-y-2">
          <label className="font-rajdhani font-semibold text-foreground/80 block">Local Port</label>
          <input
            type="number"
            value={settings.wing?.network.localPort || 9000}
            onChange={(e) => updateWingConfig('network.localPort', Number(e.target.value))}
            className="w-full bg-neu-base neu-pressed p-3 rounded-xl text-foreground font-rajdhani font-bold outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="font-rajdhani font-semibold text-foreground/80 block">Main Monitor Channel</label>
        <input
          type="text"
          value={settings.wing?.monitorMain.path || '/ch/40'}
          onChange={(e) => updateWingConfig('monitorMain.path', e.target.value)}
          className="w-full bg-neu-base neu-pressed p-3 rounded-xl text-foreground font-rajdhani font-bold outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>
    </div>
  );

  const renderInputsTab = () => (
    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
      {settings.wing?.monitorInputs.map((input, idx) => (
        <div key={idx} className="bg-neu-base neu-flat p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-rajdhani font-bold text-accent">Input {idx + 1}</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-rajdhani">Name</label>
              <input
                type="text"
                value={input.name}
                onChange={(e) => updateInput(idx, 'name', e.target.value)}
                className="w-full bg-neu-base neu-pressed p-2 rounded-lg text-sm font-rajdhani outline-none focus:ring-1 focus:ring-accent/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-rajdhani">Group</label>
              <input
                type="text"
                value={input.sourceGroup}
                onChange={(e) => updateInput(idx, 'sourceGroup', e.target.value)}
                className="w-full bg-neu-base neu-pressed p-2 rounded-lg text-sm font-rajdhani outline-none focus:ring-1 focus:ring-accent/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-rajdhani">Index</label>
              <input
                type="number"
                value={input.sourceIndex}
                onChange={(e) => updateInput(idx, 'sourceIndex', Number(e.target.value))}
                className="w-full bg-neu-base neu-pressed p-2 rounded-lg text-sm font-rajdhani outline-none focus:ring-1 focus:ring-accent/50"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderOutputsTab = () => (
    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
      {settings.wing?.monitorMatrixOutputs.map((output, idx) => (
        <div key={idx} className="bg-neu-base neu-flat p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-rajdhani font-bold text-accent">Output {idx + 1}</h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-rajdhani">Name</label>
              <input
                type="text"
                value={output.name}
                onChange={(e) => updateOutput(idx, 'name', e.target.value)}
                className="w-full bg-neu-base neu-pressed p-2 rounded-lg text-sm font-rajdhani outline-none focus:ring-1 focus:ring-accent/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-rajdhani">Path</label>
              <input
                type="text"
                value={output.path}
                onChange={(e) => updateOutput(idx, 'path', e.target.value)}
                className="w-full bg-neu-base neu-pressed p-2 rounded-lg text-sm font-rajdhani outline-none focus:ring-1 focus:ring-accent/50"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSubwooferTab = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="font-rajdhani font-semibold text-foreground/80 block">Subwoofer Matrix Path</label>
        <input
          type="text"
          value={settings.wing?.subwoofer?.path || '/mtx/4'}
          onChange={(e) => updateWingConfig('subwoofer.path', e.target.value)}
          className="w-full bg-neu-base neu-pressed p-3 rounded-xl text-foreground font-rajdhani font-bold outline-none focus:ring-2 focus:ring-accent/50"
          placeholder="/mtx/4"
        />
      </div>
      <div className="space-y-2">
        <label className="font-rajdhani font-semibold text-foreground/80 block">Trim (dB)</label>
        <input
          type="number"
          value={settings.wing?.subwoofer?.trim || 0}
          onChange={(e) => updateWingConfig('subwoofer.trim', Number(e.target.value))}
          className="w-full bg-neu-base neu-pressed p-3 rounded-xl text-foreground font-rajdhani font-bold outline-none focus:ring-2 focus:ring-accent/50"
        />
      </div>
      <div className="p-4 bg-neu-base neu-flat rounded-xl">
        <p className="text-sm text-muted-foreground font-rajdhani">
          Note: Crossover frequency and EQ settings should be configured directly on the Wing console's matrix EQ.
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-neu-base p-8 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-800 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-rajdhani font-bold text-2xl text-foreground tracking-wider">SETTINGS</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['general', 'network', 'inputs', 'outputs', 'subwoofer'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-lg font-rajdhani font-bold transition-all whitespace-nowrap neu-btn",
                activeTab === tab && "active text-accent"
              )}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === 'general' && renderGeneralTab()}
          {activeTab === 'network' && renderNetworkTab()}
          {activeTab === 'inputs' && renderInputsTab()}
          {activeTab === 'outputs' && renderOutputsTab()}
          {activeTab === 'subwoofer' && renderSubwooferTab()}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-800/50 flex justify-end">
          <button
            onClick={() => onSave(settings)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-rajdhani font-bold transition-all shadow-lg hover:shadow-green-500/20"
          >
            <Save size={18} />
            SAVE SETTINGS
          </button>
        </div>
      </div>
    </div>
  );
}
