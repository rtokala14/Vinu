import { use$ } from '@legendapp/state/react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { H1, Muted } from '~/components/ui/typography';
import {
  type DownloadEntry,
  cancelDownload,
  deleteDownload,
  downloadItem,
  downloads$,
  flushLocalSessions,
  formatBytes,
  offlineSessions$,
  resolveDownloadUri,
} from '~/lib/downloads';
import { ChevronLeft } from '~/lib/icons/ChevronLeft';
import { CloudOff } from '~/lib/icons/CloudOff';
import { HardDrive } from '~/lib/icons/HardDrive';
import { RefreshCw } from '~/lib/icons/RefreshCw';
import { Trash2 } from '~/lib/icons/Trash2';
import { cn, formatDuration, getCoverUri } from '~/lib/utils';
import { store$ } from '~/stores';

type Row = { itemId: string; entry: DownloadEntry };

function statusLine(entry: DownloadEntry): string {
  switch (entry.status) {
    case 'queued':
      return 'Waiting to download…';
    case 'downloading':
      return `Downloading… ${Math.round(entry.progress * 100)}%`;
    case 'error':
      return entry.error ?? 'Download failed';
    case 'complete':
      return `${formatBytes(entry.itemMeta.size)} · ${formatDuration(entry.itemMeta.duration)}`;
  }
}

function DownloadRow({ itemId, entry }: Row) {
  const router = useRouter();

  const coverUri = entry.itemMeta.coverLocalUri
    ? resolveDownloadUri(entry.itemMeta.coverLocalUri)
    : getCoverUri(itemId, store$.settings.serverUrl.peek(), 200);
  const inFlight = entry.status === 'downloading' || entry.status === 'queued';

  const onDelete = () => {
    if (inFlight) {
      Alert.alert('Cancel download?', 'The partially downloaded files will be removed.', [
        { text: 'Keep downloading', style: 'cancel' },
        {
          text: 'Cancel download',
          style: 'destructive',
          onPress: () => void cancelDownload(itemId),
        },
      ]);
      return;
    }
    Alert.alert(
      'Remove download?',
      `"${entry.itemMeta.title}" will be deleted from this device. Your listening progress is kept.`,
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => void deleteDownload(itemId) },
      ]
    );
  };

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/item/[id]', params: { id: itemId } })}
      className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3 active:opacity-80">
      <Image
        source={
          entry.itemMeta.coverLocalUri
            ? { uri: coverUri }
            : { uri: coverUri, headers: { Authorization: `Bearer ${store$.userToken.peek()}` } }
        }
        style={{ width: 52, height: 52, borderRadius: 8 }}
        contentFit="cover"
        recyclingKey={itemId}
        transition={200}
      />
      <View className="flex-1">
        <Text numberOfLines={1} className="text-base font-semibold">
          {entry.itemMeta.title || 'Unknown title'}
        </Text>
        {entry.itemMeta.authorName ? (
          <Muted numberOfLines={1} className="text-xs">
            {entry.itemMeta.authorName}
          </Muted>
        ) : null}
        <Text
          numberOfLines={1}
          className={cn(
            'mt-0.5 text-xs',
            entry.status === 'error' ? 'text-destructive' : 'text-muted-foreground'
          )}>
          {statusLine(entry)}
        </Text>
        {inFlight ? (
          <View className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
            <View
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.round(entry.progress * 100)}%` }}
            />
          </View>
        ) : null}
      </View>
      {entry.status === 'error' ? (
        <Pressable
          onPress={() => downloadItem(itemId)}
          hitSlop={8}
          accessibilityLabel="Retry download"
          className="h-9 w-9 items-center justify-center rounded-full border border-border active:bg-muted">
          <RefreshCw size={16} className="text-foreground" />
        </Pressable>
      ) : null}
      <Pressable
        onPress={onDelete}
        hitSlop={8}
        accessibilityLabel={inFlight ? 'Cancel download' : 'Remove download'}
        className="h-9 w-9 items-center justify-center rounded-full border border-border active:bg-muted">
        <Trash2 size={16} className="text-destructive" />
      </Pressable>
    </Pressable>
  );
}

function PendingSessionsFooter() {
  const sessions = use$(offlineSessions$.sessions);
  const lastError = use$(offlineSessions$.lastError);
  const [syncing, setSyncing] = useState(false);

  if (!sessions || sessions.length === 0) return null;

  const onSyncNow = async () => {
    setSyncing(true);
    try {
      await flushLocalSessions();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="mt-4 gap-3 p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/15">
          <CloudOff size={18} className="text-primary" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold">
            {sessions.length === 1
              ? '1 listening session waiting to sync'
              : `${sessions.length} listening sessions waiting to sync`}
          </Text>
          <Muted className="text-xs">Progress from offline listening uploads automatically.</Muted>
        </View>
      </View>
      {lastError ? (
        <Text numberOfLines={2} className="text-xs text-destructive">
          Last attempt failed: {lastError}
        </Text>
      ) : null}
      <Pressable
        onPress={() => void onSyncNow()}
        disabled={syncing}
        className={cn(
          'h-10 flex-row items-center justify-center gap-2 rounded-md bg-primary active:opacity-90',
          syncing && 'opacity-50'
        )}>
        <RefreshCw size={16} className="text-primary-foreground" />
        <Text className="text-sm font-medium text-primary-foreground">
          {syncing ? 'Syncing…' : 'Sync now'}
        </Text>
      </Pressable>
    </Card>
  );
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-10 py-24">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-muted">
        <HardDrive size={28} className="text-muted-foreground" />
      </View>
      <Text className="text-center text-lg font-semibold">No downloads yet</Text>
      <Muted className="text-center text-sm">
        Download a book from its page and it will be ready here for offline listening — on flights,
        commutes, or anywhere without a connection.
      </Muted>
    </View>
  );
}

export default function DownloadsScreen() {
  const router = useRouter();
  const downloads = use$(downloads$);

  const rows: Row[] = Object.entries(downloads ?? {})
    .filter((pair): pair is [string, DownloadEntry] => pair[1] != null)
    .map(([itemId, entry]) => ({ itemId, entry }))
    .sort(
      (a, b) =>
        (b.entry.downloadedAt ?? Number.MAX_SAFE_INTEGER) -
        (a.entry.downloadedAt ?? Number.MAX_SAFE_INTEGER)
    );

  const completed = rows.filter((r) => r.entry.status === 'complete');
  const totalBytes = completed.reduce((sum, r) => sum + r.entry.itemMeta.size, 0);
  const summary =
    completed.length === 0
      ? 'Nothing stored on this device'
      : `${completed.length} ${completed.length === 1 ? 'book' : 'books'} · ${formatBytes(totalBytes)}`;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-4 pb-4 pt-2">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center rounded-full border border-border bg-card active:opacity-80">
          <ChevronLeft size={24} className="text-foreground" />
        </Pressable>
        <View className="flex-1">
          <H1 className="text-2xl">Downloads</H1>
          <Muted className="text-xs">{summary}</Muted>
        </View>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(row) => row.itemId}
        renderItem={({ item }) => <DownloadRow itemId={item.itemId} entry={item.entry} />}
        contentContainerClassName="gap-3 px-4 pb-10"
        ListEmptyComponent={<EmptyState />}
        ListFooterComponent={<PendingSessionsFooter />}
      />
    </SafeAreaView>
  );
}
