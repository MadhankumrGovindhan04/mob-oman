import fs from 'node:fs';
import path from 'node:path';

export interface EnvConfig {
  googleEmail: string;
  googlePassword: string;
  appSearchTerm: string;
  androidAppPackage: string;
  appiumPort: number;
  deviceName: string;
  platformVersion: string;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". Set it locally in .env or as a CI secret.`,
    );
  }
  return value;
}

export function loadEnvConfig(): EnvConfig {
  return {
    googleEmail: requireEnv('GOOGLE_EMAIL'),
    googlePassword: requireEnv('GOOGLE_PASSWORD'),
    appSearchTerm: process.env.APP_SEARCH_TERM?.trim() || 'brisbanebroncos',
    androidAppPackage:
      process.env.ANDROID_APP_PACKAGE?.trim() || 'com.telstra.nrl.broncos',
    appiumPort: Number(process.env.APPIUM_PORT || 4723),
    deviceName: process.env.ANDROID_DEVICE_NAME?.trim() || 'Android Emulator',
    platformVersion: process.env.ANDROID_PLATFORM_VERSION?.trim() || '14',
  };
}

export const artifactDirs = {
  screenshots: path.resolve(process.cwd(), 'artifacts', 'screenshots'),
  logs: path.resolve(process.cwd(), 'artifacts', 'logs'),
};

export function ensureArtifactDirs(): void {
  fs.mkdirSync(artifactDirs.screenshots, { recursive: true });
  fs.mkdirSync(artifactDirs.logs, { recursive: true });
}
