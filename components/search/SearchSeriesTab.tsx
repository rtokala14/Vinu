import { useTheme } from '@react-navigation/native';
import { View, FlatList, Keyboard } from 'react-native';

import type { SearchLibrary200 } from '~/api/models';
import { SeriesItem } from '~/components/library/SeriesItem';
import { Text } from '~/components/ui/text';

interface SearchSeriesTabProps {
  searchResults: SearchLibrary200;
}

export function SearchSeriesTab({ searchResults }: SearchSeriesTabProps) {
  const { colors } = useTheme();
  const series = searchResults.series?.filter((item) => !!item) || [];
  if (!series.length) {
    return (
      <View className="m-2 flex-1 items-center justify-center rounded-lg bg-card">
        <Text>No series found</Text>
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
        data={series}
        keyExtractor={(item, index) => (item?.id ? String(item.id) : String(index))}
        renderItem={({ item }) => (item ? <SeriesItem item={item} /> : null)}
        numColumns={2}
        columnWrapperStyle={{
          paddingHorizontal: 4,
          justifyContent: 'space-evenly',
          paddingTop: 16,
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
