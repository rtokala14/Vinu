import { use$ } from '@legendapp/state/react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLogout } from '~/api/queries/auth/auth';
import { ThemeToggle } from '~/components/ThemeToggle';
import { LibrarySwitcher } from '~/components/home/LibrarySwitcher';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';
import { Text } from '~/components/ui/text';
import { H1, Muted } from '~/components/ui/typography';
import { FastForward } from '~/lib/icons/FastForward';
import { Gauge } from '~/lib/icons/Gauge';
import { LogOut } from '~/lib/icons/LogOut';
import { Rewind } from '~/lib/icons/Rewind';
import { Server } from '~/lib/icons/Server';
import { User } from '~/lib/icons/User';
import { cn } from '~/lib/utils';
import { clearAuth, store$ } from '~/stores';

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];
const JUMP_OPTIONS = [10, 15, 30, 60];

function SectionTitle({ children }: { children: string }) {
  return <Muted className="px-1 text-xs font-semibold uppercase tracking-wider">{children}</Muted>;
}

function OptionPills<T extends number>({
  options,
  value,
  onSelect,
  format,
}: {
  options: T[];
  value: T;
  onSelect: (option: T) => void;
  format: (option: T) => string;
}) {
  return (
    <View className="flex-row gap-2">
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            className={cn(
              'items-center justify-center rounded-full border px-3 py-1.5',
              selected ? 'border-primary bg-primary' : 'border-border bg-background'
            )}>
            <Text
              className={cn(
                'text-sm font-medium',
                selected ? 'text-primary-foreground' : 'text-muted-foreground'
              )}>
              {format(option)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SettingsPage() {
  const user = use$(store$.user);
  const serverUrl = use$(store$.settings.serverUrl);
  const playbackRate = use$(store$.settings.playbackRate);
  const jumpForwardSec = use$(store$.settings.jumpForwardSec);
  const jumpBackwardsSec = use$(store$.settings.jumpBackwardsSec);

  const { mutate: logout, isPending } = useLogout({
    mutation: {
      onError: (err) => {
        console.error(err);
      },
      onSettled: () => {
        clearAuth();
      },
    },
  });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="px-6 pb-4 pt-2">
        <H1 className="text-3xl">Settings</H1>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-6 pb-8">
        <View className="gap-2">
          <SectionTitle>Account</SectionTitle>
          <Card className="gap-4 p-4">
            <View className="flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                <User size={22} className="text-primary" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold">{user?.username ?? 'Unknown user'}</Text>
                <View className="flex-row items-center gap-1.5">
                  <Server size={12} className="text-muted-foreground" />
                  <Muted className="text-xs" numberOfLines={1}>
                    {serverUrl || 'No server'}
                  </Muted>
                </View>
              </View>
            </View>
            <Button
              variant="destructive"
              disabled={isPending}
              className="flex-row items-center gap-2"
              onPress={() => logout({ data: { socketId: undefined } })}>
              <LogOut size={16} className="text-destructive-foreground" />
              <Text>Log Out</Text>
            </Button>
          </Card>
        </View>

        <View className="gap-2">
          <SectionTitle>Appearance</SectionTitle>
          <Card className="p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-medium">Dark mode</Text>
              <ThemeToggle />
            </View>
          </Card>
        </View>

        <View className="gap-2">
          <SectionTitle>Playback</SectionTitle>
          <Card className="gap-4 p-4">
            <View className="gap-2.5">
              <View className="flex-row items-center gap-2">
                <Gauge size={15} className="text-primary" />
                <Text className="text-base font-medium">Default speed</Text>
              </View>
              <OptionPills
                options={SPEED_OPTIONS}
                value={playbackRate}
                onSelect={(option) => store$.settings.playbackRate.set(option)}
                format={(option) => `${option}x`}
              />
            </View>
            <Separator />
            <View className="gap-2.5">
              <View className="flex-row items-center gap-2">
                <FastForward size={15} className="text-primary" />
                <Text className="text-base font-medium">Jump forward</Text>
              </View>
              <OptionPills
                options={JUMP_OPTIONS}
                value={jumpForwardSec}
                onSelect={(option) => store$.settings.jumpForwardSec.set(option)}
                format={(option) => `${option}s`}
              />
            </View>
            <Separator />
            <View className="gap-2.5">
              <View className="flex-row items-center gap-2">
                <Rewind size={15} className="text-primary" />
                <Text className="text-base font-medium">Jump backward</Text>
              </View>
              <OptionPills
                options={JUMP_OPTIONS}
                value={jumpBackwardsSec}
                onSelect={(option) => store$.settings.jumpBackwardsSec.set(option)}
                format={(option) => `${option}s`}
              />
            </View>
          </Card>
        </View>

        <View className="gap-2">
          <SectionTitle>Library</SectionTitle>
          <Card className="p-4">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-base font-medium">Default library</Text>
              <LibrarySwitcher />
            </View>
          </Card>
        </View>

        <Muted className="text-center text-xs">Vinu 0.0.1</Muted>
      </ScrollView>
    </SafeAreaView>
  );
}
