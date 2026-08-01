import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useRootTheme,
} from '../../store/rootTheme';

export default function TabLayout() {
  const {
    themeMode,
    theme,
  } = useRootTheme();

  const insets =
    useSafeAreaInsets();

  const isCityBlack =
    themeMode === 'cityBlack';

  const bottomPadding =
    Math.max(
      insets.bottom,
      10
    );

  const tabBarHeight =
    68 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,

        sceneStyle: {
          backgroundColor:
            theme.background,
        },

        tabBarStyle: {
          position: 'absolute',

          left: 0,
          right: 0,
          bottom: 0,

          height:
            tabBarHeight,

          paddingTop: 8,
          paddingBottom:
            bottomPadding,

          backgroundColor:
            theme.card,

          borderTopWidth: 1,
          borderTopColor:
            theme.line,

          borderTopLeftRadius:
            isCityBlack
              ? 4
              : 28,

          borderTopRightRadius:
            isCityBlack
              ? 4
              : 28,

          overflow: 'hidden',

          elevation:
            isCityBlack
              ? 0
              : 12,

          shadowColor:
            '#000000',

          shadowOffset: {
            width: 0,
            height: -4,
          },

          shadowOpacity:
            isCityBlack
              ? 0
              : 0.1,

          shadowRadius:
            isCityBlack
              ? 0
              : 10,
        },

        tabBarItemStyle: {
          marginHorizontal: 3,
          marginVertical: 4,

          borderRadius:
            isCityBlack
              ? 4
              : 18,
        },

        tabBarActiveBackgroundColor:
          isCityBlack
            ? theme.card2
            : 'transparent',

        tabBarInactiveBackgroundColor:
          'transparent',

        tabBarActiveTintColor:
          isCityBlack
            ? theme.text
            : theme.button,

        tabBarInactiveTintColor:
          theme.mutedText,

        tabBarIconStyle: {
          marginTop: 2,
        },

        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
          marginTop: 1,

          marginBottom:
            Platform.OS ===
            'android'
              ? 0
              : 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',

          tabBarAccessibilityLabel:
            '홈 화면',

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'home'
                  : 'home-outline'
              }
              size={
                size ?? 22
              }
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="record"
        options={{
          title: '기록',

          tabBarAccessibilityLabel:
            '기록 화면',

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'book'
                  : 'book-outline'
              }
              size={
                size ?? 22
              }
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="crew"
        options={{
          title: '크루',

          tabBarAccessibilityLabel:
            '크루 화면',

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'people'
                  : 'people-outline'
              }
              size={
                size ?? 22
              }
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="day"
        options={{
          title: '하루',

          tabBarAccessibilityLabel:
            '하루 화면',

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'sunny'
                  : 'sunny-outline'
              }
              size={
                size ?? 22
              }
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: '탐험',

          tabBarAccessibilityLabel:
            '탐험 화면',

          tabBarIcon: ({
            color,
            size,
            focused,
          }) => (
            <Ionicons
              name={
                focused
                  ? 'map'
                  : 'map-outline'
              }
              size={
                size ?? 22
              }
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}