import { Image } from 'expo-image';
import { Href, useRouter } from 'expo-router';
import { FlatList, Pressable, View } from 'react-native';

import type { LibraryShelf } from '~/api/models';
import { BookCard, CARD_WIDTH, ShelfBook } from '~/components/home/BookCard';
import { Text } from '~/components/ui/text';
import { Users } from '~/lib/icons/Users';
import { getCoverUri } from '~/lib/utils';
import { store$ } from '~/stores';

/** Loose shape of a series entity from the personalized shelves. */
type ShelfSeries = {
  id?: string;
  name?: string;
  books?: { id?: string }[];
};

/** Loose shape of an author entity from the personalized shelves. */
type ShelfAuthor = {
  id?: string;
  name?: string;
  imagePath?: string | null;
};

const PROGRESS_SHELVES = new Set(['continue-listening', 'listen-again']);

function SeriesCard({ series }: { series: ShelfSeries }) {
  const router = useRouter();
  const serverUrl = store$.settings.serverUrl.peek();
  const token = store$.userToken.peek();
  const firstBookId = series.books?.[0]?.id;
  const bookCount = series.books?.length ?? 0;

  return (
    <Pressable
      className="active:opacity-80"
      style={{ width: CARD_WIDTH }}
      onPress={() => router.push(`/series/${series.id}` as Href)}>
      <Image
        source={{
          uri: getCoverUri(firstBookId, serverUrl),
          headers: { Authorization: `Bearer ${token}` },
        }}
        style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.5, borderRadius: 8 }}
        className="bg-muted"
        contentFit="cover"
        recyclingKey={series.id}
        transition={300}
      />
      <Text numberOfLines={2} className="mt-1.5 text-sm font-semibold leading-tight">
        {series.name}
      </Text>
      {bookCount > 0 && (
        <Text className="mt-0.5 text-xs text-muted-foreground">
          {bookCount} {bookCount === 1 ? 'book' : 'books'}
        </Text>
      )}
    </Pressable>
  );
}

function AuthorCard({ author }: { author: ShelfAuthor }) {
  const router = useRouter();
  const serverUrl = store$.settings.serverUrl.peek();
  const token = store$.userToken.peek();

  return (
    <Pressable
      className="items-center active:opacity-80"
      style={{ width: 96 }}
      onPress={() => router.push(`/author/${author.id}` as Href)}>
      {author.imagePath ? (
        <Image
          source={{
            uri: `${serverUrl}/api/authors/${author.id}/image?format=webp&width=192`,
            headers: { Authorization: `Bearer ${token}` },
          }}
          style={{ width: 80, height: 80, borderRadius: 40 }}
          className="bg-muted"
          contentFit="cover"
          recyclingKey={author.id}
          transition={300}
        />
      ) : (
        <View className="h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Users size={28} className="text-muted-foreground" />
        </View>
      )}
      <Text numberOfLines={2} className="mt-1.5 text-center text-sm font-medium leading-tight">
        {author.name}
      </Text>
    </Pressable>
  );
}

export function ShelfRow({
  shelf,
  progressMap,
}: {
  shelf: LibraryShelf;
  /** libraryItemId -> 0..1 progress, from the user's mediaProgress. */
  progressMap: Record<string, number>;
}) {
  const entities = shelf.entities ?? [];
  if (!entities.length) return null;

  const showProgress = PROGRESS_SHELVES.has(shelf.id ?? '');
  const showPlay = shelf.id === 'continue-listening';

  return (
    <View className="gap-3">
      <Text className="px-6 text-lg font-semibold">{shelf.label}</Text>
      {shelf.type === 'series' ? (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={entities as ShelfSeries[]}
          keyExtractor={(entity, index) => entity.id ?? String(index)}
          contentContainerClassName="gap-4 px-6"
          renderItem={({ item }) => <SeriesCard series={item} />}
        />
      ) : shelf.type === 'authors' ? (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={entities as ShelfAuthor[]}
          keyExtractor={(entity, index) => entity.id ?? String(index)}
          contentContainerClassName="gap-4 px-6"
          renderItem={({ item }) => <AuthorCard author={item} />}
        />
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={entities as ShelfBook[]}
          keyExtractor={(entity, index) => entity.id ?? String(index)}
          contentContainerClassName="gap-4 px-6"
          renderItem={({ item }) => (
            <BookCard
              item={item}
              progress={showProgress && item.id ? progressMap[item.id] : undefined}
              showPlay={showPlay}
            />
          )}
        />
      )}
    </View>
  );
}
