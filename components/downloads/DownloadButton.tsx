import { use$ } from '@legendapp/state/react';
import { useTheme } from '@react-navigation/native';
import { Alert, Pressable, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '~/components/ui/text';
import { cancelDownload, deleteDownload, downloadItem } from '~/lib/downloads/manager';
import { downloads$, formatBytes } from '~/lib/downloads/state';
import { CircleCheck } from '~/lib/icons/CircleCheck';
import { Download } from '~/lib/icons/Download';
import { RefreshCw } from '~/lib/icons/RefreshCw';
import { cn } from '~/lib/utils';

/** Circular determinate progress indicator (0..1). */
function ProgressRing({
  progress,
  size,
  strokeWidth,
}: {
  progress: number;
  size: number;
  strokeWidth: number;
}) {
  const { colors } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={colors.border}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={colors.primary}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={circumference * (1 - clamped)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

function confirmCancel(itemId: string) {
  Alert.alert('Cancel download?', 'The partially downloaded files will be removed.', [
    { text: 'Keep downloading', style: 'cancel' },
    { text: 'Cancel download', style: 'destructive', onPress: () => void cancelDownload(itemId) },
  ]);
}

function confirmDelete(itemId: string, title: string, size: number) {
  Alert.alert(
    'Remove download?',
    `"${title}" (${formatBytes(size)}) will be deleted from this device. Your listening progress is kept.`,
    [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void deleteDownload(itemId) },
    ]
  );
}

/**
 * Self-contained download control for a library item. Drop it anywhere —
 * it reads and drives the download state on its own.
 *
 * - `block` (default): full-width labeled button.
 * - `row`: compact 40pt control for list rows / toolbars.
 */
export function DownloadButton({
  itemId,
  size = 'block',
}: {
  itemId: string;
  size?: 'row' | 'block';
}) {
  const entry = use$(downloads$[itemId]);

  const status = entry?.status;
  const progress = entry?.progress ?? 0;
  const percent = Math.round(progress * 100);

  const onPress = () => {
    if (status === 'downloading' || status === 'queued') {
      confirmCancel(itemId);
    } else if (status === 'complete') {
      confirmDelete(itemId, entry?.itemMeta.title ?? 'This book', entry?.itemMeta.size ?? 0);
    } else {
      // Not downloaded, or errored → (re)start.
      downloadItem(itemId);
    }
  };

  if (size === 'row') {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityLabel={rowLabel(status, percent)}
        className={cn(
          'h-10 w-10 items-center justify-center rounded-full border',
          status === 'complete' ? 'border-primary/40 bg-primary/10' : 'border-border bg-card',
          'active:opacity-80'
        )}>
        {status === 'downloading' || status === 'queued' ? (
          <View className="items-center justify-center">
            <ProgressRing progress={progress} size={26} strokeWidth={2.5} />
            <Text className="absolute text-[8px] font-semibold text-muted-foreground">
              {percent}
            </Text>
          </View>
        ) : status === 'complete' ? (
          <CircleCheck size={20} className="text-primary" />
        ) : status === 'error' ? (
          <RefreshCw size={18} className="text-destructive" />
        ) : (
          <Download size={18} className="text-foreground" />
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={rowLabel(status, percent)}
      className={cn(
        'h-12 flex-row items-center justify-center gap-2 rounded-md border px-5',
        status === 'complete' ? 'border-primary/40 bg-primary/10' : 'border-input bg-background',
        'active:opacity-80'
      )}>
      {status === 'downloading' || status === 'queued' ? (
        <>
          <ProgressRing progress={progress} size={22} strokeWidth={2.5} />
          <Text className="text-base font-medium">
            {status === 'queued' ? 'Waiting…' : `Downloading ${percent}%`}
          </Text>
        </>
      ) : status === 'complete' ? (
        <>
          <CircleCheck size={18} className="text-primary" />
          <Text className="text-base font-medium text-primary">Downloaded</Text>
        </>
      ) : status === 'error' ? (
        <>
          <RefreshCw size={18} className="text-destructive" />
          <View className="shrink items-center">
            <Text className="text-base font-medium text-destructive">Retry download</Text>
            {entry?.error ? (
              <Text numberOfLines={1} className="text-xs text-muted-foreground">
                {entry.error}
              </Text>
            ) : null}
          </View>
        </>
      ) : (
        <>
          <Download size={18} className="text-foreground" />
          <Text className="text-base font-medium">Download</Text>
        </>
      )}
    </Pressable>
  );
}

function rowLabel(status: string | undefined, percent: number): string {
  switch (status) {
    case 'queued':
      return 'Download queued, tap to cancel';
    case 'downloading':
      return `Downloading, ${percent} percent, tap to cancel`;
    case 'complete':
      return 'Downloaded, tap to remove';
    case 'error':
      return 'Download failed, tap to retry';
    default:
      return 'Download';
  }
}
