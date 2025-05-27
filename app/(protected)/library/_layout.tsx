import { Stack } from 'expo-router';

export default function BaseLibraryLayout() {
  return (
    <Stack
      initialRouteName="(toptabs)"
      screenOptions={{ animationDuration: 50, headerShown: false }}>
      <Stack.Screen name="(screens)" />
      <Stack.Screen name="(toptabs)" />
    </Stack>
  );
}
