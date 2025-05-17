import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLogout } from '~/api/queries/auth/auth';
import { ThemeToggle } from '~/components/ThemeToggle';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { H1, H3 } from '~/components/ui/typography';
import { store$ } from '~/stores';

export default function SettingsPage() {
  const { mutate: logout } = useLogout({
    mutation: {
      onSuccess: () => {
        store$.user.set(undefined);
        store$.userToken.set(undefined);
      },
      onError: (err) => {
        console.error(err);
      },
    },
  });
  return (
    <SafeAreaView className="flex flex-1 gap-2 p-4">
      <H1>Settings</H1>
      <ScrollView className=" flex-1 p-4" contentContainerClassName="gap-4 grow">
        <View className=" flex flex-row items-center justify-between">
          <H3>Dark Mode</H3>
          <ThemeToggle />
        </View>
        <Button variant="destructive" onPress={() => logout({ data: { socketId: undefined } })}>
          <Text>Log Out</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
