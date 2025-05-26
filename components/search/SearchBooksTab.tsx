import { useTheme } from '@react-navigation/native';
import { View, FlatList, Keyboard } from 'react-native';

import type { SearchLibrary200 } from '~/api/models';
import { LibraryItem } from '~/components/library/LibraryItem';
import { Text } from '~/components/ui/text';

interface SearchBooksTabProps {
  searchResults: SearchLibrary200;
}

export function SearchBooksTab({ searchResults }: SearchBooksTabProps) {
  const { colors } = useTheme();
  const books = searchResults.book?.map((b) => b.libraryItem).filter((item) => !!item) || [];
  if (!books.length) {
    return (
      <View className="m-2 flex-1 items-center justify-center rounded-lg bg-card">
        <Text>No books found</Text>
      </View>
    );
  }
  return (
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
        data={books}
        keyExtractor={(item, index) => (item?.id ? String(item.id) : String(index))}
        renderItem={({ item }) => (item ? <LibraryItem item={item} /> : null)}
        numColumns={2}
        columnWrapperStyle={{
          paddingHorizontal: 4,
          justifyContent: 'space-evenly',
          paddingTop: 8,
        }}
        contentContainerStyle={{
          gap: 8,
          borderRadius: 8,
          paddingBottom: 16,
        }}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => Keyboard.dismiss()}
      />
    </View>
  );
}
