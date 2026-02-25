import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeOption } from '../types';

export const lightColors = {
  background: '#F3F4F6',
  card: '#FFFFFF',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  primary: '#2563EB',
  danger: '#DC2626',
  dangerBg: '#FEE2E2'
};

export const darkColors = {
  background: '#111827',
  card: '#1F2937',
  text: '#F9FAFB',
  textMuted: '#9CA3AF',
  border: '#374151',
  primary: '#3B82F6',
  danger: '#EF4444',
  dangerBg: '#7F1D1D'
};

type Colors = typeof lightColors;

interface ThemeContextType {
  themeOption: ThemeOption;
  setThemeOption: (theme: ThemeOption) => Promise<void>;
  isDarkMode: boolean;
  colors: Colors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeOption, setThemeState] = useState<ThemeOption>('system');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@roadlift_theme');
        if (savedTheme) {
          setThemeState(savedTheme as ThemeOption);
        }
      } catch (e) {
        console.error('Failed to load theme', e);
      }
    };
    loadTheme();

    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });

    return () => subscription.remove();
  }, []);

  const setThemeOption = async (newTheme: ThemeOption) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem('@roadlift_theme', newTheme);
    } catch (e) {
      console.error('Failed to save theme', e);
    }
  };

  const isDarkMode = themeOption === 'dark' || (themeOption === 'system' && systemScheme === 'dark');
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ themeOption, setThemeOption, isDarkMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
