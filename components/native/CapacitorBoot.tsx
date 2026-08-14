'use client';

import { useEffect } from 'react';

/**
 * Native app (Capacitor) дээр status bar, back товч, splash, safe-area тохируулна.
 * Web browser дээр юу ч хийхгүй.
 */
export function CapacitorBoot() {
  useEffect(() => {
    let backListener: { remove: () => void } | undefined;
    let themeObserver: MutationObserver | undefined;

    void (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;

        document.documentElement.classList.add('capacitor-native');

        const [{ StatusBar, Style }, { App }, { SplashScreen }] = await Promise.all([
          import('@capacitor/status-bar'),
          import('@capacitor/app'),
          import('@capacitor/splash-screen'),
        ]);

        const isDark = document.documentElement.classList.contains('dark');
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => undefined);
        await SplashScreen.hide().catch(() => undefined);

        backListener = await App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
            return;
          }
          void App.exitApp();
        });

        themeObserver = new MutationObserver(() => {
          const dark = document.documentElement.classList.contains('dark');
          void StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        });
      } catch {
        /* Capacitor байхгүй — web */
      }
    })();

    return () => {
      backListener?.remove();
      themeObserver?.disconnect();
    };
  }, []);

  return null;
}
