import { useTheme } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';

import { Container } from '~/components/Container';
import { Text } from '~/components/ui/text';
import { store$ } from '~/stores';

export default function BookPage() {
  const { bookId } = useLocalSearchParams() as { bookId: string };
  const { colors } = useTheme();

  const coverPath = `${store$.settings.serverUrl.peek()}/api/items/${bookId}/cover?format=webp`;

  return (
    <Container>
      <Text>{bookId}</Text>
      <Image
        source={{
          uri: coverPath,
          headers: {
            Authorization: `Bearer ${store$.userToken.peek()}`,
          },
        }}
        style={{ width: 300, height: 450, borderRadius: 8, backgroundColor: colors.card }}
        contentFit="cover"
        recyclingKey={bookId}
        placeholderContentFit="cover"
        transition={1000}
      />
    </Container>
  );
}
