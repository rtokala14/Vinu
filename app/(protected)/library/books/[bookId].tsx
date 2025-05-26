import { useLocalSearchParams } from 'expo-router';

import { Container } from '~/components/Container';
import { Text } from '~/components/ui/text';

export default function BookPage() {
  const { bookId } = useLocalSearchParams();

  return (
    <Container>
      <Text>{bookId}</Text>
    </Container>
  );
}
