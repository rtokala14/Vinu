import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from './ui/text';

import { LibraryItemBase } from '~/api/models';
import { store$ } from '~/stores';

const blurhash =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

export function LibraryItem({ item }: { item: LibraryItemBase }) {
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
        style={{ width: 150, height: 200, borderRadius: 8 }}
        contentFit="cover"
        placeholder={blurhash}
        placeholderContentFit="cover"
        transition={1000}
      />
      <Text>{item.media?.metadata?.title}</Text>
    </View>
  );
}
