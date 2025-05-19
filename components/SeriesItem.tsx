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
  const numBooks = item.books?.length || 0;
  const covers = (item.books || []).slice(0, 7);
  const baseWidth = 96;
  const gap = numBooks > 3 ? -(baseWidth / 1.5 / (7 - 3)) * (covers.length - 3) : -16;

  return (
    <View className="flex flex-col items-center justify-center gap-2">
      <View
        style={{
          marginBottom: 4,
          flexDirection: 'row',
          alignItems: 'center',
          position: 'relative',
        }}>
        {covers.map((book, idx) => (
          <Image
            key={book.id}
            source={{
              uri: `${store$.settings.serverUrl.peek()}/api/items/${book.id}/cover?format=webp`,
              headers: { Authorization: `Bearer ${store$.userToken.peek()}` },
            }}
            style={{
              width: baseWidth,
              height: 144,
              borderRadius: 6,
              marginLeft: idx === 0 ? 0 : gap,
              borderWidth: 1,
              borderColor: '#fff',
              zIndex: -idx,
            }}
            contentFit="cover"
            placeholderContentFit="cover"
            transition={500}
          />
        ))}
        <Badge className={` absolute left-2 top-2 z-50`}>
          <Text>{item.books?.length}</Text>
        </Badge>
      </View>
      <Text className="mb-1 text-center text-base font-semibold">{item.name}</Text>
    </View>
  );
}
