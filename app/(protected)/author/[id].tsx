import { LegendList } from '@legendapp/list';
import { useTheme } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GetAuthorByIdParams } from '~/api/models';
import { useGetAuthorById } from '~/api/queries/authors/authors';
import { BackButton } from '~/components/detail/BackButton';
import { CollapsibleText } from '~/components/detail/CollapsibleText';
import { stripHtml } from '~/components/detail/helpers';
import { LibraryItem } from '~/components/library/LibraryItem';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { Muted } from '~/components/ui/typography';
import { Users } from '~/lib/icons/Users';
import { store$ } from '~/stores';

export default function AuthorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [imageFailed, setImageFailed] = useState(false);

  const libraryId = store$.currentLibraryId.get();
  const query = useGetAuthorById(id ?? '', {
    include: 'items,series',
    library: libraryId,
  } as GetAuthorByIdParams);
  const author = query.data;
  const books = author?.libraryItems ?? [];
  const series = author?.series ?? [];

  if (query.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <BackButton />
        <ActivityIndicator color="#B45309" size="large" />
      </View>
    );
  }

  if (query.isError || !author) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-8">
        <BackButton />
        <Text className="text-center text-muted-foreground">Could not load this author.</Text>
        <Button variant="outline" onPress={() => query.refetch()}>
          <Text>Retry</Text>
        </Button>
      </View>
    );
  }

  const header = (
    <View className="items-center px-6 pb-2">
      {imageFailed || !author.imagePath ? (
        <View className="h-32 w-32 items-center justify-center rounded-full bg-muted">
          <Users size={48} className="text-muted-foreground" />
        </View>
      ) : (
        <Image
          source={{
            uri: `${store$.settings.serverUrl.peek()}/api/authors/${id}/image?format=webp&width=400`,
            headers: { Authorization: `Bearer ${store$.userToken.peek()}` },
          }}
          style={{ width: 128, height: 128, borderRadius: 64, backgroundColor: colors.card }}
          contentFit="cover"
          transition={500}
          onError={() => setImageFailed(true)}
        />
      )}
      <Text className="mt-4 text-center text-2xl font-bold">{author.name}</Text>
      {books.length > 0 ? (
        <Muted className="mt-1">
          {books.length} {books.length === 1 ? 'book' : 'books'}
        </Muted>
      ) : null}
      {author.description ? (
        <View className="mt-4 w-full">
          <CollapsibleText text={stripHtml(author.description)} numberOfLines={5} />
        </View>
      ) : null}
      {books.length > 0 ? (
        <View className="mt-6 w-full">
          <Text className="text-lg font-bold">Books</Text>
        </View>
      ) : null}
    </View>
  );

  const footer =
    series.length > 0 ? (
      <View className="mt-6">
        {series.map((s) => (
          <View key={s.id} className="mb-6">
            <View className="flex-row items-center justify-between px-4 pb-2">
              <Text className="flex-1 text-lg font-bold" numberOfLines={1}>
                {s.name}
              </Text>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  s.id &&
                  router.push({
                    pathname: '/series/[id]',
                    params: { id: s.id, name: s.name ?? '' },
                  })
                }>
                <Text className="font-medium text-primary">View series</Text>
              </Pressable>
            </View>
            <FlatList
              horizontal
              data={s.items ?? []}
              keyExtractor={(it, index) => it.id ?? String(index)}
              renderItem={({ item }) => <LibraryItem item={item} />}
              contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        ))}
      </View>
    ) : null;

  return (
    <View className="flex-1 bg-background">
      <BackButton />
      <LegendList
        data={books}
        renderItem={({ item }) => <LibraryItem item={item} />}
        numColumns={2}
        recycleItems
        keyExtractor={(item, index) => item.id ?? String(index)}
        contentContainerStyle={{
          paddingTop: insets.top + 56,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 4,
        }}
        columnWrapperStyle={{ columnGap: 8, rowGap: 8 }}
        estimatedItemSize={280}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
