/**
 * Sync + Xcode нээх (зөвхөн macOS).
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  loadMobileEnv,
  logMobileServerUrl,
  mobileProjectRoot,
} from './mobile-env.mts';

loadMobileEnv();
logMobileServerUrl();

execSync('npx cap sync ios', { stdio: 'inherit', cwd: mobileProjectRoot, env: process.env });

const isMac = process.platform === 'darwin';
const iosDir = resolve(mobileProjectRoot, 'ios');

if (isMac) {
  execSync('npx cap open ios', { stdio: 'inherit', cwd: mobileProjectRoot, env: process.env });
  process.exit(0);
}

const xcodeProject = resolve(iosDir, 'App', 'App.xcodeproj');
const hasIosProject = existsSync(xcodeProject);

console.error('');
console.error('iPhone app build хийхэд Mac + Xcode шаардлагатай.');
console.error('Windows дээр зөвхөн ios/ төсөл бэлдэгдэнэ — build хийхгүй.');
console.error('');
if (hasIosProject) {
  console.error('Mac дээр (эсвэл MacStadium / cloud Mac):');
  console.error('  git pull');
  console.error('  npm install');
  console.error('  npm run mobile:ios');
  console.error('');
  console.error('Xcode нээгдсний дараа:');
  console.error('  1. Signing & Capabilities → Team (Apple ID)');
  console.error('  2. Simulator сонго (жишээ: iPhone 16)');
  console.error('  3. ▶ Run');
} else {
  console.error('Эхлээд: npx cap add ios');
}
console.error('');
console.error('Local dev (iOS Simulator): localhost:3000 ажиллана.');
console.error('Бодит iPhone: CAPACITOR_SERVER_URL=http://<Mac-ийн-IP>:3000');
console.error('Production: CAPACITOR_SERVER_URL=https://your-app.vercel.app');
console.error('');

process.exit(1);
