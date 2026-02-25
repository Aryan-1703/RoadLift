import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SkeletonProps {
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({ style }) => {
  const { isDarkMode } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View 
      style={[
        { backgroundColor: isDarkMode ? '#374151' : '#E5E7EB', borderRadius: 4, opacity },
        style
      ]} 
    />
  );
};
