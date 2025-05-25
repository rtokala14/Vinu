import { useTheme } from '@react-navigation/native';
import { View } from 'react-native';

const LibraryItemSkeleton = () => {
  const { colors } = useTheme();
  return <View className="flex h-52 w-36 rounded-lg bg-white" />;
};

export default LibraryItemSkeleton;
