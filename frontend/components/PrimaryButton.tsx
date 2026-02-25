import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, TouchableOpacityProps, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({ 
  title, 
  variant = 'primary', 
  isLoading, 
  disabled,
  style,
  ...props 
}) => {
  const { colors, isDarkMode } = useTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          bg: isDarkMode ? '#374151' : '#F3F4F6',
          text: colors.text
        };
      case 'danger':
        return {
          bg: colors.dangerBg,
          text: colors.danger
        };
      case 'primary':
      default:
        return {
          bg: disabled ? (isDarkMode ? '#1E3A8A' : '#93C5FD') : colors.primary,
          text: '#FFFFFF'
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        { backgroundColor: vStyles.bg },
        (disabled || isLoading) && styles.disabled,
        style
      ]}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
      {...props}
    >
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator color={vStyles.text} />
        ) : (
          <Text style={[styles.text, { color: vStyles.text }]}>{title}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.7,
  }
});
