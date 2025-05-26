import { useTheme } from '@react-navigation/native';
import { View, Pressable, FlatList, Keyboard } from 'react-native';

import type { SearchLibrary200 } from '~/api/models';
import { AuthorItem } from '~/components/library/AuthorItem';
import { LibraryItem } from '~/components/library/LibraryItem';
import { SeriesItem } from '~/components/library/SeriesItem';
import { Text } from '~/components/ui/text';

interface Section {
  key: string;
  data: any[];
  renderItem: (item: any) => React.ReactElement | null;
  tabIndex: number;
}

interface SearchAllTabProps {
  searchResults: SearchLibrary200;
  handleTabPress: (tabIndex: number) => void;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  debouncedSearch: string;
}

export function SearchAllTab({
  searchResults,
  handleTabPress,
  isLoading,
  isFetching,
  isError,
  debouncedSearch,
}: SearchAllTabProps) {
  const { colors } = useTheme();
  if (!debouncedSearch) {
    return (
      <View className="m-2 flex-1 items-center justify-center rounded-lg bg-card">
        <Text className="text-muted-foreground">Type to search your library...</Text>
      </View>
    );
  }
  if (isLoading || isFetching) {
    return (
      <View className="m-2 flex flex-1 items-center justify-center rounded-lg bg-card">
        <Text>Loading...</Text>
      </View>
    );
  }
  if (isError) {
    return (
      <View className="m-2 flex-1 items-center justify-center rounded-lg bg-card">
        <Text className="text-destructive">Error loading results</Text>
      </View>
    );
  }
  if (
    !searchResults ||
    (!searchResults.book?.length && !searchResults.series?.length && !searchResults.authors?.length)
  ) {
    return (
      <View className="m-2 flex-1 items-center justify-center rounded-lg bg-card">
        <Text>No results found</Text>
      </View>
    );
  }
  const books = searchResults.book?.map((b) => b.libraryItem).filter((item) => !!item) || [];
  const series = searchResults.series?.filter((item) => !!item) || [];
  const authors = searchResults.authors?.filter((item) => !!item) || [];
  const sections: Section[] = [
    books.length > 0
      ? {
          key: 'Books',
          data: books,
          renderItem: (item: any) => (item ? <LibraryItem item={item} /> : null),
          tabIndex: 1,
        }
      : null,
    series.length > 0
      ? {
          key: 'Series',
          data: series,
          renderItem: (item: any) => (item ? <SeriesItem item={item} /> : null),
          tabIndex: 2,
        }
      : null,
    authors.length > 0
      ? {
          key: 'Authors',
          data: authors,
          renderItem: (item: any) => (item ? <AuthorItem item={item} /> : null),
          tabIndex: 3,
        }
      : null,
  ].filter(Boolean) as Section[];

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.card,
          borderRadius: 8,
          margin: 8,
          paddingBottom: 8,
          overflow: 'hidden',
        }}>
        <FlatList
          data={sections}
          keyExtractor={(section) => section.key}
          renderItem={({ item: section }) => (
            <View style={{ marginTop: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 8,
                  paddingTop: 8,
                  paddingBottom: 2,
                }}>
                <Text className="text-lg font-bold">{section.key}</Text>
                <Pressable
                  onPress={() => handleTabPress(section.tabIndex)}
                  style={{ paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text className="font-medium text-primary">More</Text>
                </Pressable>
              </View>
              <FlatList
                data={section.data.slice(0, 2)}
                keyExtractor={(item, index) => (item?.id ? String(item.id) : String(index))}
                renderItem={({ item }) => section.renderItem(item) ?? null}
                numColumns={2}
                columnWrapperStyle={{
                  paddingHorizontal: 4,
                  justifyContent: 'space-evenly',
                  paddingTop: 8,
                }}
                contentContainerStyle={{
                  gap: 8,
                  borderRadius: 8,
                  paddingBottom: 8,
                }}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
                onScrollBeginDrag={() => Keyboard.dismiss()}
              />
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
          onScrollBeginDrag={() => Keyboard.dismiss()}
        />
      </View>
    </View>
  );
}
