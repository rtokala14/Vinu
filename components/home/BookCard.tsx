import { Image } from 'expo-image';
import { Href, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '~/components/ui/text';
import { Play } from '~/lib/icons/Play';
import { playLibraryItem } from '~/lib/player';
import { getCoverUri } from '~/lib/utils';
import { store$ } from '~/stores';

/** Loose shape of a book/podcast entity from the personalized shelves. */
export type ShelfBook = {
  id?: string;
  media?: { metadata?: { title?: string; authorName?: string; author?: string } };
  recentEpisode?: { id?: string; title?: string };
};

export const CARD_WIDTH = 110;

export function BookCard({
  item,
  progress,
  showPlay = false,
}: {
  item: ShelfBook;
  /** 0..1 listening progress; renders a hairline under the cover when set. */
  progress?: number;
  showPlay?: boolean;
}) {
  const router = useRouter();
  const serverUrl = store$.settings.serverUrl.peek();
  const token = store$.userToken.peek();

  const title = item.recentEpisode?.title ?? item.media?.metadata?.title;
  const author = item.media?.metadata?.authorName ?? item.media?.metadata?.author;

  return (
    <Pressable
      className="active:opacity-80"
      style={{ width: CARD_WIDTH }}
      onPress={() => router.push(`/item/${item.id}` as Href)}>
      <View>
        <Image
          source={{
            uri: getCoverUri(item.id, serverUrl),
            headers: { Authorization: `Bearer ${token}` },
          }}
          style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.5, borderRadius: 8 }}
          className="bg-muted"
          contentFit="cover"
          recyclingKey={item.id}
          transition={300}
        />
        {showPlay && (
          <Pressable
            className="absolute bottom-2 right-2 h-9 w-9 items-center justify-center rounded-full bg-primary/90 active:bg-primary"
            hitSlop={8}
            onPress={() =>
              playLibraryItem(
                item.id!,
                item.recentEpisode?.id ? { episodeId: item.recentEpisode.id } : undefined
              )
            }>
            <Play size={16} className="ml-0.5 text-primary-foreground" fill="#ffffff" />
          </Pressable>
        )}
      </View>
      {progress !== undefined && progress > 0 && (
        <View className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
          <View
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }}
          />
        </View>
      )}
      <Text numberOfLines={2} className="mt-1.5 text-sm font-semibold leading-tight">
        {title}
      </Text>
      {!!author && (
        <Text numberOfLines={1} className="mt-0.5 text-xs text-muted-foreground">
          {author}
        </Text>
      )}
    </Pressable>
  );
}
