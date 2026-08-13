import { use$ } from '@legendapp/state/react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { Text } from '~/components/ui/text';
import { Pause } from '~/lib/icons/Pause';
import { Play } from '~/lib/icons/Play';
import { Rewind } from '~/lib/icons/Rewind';
import { jumpBackward, player$, togglePlayPause } from '~/lib/player';
import { store$ } from '~/stores';

export function MiniPlayer() {
  const nowPlaying = use$(player$.nowPlaying);
  const isPlaying = use$(player$.isPlaying);
  const isLoading = use$(player$.isLoading);
  const position = use$(player$.position);

  if (!nowPlaying) return null;

  const chapter = nowPlaying.chapters?.find(
    (ch) =>
      ch != null && (ch.start ?? 0) <= position && position < (ch.end ?? Number.MAX_SAFE_INTEGER)
  );
  const subtitle = chapter?.title ?? nowPlaying.authorName;
  const progress =
    nowPlaying.duration > 0 ? Math.min(Math.max(position / nowPlaying.duration, 0), 1) : 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      exiting={FadeOutDown.duration(200)}
      className="absolute inset-x-2"
      style={{ bottom: 88 }}>
      <Pressable
        onPress={() => router.push('/player')}
        className="overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-foreground/10">
        <View className="flex-row items-center gap-3 p-2 pr-3">
          <Image
            source={{
              uri: nowPlaying.coverUri,
              headers: { Authorization: `Bearer ${store$.userToken.peek()}` },
            }}
            style={{ width: 44, height: 44, borderRadius: 8 }}
            contentFit="cover"
            recyclingKey={nowPlaying.libraryItemId}
            transition={300}
          />
          <View className="flex-1">
            <Text numberOfLines={1} className="text-sm font-semibold">
              {nowPlaying.title}
            </Text>
            <Text numberOfLines={1} className="text-xs text-muted-foreground">
              {subtitle}
            </Text>
          </View>
          <Pressable
            onPress={() => void jumpBackward()}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full active:bg-muted">
            <Rewind size={22} className="text-foreground" />
          </Pressable>
          <Pressable
            onPress={() => void togglePlayPause()}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full bg-primary active:opacity-90">
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : isPlaying ? (
              <Pause size={20} className="text-primary-foreground" />
            ) : (
              <Play size={20} className="ml-0.5 text-primary-foreground" />
            )}
          </Pressable>
        </View>
        <View className="h-0.5 w-full bg-muted">
          <View className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
        </View>
      </Pressable>
    </Animated.View>
  );
}
