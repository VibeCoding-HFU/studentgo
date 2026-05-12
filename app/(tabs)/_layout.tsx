import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import React, { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import type { Animated, StyleProp, ViewStyle } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

type TabSceneStyleInterpolator = (props: {
  current: { progress: Animated.Value };
}) => {
  sceneStyle: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? 'dark' : 'light';
  const { isAdminMode, isManagerMode } = useAuth();
  const { width } = useWindowDimensions();
  const sceneStyleInterpolator = useMemo<TabSceneStyleInterpolator>(() => ({ current }) => ({
    sceneStyle: {
      opacity: current.progress.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [1, 1, 1],
      }),
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [-width, 0, width],
          }),
        },
      ],
    },
  }), [width]);

  return (
    <Tabs
      screenOptions={{
        animation: 'shift',
        sceneStyleInterpolator,
        tabBarActiveTintColor: Colors[theme].tint,
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: 260,
          },
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color }) => <MaterialIcons size={25} name="calendar-month" color={color} />,
        }}
      />
      <Tabs.Screen
        name="deadlines"
        options={{
          title: 'To-Do',
          tabBarIcon: ({ color }) => <MaterialIcons size={25} name="checklist" color={color} />,
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Kontakt',
          tabBarIcon: ({ color }) => <MaterialIcons size={25} name="contacts" color={color} />,
        }}
      />
      <Tabs.Screen
        name="nfc"
        options={{
          title: 'Mensa',
          tabBarIcon: ({ color }) => <MaterialIcons size={25} name="nfc" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => <MaterialIcons size={25} name="account-circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          href: null,
          title: 'Anfragen',
          tabBarIcon: ({ color }) => <MaterialIcons size={25} name="notifications" color={color} />,
        }}
      />
      <Tabs.Screen
        name="manager"
        options={{
          href: isManagerMode && !isAdminMode ? undefined : null,
          title: 'Verwalter',
          tabBarIcon: ({ color }) => <MaterialIcons size={25} name="edit-note" color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          href: isAdminMode ? undefined : null,
          title: 'Admin',
          tabBarIcon: ({ color }) => <MaterialIcons size={25} name="admin-panel-settings" color={color} />,
        }}
      />
    </Tabs>
  );
}
