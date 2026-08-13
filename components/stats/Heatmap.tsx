import { useTheme } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import {
  dateKey,
  intensityStep,
  parseDateKey,
  quartileThresholds,
} from '~/components/stats/insights';
import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { Muted } from '~/components/ui/typography';
import { formatDuration } from '~/lib/utils';

const WEEKS = 17;
const GAP = 3;
const GUTTER = 18; // weekday labels
const MONTH_BAND = 16; // month labels above the grid
const MAX_CELL = 16;
const MIN_CELL = 8;
// Sequential single-hue scale: primary at 4 opacity steps by quartile of nonzero days.
const STEP_OPACITY = [0.28, 0.48, 0.72, 1] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Cell = {
  key: string;
  seconds: number;
  /** false for days after today in the current (partial) week. */
  inRange: boolean;
};

type Grid = {
  /** weeks[col][row], row 0 = Sunday. */
  weeks: Cell[][];
  monthLabels: { col: number; label: string }[];
  thresholds: [number, number, number];
  totalSeconds: number;
};

function buildGrid(days: Record<string, number>): Grid {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() - 7 * (WEEKS - 1)); // Sunday, WEEKS-1 weeks back

  const weeks: Cell[][] = [];
  const monthLabels: Grid['monthLabels'] = [];
  const nonzero: number[] = [];
  let totalSeconds = 0;
  let prevMonth = -1;

  for (let w = 0; w < WEEKS; w++) {
    const column: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const key = dateKey(date);
      const inRange = date.getTime() <= today.getTime();
      const seconds = inRange ? (days[key] ?? 0) : 0;
      if (inRange && seconds > 0) {
        nonzero.push(seconds);
        totalSeconds += seconds;
      }
      column.push({ key, seconds, inRange });
    }
    weeks.push(column);

    const month = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + w * 7
    ).getMonth();
    if (month !== prevMonth) {
      // Skip a label on the very first column if the month turns again right after
      // it (avoids "Apr May" colliding at the left edge).
      const turnsAgainSoon =
        w === 0 &&
        new Date(start.getFullYear(), start.getMonth(), start.getDate() + 2 * 7).getMonth() !==
          month;
      if (!turnsAgainSoon) monthLabels.push({ col: w, label: MONTHS[month] });
      prevMonth = month;
    }
  }

  return { weeks, monthLabels, thresholds: quartileThresholds(nonzero), totalSeconds };
}

/**
 * GitHub-style calendar heatmap of the last 17 weeks of listening.
 * Data: `days` map from GET /api/me/listening-stats.
 * Tap a cell for a "Mar 4 · 1h 23m" caption under the grid.
 */
export function Heatmap({ days }: { days: Record<string, number> }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const grid = useMemo(() => buildGrid(days), [days]);

  const cell = width
    ? Math.max(
        MIN_CELL,
        Math.min(MAX_CELL, Math.floor((width - GUTTER - (WEEKS - 1) * GAP) / WEEKS))
      )
    : 0;
  const svgHeight = MONTH_BAND + 7 * cell + 6 * GAP;

  const selected = useMemo(() => {
    if (!selectedKey) return null;
    for (const column of grid.weeks) {
      for (const c of column) if (c.key === selectedKey && c.inRange) return c;
    }
    return null;
  }, [grid, selectedKey]);

  const onGridPress = (x: number, y: number) => {
    const col = Math.floor((x - GUTTER) / (cell + GAP));
    const row = Math.floor((y - MONTH_BAND) / (cell + GAP));
    if (col < 0 || col >= WEEKS || row < 0 || row > 6) return;
    const tapped = grid.weeks[col][row];
    if (!tapped.inRange) return;
    setSelectedKey((prev) => (prev === tapped.key ? null : tapped.key));
  };

  return (
    <Card className="p-4">
      <Text className="text-base font-semibold">Listening activity</Text>
      <View className="mt-3" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {cell > 0 && (
          <Pressable onPress={(e) => onGridPress(e.nativeEvent.locationX, e.nativeEvent.locationY)}>
            <Svg width={width} height={svgHeight}>
              {grid.monthLabels.map(({ col, label }) => (
                <SvgText
                  key={`m-${col}`}
                  x={GUTTER + col * (cell + GAP)}
                  y={MONTH_BAND - 6}
                  fontSize={10}
                  fill={colors.text}
                  fillOpacity={0.55}>
                  {label}
                </SvgText>
              ))}
              {(['M', 'W', 'F'] as const).map((label, i) => {
                const row = 1 + i * 2; // Mon, Wed, Fri
                return (
                  <SvgText
                    key={`d-${label}`}
                    x={GUTTER - 7}
                    y={MONTH_BAND + row * (cell + GAP) + cell / 2 + 3}
                    fontSize={9}
                    fill={colors.text}
                    fillOpacity={0.5}
                    textAnchor="end">
                    {label}
                  </SvgText>
                );
              })}
              {grid.weeks.map((column, w) =>
                column.map((c, d) => {
                  if (!c.inRange) return null;
                  const isSelected = selectedKey === c.key;
                  const empty = c.seconds <= 0;
                  return (
                    <Rect
                      key={c.key}
                      x={GUTTER + w * (cell + GAP)}
                      y={MONTH_BAND + d * (cell + GAP)}
                      width={cell}
                      height={cell}
                      rx={3}
                      fill={empty ? colors.text : colors.primary}
                      fillOpacity={
                        empty ? 0.07 : STEP_OPACITY[intensityStep(c.seconds, grid.thresholds)]
                      }
                      stroke={isSelected ? colors.text : undefined}
                      strokeWidth={isSelected ? 1.5 : 0}
                    />
                  );
                })
              )}
            </Svg>
          </Pressable>
        )}
      </View>
      <View className="mt-2 h-5 justify-center">
        {selected ? (
          <Text className="text-xs font-medium">
            {parseDateKey(selected.key).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
            {' · '}
            {selected.seconds > 0 ? formatDuration(selected.seconds) : 'no listening'}
          </Text>
        ) : (
          <Muted className="text-xs">
            Last {WEEKS} weeks · {formatDuration(grid.totalSeconds)}
          </Muted>
        )}
      </View>
    </Card>
  );
}
