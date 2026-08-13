import { Pressable } from 'react-native';

import { Text } from '~/components/ui/text';
import { Muted } from '~/components/ui/typography';
import { formatDuration } from '~/lib/utils';

interface ChapterRowProps {
  index: number;
  title: string;
  /** Chapter length in seconds. */
  duration: number;
  isCurrent?: boolean;
  onPress: () => void;
}

/** A single tappable chapter row inside the chapters list. */
export function ChapterRow({ index, title, duration, isCurrent, onPress }: ChapterRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 border-t border-border px-4 py-3 active:bg-muted">
      <Muted className="w-7 text-right text-xs">{index}</Muted>
      <Text
        className={`flex-1 text-sm ${isCurrent ? 'font-semibold text-primary' : ''}`}
        numberOfLines={2}>
        {title}
      </Text>
      <Muted className="text-xs">{formatDuration(duration)}</Muted>
    </Pressable>
  );
}
