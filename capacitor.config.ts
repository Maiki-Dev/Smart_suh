import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Smart СӨХ — Capacitor тохиргоо.
 *
 * Энэ Next.js апп SSR + PostgreSQL ашигладаг тул mobile app нь
 * remote URL (WebView) горимоор ажиллана — бүх server/auth/API хэвээр.
 *
 * Sync хийхээс өмнө:
 *   set CAPACITOR_SERVER_URL=https://your-app.vercel.app
 *   npm run mobile:sync
 *
 * Local dev (Android emulator → host machine):
 *   set CAPACITOR_SERVER_URL=http://10.0.2.2:3000
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  '';

const config: CapacitorConfig = {
  appId: 'mn.itsafe.smartsokh',
  appName: 'Smart СӨХ',
  webDir: 'mobile/www',
  ...(serverUrl
    ? {
        server: {
          url: serverUrl.replace(/\/$/, ''),
          cleartext: serverUrl.startsWith('http://'),
          androidScheme: serverUrl.startsWith('https://') ? 'https' : 'http',
        },
      }
    : {}),
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1200,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
