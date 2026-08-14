/**
 * Sync + Android Studio нээх (Windows path auto-detect).
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  findAndroidStudioPath,
  loadMobileEnv,
  logMobileServerUrl,
  mobileProjectRoot,
} from './mobile-env.mts';

loadMobileEnv();
logMobileServerUrl();

execSync('npx cap sync android', { stdio: 'inherit', cwd: mobileProjectRoot, env: process.env });

const studioPath = findAndroidStudioPath();
const androidDir = resolve(mobileProjectRoot, 'android');

if (studioPath) {
  console.log(`Android Studio: ${studioPath}`);
  const result = spawnSync(studioPath, [androidDir], { stdio: 'inherit', shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
  process.exit(0);
}

console.error('');
console.error('Android Studio олдсонгүй.');
console.error('');
console.error('1) Суулгах: https://developer.android.com/studio');
console.error('2) Дахин: npm run mobile:android');
console.error('');
console.error('Гараар path заах (PowerShell):');
console.error('   $env:CAPACITOR_ANDROID_STUDIO_PATH="C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe"');
console.error('   npm run mobile:android');
console.error('');
console.error('Android Studioгүйгээр Gradle build:');
console.error('   cd android');
console.error('   .\\gradlew.bat assembleDebug');
console.error('');

process.exit(1);
