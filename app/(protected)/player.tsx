import { use$ } from '@legendapp/state/react';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookChapter } from '~/api/models';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Text } from '~/components/ui/text';
import { ChevronDown } from '~/lib/icons/ChevronDown';
import { FastForward } from '~/lib/icons/FastForward';
import { Gauge } from '~/lib/icons/Gauge';
import { ListMusic } from '~/lib/icons/ListMusic';
import { Moon } from '~/lib/icons/Moon';
import { Pause } from '~/lib/icons/Pause';
import { Play } from '~/lib/icons/Play';
import { Rewind } from '~/lib/icons/Rewind';
import { SkipBack } from '~/lib/icons/SkipBack';
import { SkipForward } from '~/lib/icons/SkipForward';
import {
  cancelSleepTimer,
  jumpBackward,
  jumpForward,
  player$,
  seekTo,
  setPlaybackRate,
  startSleepTimer,
  togglePlayPause,
} from '~/lib/player';
import { cn, formatClock } from '~/lib/utils';
import { store$ } from '~/stores';

type Chapter = NonNullable<BookChapter>;

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];
const SLEEP_MINUTES = [5, 15, 30, 45, 60];

function clamp01(value: number): number {
  'worklet';
  return Math.min(Math.max(value, 0), 1);
}

function nonNullChapters(chapters: BookChapter[] | undefined): Chapter[] {
  return (chapters ?? []).filter((ch): ch is Chapter => ch != null);
}

function chapterIndexAt(chapters: Chapter[], position: number): number {
  return chapters.findIndex(
    (ch) => (ch.start ?? 0) <= position && position < (ch.end ?? Number.MAX_SAFE_INTEGER)
  );
}

function goPrevChapter(): void {
  const np = player$.nowPlaying.peek();
  const pos = player$.position.peek();
  const chapters = nonNullChapters(np?.chapters);
  if (chapters.length === 0) {
    void seekTo(0);
    return;
  }
  const idx = chapterIndexAt(chapters, pos);
  const current = idx >= 0 ? chapters[idx] : undefined;
  // Within the first 3s of a chapter, go to the previous one instead.
  if (current && (pos - (current.start ?? 0) > 3 || idx === 0)) {
    void seekTo(current.start ?? 0);
  } else if (idx > 0) {
    void seekTo(chapters[idx - 1].start ?? 0);
  } else {
    void seekTo(0);
  }
}

function goNextChapter(): void {
  const np = player$.nowPlaying.peek();
  const pos = player$.position.peek();
  const chapters = nonNullChapters(np?.chapters);
  const next = chapters.find((ch) => (ch.start ?? 0) > pos + 0.5);
  void seekTo(next?.start ?? np?.duration ?? pos);
}

// ---------------------------------------------------------------------------
// Scrubbing slider (gesture-handler Pan + reanimated, no native slider dep)
// ---------------------------------------------------------------------------

function ProgressSlider() {
  const nowPlaying = use$(player$.nowPlaying);
  const position = use$(player$.position);
  const rate = use$(player$.playbackRate);
  const duration = nowPlaying?.duration ?? 0;

  const [width, setWidth] = useState(0);
  /** Non-null while the user is dragging — shown in the elapsed label. */
  const [scrubPos, setScrubPos] = useState<number | null>(null);
  const fraction = useSharedValue(0);
  const scrubbing = useSharedValue(false);

  useEffect(() => {
    if (scrubPos === null && duration > 0) {
      fraction.value = clamp01(position / duration);
    }
  }, [position, duration, scrubPos, fraction]);

  const onScrub = useCallback((seconds: number) => setScrubPos(seconds), []);
  const onCommit = useCallback((seconds: number) => {
    void seekTo(seconds);
    setScrubPos(null);
  }, []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((e) => {
          if (width <= 0 || duration <= 0) return;
          scrubbing.value = true;
          const f = clamp01(e.x / width);
          fraction.value = f;
          runOnJS(onScrub)(f * duration);
        })
        .onUpdate((e) => {
          if (width <= 0 || duration <= 0) return;
          const f = clamp01(e.x / width);
          fraction.value = f;
          runOnJS(onScrub)(f * duration);
        })
        .onFinalize(() => {
          if (!scrubbing.value) return;
          scrubbing.value = false;
          if (duration > 0) runOnJS(onCommit)(fraction.value * duration);
        }),
    [width, duration, fraction, scrubbing, onScrub, onCommit]
  );

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fraction.value * 100}%`,
  }));
  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: fraction.value * width - 8 },
      { scale: withTiming(scrubbing.value ? 1.4 : 1, { duration: 120 }) },
    ],
  }));

  const shownPosition = scrubPos ?? position;
  const remainingAtRate = Math.max(duration - shownPosition, 0) / (rate || 1);

  return (
    <View>
      <GestureDetector gesture={pan}>
        <View
          className="h-10 justify-center"
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          <View className="h-1.5 overflow-hidden rounded-full bg-muted">
            <Animated.View className="h-full rounded-full bg-primary" style={fillStyle} />
          </View>
          <Animated.View
            pointerEvents="none"
            className="absolute top-3 h-4 w-4 rounded-full bg-primary shadow-md"
            style={knobStyle}
          />
        </View>
      </GestureDetector>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-medium text-muted-foreground">
          {formatClock(shownPosition)}
        </Text>
        <Text className="text-xs font-medium text-muted-foreground">
          -{formatClock(remainingAtRate)} left
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Inline chapter list
// ---------------------------------------------------------------------------

const CHAPTER_ROW_HEIGHT = 52;

function ChapterList({ chapters, currentIndex }: { chapters: Chapter[]; currentIndex: number }) {
  const listRef = useRef<FlatList<Chapter>>(null);

  return (
    <FlatList
      ref={listRef}
      data={chapters}
      className="flex-1"
      contentContainerClassName="pb-2"
      keyExtractor={(ch, i) => String(ch.id ?? i)}
      initialScrollIndex={Math.max(currentIndex - 2, 0)}
      getItemLayout={(_, index) => ({
        length: CHAPTER_ROW_HEIGHT,
        offset: CHAPTER_ROW_HEIGHT * index,
        index,
      })}
      renderItem={({ item, index }) => {
        const isCurrent = index === currentIndex;
        return (
          <Pressable
            onPress={() => void seekTo(item.start ?? 0)}
            style={{ height: CHAPTER_ROW_HEIGHT }}
            className={cn(
              'flex-row items-center gap-3 rounded-lg px-3',
              isCurrent ? 'bg-accent' : 'active:bg-muted'
            )}>
            <Text
              className={cn(
                'w-8 text-center text-xs font-semibold',
                isCurrent ? 'text-primary' : 'text-muted-foreground'
              )}>
              {index + 1}
            </Text>
            <Text
              numberOfLines={1}
              className={cn('flex-1 text-sm', isCurrent && 'font-semibold text-primary')}>
              {item.title ?? `Chapter ${index + 1}`}
            </Text>
            <Text
              className={cn(
                'text-xs',
                isCurrent ? 'font-medium text-primary' : 'text-muted-foreground'
              )}>
              {formatClock((item.end ?? 0) - (item.start ?? 0))}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function PlayerScreen() {
  const nowPlaying = use$(player$.nowPlaying);
  const isPlaying = use$(player$.isPlaying);
  const isLoading = use$(player$.isLoading);
  const position = use$(player$.position);
  const rate = use$(player$.playbackRate);
  const sleepTimer = use$(player$.sleepTimer);
  const jumpFwdSec = use$(store$.settings.jumpForwardSec);
  const jumpBackSec = use$(store$.settings.jumpBackwardsSec);

  const [chaptersOpen, setChaptersOpen] = useState(false);

  // Sleep-timer countdown tick.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!sleepTimer.endsAt) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sleepTimer.endsAt]);

  // Nothing loaded — nothing to show.
  useEffect(() => {
    if (!nowPlaying && router.canGoBack()) router.back();
  }, [nowPlaying]);

  const chapters = useMemo(() => nonNullChapters(nowPlaying?.chapters), [nowPlaying]);
  if (!nowPlaying) return null;

  const currentChapterIndex = chapterIndexAt(chapters, position);
  const currentChapter = currentChapterIndex >= 0 ? chapters[currentChapterIndex] : undefined;

  const cycleRate = () => {
    const idx = RATES.findIndex((r) => Math.abs(r - rate) < 0.01);
    void setPlaybackRate(RATES[(idx + 1) % RATES.length] ?? 1);
  };

  const sleepActive = !!sleepTimer.endsAt || sleepTimer.endOfChapter;
  const sleepLabel = sleepTimer.endsAt
    ? formatClock(Math.max((sleepTimer.endsAt - now) / 1000, 0))
    : sleepTimer.endOfChapter
      ? 'End of ch.'
      : 'Sleep';

  const pillClass =
    'flex-row items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 active:bg-muted';

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-1 px-6 pb-2">
        {/* Header */}
        <View className="flex-row items-center justify-between py-2">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-muted">
            <ChevronDown size={26} className="text-foreground" />
          </Pressable>
          <Text className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Now Playing
          </Text>
          <View className="h-10 w-10" />
        </View>

        {/* Cover / chapter list */}
        {chaptersOpen ? (
          <ChapterList chapters={chapters} currentIndex={currentChapterIndex} />
        ) : (
          <View className="flex-1 items-center justify-center gap-6">
            <View
              className="rounded-2xl shadow-xl shadow-foreground/25"
              style={{ width: '82%', aspectRatio: 1, maxHeight: 380 }}>
              <Image
                source={{
                  uri: nowPlaying.coverUri,
                  headers: { Authorization: `Bearer ${store$.userToken.peek()}` },
                }}
                style={{ width: '100%', height: '100%', borderRadius: 16 }}
                contentFit="cover"
                recyclingKey={nowPlaying.libraryItemId}
                transition={300}
              />
            </View>
            <View className="items-center gap-1 px-2">
              <Text numberOfLines={2} className="text-center text-2xl font-bold">
                {nowPlaying.title}
              </Text>
              <Text numberOfLines={1} className="text-base text-muted-foreground">
                {nowPlaying.authorName}
              </Text>
              {currentChapter ? (
                <Text numberOfLines={1} className="mt-1 text-sm font-medium text-primary">
                  {currentChapter.title}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* Progress */}
        <ProgressSlider />

        {/* Transport */}
        <View className="flex-row items-center justify-between px-1 py-5">
          <Pressable
            onPress={goPrevChapter}
            hitSlop={8}
            className="h-12 w-12 items-center justify-center rounded-full active:bg-muted">
            <SkipBack size={26} className="text-foreground" />
          </Pressable>
          <Pressable
            onPress={() => void jumpBackward()}
            hitSlop={8}
            className="h-14 w-14 items-center justify-center rounded-full active:bg-muted">
            <Rewind size={30} className="text-foreground" />
            <Text className="absolute bottom-0 text-[10px] font-semibold text-muted-foreground">
              {jumpBackSec}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void togglePlayPause()}
            className="items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/40 active:opacity-90"
            style={{ height: 72, width: 72 }}>
            {isLoading ? (
              <ActivityIndicator size="large" color="white" />
            ) : isPlaying ? (
              <Pause size={32} className="text-primary-foreground" />
            ) : (
              <Play size={32} className="ml-1 text-primary-foreground" />
            )}
          </Pressable>
          <Pressable
            onPress={() => void jumpForward()}
            hitSlop={8}
            className="h-14 w-14 items-center justify-center rounded-full active:bg-muted">
            <FastForward size={30} className="text-foreground" />
            <Text className="absolute bottom-0 text-[10px] font-semibold text-muted-foreground">
              {jumpFwdSec}
            </Text>
          </Pressable>
          <Pressable
            onPress={goNextChapter}
            hitSlop={8}
            className="h-12 w-12 items-center justify-center rounded-full active:bg-muted">
            <SkipForward size={26} className="text-foreground" />
          </Pressable>
        </View>

        {/* Bottom pills */}
        <View className="flex-row items-center justify-center gap-3 pb-2">
          <Pressable onPress={cycleRate} className={pillClass}>
            <Gauge size={16} className={rate !== 1 ? 'text-primary' : 'text-muted-foreground'} />
            <Text
              className={cn(
                'text-sm font-semibold',
                rate !== 1 && 'text-primary'
              )}>{`${rate}x`}</Text>
          </Pressable>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Pressable className={pillClass}>
                <Moon
                  size={16}
                  className={sleepActive ? 'text-primary' : 'text-muted-foreground'}
                />
                <Text className={cn('text-sm font-semibold', sleepActive && 'text-primary')}>
                  {sleepLabel}
                </Text>
              </Pressable>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-48">
              <DropdownMenuLabel>Sleep timer</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onPress={() => cancelSleepTimer()}>
                <Text>Off</Text>
              </DropdownMenuItem>
              {SLEEP_MINUTES.map((minutes) => (
                <DropdownMenuItem key={minutes} onPress={() => startSleepTimer({ minutes })}>
                  <Text>{minutes} minutes</Text>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onPress={() => startSleepTimer({ endOfChapter: true })}>
                <Text>End of chapter</Text>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Pressable
            onPress={() => setChaptersOpen((open) => !open)}
            className={cn(pillClass, chaptersOpen && 'border-primary')}>
            <ListMusic
              size={16}
              className={chaptersOpen ? 'text-primary' : 'text-muted-foreground'}
            />
            <Text className={cn('text-sm font-semibold', chaptersOpen && 'text-primary')}>
              Chapters
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
