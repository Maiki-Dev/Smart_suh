/**
 * Sync + Android device/emulator дээр ажиллуулах.
 */
import { execSync } from 'node:child_process';
import { loadMobileEnv, logMobileServerUrl, mobileProjectRoot } from './mobile-env.mts';

loadMobileEnv();
logMobileServerUrl();

execSync('npx cap run android', { stdio: 'inherit', cwd: mobileProjectRoot, env: process.env });
