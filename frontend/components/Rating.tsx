import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
}

export const Rating: React.FC<RatingProps> = ({ value, onChange, readonly = false }) => {
  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity 
          key={star} 
          disabled={readonly} 
          onPress={() => onChange?.(star)}
          activeOpacity={0.7}
          style={styles.starBtn}
        >
          <Ionicons 
            name={star <= value ? 'star' : 'star-outline'} 
            size={40} 
            color={star <= value ? '#FBBF24' : '#E5E7EB'} 
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'center' },
  starBtn: { padding: 4 }
});
