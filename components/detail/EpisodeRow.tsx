import { Pressable, View } from 'react-native';

import { formatDate } from './helpers';

import { Text } from '~/components/ui/text';
import { Muted } from '~/components/ui/typography';
import { Pause } from '~/lib/icons/Pause';
import { Play } from '~/lib/icons/Play';
import { formatDuration } from '~/lib/utils';

interface EpisodeRowProps {
  title: string;
  /** Epoch ms the episode was published. */
  publishedAt?: number | null;
  /** Episode length in seconds. */
  duration?: number | null;
  /** True when this episode is the one loaded in the player and playing. */
  isPlaying?: boolean;
  onPlay: () => void;
}

/** A podcast episode row with a per-episode play button. */
export function EpisodeRow({ title, publishedAt, duration, isPlaying, onPlay }: EpisodeRowProps) {
  const meta = [formatDate(publishedAt), duration ? formatDuration(duration) : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <View className="flex-row items-center gap-3 border-t border-border px-4 py-3">
      <View className="flex-1">
        <Text className="text-sm font-medium" numberOfLines={2}>
          {title}
        </Text>
        {meta ? <Muted className="mt-0.5 text-xs">{meta}</Muted> : null}
      </View>
      <Pressable
        onPress={onPlay}
        hitSlop={6}
        className="h-9 w-9 items-center justify-center rounded-full bg-primary active:opacity-80">
        {isPlaying ? (
          <Pause size={16} className="text-primary-foreground" />
        ) : (
          <Play size={16} className="text-primary-foreground" />
        )}
      </Pressable>
    </View>
  );
}
