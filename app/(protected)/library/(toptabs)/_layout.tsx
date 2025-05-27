import type {
  MaterialTopTabNavigationEventMap,
  MaterialTopTabNavigationOptions,
} from '@react-navigation/material-top-tabs';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme, type ParamListBase, type TabNavigationState } from '@react-navigation/native';
import { withLayoutContext } from 'expo-router';
import { Dimensions } from 'react-native';
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
      initialRouteName="books"
      initialLayout={{
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
      }}
      backBehavior="initialRoute"
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: 'grey',
        tabBarLabelStyle: {
          fontSize: 14,
          textTransform: 'capitalize',
          fontWeight: 'bold',
        },
        lazy: true,
        tabBarIndicatorStyle: {
          backgroundColor: colors.primary,
        },
        tabBarScrollEnabled: true,
        tabBarItemStyle: { width: 'auto', minWidth: 85 },
        tabBarStyle: {
          backgroundColor: colors.card,
          shadowRadius: 10,
          height: 40 + insets.top,
          paddingTop: insets.top - 10,
        },
      }}>
      <MaterialTopTabs.Screen
        name="books"
        options={{
          title: 'Books',
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
      <MaterialTopTabs.Screen
        name="authors"
        options={{
          title: 'Authors',
        }}
      />
      <MaterialTopTabs.Screen
        name="collections"
        options={{
          title: 'Collections',
        }}
      />
    </MaterialTopTabs>
  );
}
