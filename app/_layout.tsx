import '../global.css';

import { DefaultTheme, Theme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useLayoutEffect, useState } from 'react';

import { setAndroidNavigationBar } from '~/lib/android-navigation-bar';
import { NAV_THEME } from '~/lib/constants';
import { useColorScheme } from '~/lib/useColorScheme';
import { useAuthActions, useAuthorized, useServerUrl, useUser } from '~/stores/auth';

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

export default function Layout() {
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  const [isAppReady, setIsAppReady] = useState(false);

  const isAuthorized = useAuthorized();
  const serverUrl = useServerUrl();
  const prevUser = useUser();
  const { setUser, setAuthorized } = useAuthActions();

  useLayoutEffect(() => {
    async function prepareApp() {
      try {
        setAndroidNavigationBar(colorScheme);

        if (isAuthorized) {
        } else if (serverUrl && prevUser?.token) {
          try {
            const res = await axios.post(
              `${serverUrl}/api/authorize`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${prevUser.token}`,
                },
                timeout: 3000,
              }
            );
            if (res.status === 200 && res.data.user) {
              setAuthorized(true);
              setUser(res.data.user);
            } else {
              setAuthorized(false);
            }
          } catch (error) {
            console.error('Auto-authorization failed: ', error);
            setAuthorized(false);
            setUser(undefined);
          }
        }
      } catch (e) {
        console.warn('Error during app preparation: ', e);
        setAuthorized(false);
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
      </ThemeProvider>
    </QueryClientProvider>
  );
}
