import { useState } from 'react';
import { Dimensions, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';

const { width } = Dimensions.get('window');
const tabs = ['All', 'Books', 'Series', 'Authors'];

export default function SearchPage() {
  const [activeTab, setActiveTab] = useState(0);
  const translateX = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const handleTabPress = (index: number) => {
    translateX.value = withTiming(
      -index * width,
      {
        duration: 300,
        easing: Easing.inOut(Easing.quad),
      },
      () => {
        runOnJS(setActiveTab)(index);
      }
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const barStyle = useAnimatedStyle(() => {
    const barItemWidth = width / tabs.length;
    const barTranslateX = (-translateX.value / width) * barItemWidth;

    return {
      width: barItemWidth,
      height: 2,
      left: 0,
      transform: [{ translateX: barTranslateX }],
    };
  });

  const panGesture = Gesture.Pan()
    .onChange((event) => {
      const newTranslateX = translateX.value + event.changeX;
      const minTranslateX = -width * (tabs.length - 1);
      const maxTranslateX = 0;
      translateX.value = Math.max(minTranslateX, Math.min(newTranslateX, maxTranslateX));
    })
    .onEnd((event) => {
      const currentContentOffset = -translateX.value;
      const currentTabIndex = Math.round(currentContentOffset / width);
      let newTab = currentTabIndex;

      const threshold = width / 4;
      const velocity = event.velocityX;

      if (Math.abs(event.translationX) > threshold || Math.abs(velocity) > 300) {
        if (event.translationX > 0 || velocity > 300) {
          newTab = Math.max(currentTabIndex - 1, 0);
        } else if (event.translationX < 0 || velocity < -300) {
          newTab = Math.min(currentTabIndex + 1, tabs.length - 1);
        }
      } else {
        newTab = Math.round(-translateX.value / width);
      }

      translateX.value = withTiming(
        -newTab * width,
        {
          duration: 250,
          easing: Easing.out(Easing.quad),
        },
        () => {
          runOnJS(setActiveTab)(newTab);
        }
      );
    });

  const renderTabContent = (tab: string) => {
    return (
      <View className="m-2 flex-1 items-center justify-center rounded-lg bg-card">
        <Text>Content for {tab}</Text>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Tab Bar */}
      <View
        className=" relative flex-row justify-around bg-card"
        style={{
          paddingTop: insets.top,
          paddingBottom: 15,
        }}>
        {tabs.map((tab, index) => (
          <Pressable
            key={tab}
            onPress={() => handleTabPress(index)}
            style={{
              width: width / tabs.length,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text
              className={`py-1 text-base font-medium ${
                activeTab === index ? 'text-primary' : 'text-muted-foreground'
              }`}>
              {tab}
            </Text>
          </Pressable>
        ))}
        <Animated.View className=" absolute bottom-0 z-50 bg-primary" style={barStyle} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 15 : 0}>
        <View className="flex-1">
          {/* Swipeable Content */}
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                { flexDirection: 'row', width: width * tabs.length, flex: 1 },
                animatedStyle,
              ]}>
              {tabs.map((tab) => (
                <View key={tab} style={{ width, flex: 1 }}>
                  {renderTabContent(tab)}
                </View>
              ))}
            </Animated.View>
          </GestureDetector>

          {/* Input */}
          <View className=" p-4 pt-2">
            <Input
              placeholder="Search..."
              selectTextOnFocus
              returnKeyType="search"
              style={{
                height: 50,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#ccc',
                paddingHorizontal: 16,
              }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
