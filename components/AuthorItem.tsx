import { useTheme } from '@react-navigation/native';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { Badge } from './ui/badge';
import { Text } from './ui/text';

import { AuthorMinified } from '~/api/models';
import { store$ } from '~/stores';

export function AuthorItem({ item }: { item: AuthorMinified }) {
  const { colors } = useTheme();
  const coverPath = `${store$.settings.serverUrl.peek()}/api/authors/${item.id}/image?format=webp`;

  return (
    <View className="flex flex-col items-center justify-center gap-2">
      <View
        style={{
          marginBottom: 4,
          flexDirection: 'row',
          alignItems: 'center',
          position: 'relative',
        }}>
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
          transition={1000}
        />
        <Badge className={` absolute left-2 top-2 z-50`}>
          {/* @ts-expect-error */}
          <Text>{item.numBooks}</Text>
        </Badge>
      </View>
      <Text>{item.name}</Text>
    </View>
  );
}
