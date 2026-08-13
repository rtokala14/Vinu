import '../global.css';

import { ObservablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv';
import { use$ } from '@legendapp/state/react';
import { syncObservable } from '@legendapp/state/sync';
import { DefaultTheme, Theme, ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useLayoutEffect, useState } from 'react';
import { Appearance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { setAndroidNavigationBar } from '~/lib/android-navigation-bar';
import { NAV_THEME } from '~/lib/constants';
import { initOfflineSessionSync, pruneLocalProgress, reconcileDownloads } from '~/lib/downloads';
import { useColorScheme } from '~/lib/useColorScheme';
import { store$ } from '~/stores';

const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};

const DARK_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.dark,
};

SplashScreen.preventAutoHideAsync();

export { ErrorBoundary } from 'expo-router';

const queryClient = new QueryClient();

syncObservable(store$, {
  persist: {
    name: 'vinu-state',
    plugin: ObservablePersistMMKV,
  },
});

export default function Layout() {
  const { isDarkColorScheme, setColorScheme } = useColorScheme();
  const [isAppReady, setIsAppReady] = useState(false);

  const serverUrl = use$(store$.settings.serverUrl);
  const userToken = use$(store$.userToken);

  const isAuthorized = use$(store$.isAuthorized);

  useLayoutEffect(() => {
    async function prepareApp() {
      try {
        const theme = store$.settings.theme.peek();
        const resolvedTheme = theme === 'system' ? (Appearance.getColorScheme() ?? 'dark') : theme;
        setColorScheme(theme);
        setAndroidNavigationBar(resolvedTheme);

        // Downloads/offline: verify local files, arm the offline-session
        // ledger flush (network regain + app foreground), drop stale progress.
        void reconcileDownloads();
        initOfflineSessionSync();
        void pruneLocalProgress();

        if (serverUrl && userToken !== undefined) {
          try {
            const res = await axios.post(
              `${serverUrl}/api/authorize`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${userToken}`,
                },
                timeout: 3000,
              }
            );
            if (res.status === 200 && res.data.user) {
              store$.user.set(res.data.user);
            } else {
              store$.user.set(undefined);
            }
          } catch (error) {
            console.error('Auto-authorization failed: ', error);
            store$.user.set(undefined);
          }
        }
      } catch (e) {
        console.warn('Error during app preparation: ', e);
      } finally {
        setIsAppReady(true);
        SplashScreen.hideAsync();
      }
    }

    prepareApp();
  }, []);

  if (!isAppReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView>
        <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
          <StatusBar style={isDarkColorScheme ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              animationDuration: 50,
              headerShown: false,
            }}>
            <Stack.Protected guard={isAuthorized}>
              <Stack.Screen name="(protected)" options={{ animation: 'slide_from_right' }} />
            </Stack.Protected>
            <Stack.Protected guard={!isAuthorized}>
              <Stack.Screen name="auth" options={{ animation: 'slide_from_left' }} />
            </Stack.Protected>
          </Stack>
          <PortalHost />
        </ThemeProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
