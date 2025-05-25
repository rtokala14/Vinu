import { useTheme } from '@react-navigation/native';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { Badge } from './ui/badge';
import { Text } from './ui/text';

import type { SeriesBooks } from '~/api/models/seriesBooks';
import { store$ } from '~/stores';

interface SeriesItemProps {
  item: SeriesBooks;
}

export function SeriesItem({ item }: SeriesItemProps) {
  const { colors } = useTheme();

  const covers = (item.books || []).slice(0, 6);

  return (
    <View className="flex flex-col items-center justify-center gap-2">
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'center',
          position: 'relative',
          height: 180,
        }}>
        {covers.map((book, idx) => (
          <Image
            key={book.id}
            source={{
              uri: `${store$.settings.serverUrl.peek()}/api/items/${book.id}/cover?format=webp`,
              headers: { Authorization: `Bearer ${store$.userToken.peek()}` },
            }}
            style={{
              width: 106,
              height: 160,
              borderRadius: 6,
              marginLeft: idx === 0 ? 0 : -100,
              marginBottom: idx * 5,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              zIndex: covers.length - idx,
            }}
            contentFit="cover"
            recyclingKey={book.id}
            placeholderContentFit="cover"
            transition={500}
          />
        ))}
        <Badge className={` absolute bottom-2 left-2 z-50`}>
          <Text>{item.books?.length}</Text>
        </Badge>
      </View>
      <Text className="text-center text-base font-semibold">{item.name}</Text>
      <Text className="-mt-2 mb-1 text-sm font-light">
        {item.books![0].media?.metadata?.authorName}
      </Text>
    </View>
  );
}
