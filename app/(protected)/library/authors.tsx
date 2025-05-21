import { LegendList } from '@legendapp/list';
import { useInfiniteQuery } from '@tanstack/react-query';

import { customAxios } from '~/api/custom-axios';
import { GetLibraryAuthors200 } from '~/api/models';
import { AuthorItem } from '~/components/AuthorItem';
import AuthorItemSkeleton from '~/components/AuthorItemSkeleton';
import { Container } from '~/components/Container';
import { Text } from '~/components/ui/text';
import { store$ } from '~/stores';

export default function AuthorsPage() {
  const userLibraryId = store$.currentLibraryId.get();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['authors', userLibraryId],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      customAxios<GetLibraryAuthors200>({
        url: `/api/libraries/${userLibraryId}/authors?sort=name&desc=0&limit=20&page=${pageParam}&minified=1`,
        method: 'GET',
      }).then((res) => res),
    getNextPageParam: (lastPage, allPages) => {
      const lp = lastPage as GetLibraryAuthors200;
      const nextPage = allPages.length;
      // @ts-expect-error Yet to change the data type in the API
      return lp.results && lp.results.length === 20 ? nextPage : undefined;
    },
  });

  const authors = data
    ? // @ts-expect-error Yet to change the data type in the API
      data.pages.flatMap((page) => (page as GetLibraryAuthors200).results || [])
    : [];
  // @ts-expect-error Yet to change the data type in the API
  const total = data?.pages[0] ? (data.pages[0] as GetLibraryAuthors200).total : 0;

  if (isLoading) {
    return (
      <Container>
        {/* <Text>{total}</Text>  TODO: Decide if total should be shown during loading */}
        <LegendList
          data={Array(20).fill({})}
          renderItem={() => <AuthorItemSkeleton />}
          keyExtractor={(_item, index) => `skeleton-author-${index}`}
          numColumns={2}
          recycleItems
          contentContainerStyle={{ padding: 4 }}
          columnWrapperStyle={{ columnGap: 8, rowGap: 8 }}
          estimatedItemSize={230}
        />
      </Container>
    );
  }

  if (!authors.length) {
    return <Text>No authors found</Text>;
  }

  return (
    <Container>
      <Text>{total}</Text>
      <LegendList
        data={authors}
        renderItem={({ item }) => <AuthorItem item={item} />}
        numColumns={2}
        recycleItems
        keyExtractor={(item) => item.id!}
        contentContainerStyle={{ padding: 4 }}
        columnWrapperStyle={{ columnGap: 8, rowGap: 8 }}
        estimatedItemSize={230}
        onEndReachedThreshold={2}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
      />
    </Container>
  );
}
