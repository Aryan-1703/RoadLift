import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { View, Text, StyleSheet, Platform, SafeAreaView } from 'react-native';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <View style={{ flex: 1 }}>
        {children}
        {toasts.length > 0 && (
          <SafeAreaView style={styles.overlay} pointerEvents="none">
            {toasts.map(toast => (
              <View 
                key={toast.id} 
                style={[
                  styles.toast,
                  toast.type === 'success' ? styles.success : 
                  toast.type === 'error' ? styles.error : styles.info
                ]}
              >
                <Text style={styles.text}>{toast.message}</Text>
              </View>
            ))}
          </SafeAreaView>
        )}
      </View>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 0, right: 0, alignItems: 'center', zIndex: 999 },
  toast: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginBottom: 10, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  success: { backgroundColor: '#059669' },
  error: { backgroundColor: '#DC2626' },
  info: { backgroundColor: '#1F2937' },
  text: { color: '#FFF', fontSize: 14, fontWeight: 'bold' }
});
