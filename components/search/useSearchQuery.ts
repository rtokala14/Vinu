import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { customAxios } from '~/api/custom-axios';
import { SearchLibrary200 } from '~/api/models';
import { store$ } from '~/stores';

export function useSearchQuery() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const userLibraryId = store$.currentLibraryId.peek();
  const userToken = store$.userToken.peek();

  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [search]);

  const query = useInfiniteQuery({
    queryKey: ['search', userLibraryId, debouncedSearch],
    enabled: !!debouncedSearch,
    initialPageParam: 0,
    queryFn: async () => {
      if (!debouncedSearch) return {} as SearchLibrary200;
      return customAxios({
        url: `/api/libraries/${userLibraryId}/search?q=${encodeURIComponent(debouncedSearch)}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${userToken}` },
      }).then((res) => res as SearchLibrary200);
    },
    getNextPageParam: () => undefined,
  });

  return {
    search,
    setSearch,
    debouncedSearch,
    ...query,
    searchResults: query.data?.pages?.[0] || {},
  };
}
