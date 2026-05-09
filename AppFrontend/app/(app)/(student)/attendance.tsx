import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Calendar, CheckCircle2, XCircle, AlertCircle, Clock, ChevronRight, BarChart3 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../../src/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../src/components/ui/Card';
import { Colors } from '../../../src/constants/Colors';

interface AttendanceRecord {
  id: number;
  session_id: number;
  date: string;
  status: string;
}

interface SubjectAttendance {
  class_id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  year: number;
  section: string;
  total_sessions: number;
  attended_sessions: number;
  attendance_percentage: number;
  recent_records: AttendanceRecord[];
}

const statusConfig = {
  present: { label: 'Present', icon: CheckCircle2, color: Colors.light.success },
  pending_approval: { label: 'Pending', icon: Clock, color: '#F59E0B' },
  absent: { label: 'Absent', icon: XCircle, color: Colors.light.destructive },
  manual_review: { label: 'Review', icon: AlertCircle, color: '#6366F1' },
};

export default function AttendanceHistoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceData, setAttendanceData] = useState<SubjectAttendance[]>([]);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/attendance/my-attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch attendance');
      const data = await res.json();
      setAttendanceData(data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendanceData();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading attendance history...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Attendance History</Text>
        <Text style={styles.subtitle}>Detailed overview of your course attendance</Text>
      </View>

      <View style={styles.content}>
        {attendanceData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <BarChart3 size={48} color={Colors.light.mutedForeground} />
            <Text style={styles.emptyTitle}>No Attendance Records</Text>
            <Text style={styles.emptySubtitle}>You haven't attended any courses yet or aren't enrolled.</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryGrid}>
              {attendanceData.map((subject) => (
                <Card key={subject.class_id} style={styles.subjectCard}>
                  <CardContent style={styles.subjectCardContent}>
                    <View style={styles.subjectHeader}>
                      <View style={styles.subjectIcon}>
                        <BookOpen size={20} color={Colors.light.primary} />
                      </View>
                      <View style={styles.subjectTitleContainer}>
                        <Text style={styles.subjectName} numberOfLines={1}>{subject.subject_name}</Text>
                        <Text style={styles.subjectCode}>{subject.subject_code}</Text>
                      </View>
                    </View>

                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{subject.attended_sessions}/{subject.total_sessions}</Text>
                        <Text style={styles.statLabel}>Sessions</Text>
                      </View>
                      <View style={[
                        styles.percentageBadge,
                        { backgroundColor: subject.attendance_percentage >= 75 ? Colors.light.success + '20' : Colors.light.destructive + '20' }
                      ]}>
                        <Text style={[
                          styles.percentageText,
                          { color: subject.attendance_percentage >= 75 ? Colors.light.success : Colors.light.destructive }
                        ]}>
                          {subject.attendance_percentage}%
                        </Text>
                      </View>
                    </View>

                    <View style={styles.progressBarBg}>
                      <View style={[
                        styles.progressBarFill, 
                        { 
                          width: `${subject.attendance_percentage}%`,
                          backgroundColor: subject.attendance_percentage >= 75 ? Colors.light.success : Colors.light.destructive
                        }
                      ]} />
                    </View>
                  </CardContent>
                </Card>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Card style={styles.recentCard}>
              <CardContent style={{ padding: 0 }}>
                {attendanceData.flatMap(s => s.recent_records.map(r => ({ ...r, subjectName: s.subject_name })))
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 10)
                  .map((record, index) => {
                    const config = statusConfig[record.status as keyof typeof statusConfig] || statusConfig.absent;
                    const StatusIcon = config.icon;
                    
                    return (
                      <View key={`${record.id}-${index}`} style={[
                        styles.recordItem,
                        index === 0 && { borderTopWidth: 0 }
                      ]}>
                        <View style={styles.recordInfo}>
                          <Text style={styles.recordSubject}>{record.subjectName}</Text>
                          <Text style={styles.recordDate}>
                            {new Date(record.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: config.color + '1A' }]}>
                          <StatusIcon size={14} color={config.color} />
                          <Text style={[styles.statusText, { color: config.color }]}>
                            {config.label}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
              </CardContent>
            </Card>
          </>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.light.mutedForeground,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.mutedForeground,
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  summaryGrid: {
    gap: 16,
    marginBottom: 24,
  },
  subjectCard: {
    borderRadius: 16,
  },
  subjectCardContent: {
    padding: 16,
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.light.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  subjectTitleContainer: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  subjectCode: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'column',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
  },
  percentageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.light.accent,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 16,
    marginLeft: 4,
  },
  recentCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  recordInfo: {
    flex: 1,
  },
  recordSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  recordDate: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.mutedForeground,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
});
