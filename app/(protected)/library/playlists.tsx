import { LegendList } from '@legendapp/list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ActivityIndicator, View } from 'react-native';

import { customAxios } from '~/api/custom-axios';
import { AudioTrack, LibraryItemExpanded, LibraryItemMinified, PodcastEpisode } from '~/api/models';
import { Container } from '~/components/Container';
import { PlaylistItemComponent } from '~/components/library/PlaylistItem';
import { Text } from '~/components/ui/text';
import { store$ } from '~/stores';

type PlaylistItem = {
  libraryItemId: string;
  episodeId: string | null;
};

type PlaylistItemExpanded = PlaylistItem & {
  episode?: PodcastEpisode & {
    audioTrack: AudioTrack;
    duration: number;
    size: number;
  };
  libraryItem: LibraryItemExpanded | LibraryItemMinified;
};

type Playlist = {
  id: string;
  libraryId: string;
  userId: string;
  name: string;
  description: string | null;
  coverPath: string | null;
  items: PlaylistItem[];
  lastUpdate: number;
  createdAt: number;
};

export type PlaylistExpanded = Omit<Playlist, 'items'> & {
  items: PlaylistItemExpanded[];
};

type GetLibraryPlaylists200 = {
  results: PlaylistExpanded[];
  total: number;
  limit: number;
  page: number;
};

export default function PlaylistsPage() {
  const userLibraryId = store$.currentLibraryId.get();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['playlists', userLibraryId],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      customAxios<GetLibraryPlaylists200>({
        url: `/api/libraries/${userLibraryId}/playlists?limit=20&page=${pageParam}`,
        method: 'GET',
      }).then((res) => res),
    getNextPageParam: (lastPage, allPages) => {
      const lp = lastPage as GetLibraryPlaylists200;
      const nextPage = allPages.length;
      return lp.results && lp.results.length === 20 ? nextPage : undefined;
    },
  });

  const playlists = data
    ? data.pages.flatMap((page) => (page as GetLibraryPlaylists200).results || [])
    : [];

  return (
    <Container>
      {isLoading ? (
        <View className=" flex flex-1 items-center justify-center rounded-lg bg-card">
          <ActivityIndicator color="#B45309" size="large" />
        </View>
      ) : !playlists.length ? (
        <View className=" flex flex-1 items-center justify-center rounded-lg bg-card">
          <Text>No playlists found</Text>
        </View>
      ) : (
        <LegendList
          data={playlists}
          renderItem={({ item }) => <PlaylistItemComponent item={item} />}
          numColumns={1}
          recycleItems
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 4 }}
          columnWrapperStyle={{ columnGap: 8, rowGap: 8 }}
          estimatedItemSize={180}
          onEndReachedThreshold={4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
        />
      )}
    </Container>
  );
}
