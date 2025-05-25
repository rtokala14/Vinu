import { useTheme } from '@react-navigation/native';
import { View } from 'react-native';

const LibraryItemSkeleton = () => {
  const { colors } = useTheme();
  return (
    <View className="overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-800">
      <View className="h-48 w-36 animate-pulse bg-gray-300 dark:bg-gray-700" />
      <View className="p-4">
        <View className="mb-2 h-6 w-3/4 animate-pulse bg-gray-300 dark:bg-gray-700" />
        <View className="h-4 w-1/2 animate-pulse bg-gray-300 dark:bg-gray-700" />
      </View>
    </View>
  );
};

export default LibraryItemSkeleton;
