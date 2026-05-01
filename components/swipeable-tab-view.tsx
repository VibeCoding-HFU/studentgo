import { usePathname, useRouter } from 'expo-router';
import React, { PropsWithChildren, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { useAuth } from '@/contexts/auth-context';

type VisibleTab = {
  href: string;
  name: string;
};

const swipeDistance = 58;
const swipeVelocity = 420;

export function SwipeableTabView({ children }: PropsWithChildren) {
  const { isAdminMode, isManagerMode } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const visibleTabs = useMemo<VisibleTab[]>(() => [
    { href: '/(tabs)', name: 'index' },
    { href: '/(tabs)/deadlines', name: 'deadlines' },
    { href: '/(tabs)/contacts', name: 'contacts' },
    { href: '/(tabs)/account', name: 'account' },
    ...(isManagerMode && !isAdminMode ? [{ href: '/(tabs)/manager', name: 'manager' }] : []),
    ...(isAdminMode ? [{ href: '/(tabs)/admin', name: 'admin' }] : []),
  ], [isAdminMode, isManagerMode]);
  const currentIndex = useMemo(() => {
    const currentName = pathname.split('/').filter(Boolean).pop() ?? 'index';
    return Math.max(0, visibleTabs.findIndex((tab) => tab.name === currentName));
  }, [pathname, visibleTabs]);
  const canSwipeBackward = currentIndex > 0;
  const canSwipeForward = currentIndex < visibleTabs.length - 1;

  const navigateBySwipe = useCallback((direction: 1 | -1) => {
    const nextIndex = currentIndex + direction;

    if (nextIndex < 0 || nextIndex >= visibleTabs.length) {
      return;
    }

    router.navigate(visibleTabs[nextIndex].href as never);
  }, [currentIndex, router, visibleTabs]);

  const swipeGesture = useMemo(() => Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-80, 80])
    .onEnd((event) => {
      const horizontalMovement = Math.abs(event.translationX);
      const verticalMovement = Math.abs(event.translationY);
      const isHorizontal = horizontalMovement > verticalMovement * 1.15;
      const isSwipe = horizontalMovement > swipeDistance || Math.abs(event.velocityX) > swipeVelocity;
      const direction = event.translationX < 0 ? 1 : -1;
      const canNavigate = direction === 1 ? canSwipeForward : canSwipeBackward;

      if (isHorizontal && isSwipe && canNavigate) {
        runOnJS(navigateBySwipe)(direction);
      }
    }), [canSwipeBackward, canSwipeForward, navigateBySwipe]);

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.container}>
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
