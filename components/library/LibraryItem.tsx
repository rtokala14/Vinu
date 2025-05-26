import { useTheme } from '@react-navigation/native';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '../ui/text';

import { LibraryItemBase } from '~/api/models';
import { store$ } from '~/stores';

export function LibraryItem({ item }: { item: LibraryItemBase }) {
  const { colors } = useTheme();
  const coverPath = `${store$.settings.serverUrl.peek()}/api/items/${item.id}/cover?format=webp`;

  return (
    <View className="flex flex-col items-center justify-center gap-2">
      <Image
        source={{
          uri: coverPath,
          headers: {
            Authorization: `Bearer ${store$.userToken.peek()}`,
          },
        }}
        style={{ width: 150, height: 225, borderRadius: 8, backgroundColor: colors.card }}
        contentFit="cover"
        recyclingKey={item.id}
        placeholderContentFit="cover"
        transition={1000}
      />
      <Text className="text-center text-base font-semibold">{item.media?.metadata?.title}</Text>
      <Text className="-mt-2 mb-1 text-sm font-light">{item.media?.metadata?.authorName}</Text>
    </View>
  );
}
