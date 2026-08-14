/**
 * Sync + iOS simulator/device дээр ажиллуулах (macOS).
 */
import { execSync } from 'node:child_process';
import { loadMobileEnv, logMobileServerUrl, mobileProjectRoot } from './mobile-env.mts';

loadMobileEnv();
logMobileServerUrl();

if (process.platform !== 'darwin') {
  console.error('');
  console.error('npm run mobile:run:ios — зөвхөн Mac дээр ажиллана.');
  console.error('Windows: npm run mobile:android ашиглана.');
  console.error('');
  process.exit(1);
}

execSync('npx cap run ios', { stdio: 'inherit', cwd: mobileProjectRoot, env: process.env });
