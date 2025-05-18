import type {
  MaterialTopTabNavigationEventMap,
  MaterialTopTabNavigationOptions,
} from '@react-navigation/material-top-tabs';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme, type ParamListBase, type TabNavigationState } from '@react-navigation/native';
import { withLayoutContext } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { Navigator } = createMaterialTopTabNavigator();

const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

export default function LibraryLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <MaterialTopTabs
      initialRouteName="all"
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: 'grey',
        tabBarLabelStyle: {
          fontSize: 14,
          textTransform: 'capitalize',
          fontWeight: 'bold',
        },
        tabBarIndicatorStyle: {
          backgroundColor: colors.primary,
        },
        tabBarScrollEnabled: true,
        tabBarItemStyle: { width: 'auto', minWidth: 100 },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopStartRadius: 10,
          borderTopEndRadius: 10,
          shadowRadius: 10,
          height: 50 + insets.top,
          paddingTop: insets.top,
        },
      }}>
      <MaterialTopTabs.Screen
        name="collections"
        options={{
          title: 'Collections',
        }}
      />
      <MaterialTopTabs.Screen
        name="authors"
        options={{
          title: 'Authors',
        }}
      />
      <MaterialTopTabs.Screen
        name="all"
        options={{
          title: 'All',
        }}
      />
      <MaterialTopTabs.Screen
        name="series"
        options={{
          title: 'Series',
        }}
      />
      <MaterialTopTabs.Screen
        name="playlists"
        options={{
          title: 'Playlists',
        }}
      />
    </MaterialTopTabs>
  );
}
