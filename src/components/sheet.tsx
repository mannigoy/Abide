import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/**
 * A panel that slides up from the bottom of the screen. Tapping the dimmed
 * area behind it, or Android's back button, closes it.
 */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  // Keeps the panel clear of the Android navigation bar / iPhone home indicator.
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent>
      <View style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.panel, { paddingBottom: insets.bottom + Spacing.md }]}>
          <View style={styles.header}>
            <AppText variant="heading">{title}</AppText>
            <Pressable onPress={onClose} accessibilityRole="button" hitSlop={12}>
              <AppText style={styles.close}>Close</AppText>
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  panel: {
    maxHeight: '85%',
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  close: {
    color: Colors.primary,
  },
});
