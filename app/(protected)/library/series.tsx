import { LegendList } from '@legendapp/list';

import { useGetLibrarySeries } from '~/api/queries/libraries/libraries';
import { Container } from '~/components/Container';
import { Text } from '~/components/ui/text';
import { store$ } from '~/stores';

export default function SeriesPage() {
  const { data: seriesItems, isLoading } = useGetLibrarySeries(
    store$.userDefaultLibraryId.peek() as string,
    {
      minified: 1,
    }
  );

  if (isLoading) {
    return <Text>Loading</Text>;
  }

  return (
    <Container>
      <Text>{seriesItems?.total}</Text>
      <LegendList
        data={seriesItems?.results!}
        renderItem={({ item }) => <Text>{item.name}</Text>}
        // recycleItems
        numColumns={2}
        keyExtractor={(item) => item.id!}
        contentContainerStyle={{ padding: 4 }}
        // columnWrapperStyle={{ columnGap: 8, rowGap: 8 }}
        estimatedItemSize={10}
      />
    </Container>
  );
}
