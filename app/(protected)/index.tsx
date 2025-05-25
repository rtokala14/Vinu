import { useGetLibraryById } from '~/api/queries/libraries/libraries';
import { Container } from '~/components/Container';
import { Text } from '~/components/ui/text';
import { store$ } from '~/stores';

export default function HomePage() {
  const { data: libraryData, isLoading } = useGetLibraryById(
    store$.currentLibraryId.peek() as string
  );

  return (
    <Container>
      {isLoading ?? <Text>Loading...</Text>}
      <Text>{libraryData?.name}</Text>
    </Container>
  );
}
