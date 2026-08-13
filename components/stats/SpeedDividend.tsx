import { View } from 'react-native';

import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { Muted } from '~/components/ui/typography';
import { Gauge } from '~/lib/icons/Gauge';
import { formatDuration } from '~/lib/utils';

/**
 * Speed dividend — an honest calculator, not fake history: sessions don't
 * record playback rate, so this only states the arithmetic of the CURRENT
 * speed setting. Hidden entirely at 1×.
 * Saved per 10h of listening = 10h × (rate − 1).
 */
export function SpeedDividend({ playbackRate }: { playbackRate: number }) {
  if (playbackRate <= 1) return null;

  const savedPer10h = 10 * 3600 * (playbackRate - 1);

  return (
    <Card className="p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/15">
          <Gauge size={18} className="text-primary" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold">
            At {playbackRate}× you're saving ~{formatDuration(savedPer10h)} per 10h of listening
          </Text>
          <Muted className="mt-0.5 text-xs">Based on your current speed setting</Muted>
        </View>
      </View>
    </Card>
  );
}
