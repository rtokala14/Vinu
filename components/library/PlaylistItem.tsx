import { useTheme } from '@react-navigation/native';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { Badge } from '../ui/badge';
import { Text } from '../ui/text';

import { PlaylistExpanded } from '~/app/(protected)/library/(toptabs)/playlists';
import { store$ } from '~/stores';

interface PlaylistItemProps {
  item: PlaylistExpanded;
}

export function PlaylistItemComponent({ item }: PlaylistItemProps) {
  const { colors } = useTheme();

  const covers = (item.items || []).slice(0, 6);

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
            key={book.libraryItemId}
            source={{
              uri: `${store$.settings.serverUrl.peek()}/api/items/${book.libraryItemId}/cover?format=webp`,
              headers: { Authorization: `Bearer ${store$.userToken.peek()}` },
            }}
            style={{
              width: 106,
              height: 160,
              borderRadius: 6,
              marginLeft: idx === 0 ? 0 : -60,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              zIndex: covers.length - idx,
            }}
            contentFit="cover"
            recyclingKey={book.libraryItemId}
            placeholderContentFit="cover"
            transition={500}
          />
        ))}
        <Badge className={` absolute bottom-2 left-2 z-50`}>
          <Text>{item.items?.length}</Text>
        </Badge>
      </View>
      {/* @ts-ignore */}
      <Text className="text-center text-base font-semibold">{item.name}</Text>
    </View>
  );
}
