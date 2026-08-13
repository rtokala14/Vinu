import { View } from 'react-native';

import { cn } from '~/lib/utils';

/** Thin horizontal progress bar. `value` is 0-1. */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;

  return (
    <View className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      <View className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </View>
  );
}
