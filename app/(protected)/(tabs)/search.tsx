import { useState } from 'react';
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchAllTab } from '~/components/search/SearchAllTab';
import { SearchAuthorsTab } from '~/components/search/SearchAuthorsTab';
import { SearchBooksTab } from '~/components/search/SearchBooksTab';
import { SearchInput } from '~/components/search/SearchInput';
import { SearchSeriesTab } from '~/components/search/SearchSeriesTab';
import { SearchTabBar } from '~/components/search/SearchTabBar';
import { useSearchQuery } from '~/components/search/useSearchQuery';

const { width } = Dimensions.get('window');
const tabs = ['All', 'Books', 'Series', 'Authors'];

export default function SearchPage() {
  const [activeTab, setActiveTab] = useState(0);
  const translateX = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const { search, setSearch, debouncedSearch, isLoading, isError, isFetching, searchResults } =
    useSearchQuery();

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

  const dismissKeyboard = () => Keyboard.dismiss();

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
    .onBegin(() => {
      runOnJS(dismissKeyboard)();
    })
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
    if (tab === 'All') {
      return (
        <SearchAllTab
          searchResults={searchResults}
          handleTabPress={handleTabPress}
          isLoading={isLoading}
          isFetching={isFetching}
          isError={isError}
          debouncedSearch={debouncedSearch}
        />
      );
    }
    if (tab === 'Books') {
      return <SearchBooksTab searchResults={searchResults} />;
    }
    if (tab === 'Series') {
      return <SearchSeriesTab searchResults={searchResults} />;
    }
    if (tab === 'Authors') {
      return <SearchAuthorsTab searchResults={searchResults} />;
    }
    return null;
  };

  return (
    <View style={{ flex: 1 }}>
      <SearchTabBar activeTab={activeTab} onTabPress={handleTabPress} barStyle={barStyle} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 15 : 0}>
        <View className="flex-1">
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
          <SearchInput value={search} onChangeText={setSearch} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
