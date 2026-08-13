import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { Card } from '~/components/ui/card';
import { Text } from '~/components/ui/text';
import { Muted } from '~/components/ui/typography';

export function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Card className="min-w-0 flex-1 p-4">
      <View className="flex-row items-center gap-2">
        <Icon size={15} className="text-primary" />
        <Muted className="text-xs font-medium uppercase tracking-wide">{label}</Muted>
      </View>
      <Text numberOfLines={1} className="mt-2 text-2xl font-bold">
        {value}
      </Text>
    </Card>
  );
}
