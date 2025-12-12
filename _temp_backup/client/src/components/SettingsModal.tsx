import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Settings {
  volumeUnit: 'percent' | 'db';
  unityLevel: number; // The raw value (0-100) that corresponds to 0dB/100%
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: Settings) => void;
  initialSettings: Settings;
}

export function SettingsModal({ isOpen, onClose, onSave, initialSettings }: SettingsModalProps) {
  const [settings, setSettings] = useState<Settings>(initialSettings);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-neu-base p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-rajdhani font-bold text-2xl text-foreground tracking-wider">SETTINGS</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Volume Unit Setting */}
          <div className="space-y-2">
            <label className="font-rajdhani font-semibold text-foreground/80 block">Volume Display Unit</label>
            <div className="flex gap-4">
              <button
                onClick={() => setSettings({ ...settings, volumeUnit: 'percent' })}
                className={cn(
                  "flex-1 py-3 rounded-xl font-rajdhani font-bold transition-all",
                  settings.volumeUnit === 'percent'
                    ? "bg-accent text-accent-foreground shadow-[0_0_15px_rgba(var(--accent),0.3)]"
                    : "bg-neu-base neu-flat text-muted-foreground hover:text-foreground"
                )}
              >
                PERCENT (%)
              </button>
              <button
                onClick={() => setSettings({ ...settings, volumeUnit: 'db' })}
                className={cn(
                  "flex-1 py-3 rounded-xl font-rajdhani font-bold transition-all",
                  settings.volumeUnit === 'db'
                    ? "bg-accent text-accent-foreground shadow-[0_0_15px_rgba(var(--accent),0.3)]"
                    : "bg-neu-base neu-flat text-muted-foreground hover:text-foreground"
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
        </div>

        <div className="mt-8 flex justify-end">
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
