import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { BookmarkRow } from '~/components/bookmarks/BookmarkRow';
import { RenameBookmarkModal } from '~/components/bookmarks/RenameBookmarkModal';
import { Text } from '~/components/ui/text';
import { Muted } from '~/components/ui/typography';
import {
  useBookmarks,
  useDeleteBookmark,
  useUpdateBookmark,
  type BookmarkEntry,
} from '~/lib/bookmarks';
import { Bookmark } from '~/lib/icons/Bookmark';
import { ChevronDown } from '~/lib/icons/ChevronDown';
import { ChevronUp } from '~/lib/icons/ChevronUp';
import { playLibraryItem, player$, seekTo } from '~/lib/player';

interface BookmarksSectionProps {
  libraryItemId: string;
}

/**
 * Collapsible bookmarks card for the item detail page, styled to match the
 * Chapters/Episodes sections there. Renders nothing when the item has no
 * bookmarks. Tapping a bookmark seeks if this item is already loaded in the
 * player, otherwise starts playback at the bookmark's time.
 */
export function BookmarksSection({ libraryItemId }: BookmarksSectionProps) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState<BookmarkEntry | null>(null);

  const { data: bookmarks = [] } = useBookmarks(libraryItemId);
  const updateBookmark = useUpdateBookmark();
  const deleteBookmark = useDeleteBookmark();

  if (bookmarks.length === 0) return null;

  const handlePress = (bm: BookmarkEntry) => {
    const nowPlaying = player$.nowPlaying.peek();
    if (nowPlaying?.libraryItemId === libraryItemId) {
      void seekTo(bm.time);
    } else {
      void playLibraryItem(libraryItemId, { startAtTime: bm.time });
    }
  };

  return (
    <View className="mx-4 mt-6 overflow-hidden rounded-xl bg-card">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        className="flex-row items-center justify-between p-4 active:bg-muted">
        <View className="flex-row items-center gap-2">
          <Bookmark size={18} className="text-primary" />
          <Text className="font-semibold">Bookmarks</Text>
          <Muted>({bookmarks.length})</Muted>
        </View>
        {open ? (
          <ChevronUp size={20} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={20} className="text-muted-foreground" />
        )}
      </Pressable>
      {open ? (
        <View className="border-t border-border px-1 pb-2 pt-1">
          {bookmarks.map((bm) => (
            <BookmarkRow
              key={bm.time}
              bookmark={bm}
              onPress={() => handlePress(bm)}
              onEdit={() => setRenaming(bm)}
              onDelete={() => deleteBookmark.mutate({ libraryItemId, time: bm.time })}
            />
          ))}
        </View>
      ) : null}

      <RenameBookmarkModal
        bookmark={renaming}
        saving={updateBookmark.isPending}
        onCancel={() => setRenaming(null)}
        onSave={(title) => {
          if (!renaming) return;
          updateBookmark.mutate(
            { libraryItemId, time: renaming.time, title },
            { onSettled: () => setRenaming(null) }
          );
        }}
      />
    </View>
  );
}
