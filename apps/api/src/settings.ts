import fs from "fs/promises";
import path from "path";
import os from "os";

const HOME_DIR = os.homedir();
const SETTINGS_FILE = path.join(HOME_DIR, ".monitor-controller-settings");
const TEMPLATE_FILE = path.join(__dirname, "settings.template.json");

export interface Settings {
  volumeUnit: "percent" | "db";
  unityLevel: number;
}

export const DEFAULT_SETTINGS: Settings = {
  volumeUnit: "percent",
  unityLevel: 0.75,
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
      let templateContent = JSON.stringify(DEFAULT_SETTINGS, null, 2);
      
      try {
          // Try reading template if it exists in the build output
          templateContent = await fs.readFile(TEMPLATE_FILE, "utf-8");
      } catch (e) {
          // Template file might not be in the same dir in dist, ignore and use defaults
          console.warn("Template file not found, using internal defaults");
      }

      await fs.writeFile(SETTINGS_FILE, templateContent);
    } catch (err) {
      console.error("Failed to initialize settings file:", err);
      return DEFAULT_SETTINGS;
    }
  }

  try {
    const data = await fs.readFile(SETTINGS_FILE, "utf-8");
    return JSON.parse(data) as Settings;
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
