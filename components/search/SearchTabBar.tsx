import { View, Pressable, Dimensions, type ViewStyle, type StyleProp } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '~/components/ui/text';

const { width } = Dimensions.get('window');
const tabs = ['All', 'Books', 'Series', 'Authors'];

interface SearchTabBarProps {
  activeTab: number;
  onTabPress: (index: number) => void;
  barStyle: StyleProp<ViewStyle>;
}

export function SearchTabBar({ activeTab, onTabPress, barStyle }: SearchTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="relative flex-row justify-around bg-card"
      style={{ paddingTop: insets.top, paddingBottom: 15 }}>
      {tabs.map((tab, index) => (
        <Pressable
          key={tab}
          hitSlop={30}
          onPress={() => onTabPress(index)}
          style={{ width: width / tabs.length, alignItems: 'center', justifyContent: 'center' }}>
          <Text
            className={`py-1 text-base font-medium ${
              activeTab === index ? 'text-primary' : 'text-muted-foreground'
            }`}>
            {tab}
          </Text>
        </Pressable>
      ))}
      <Animated.View className="absolute bottom-0 z-50 bg-primary" style={barStyle} />
    </View>
  );
}
