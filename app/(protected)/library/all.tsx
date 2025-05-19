import { LegendList } from '@legendapp/list';

import { useGetLibraryItems } from '~/api/queries/libraries/libraries';
import { Container } from '~/components/Container';
import { LibraryItem } from '~/components/LibraryItem';
import { Text } from '~/components/ui/text';
import { store$ } from '~/stores';

export default function AllPage() {
  const { data: libraryItems, isLoading } = useGetLibraryItems(
    store$.userDefaultLibraryId.peek() as string,
    {
      limit: 100,
      minified: 1,
      sort: 'media.metadata.title',
    }
  );

  if (isLoading) {
    return <Text>Loading</Text>;
  }

  return (
    <Container>
      <Text>{libraryItems?.total}</Text>
      <LegendList
        data={libraryItems?.results!}
        renderItem={({ item }) => <LibraryItem item={item} />}
        // recycleItems
        numColumns={2}
        keyExtractor={(item) => item.id!}
        contentContainerStyle={{ padding: 4 }}
        columnWrapperStyle={{ columnGap: 8, rowGap: 8 }}
        estimatedItemSize={230}
      />
    </Container>
  );
}
