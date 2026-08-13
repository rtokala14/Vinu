import { useTheme } from '@react-navigation/native';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { G, Line, Path, Text as SvgText } from 'react-native-svg';

import { formatDuration } from '~/lib/utils';

export type DayBar = {
  /** YYYY-MM-DD key. */
  date: string;
  /** Short weekday label, e.g. "Mon". */
  label: string;
  seconds: number;
  isToday: boolean;
};

const CHART_HEIGHT = 120;
const TOP_PAD = 18;
const LABEL_AREA = 20;
const BAR_GAP = 10;

/** Rounded-top bar anchored to the baseline. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
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

export function WeekBars({ days }: { days: DayBar[] }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  const totalHeight = TOP_PAD + CHART_HEIGHT + LABEL_AREA;
  const max = Math.max(...days.map((d) => d.seconds), 1);
  const maxIndex = days.findIndex((d) => d.seconds === max);
  const todayIndex = days.findIndex((d) => d.isToday);

  const barWidth = days.length ? (width - BAR_GAP * (days.length - 1)) / days.length : 0;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={totalHeight}>
          {/* baseline */}
          <Line
            x1={0}
            y1={TOP_PAD + CHART_HEIGHT}
            x2={width}
            y2={TOP_PAD + CHART_HEIGHT}
            stroke={colors.border}
            strokeWidth={1}
          />
          {days.map((day, i) => {
            const x = i * (barWidth + BAR_GAP);
            const h = Math.max(2, (day.seconds / max) * CHART_HEIGHT);
            const y = TOP_PAD + CHART_HEIGHT - h;
            const isEmpty = day.seconds <= 0;
            // Selective direct labels: max bar and today only.
            const showValue = !isEmpty && (i === maxIndex || day.isToday);
            return (
              <G key={day.date}>
                <Path
                  d={barPath(x, y, barWidth, h)}
                  fill={colors.primary}
                  fillOpacity={isEmpty ? 0.12 : day.isToday ? 1 : 0.4}
                />
                {showValue && (
                  <SvgText
                    x={x + barWidth / 2}
                    y={y - 6}
                    fontSize={10}
                    fontWeight="600"
                    fill={colors.text}
                    textAnchor="middle">
                    {formatDuration(day.seconds)}
                  </SvgText>
                )}
                <SvgText
                  x={x + barWidth / 2}
                  y={TOP_PAD + CHART_HEIGHT + 14}
                  fontSize={10}
                  fontWeight={day.isToday ? '700' : '400'}
                  fill={colors.text}
                  fillOpacity={i === todayIndex ? 0.9 : 0.55}
                  textAnchor="middle">
                  {day.label}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      )}
    </View>
  );
}
