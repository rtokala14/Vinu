import { Stack } from 'expo-router';

export default function BooksLayout() {
  return (
    <Stack
      screenOptions={{
        animationDuration: 50,
        headerShown: false,
      }}
    />
  );
}
