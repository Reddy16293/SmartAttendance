import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity, Alert } from 'react-native';
import { User, Mail, Calendar, Shield, LogOut, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import { config } from '../../config';
import { Button } from './Button';
import { Card, CardContent } from './Card';
import { Colors } from '../../constants/Colors';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'teacher';
  google_id: string | null;
  created_at: string;
  roll_number?: string;
}

export function ProfileView() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${config.apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (!profile) return null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&size=200&background=random` }} 
            style={styles.avatar}
          />
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{profile.role === 'teacher' ? 'Professor' : 'Student'}</Text>
          </View>
        </View>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.email}>{profile.email}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <Card style={styles.infoCard}>
          <CardContent style={{ padding: 0 }}>
            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <User size={18} color={Colors.light.primary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{profile.name}</Text>
              </View>
            </View>

            <View style={styles.infoItem}>
              <View style={styles.infoIcon}>
                <Mail size={18} color={Colors.light.primary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{profile.email}</Text>
              </View>
              {profile.google_id && (
                <View style={styles.googleBadge}>
                  <CheckCircle2 size={12} color={Colors.light.success} />
                  <Text style={styles.googleText}>Google</Text>
                </View>
              )}
            </View>

            {profile.roll_number && (
              <View style={styles.infoItem}>
                <View style={styles.infoIcon}>
                  <Shield size={18} color={Colors.light.primary} />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Roll Number</Text>
                  <Text style={styles.infoValue}>{profile.roll_number}</Text>
                </View>
              </View>
            )}

            <View style={[styles.infoItem, { borderBottomWidth: 0 }]}>
              <View style={styles.infoIcon}>
                <Calendar size={18} color={Colors.light.primary} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Joined On</Text>
                <Text style={styles.infoValue}>{formatDate(profile.created_at)}</Text>
              </View>
            </View>
          </CardContent>
        </Card>

        <Text style={styles.sectionTitle}>Settings</Text>
        <Card style={styles.infoCard}>
          <CardContent style={{ padding: 0 }}>
            <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Coming Soon', 'Notification settings coming soon.')}>
              <Text style={styles.menuText}>Notifications</Text>
              <ChevronRight size={20} color={Colors.light.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => Alert.alert('Coming Soon', 'Privacy settings coming soon.')}>
              <Text style={styles.menuText}>Privacy & Security</Text>
              <ChevronRight size={20} color={Colors.light.mutedForeground} />
            </TouchableOpacity>
          </CardContent>
        </Card>

        <Button 
          variant="destructive" 
          onPress={logout} 
          style={styles.logoutButton}
        >
          <LogOut size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </Button>
        
        <Text style={styles.versionText}>Version 1.0.0 (Replica)</Text>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: Colors.light.primary + '20',
  },
  roleBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'white',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'white',
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  email: {
    fontSize: 14,
    color: Colors.light.mutedForeground,
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.mutedForeground,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 1,
  },
  infoCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.light.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 1,
  },
  googleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.success + '1A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  googleText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.light.success,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.light.text,
  },
  logoutButton: {
    marginTop: 32,
    height: 56,
    borderRadius: 16,
  },
  logoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.light.mutedForeground,
    marginTop: 24,
  }
});
