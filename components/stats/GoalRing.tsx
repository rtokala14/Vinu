import { useTheme } from '@react-navigation/native';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { Muted } from '~/components/ui/typography';
import { Timer } from '~/lib/icons/Timer';
import { formatDuration } from '~/lib/utils';

const SIZE = 60;
const STROKE = 7;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * "Today" tile as a goal meter: circular progress of today's listening
 * against the daily goal. The unfilled track is a light step of the same
 * hue (meter spec: state reads across the whole ring).
 */
export function GoalRing({
  todaySeconds,
  goalMinutes,
}: {
  todaySeconds: number;
  goalMinutes: number;
}) {
  const { colors } = useTheme();
  const goalSeconds = goalMinutes * 60;
  const ratio = goalSeconds > 0 ? todaySeconds / goalSeconds : 0;
  const shown = Math.min(1, Math.max(0, ratio));
  const percent = Math.round(ratio * 100);

  return (
    <Card className="min-w-0 flex-1 p-4">
      <View className="flex-row items-center gap-2">
        <Timer size={15} className="text-primary" />
        <Muted className="text-xs font-medium uppercase tracking-wide">Today</Muted>
      </View>
      <View className="mt-2 flex-row items-center gap-3">
        <View style={{ width: SIZE, height: SIZE }}>
          <Svg width={SIZE} height={SIZE}>
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              stroke={colors.primary}
              strokeOpacity={0.16}
              strokeWidth={STROKE}
              fill="none"
            />
            {shown > 0 && (
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                stroke={colors.primary}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={`${CIRCUMFERENCE * shown} ${CIRCUMFERENCE}`}
                fill="none"
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              />
            )}
          </Svg>
          <View className="absolute inset-0 items-center justify-center">
            <Text className="text-xs font-bold">{percent}%</Text>
          </View>
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-base font-bold">
            {formatDuration(todaySeconds)}
          </Text>
          <Muted numberOfLines={1} className="text-xs">
            of {formatDuration(goalSeconds)}
          </Muted>
        </View>
      </View>
    </Card>
  );
}
