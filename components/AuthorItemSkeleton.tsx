import { View } from 'react-native';

const AuthorItemSkeleton = () => {
  return (
    <View className="flex flex-col items-center justify-center gap-2">
      <View
        style={{
          // The `style` prop is used here for consistency with AuthorItem.tsx
          // although these could be converted to Tailwind classes if preferred.
          marginBottom: 4,
          flexDirection: 'row',
          alignItems: 'center',
          position: 'relative',
        }}>
        {/* Image Placeholder */}
        <View className="h-[225px] w-[150px] animate-pulse rounded-lg bg-gray-300 dark:bg-gray-700" />
        {/* Badge Placeholder */}
        <View className="absolute left-2 top-2 z-50 h-5 w-10 animate-pulse rounded bg-gray-400 dark:bg-gray-600" />
      </View>
      {/* Text Placeholder */}
      <View className="h-4 w-24 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
    </View>
  );
};

export default AuthorItemSkeleton;
