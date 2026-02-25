import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

interface MobileFrameProps {
  children: ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  return (
    <View style={styles.container}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 }
});
