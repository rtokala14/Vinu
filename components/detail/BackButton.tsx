import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronLeft } from '~/lib/icons/ChevronLeft';

/** Floating circular back button rendered over detail screens. */
export function BackButton() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={8}
      style={{ position: 'absolute', top: insets.top + 8, left: 16, zIndex: 50 }}
      className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card active:opacity-80">
      <ChevronLeft size={24} className="text-foreground" />
    </Pressable>
  );
}
