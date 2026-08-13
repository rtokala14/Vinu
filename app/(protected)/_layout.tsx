import { Stack } from 'expo-router';

export default function ProtectedLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="item/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="author/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="series/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="player"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      />
    </Stack>
  );
}
