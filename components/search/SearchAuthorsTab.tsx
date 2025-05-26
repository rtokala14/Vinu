import { useTheme } from '@react-navigation/native';
import { View, FlatList, Keyboard } from 'react-native';

import type { SearchLibrary200 } from '~/api/models';
import { AuthorItem } from '~/components/library/AuthorItem';
import { Text } from '~/components/ui/text';

interface SearchAuthorsTabProps {
  searchResults: SearchLibrary200;
}

export function SearchAuthorsTab({ searchResults }: SearchAuthorsTabProps) {
  const { colors } = useTheme();
  const authors = searchResults.authors?.filter((item) => !!item) || [];
  if (!authors.length) {
    return (
      <View className="m-2 flex-1 items-center justify-center rounded-lg bg-card">
        <Text>Type to search authors...</Text>
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
        data={authors}
        keyExtractor={(item, index) => (item?.id ? String(item.id) : String(index))}
        renderItem={({ item }) => (item ? <AuthorItem item={item} /> : null)}
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
