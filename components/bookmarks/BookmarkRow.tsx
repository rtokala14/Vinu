import { Alert, Pressable, View } from 'react-native';

import { Text } from '~/components/ui/text';
import { formatRelativeDate, type BookmarkEntry } from '~/lib/bookmarks';
import { Bookmark } from '~/lib/icons/Bookmark';
import { Pencil } from '~/lib/icons/Pencil';
import { Trash2 } from '~/lib/icons/Trash2';
import { formatClock } from '~/lib/utils';

interface BookmarkRowProps {
  bookmark: BookmarkEntry;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Shows the native delete confirmation for a bookmark. */
export function confirmDeleteBookmark(title: string, onConfirm: () => void) {
  Alert.alert('Delete bookmark', `Delete "${title || 'this bookmark'}"?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

/**
 * A single tappable bookmark row: title + time + relative created date, with
 * rename (pencil) and delete (trash) affordances. Used by both the player's
 * inline bookmarks list and the item-detail BookmarksSection.
 */
export function BookmarkRow({ bookmark, onPress, onEdit, onDelete }: BookmarkRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-lg px-3 py-2.5 active:bg-muted">
      <Bookmark size={16} className="text-primary" />
      <View className="flex-1">
        <Text numberOfLines={1} className="text-sm font-medium">
          {bookmark.title || formatClock(bookmark.time)}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {formatClock(bookmark.time)}
          {bookmark.createdAt ? ` · ${formatRelativeDate(bookmark.createdAt)}` : ''}
        </Text>
      </View>
      <Pressable
        onPress={onEdit}
        hitSlop={6}
        className="h-9 w-9 items-center justify-center rounded-full active:bg-accent">
        <Pencil size={15} className="text-muted-foreground" />
      </Pressable>
      <Pressable
        onPress={() => confirmDeleteBookmark(bookmark.title, onDelete)}
        hitSlop={6}
        className="h-9 w-9 items-center justify-center rounded-full active:bg-accent">
        <Trash2 size={15} className="text-muted-foreground" />
      </Pressable>
    </Pressable>
  );
}
