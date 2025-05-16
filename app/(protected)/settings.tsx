import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLogout } from '~/api/queries/auth/auth';
import { Button } from '~/components/ui/button';
import { Switch } from '~/components/ui/switch';
import { Text } from '~/components/ui/text';
import { H1, H3 } from '~/components/ui/typography';
import { useColorScheme } from '~/lib/useColorScheme';
import { useAuthActions } from '~/stores/auth';

export default function SettingsPage() {
  const { toggleColorScheme, isDarkColorScheme } = useColorScheme();
  const { setAuthorized } = useAuthActions();
  const { mutate: logout } = useLogout({
    mutation: {
      onSuccess: () => {
        setAuthorized(false);
        // Set user to undefined
      },
    },
  });
  return (
    <SafeAreaView className="flex flex-1 gap-2 p-4">
      <H1>Settings</H1>
      <ScrollView className=" flex-1 p-4" contentContainerClassName="gap-4 grow">
        <View className=" flex flex-row items-center justify-between">
          <H3>Dark Mode</H3>
          <Switch onCheckedChange={toggleColorScheme} checked={isDarkColorScheme} />
        </View>
        <Button variant="destructive" onPress={() => logout({ data: { socketId: undefined } })}>
          <Text>Log Out</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
