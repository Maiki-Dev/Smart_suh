import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

export function loadMobileEnv(): void {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(root, file);
    if (existsSync(path)) loadEnv({ path });
  }
}

export function getMobileServerUrl(): string | undefined {
  return (
    process.env.CAPACITOR_SERVER_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    undefined
  );
}

export function logMobileServerUrl(): string | undefined {
  const serverUrl = getMobileServerUrl();
  if (!serverUrl) {
    console.warn(
      'Анхаар: CAPACITOR_SERVER_URL эсвэл NEXT_PUBLIC_APP_URL тохируулаагүй — local shell ачаална.',
    );
    return undefined;
  }

  console.log(`Capacitor server URL: ${serverUrl}`);

  if (/localhost|127\.0\.0\.1/i.test(serverUrl)) {
    console.warn('');
    console.warn('⚠  localhost — платформоос хамаарна:');
    console.warn('   iOS Simulator (Mac):     http://localhost:3000 ✓');
    console.warn('   Android emulator:        http://10.0.2.2:3000');
    console.warn('   Бодит утас (Wi‑Fi):      http://192.168.x.x:3000');
    console.warn('   Production:              https://your-app.vercel.app');
    console.warn('');
  }

  return serverUrl;
}

export function findAndroidStudioPath(): string | undefined {
  const fromEnv = process.env.CAPACITOR_ANDROID_STUDIO_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const localAppData = process.env.LOCALAPPDATA ?? '';
  const candidates = [
    'C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe',
    'C:\\Program Files\\Android\\Android Studio\\bin\\studio.exe',
    localAppData
      ? `${localAppData}\\Programs\\Android Studio\\bin\\studio64.exe`
      : undefined,
    localAppData
      ? `${localAppData}\\Programs\\Android Studio\\bin\\studio.exe`
      : undefined,
  ].filter(Boolean) as string[];

  return candidates.find((path) => existsSync(path));
}

export { root as mobileProjectRoot };
