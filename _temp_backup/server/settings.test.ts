import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './settings';
import fs from 'fs/promises';

vi.mock('fs/promises');

describe('Server Settings', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads default settings if file does not exist', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('loads settings from file', async () => {
    const mockSettings = { volumeUnit: 'db', unityLevel: 80 };
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSettings));
    const settings = await loadSettings();
    expect(settings).toEqual(mockSettings);
  });

  it('saves settings to file', async () => {
    const newSettings = { volumeUnit: 'db' as const, unityLevel: 90 };
    await saveSettings(newSettings);
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('settings.json'),
      JSON.stringify(newSettings, null, 2)
    );
  });
});
