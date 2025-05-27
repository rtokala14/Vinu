import { LegendList } from '@legendapp/list';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { customAxios } from '~/api/custom-axios';

import { Container } from '~/components/Container';
import { Text } from '~/components/ui/text';

type Series = {
  id: string;
  name: string;
  description: string | null;
  addedAt: number;
  updatedAt: number;
};

type SeriesProgress = {
  libraryItemIds: string[];
  libraryItemIdsFinished: string[];
  isFinished: boolean;
};

type SeriesWithProgress = Series & {
  progress: SeriesProgress;
};

export default function SeriesPage() {
  const { seriesId } = useLocalSearchParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['series', seriesId],
    queryFn: async () =>
      customAxios<SeriesWithProgress>({
        url: `/api/series/${seriesId}?include=progress,rssfeed`,
        method: 'GET',
      }).then((res) => res),
  });

  return (
    <Container>
      {isLoading ? (
        <Text>Loading...</Text>
      ) : error || !data ? (
        <Text>Error loading series</Text>
      ) : (
        <>
          <Text className="text-lg font-bold">{data.name}</Text>
          <Text className="text-sm text-gray-500">
            {data.progress.libraryItemIds.length} episodes incomplete
          </Text>
          <LegendList
            data={data.progress.libraryItemIds}
            renderItem={(item) => <Text>{item.item}</Text>}
          />
        </>
      )}
    </Container>
  );
}
