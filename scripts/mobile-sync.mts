/**
 * .env / .env.local уншиж Capacitor sync хийнэ.
 */
import { execSync } from 'node:child_process';
import { loadMobileEnv, logMobileServerUrl, mobileProjectRoot } from './mobile-env.mts';

loadMobileEnv();
logMobileServerUrl();

execSync('npx cap sync', { stdio: 'inherit', cwd: mobileProjectRoot, env: process.env });
