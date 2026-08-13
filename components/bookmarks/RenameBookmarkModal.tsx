import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';

import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import type { BookmarkEntry } from '~/lib/bookmarks';
import { formatClock } from '~/lib/utils';

interface RenameBookmarkModalProps {
  /** The bookmark being renamed; null hides the modal. */
  bookmark: BookmarkEntry | null;
  saving?: boolean;
  onCancel: () => void;
  onSave: (title: string) => void;
}

/** Minimal centered modal with a single Input to rename a bookmark. */
export function RenameBookmarkModal({
  bookmark,
  saving,
  onCancel,
  onSave,
}: RenameBookmarkModalProps) {
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (bookmark) setTitle(bookmark.title);
  }, [bookmark]);

  return (
    <Modal visible={bookmark !== null} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <Pressable
          className="flex-1 items-center justify-center bg-black/50 px-8"
          onPress={onCancel}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-5">
            <Text className="text-lg font-semibold">Rename bookmark</Text>
            {bookmark ? (
              <Text className="mt-0.5 text-xs text-muted-foreground">
                at {formatClock(bookmark.time)}
              </Text>
            ) : null}
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="Bookmark title"
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={() => title.trim() && onSave(title.trim())}
              className="mt-4"
            />
            <View className="mt-4 flex-row justify-end gap-2">
              <Button variant="ghost" size="sm" onPress={onCancel}>
                <Text>Cancel</Text>
              </Button>
              <Button
                size="sm"
                disabled={!title.trim() || saving}
                onPress={() => onSave(title.trim())}>
                <Text>{saving ? 'Saving…' : 'Save'}</Text>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
