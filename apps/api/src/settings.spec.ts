import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { loadSettings, saveSettings, Settings, DEFAULT_SETTINGS } from './settings';

const HOME_DIR = os.homedir();
const SETTINGS_FILE = path.join(HOME_DIR, '.monitor-controller-settings');

describe('Settings Persistence', () => {
  // Backup existing settings if any
  let backupSettings: string | null = null;

  beforeAll(async () => {
    try {
      backupSettings = await fs.readFile(SETTINGS_FILE, 'utf-8');
    } catch {
      backupSettings = null;
    }
  });

  afterAll(async () => {
    if (backupSettings) {
      await fs.writeFile(SETTINGS_FILE, backupSettings);
    } else {
      try {
        await fs.unlink(SETTINGS_FILE);
      } catch {}
    }
  });

  beforeEach(async () => {
    // Ensure clean state
    try {
      await fs.unlink(SETTINGS_FILE);
    } catch {}
  });

  it('should create settings file from default if it does not exist', async () => {
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
    
    // Verify file was created
    const fileContent = await fs.readFile(SETTINGS_FILE, 'utf-8');
    expect(JSON.parse(fileContent)).toEqual(DEFAULT_SETTINGS);
  });

  it('should save and load settings correctly', async () => {
    const newSettings: Settings = {
      volumeUnit: 'db',
      unityLevel: 0.85
    };

    await saveSettings(newSettings);
    
    const loadedSettings = await loadSettings();
    expect(loadedSettings).toEqual(newSettings);
    
    // Verify file content
    const fileContent = await fs.readFile(SETTINGS_FILE, 'utf-8');
    expect(JSON.parse(fileContent)).toEqual(newSettings);
  });

  it('should persist volumeUnit setting', async () => {
    // Explicitly test the requirement: "make sure the db/% setting is written somewhere in this file"
    const dbSettings: Settings = { ...DEFAULT_SETTINGS, volumeUnit: 'db' };
    await saveSettings(dbSettings);
    
    let content = JSON.parse(await fs.readFile(SETTINGS_FILE, 'utf-8'));
    expect(content.volumeUnit).toBe('db');

    const percentSettings: Settings = { ...DEFAULT_SETTINGS, volumeUnit: 'percent' };
    await saveSettings(percentSettings);
    
    content = JSON.parse(await fs.readFile(SETTINGS_FILE, 'utf-8'));
    expect(content.volumeUnit).toBe('percent');
  });
});
