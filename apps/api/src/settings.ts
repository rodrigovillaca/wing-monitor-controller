import fs from "fs/promises";
import path from "path";

// Prefer CommonJS globals when available; fall back to cwd for dev runners.
// (Do not use import.meta here because the API build outputs CJS.)
const settingsDir: string =
  typeof __dirname !== "undefined" ? __dirname : process.cwd();

const SETTINGS_FILE: string = path.join(settingsDir, "settings.json");

export interface Settings {
  volumeUnit: "percent" | "db";
  unityLevel: number;
}

export const DEFAULT_SETTINGS: Settings = {
  volumeUnit: "percent",
  unityLevel: 100,
};

export async function loadSettings(): Promise<Settings> {
  try {
    const data: string = await fs.readFile(SETTINGS_FILE, "utf-8");
    return JSON.parse(data) as Settings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}
