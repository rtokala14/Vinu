import { useTheme } from '@react-navigation/native';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import type { SeriesFilteredMetadata } from './types';

import type { LibraryItemBase } from '~/api/models';
import { Text } from '~/components/ui/text';
import { Muted } from '~/components/ui/typography';
import { ChevronRight } from '~/lib/icons/ChevronRight';
import { getCoverUri } from '~/lib/utils';
import { store$ } from '~/stores';

interface SeriesBookRowProps {
  item: LibraryItemBase;
  onPress: () => void;
}

/** A book row on the series screen: cover thumb, title, sequence, author. */
export function SeriesBookRow({ item, onPress }: SeriesBookRowProps) {
  const { colors } = useTheme();
  const metadata = item.media?.metadata as SeriesFilteredMetadata | undefined;
  const sequence = metadata?.series?.sequence;

  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-3 px-4 py-2 active:bg-muted">
      <Image
        source={{
          uri: getCoverUri(item.id, store$.settings.serverUrl.peek(), 200),
          headers: { Authorization: `Bearer ${store$.userToken.peek()}` },
        }}
        style={{ width: 64, height: 96, borderRadius: 8, backgroundColor: colors.card }}
        contentFit="cover"
        recyclingKey={item.id}
        placeholderContentFit="cover"
        transition={500}
      />
      <View className="flex-1">
        <Text className="font-semibold" numberOfLines={2}>
          {metadata?.title}
        </Text>
        {sequence ? (
          <Text className="mt-0.5 text-xs font-medium text-primary">Book #{sequence}</Text>
        ) : null}
        {metadata?.authorName ? (
          <Muted className="mt-0.5" numberOfLines={1}>
            {metadata.authorName}
          </Muted>
        ) : null}
      </View>
      <ChevronRight size={20} className="text-muted-foreground" />
    </Pressable>
  );
}
