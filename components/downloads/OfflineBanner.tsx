import * as Network from 'expo-network';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Text } from '~/components/ui/text';
import { CloudOff } from '~/lib/icons/CloudOff';

/**
 * Small pill shown only while the device has no network connection.
 * Self-contained — the integrator can place it anywhere (e.g. Home header).
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let mounted = true;

    const apply = (state: Network.NetworkState) => {
      if (!mounted) return;
      setOffline(state.isConnected === false || state.isInternetReachable === false);
    };

    Network.getNetworkStateAsync()
      .then(apply)
      .catch(() => {});
    const subscription = Network.addNetworkStateListener(apply);

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  if (!offline) return null;

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
      <View className="flex-row items-center justify-center gap-2 self-center rounded-full border border-border bg-muted px-3 py-1.5">
        <CloudOff size={14} className="text-muted-foreground" />
        <Text className="text-xs font-medium text-muted-foreground">
          Offline — playing downloads only
        </Text>
      </View>
    </Animated.View>
  );
}
