import { Tabs } from 'expo-router';

import { ChartColumnIncreasing } from '~/lib/icons/ChartColumnIncreasing';
import { Home } from '~/lib/icons/Home';
import { LibraryBig } from '~/lib/icons/LibraryBig';
import { Search } from '~/lib/icons/Search';
import { Settings } from '~/lib/icons/Settings';

export default function ProtectedLayout() {
  return (
    <Tabs
      screenOptions={{
        animation: 'shift',
        tabBarStyle: {
          borderTopStartRadius: 10,
          borderTopEndRadius: 10,
          shadowRadius: 10,
          height: 80,
          paddingTop: 5,
        },
        headerShown: false,
      }}
      backBehavior="history"
      initialRouteName="index">
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, size }) => <ChartColumnIncreasing size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => <LibraryBig size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
