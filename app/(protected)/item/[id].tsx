import { use$ } from '@legendapp/state/react';
import { useTheme } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { customAxios } from '~/api/custom-axios';
import {
  getGetLibraryItemQueryKey,
  useGetLibraryItem,
} from '~/api/queries/library-item/library-item';
import { BookmarksSection } from '~/components/bookmarks/BookmarksSection';
import { BackButton } from '~/components/detail/BackButton';
import { ChapterRow } from '~/components/detail/ChapterRow';
import { CollapsibleText } from '~/components/detail/CollapsibleText';
import { EpisodeRow } from '~/components/detail/EpisodeRow';
import { ProgressBar } from '~/components/detail/ProgressBar';
import { stripHtml } from '~/components/detail/helpers';
import type { ItemDetail } from '~/components/detail/types';
import { DownloadButton } from '~/components/downloads/DownloadButton';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { Muted } from '~/components/ui/typography';
import { CalendarDays } from '~/lib/icons/CalendarDays';
import { ChevronDown } from '~/lib/icons/ChevronDown';
import { ChevronUp } from '~/lib/icons/ChevronUp';
import { CircleCheck } from '~/lib/icons/CircleCheck';
import { Clock } from '~/lib/icons/Clock';
import { Headphones } from '~/lib/icons/Headphones';
import { ListOrdered } from '~/lib/icons/ListOrdered';
import { Pause } from '~/lib/icons/Pause';
import { Play } from '~/lib/icons/Play';
import { User } from '~/lib/icons/User';
import { playLibraryItem, player$, seekTo, togglePlayPause } from '~/lib/player';
import { formatDuration, getCoverUri } from '~/lib/utils';
import { store$ } from '~/stores';

const ITEM_PARAMS = { expanded: 1, include: 'progress' };

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();

  const [chaptersOpen, setChaptersOpen] = useState(false);

  const query = useGetLibraryItem(id ?? '', ITEM_PARAMS);
  const item = query.data as ItemDetail | undefined;

  const nowPlaying = use$(player$.nowPlaying);
  const isPlaying = use$(player$.isPlaying);
  const isItemLoaded = !!id && nowPlaying?.libraryItemId === id;

  const toggleFinished = useMutation({
    mutationFn: (isFinished: boolean) =>
      customAxios<void>({
        url: `/api/me/progress/${id}`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        data: { isFinished },
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: getGetLibraryItemQueryKey(id ?? '') }),
  });

  const metadata = item?.media?.metadata;
  const isPodcast = item?.mediaType === 'podcast' || !!item?.media?.episodes;
  const chapters = useMemo(
    () => (item?.media?.chapters ?? []).filter((ch) => !!ch),
    [item?.media?.chapters]
  );
  const episodes = useMemo(
    () =>
      [...(item?.media?.episodes ?? [])].sort(
        (a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0)
      ),
    [item?.media?.episodes]
  );

  const progress = item?.userMediaProgress ?? undefined;
  const progressValue = progress?.progress ?? 0;
  const isFinished = !!progress?.isFinished;
  const hasProgress = progressValue > 0 && !isFinished;
  const duration = item?.media?.duration ?? progress?.duration ?? 0;
  const remaining = Math.max(0, duration - (progress?.currentTime ?? 0));

  const coverWidth = Math.round(width * 0.55);
  const coverHeight = isPodcast ? coverWidth : Math.round(coverWidth * 1.5);
  const coverSource = {
    uri: getCoverUri(id, store$.settings.serverUrl.get(), 800),
    headers: { Authorization: `Bearer ${store$.userToken.get()}` },
  };

  const author = metadata?.authors?.[0];
  const series = metadata?.series ?? [];
  const chips = [...(metadata?.genres ?? []), ...(item?.media?.tags ?? [])];
  const description = metadata?.descriptionPlain || stripHtml(metadata?.description ?? '');

  const handlePlay = () => {
    if (!id) return;
    // Main button controls whole-item playback; a loaded podcast episode also counts.
    if (isItemLoaded) togglePlayPause();
    else playLibraryItem(id);
  };

  const handleChapterPress = (start: number) => {
    if (!id) return;
    if (player$.nowPlaying.peek()?.libraryItemId === id) seekTo(start);
    else playLibraryItem(id, { startAtTime: start });
  };

  const handleEpisodePlay = (episodeId: string | undefined) => {
    if (!id || !episodeId) return;
    const np = player$.nowPlaying.peek();
    if (np?.libraryItemId === id && np?.episodeId === episodeId) togglePlayPause();
    else playLibraryItem(id, { episodeId });
  };

  if (query.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <BackButton />
        <ActivityIndicator color="#B45309" size="large" />
      </View>
    );
  }

  if (query.isError || !item) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
        <BackButton />
        <Text className="text-center text-muted-foreground">Could not load this item.</Text>
        <Button variant="outline" onPress={() => query.refetch()}>
          <Text>Retry</Text>
        </Button>
      </View>
    );
  }

  const playLabel = isItemLoaded && isPlaying ? 'Pause' : hasProgress ? 'Resume' : 'Play';

  return (
    <View className="flex-1 bg-background">
      {/* Blurred, dimmed cover backdrop behind the hero. */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 380 }}>
        <Image
          source={coverSource}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          blurRadius={40}
          transition={500}
        />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: colors.background, opacity: 0.85 },
          ]}
        />
      </View>
      <BackButton />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 56, paddingBottom: insets.bottom + 48 }}>
        {/* Hero */}
        <View className="items-center px-6">
          <View
            style={{
              borderRadius: 16,
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}>
            <Image
              source={coverSource}
              style={{
                width: coverWidth,
                height: coverHeight,
                borderRadius: 16,
                backgroundColor: colors.card,
              }}
              contentFit="cover"
              transition={500}
            />
          </View>
          <Text className="mt-5 text-center text-2xl font-bold leading-8">{metadata?.title}</Text>
          {metadata?.authorName ? (
            author?.id ? (
              <Pressable
                hitSlop={4}
                onPress={() =>
                  router.push({ pathname: '/author/[id]', params: { id: author.id! } })
                }>
                <Text className="mt-1 text-center text-base text-muted-foreground underline-offset-2 active:text-primary">
                  {metadata.authorName}
                </Text>
              </Pressable>
            ) : (
              <Text className="mt-1 text-center text-base text-muted-foreground">
                {metadata.authorName}
              </Text>
            )
          ) : null}
          {metadata?.narratorName ? (
            <View className="mt-1.5 flex-row items-center gap-1.5">
              <User size={13} className="text-muted-foreground" />
              <Muted className="text-sm">Narrated by {metadata.narratorName}</Muted>
            </View>
          ) : null}
          {series.length > 0 ? (
            <View className="mt-3 flex-row flex-wrap justify-center gap-2">
              {series.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() =>
                    s.id &&
                    router.push({
                      pathname: '/series/[id]',
                      params: { id: s.id, name: s.name ?? '' },
                    })
                  }>
                  <Badge variant="secondary">
                    <Text>
                      {s.name}
                      {s.sequence ? ` #${s.sequence}` : ''}
                    </Text>
                  </Badge>
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* Meta row */}
          <View className="mt-4 flex-row flex-wrap items-center justify-center gap-x-4 gap-y-1">
            {duration > 0 ? (
              <View className="flex-row items-center gap-1">
                <Clock size={14} className="text-muted-foreground" />
                <Muted>{formatDuration(duration)}</Muted>
              </View>
            ) : null}
            {metadata?.publishedYear ? (
              <View className="flex-row items-center gap-1">
                <CalendarDays size={14} className="text-muted-foreground" />
                <Muted>{metadata.publishedYear}</Muted>
              </View>
            ) : null}
            {!isPodcast && chapters.length > 0 ? (
              <View className="flex-row items-center gap-1">
                <ListOrdered size={14} className="text-muted-foreground" />
                <Muted>{chapters.length} chapters</Muted>
              </View>
            ) : null}
            {isPodcast && episodes.length > 0 ? (
              <View className="flex-row items-center gap-1">
                <Headphones size={14} className="text-muted-foreground" />
                <Muted>{episodes.length} episodes</Muted>
              </View>
            ) : null}
          </View>

          {/* Progress */}
          {progressValue > 0 ? (
            <View className="mt-5 w-full">
              <ProgressBar value={progressValue} />
              <Muted className="mt-1.5 text-center text-xs">
                {isFinished
                  ? 'Finished'
                  : `${Math.round(progressValue * 100)}% · ${formatDuration(remaining)} left`}
              </Muted>
            </View>
          ) : null}

          {/* Actions */}
          <Button
            className="mt-6 w-full flex-row items-center justify-center gap-2"
            onPress={handlePlay}>
            {isItemLoaded && isPlaying ? (
              <Pause size={20} className="text-primary-foreground" />
            ) : (
              <Play size={20} className="text-primary-foreground" />
            )}
            <Text>{playLabel}</Text>
          </Button>
          <View className="mt-3 w-full flex-row items-stretch gap-3">
            <Button
              variant="outline"
              className="flex-1 flex-row items-center justify-center gap-2"
              disabled={toggleFinished.isPending}
              onPress={() => toggleFinished.mutate(!isFinished)}>
              <CircleCheck size={18} className={isFinished ? 'text-primary' : 'text-foreground'} />
              <Text>{isFinished ? 'Mark Unfinished' : 'Mark Finished'}</Text>
            </Button>
            {!isPodcast ? (
              <View className="flex-1">
                <DownloadButton itemId={id} />
              </View>
            ) : null}
          </View>

          {/* Description */}
          {description ? (
            <View className="mt-6 w-full">
              <CollapsibleText text={description} />
            </View>
          ) : null}

          {/* Genres & tags */}
          {chips.length > 0 ? (
            <View className="mt-4 w-full flex-row flex-wrap gap-2">
              {chips.map((chip) => (
                <Badge key={chip} variant="outline">
                  <Text>{chip}</Text>
                </Badge>
              ))}
            </View>
          ) : null}
        </View>

        {/* Chapters (books) */}
        {!isPodcast && chapters.length > 0 ? (
          <View className="mx-4 mt-6 overflow-hidden rounded-xl bg-card">
            <Pressable
              onPress={() => setChaptersOpen((v) => !v)}
              className="flex-row items-center justify-between p-4 active:bg-muted">
              <View className="flex-row items-center gap-2">
                <ListOrdered size={18} className="text-primary" />
                <Text className="font-semibold">Chapters</Text>
                <Muted>({chapters.length})</Muted>
              </View>
              {chaptersOpen ? (
                <ChevronUp size={20} className="text-muted-foreground" />
              ) : (
                <ChevronDown size={20} className="text-muted-foreground" />
              )}
            </Pressable>
            {chaptersOpen &&
              chapters.map((chapter, index) => (
                <ChapterRow
                  key={chapter!.id ?? index}
                  index={index + 1}
                  title={chapter!.title ?? `Chapter ${index + 1}`}
                  duration={(chapter!.end ?? 0) - (chapter!.start ?? 0)}
                  onPress={() => handleChapterPress(chapter!.start ?? 0)}
                />
              ))}
          </View>
        ) : null}

        {/* Bookmarks */}
        <BookmarksSection libraryItemId={id} />

        {/* Episodes (podcasts) */}
        {isPodcast && episodes.length > 0 ? (
          <View className="mx-4 mt-6 overflow-hidden rounded-xl bg-card">
            <View className="flex-row items-center gap-2 p-4">
              <Headphones size={18} className="text-primary" />
              <Text className="font-semibold">Episodes</Text>
              <Muted>({episodes.length})</Muted>
            </View>
            {episodes.map((episode, index) => (
              <EpisodeRow
                key={episode.id ?? index}
                title={episode.title ?? 'Untitled episode'}
                publishedAt={episode.publishedAt}
                duration={episode.duration ?? episode.audioFile?.duration}
                isPlaying={isPlaying && isItemLoaded && nowPlaying?.episodeId === episode.id}
                onPlay={() => handleEpisodePlay(episode.id)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
