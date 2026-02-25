import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Location } from '../types';
import { useTheme } from '../context/ThemeContext';

interface MockMapProps {
  userLocation: Location | null;
  providerLocation?: Location | null;
  style?: StyleProp<ViewStyle>;
}

export const MockMap: React.FC<MockMapProps> = ({ userLocation, providerLocation, style }) => {
  const { colors, isDarkMode } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#1F2937' : '#E5E3DF' }, style]}>
      {userLocation && (
        <View style={styles.centerMarker}>
          <View style={styles.youBadge}>
            <Text style={styles.youText}>You</Text>
          </View>
          <View style={styles.dotWrap}>
            <View style={styles.dot} />
          </View>
        </View>
      )}

      {providerLocation && userLocation && (
        <View style={[styles.providerMarker, { top: '30%', left: '60%' }]}>
          <View style={[styles.youBadge, { backgroundColor: '#111827' }]}>
            <Text style={styles.youText}>Provider</Text>
          </View>
          <View style={[styles.dotWrap, { borderColor: '#111827' }]}>
            <View style={[styles.dot, { backgroundColor: '#111827' }]} />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  centerMarker: { position: 'absolute', top: '50%', left: '50%', marginLeft: -25, marginTop: -25, alignItems: 'center' },
  providerMarker: { position: 'absolute', alignItems: 'center' },
  youBadge: { backgroundColor: '#2563EB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginBottom: 4 },
  youText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  dotWrap: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(37, 99, 235, 0.3)', alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#2563EB', borderWidth: 2, borderColor: '#FFF' },
});
