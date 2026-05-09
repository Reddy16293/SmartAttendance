import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, CalendarDays, ChevronRight, Home, LogOut, Menu, User, CheckCircle2, QrCode } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Colors } from '../../constants/Colors';

type SidebarItem = {
  label: string;
  route: string;
  icon: React.ReactNode;
  description: string;
};

interface StudentSidebarProps {
  visible: boolean;
  onClose: () => void;
}

const items: SidebarItem[] = [
  { label: 'Home', route: '/(app)/(student)', icon: <Home size={18} color={Colors.light.primary} />, description: 'Dashboard and quick actions' },
  { label: 'Courses', route: '/(app)/(student)/enrollment', icon: <BookOpen size={18} color={Colors.light.primary} />, description: 'Your enrolled subjects' },
  { label: 'Timetable', route: '/(app)/(student)/timetable', icon: <CalendarDays size={18} color={Colors.light.primary} />, description: 'Weekly class timetable' },
  { label: 'Attendance', route: '/(app)/(student)/attendance', icon: <CheckCircle2 size={18} color={Colors.light.primary} />, description: 'Attendance summary and stats' },
  { label: 'Join Attendance', route: '/(app)/(student)/attendance', icon: <QrCode size={18} color={Colors.light.primary} />, description: 'Enter code or scan QR' },
  { label: 'Profile', route: '/(app)/(student)/profile', icon: <User size={18} color={Colors.light.primary} />, description: 'Account and settings' },
];

export function StudentSidebar({ visible, onClose }: StudentSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const handleNavigate = (route: string) => {
    onClose();
    router.push(route as any);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={[styles.sheetHeader, { paddingTop: insets.top + 4 }]}>
            <View>
              <Text style={styles.title}>Student Menu</Text>
              <Text style={styles.subtitle}>Quick access to your classes and attendance</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} accessibilityRole="button">
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.items}>
              {items.map((item) => {
                const active = pathname === item.route || pathname?.startsWith(`${item.route}/`);
                return (
                  <TouchableOpacity
                    key={item.route}
                    style={[styles.item, active && styles.itemActive]}
                    onPress={() => handleNavigate(item.route)}
                    accessibilityRole="button"
                  >
                    <View style={styles.itemIcon}>{item.icon}</View>
                    <View style={styles.itemTextWrap}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      <Text style={styles.itemDescription}>{item.description}</Text>
                    </View>
                    <ChevronRight size={16} color={Colors.light.mutedForeground} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <LogOut size={18} color={Colors.light.destructive} />
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

export function StudentSidebarButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.menuButton} accessibilityRole="button">
      <Menu size={22} color={Colors.light.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    width: '82%',
    maxWidth: 360,
    backgroundColor: Colors.light.card,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    padding: 20,
    borderRightWidth: 1,
    borderRightColor: Colors.light.border,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 4, height: 0 },
    elevation: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.light.mutedForeground,
    marginTop: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.muted,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    lineHeight: 20,
  },
  scrollArea: {
    minHeight: 0,
    maxHeight: '94%',
  },
  scrollContent: {
    paddingBottom: 8,
  },
  items: {
    gap: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  itemActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.accent,
  },
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.accent,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  itemDescription: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    marginTop: 2,
  },
  logoutButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: Colors.light.accent,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.destructive,
  },
  menuButton: {
    marginLeft: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.muted,
  },
});
