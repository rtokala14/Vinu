import { use$ } from '@legendapp/state/react';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { useCreateBookmark } from '~/lib/bookmarks';
import { BookmarkPlus } from '~/lib/icons/BookmarkPlus';
import { Check } from '~/lib/icons/Check';
import { FastForward } from '~/lib/icons/FastForward';
import { Pause } from '~/lib/icons/Pause';
import { Play } from '~/lib/icons/Play';
import { Rewind } from '~/lib/icons/Rewind';
import { X } from '~/lib/icons/X';
import {
  getCurrentChapter,
  jumpBackward,
  jumpForward,
  player$,
  togglePlayPause,
} from '~/lib/player';
import { cn, formatClock } from '~/lib/utils';
import { store$ } from '~/stores';

/**
 * Car mode: a distraction-free, glanceable playback screen. Huge time +
 * chapter readout, three massive transport controls, and a one-tap bookmark
 * strip — no dialogs, no small targets. Keeps the screen awake while open.
 */
export default function CarScreen() {
  useKeepAwake();

  const nowPlaying = use$(player$.nowPlaying);
  const isPlaying = use$(player$.isPlaying);
  const isLoading = use$(player$.isLoading);
  const position = use$(player$.position);
  const jumpFwdSec = use$(store$.settings.jumpForwardSec);
  const jumpBackSec = use$(store$.settings.jumpBackwardsSec);

  const createBookmark = useCreateBookmark();
  const [saved, setSaved] = useState(false);
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (savedTimeout.current) clearTimeout(savedTimeout.current);
    },
    []
  );

  const addBookmark = () => {
    const np = player$.nowPlaying.peek();
    if (!np || createBookmark.isPending) return;
    const time = Math.floor(player$.position.peek());
    const title = getCurrentChapter()?.title ?? `Bookmark at ${formatClock(time)}`;
    createBookmark.mutate(
      { libraryItemId: np.libraryItemId, time, title },
      {
        onSuccess: () => {
          setSaved(true);
          if (savedTimeout.current) clearTimeout(savedTimeout.current);
          savedTimeout.current = setTimeout(() => setSaved(false), 1800);
        },
      }
    );
  };

  const closeButton = (
    <Pressable
      onPress={() => router.back()}
      className="h-14 w-14 items-center justify-center rounded-full active:bg-muted">
      <X size={30} className="text-muted-foreground" />
    </Pressable>
  );

  if (!nowPlaying) {
    return (
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
        <View className="flex-row justify-end px-4 pt-2">{closeButton}</View>
        <View className="flex-1 items-center justify-center gap-6 px-8">
          <Text className="text-center text-3xl font-bold text-muted-foreground">
            Nothing playing
          </Text>
          <Button size="lg" variant="outline" onPress={() => router.back()}>
            <Text>Close</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const chapterTitle = getCurrentChapter()?.title;

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-1 px-5 pb-5">
        {/* Exit */}
        <View className="flex-row items-center justify-end pt-1">{closeButton}</View>

        {/* Glanceable readout */}
        <View className="flex-1 items-center justify-center gap-3 px-2">
          <Text
            className="font-bold text-foreground"
            style={{ fontSize: 72, lineHeight: 80, fontVariant: ['tabular-nums'] }}>
            {formatClock(position)}
          </Text>
          {chapterTitle ? (
            <Text numberOfLines={2} className="text-center text-2xl font-semibold">
              {chapterTitle}
            </Text>
          ) : null}
          <Text numberOfLines={1} className="text-center text-lg text-muted-foreground">
            {nowPlaying.title}
          </Text>
        </View>

        {/* One-tap bookmark strip */}
        <Pressable
          onPress={addBookmark}
          className={cn(
            'h-20 flex-row items-center justify-center gap-3 rounded-2xl border',
            saved ? 'border-primary bg-primary' : 'border-border bg-card active:bg-muted'
          )}>
          {saved ? (
            <>
              <Check size={28} className="text-primary-foreground" />
              <Text className="text-2xl font-bold text-primary-foreground">Saved</Text>
            </>
          ) : (
            <>
              <BookmarkPlus size={28} className="text-primary" />
              <Text className="text-2xl font-bold">Bookmark</Text>
            </>
          )}
        </Pressable>

        {/* Massive transport */}
        <View className="mt-4 flex-row gap-3" style={{ flex: 1.1, minHeight: 180 }}>
          <Pressable
            onPress={() => void jumpBackward()}
            className="flex-1 items-center justify-center rounded-3xl bg-secondary active:bg-muted">
            <Rewind size={52} className="text-foreground" />
            <Text className="mt-1 text-xl font-semibold text-muted-foreground">{jumpBackSec}</Text>
          </Pressable>
          <Pressable
            onPress={() => void togglePlayPause()}
            className="flex-[1.4] items-center justify-center rounded-3xl bg-primary shadow-lg shadow-primary/40 active:opacity-90">
            {isLoading ? (
              <ActivityIndicator size="large" color="white" />
            ) : isPlaying ? (
              <Pause size={72} className="text-primary-foreground" />
            ) : (
              <Play size={72} className="ml-2 text-primary-foreground" />
            )}
          </Pressable>
          <Pressable
            onPress={() => void jumpForward()}
            className="flex-1 items-center justify-center rounded-3xl bg-secondary active:bg-muted">
            <FastForward size={52} className="text-foreground" />
            <Text className="mt-1 text-xl font-semibold text-muted-foreground">{jumpFwdSec}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
