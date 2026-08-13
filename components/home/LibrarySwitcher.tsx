import { use$ } from '@legendapp/state/react';
import { View } from 'react-native';

import { useGetLibraries } from '~/api/queries/libraries/libraries';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Text } from '~/components/ui/text';
import { BookOpen } from '~/lib/icons/BookOpen';
import { Check } from '~/lib/icons/Check';
import { ChevronDown } from '~/lib/icons/ChevronDown';
import { Headphones } from '~/lib/icons/Headphones';
import { LibraryBig } from '~/lib/icons/LibraryBig';
import { cn } from '~/lib/utils';
import { store$ } from '~/stores';

function MediaTypeIcon({ mediaType, className }: { mediaType?: string; className?: string }) {
  if (mediaType === 'podcast') return <Headphones size={16} className={className} />;
  if (mediaType === 'book') return <BookOpen size={16} className={className} />;
  return <LibraryBig size={16} className={className} />;
}

export function LibrarySwitcher({ className }: { className?: string }) {
  const currentLibraryId = use$(store$.currentLibraryId);
  const { data } = useGetLibraries();
  const libraries = data?.libraries ?? [];
  const current = libraries.find((lib) => lib.id === currentLibraryId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('flex-row items-center gap-2', className)}>
          <LibraryBig size={16} className="text-primary" />
          <Text numberOfLines={1} className="max-w-32 text-sm font-medium">
            {current?.name ?? 'Library'}
          </Text>
          <ChevronDown size={14} className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {libraries.map((lib) => (
          <DropdownMenuItem
            key={lib.id}
            onPress={() => store$.currentLibraryId.set(lib.id)}
            className="gap-2">
            <MediaTypeIcon mediaType={lib.mediaType} className="text-foreground" />
            <Text className="flex-1" numberOfLines={1}>
              {lib.name}
            </Text>
            {lib.id === currentLibraryId && (
              <View className="ml-auto">
                <Check size={16} strokeWidth={3} className="text-primary" />
              </View>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
