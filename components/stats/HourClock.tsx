import { useTheme } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import {
  bucketSessionsByHour,
  formatHour,
  type SessionWithExtras,
} from '~/components/stats/insights';
import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { Muted } from '~/components/ui/typography';

const TOP_PAD = 18; // room for the peak-hour direct label
const CHART_HEIGHT = 88;
const LABEL_AREA = 18;
const BAR_GAP = 2; // surface gap between adjacent bars
const AXIS_HOURS = [0, 6, 12, 18];

/** Rounded-top bar anchored to the baseline (square at the baseline). */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(2.5, w / 2, h);
  const bottom = y + h;
  return [
    `M ${x} ${bottom}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    `L ${x + w - r} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + r}`,
    `L ${x + w} ${bottom}`,
    'Z',
  ].join(' ');
}

/** Short axis tick: "12a", "6a", "12p", "6p". */
function tickLabel(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${hour < 12 ? 'a' : 'p'}`;
}

/**
 * When-do-you-listen: 24 bars (midnight → 11 pm), one per LOCAL hour of
 * day, weighted by session listening time. Emphasis form: the peak hour
 * carries the full hue, the rest recede.
 * Data: recent sessions from GET /api/me/listening-sessions.
 */
export function HourClock({ sessions }: { sessions: SessionWithExtras[] }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  const buckets = useMemo(() => bucketSessionsByHour(sessions), [sessions]);
  const max = Math.max(...buckets, 1);
  const total = buckets.reduce((a, b) => a + b, 0);
  const peakHour = buckets.indexOf(Math.max(...buckets));

  if (total <= 0) return null;

  const totalHeight = TOP_PAD + CHART_HEIGHT + LABEL_AREA;
  const barWidth = width > 0 ? (width - BAR_GAP * 23) / 24 : 0;
  const centerX = (hour: number) => hour * (barWidth + BAR_GAP) + barWidth / 2;

  return (
    <Card className="p-4">
      <Text className="text-base font-semibold">Listening clock</Text>
      <Muted className="mt-0.5 text-xs">You mostly listen around {formatHour(peakHour)}</Muted>
      <View className="mt-3" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={totalHeight}>
            <Line
              x1={0}
              y1={TOP_PAD + CHART_HEIGHT}
              x2={width}
              y2={TOP_PAD + CHART_HEIGHT}
              stroke={colors.border}
              strokeWidth={1}
            />
            {buckets.map((seconds, hour) => {
              const h = Math.max(2, (seconds / max) * CHART_HEIGHT);
              const y = TOP_PAD + CHART_HEIGHT - h;
              const empty = seconds <= 0;
              const isPeak = hour === peakHour && !empty;
              return (
                <Path
                  key={hour}
                  d={barPath(hour * (barWidth + BAR_GAP), y, barWidth, h)}
                  fill={colors.primary}
                  fillOpacity={empty ? 0.1 : isPeak ? 1 : 0.35}
                />
              );
            })}
            {/* Selective direct label: the peak only. */}
            <SvgText
              x={Math.min(width - 16, Math.max(16, centerX(peakHour)))}
              y={TOP_PAD + CHART_HEIGHT - (buckets[peakHour] / max) * CHART_HEIGHT - 6}
              fontSize={10}
              fontWeight="600"
              fill={colors.text}
              textAnchor="middle">
              {formatHour(peakHour)}
            </SvgText>
            {AXIS_HOURS.map((hour) => (
              <SvgText
                key={hour}
                x={centerX(hour)}
                y={TOP_PAD + CHART_HEIGHT + 13}
                fontSize={9}
                fill={colors.text}
                fillOpacity={0.55}
                textAnchor="middle">
                {tickLabel(hour)}
              </SvgText>
            ))}
          </Svg>
        )}
      </View>
    </Card>
  );
}
