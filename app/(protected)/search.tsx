import { useTheme } from '@react-navigation/native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
  FlatList,
  SectionList,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { customAxios } from '~/api/custom-axios';
import { SearchLibrary200 } from '~/api/models';
import { AuthorItem } from '~/components/AuthorItem';
import { LibraryItem } from '~/components/LibraryItem';
import { SeriesItem } from '~/components/SeriesItem';
import { Input } from '~/components/ui/input';
import { Text } from '~/components/ui/text';
import { store$ } from '~/stores';

const { width } = Dimensions.get('window');
const tabs = ['All', 'Books', 'Series', 'Authors'];

export default function SearchPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const translateX = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const userLibraryId = store$.currentLibraryId.peek();
  const userToken = store$.userToken.peek();
  const { colors } = useTheme();

  // Debounce search input
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [search]);

  // Query for search results
  const { data, isLoading, isError, isFetching } = useInfiniteQuery({
    queryKey: ['search', userLibraryId, debouncedSearch],
    enabled: !!debouncedSearch,
    initialPageParam: 0,
    queryFn: async () => {
      if (!debouncedSearch) return {} as SearchLibrary200;
      return customAxios({
        url: `/api/libraries/${userLibraryId}/search?q=${encodeURIComponent(debouncedSearch)}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${userToken}` },
      }).then((res) => res as SearchLibrary200);
    },
    getNextPageParam: () => undefined, // No pagination for search
  });

  const searchResults: SearchLibrary200 = data?.pages?.[0] || {};

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

  // Pan gesture: only respond to horizontal swipes, ignore vertical scrolls
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
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

  // Helper for SectionList data in 'All' tab
  const allSections = [
    searchResults.book?.length
      ? {
          title: 'Books',
          data: searchResults.book.map((b) => b.libraryItem).filter((item) => !!item),
          type: 'book',
        }
      : null,
    searchResults.series?.length
      ? {
          title: 'Series',
          data: searchResults.series.filter((item) => !!item),
          type: 'series',
        }
      : null,
    searchResults.authors?.length
      ? {
          title: 'Authors',
          data: searchResults.authors.filter((item) => !!item),
          type: 'author',
        }
      : null,
  ].filter(Boolean);

  const renderTabContent = (tab: string) => {
    if (!debouncedSearch) {
      return (
        <View className="m-2 flex-1 items-center justify-center rounded-lg bg-card">
          <Text className="text-muted-foreground">Type to search your library...</Text>
        </View>
      );
    }
    if (isLoading || isFetching) {
      return (
        <View className="m-2 flex flex-1 items-center justify-center rounded-lg bg-card">
          <ActivityIndicator color="#B45309" size="large" />
        </View>
      );
    }
    if (isError) {
      return (
        <View className="m-2 flex-1 items-center justify-center rounded-lg bg-card">
          <Text className="text-destructive">Error loading results</Text>
        </View>
      );
    }
    if (
      !searchResults ||
      (!searchResults.book?.length &&
        !searchResults.series?.length &&
        !searchResults.authors?.length)
    ) {
      return (
        <View className="m-2 flex-1 items-center justify-center rounded-lg bg-card">
          <Text>No results found</Text>
        </View>
      );
    }
    if (tab === 'All') {
      return (
        <SectionList
          sections={allSections as any}
          keyExtractor={(item, index) => (item?.id ? String(item.id) : String(index))}
          renderSectionHeader={({ section: { title } }) => (
            <Text className="mb-2 mt-4 text-lg font-bold" style={{ paddingLeft: 8 }}>
              {title}
            </Text>
          )}
          renderItem={({ item, section }) => {
            if (section.type === 'book') return item ? <LibraryItem item={item} /> : null;
            if (section.type === 'series') return item ? <SeriesItem item={item} /> : null;
            if (section.type === 'author') return item ? <AuthorItem item={item} /> : null;
            return null;
          }}
          contentContainerStyle={{
            gap: 8,
            backgroundColor: colors.card,
            borderRadius: 8,
            paddingBottom: 16,
            margin: 8,
            paddingHorizontal: 4,
          }}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      );
    }
    if (tab === 'Books') {
      return searchResults.book?.length ? (
        <FlatList
          data={searchResults.book.map((b) => b.libraryItem).filter((item) => !!item)}
          keyExtractor={(item, index) => (item?.id ? String(item.id) : String(index))}
          renderItem={({ item }) => (item ? <LibraryItem item={item} /> : null)}
          numColumns={2}
          columnWrapperStyle={{
            paddingHorizontal: 4,
            justifyContent: 'space-evenly',
            paddingTop: 8,
          }}
          contentContainerStyle={{
            gap: 8,
            backgroundColor: colors.card,
            borderRadius: 8,
            paddingBottom: 16,
            margin: 8,
          }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View className="m-2 flex-1 items-center justify-center rounded-lg bg-card">
          <Text>No books found</Text>
        </View>
      );
    }
    if (tab === 'Series') {
      return searchResults.series?.length ? (
        <View style={{ flex: 1 }}>
          <FlatList
            data={searchResults.series.filter((item) => !!item)}
            keyExtractor={(item, index) => (item?.id ? String(item.id) : String(index))}
            renderItem={({ item }) => (item ? <SeriesItem item={item} /> : null)}
            numColumns={2}
            columnWrapperStyle={{
              paddingHorizontal: 4,
              justifyContent: 'space-evenly',
              paddingTop: 8,
            }}
            contentContainerStyle={{
              gap: 8,
              backgroundColor: colors.card,
              borderRadius: 8,
              paddingBottom: 16,
              margin: 8,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <View className="m-2 flex-1 items-center justify-center rounded-lg bg-card">
          <Text>No series found</Text>
        </View>
      );
    }
    if (tab === 'Authors') {
      return searchResults.authors?.length ? (
        <View style={{ flex: 1 }}>
          <FlatList
            data={searchResults.authors.filter((item) => !!item)}
            keyExtractor={(item, index) => (item?.id ? String(item.id) : String(index))}
            renderItem={({ item }) => (item ? <AuthorItem item={item} /> : null)}
            numColumns={2}
            columnWrapperStyle={{
              paddingHorizontal: 4,
              justifyContent: 'space-evenly',
              paddingTop: 8,
            }}
            contentContainerStyle={{
              gap: 8,
              backgroundColor: colors.card,
              borderRadius: 8,
              paddingBottom: 16,
              flexGrow: 1,
              margin: 8,
            }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <View className="m-2 flex-1 items-center justify-center rounded-lg bg-card">
          <Text>No authors found</Text>
        </View>
      );
    }
    return null;
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
              value={search}
              onChangeText={setSearch}
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
