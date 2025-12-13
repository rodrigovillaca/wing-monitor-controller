import fs from "fs/promises";
import path from "path";
import os from "os";
import { WingMonitorConfig } from '@wing-monitor/shared-models';

const HOME_DIR = os.homedir();
const SETTINGS_FILE = path.join(HOME_DIR, ".monitor-controller-settings");
const TEMPLATE_FILE = path.join(__dirname, "settings.template.json");

// Default config to use if none exists
const DEFAULT_WING_CONFIG: WingMonitorConfig = {
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
    { name: 'REF TRACK', sourceGroup: 'USB', sourceIndex: 3 },
    { name: 'CLIENT', sourceGroup: 'AES50A', sourceIndex: 1 },
  ],
  auxInputs: [
    { name: 'BLUETOOTH', sourceGroup: 'AUX', sourceIndex: 1 },
    { name: 'MINI JACK', sourceGroup: 'AUX', sourceIndex: 3 },
  ],
  monitorMatrixOutputs: [
    { name: 'KH120', path: '/mtx/1' },
    { name: 'JBL', path: '/mtx/2' },
    { name: 'AURATONE', path: '/mtx/3' }
  ],
  subwoofer: {
    path: '/mtx/4',
    trim: 0,
  }
};

export interface Settings {
  volumeUnit: "percent" | "db";
  unityLevel: number;
  wing: WingMonitorConfig;
}

export const DEFAULT_SETTINGS: Settings = {
  volumeUnit: "db",
  unityLevel: 75,
  wing: DEFAULT_WING_CONFIG
};

export async function loadSettings(): Promise<Settings> {
  try {
    // Check if settings file exists
    await fs.access(SETTINGS_FILE);
  } catch {
    // If not, try to copy from template, otherwise use defaults
    try {
      // Try to find template in current dir or build output
      // In production build, assets might be copied to root or specific folder
      // For now, we'll try to read it, if fail, write DEFAULT_SETTINGS
      // Use internal defaults if template file is missing or we are in dev mode
      const templateContent = JSON.stringify(DEFAULT_SETTINGS, null, 2);
      
      console.log(`Creating default settings file at ${SETTINGS_FILE}`);
      await fs.writeFile(SETTINGS_FILE, templateContent);
    } catch (err) {
      console.error("Failed to initialize settings file:", err);
      return DEFAULT_SETTINGS;
    }
  }

  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf-8");
    const loadedSettings = JSON.parse(data) as Settings;
    
    // Merge with defaults to ensure all fields exist (in case of schema updates)
    return {
      ...DEFAULT_SETTINGS,
      ...loadedSettings,
      wing: {
        ...DEFAULT_SETTINGS.wing,
        ...(loadedSettings.wing || {}),
        network: {
          ...DEFAULT_SETTINGS.wing.network,
          ...(loadedSettings.wing?.network || {})
        }
      }
    };
  } catch (err) {
    console.error("Failed to read settings file:", err);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error("Failed to save settings file:", err);
    throw err;
  }
}
