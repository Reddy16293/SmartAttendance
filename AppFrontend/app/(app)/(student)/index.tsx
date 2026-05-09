import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Calendar, CheckCircle2, BarChart3, Hash, QrCode, Clock, MapPin, ChevronRight, AlertTriangle, GraduationCap, Plus, Zap } from 'lucide-react-native';
import { useAuth } from '../../../src/contexts/AuthContext';
import api from '../../../src/services/api';
import { config } from '../../../src/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatCard } from '../../../src/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';
import { Colors } from '../../../src/constants/Colors';
import { StudentAttendanceCodeModal } from '../../../src/components/dashboard/StudentAttendanceCodeModal';
import { StudentQRCodeScanModal } from '../../../src/components/dashboard/StudentQRCodeScanModal';
import { LoadingBar } from '../../../src/components/ui/LoadingBar';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface EnrolledClass {
  id: number;
  subject_name?: string;
  teacher_name?: string;
  year: number;
  section: string;
  schedules: any[];
}

interface ActiveSession {
  id: number;
  classId: number;
  className: string;
  remainingSeconds: number;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  
  // Modal states
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [classes, attendance] = await Promise.all([
        api.get<EnrolledClass[]>('/enrollments/my-classes'),
        api.get<any[]>('/attendance/my-attendance'),
      ]);
      
      setEnrolledClasses(classes);
      setAttendanceData(attendance);
      filterTodayClasses(classes);

      // Check for active sessions in enrolled classes
      const activeSes: ActiveSession[] = [];
      const token = await AsyncStorage.getItem('auth_token');
      
      for (const cls of classes) {
        try {
          const res = await fetch(`${config.apiUrl}/attendance/class/${cls.id}/active-session`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.has_active_session && data.session) {
              activeSes.push({
                id: data.session.id,
                classId: cls.id,
                className: cls.subject_name || 'Unknown',
                remainingSeconds: data.session.remaining_seconds || 0
              });
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch active session for class ${cls.id}`);
        }
      }
      setActiveSessions(activeSes);

    } catch (error) {
      console.error('Failed to load student data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeSessions.length === 0) return;

    const interval = setInterval(() => {
      setActiveSessions(prev => 
        prev.map(s => ({
          ...s,
          remainingSeconds: s.remainingSeconds > 0 ? s.remainingSeconds - 1 : 0
        })).filter(s => s.remainingSeconds > 0)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSessions.length]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filterTodayClasses = (classes: EnrolledClass[]) => {
    const today = new Date().getDay(); 
    const todayIndex = today === 0 ? 6 : today - 1;

    const todaysSchedules = classes.flatMap(cls => 
      cls.schedules
        .filter(schedule => schedule.day_of_week === todayIndex)
        .map(schedule => ({
          className: cls.subject_name || 'Unknown Subject',
          teacher: cls.teacher_name || 'TBA',
          time: `${schedule.start_time} - ${schedule.end_time}`,
          room: schedule.room_number,
          year: cls.year,
          section: cls.section,
        }))
    );

    setTodayClasses(todaysSchedules);
  };

  const getAttendanceForClass = (classId: number) => {
    const attendance = attendanceData.find(a => a.class_id === classId);
    return attendance ? attendance.attendance_percentage : 0;
  };

  const getOverallAttendance = () => {
    if (attendanceData.length === 0) return '--';
    const sum = attendanceData.reduce((acc, curr) => acc + curr.attendance_percentage, 0);
    return (sum / attendanceData.length).toFixed(0) + '%';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && !refreshing) {
    return <LoadingBar message="Fetching your attendance and schedule..." />;
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.welcomeText}>Hey, {user?.name?.split(' ')[0]}!</Text>
            <Text style={styles.subtitleText}>Track your courses and attendance</Text>
          </View>
        </View>
      </View>

      {/* Active Sessions Notification */}
      {activeSessions.length > 0 && (
        <View style={styles.activeSessionsContainer}>
          <View style={styles.activeHeader}>
            <Zap size={18} color={Colors.light.primary} fill={Colors.light.primary} />
            <Text style={styles.activeTitle}>Active Sessions</Text>
          </View>
          {activeSessions.map(session => (
            <TouchableOpacity 
              key={session.id} 
              style={styles.activeCard}
              onPress={() => setCodeModalVisible(true)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.activeClassName}>{session.className}</Text>
                <Text style={styles.activeTime}>{formatTime(session.remainingSeconds)} remaining</Text>
              </View>
              <Button size="sm" onPress={() => setCodeModalVisible(true)} style={styles.joinBtn}>
                Join Now
              </Button>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            title="Courses"
            value={enrolledClasses.length}
            icon={<BookOpen />}
            variant="primary"
          />
          <StatCard
            title="Attendance"
            value={getOverallAttendance()}
            icon={<BarChart3 />}
            variant="success"
          />
        </View>
      </View>

      {/* Verification Actions */}
      <View style={styles.actionGrid}>
        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]} 
          onPress={() => setCodeModalVisible(true)}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#E0F2FE' }]}>
            <Hash size={24} color="#0284C7" />
          </View>
          <Text style={styles.actionLabel}>Enter Code</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]} 
          onPress={() => {
            if (enrolledClasses.length > 0) {
              setQrModalVisible(true);
            } else {
              Alert.alert('No Classes', 'Please enroll in a class first.');
            }
          }}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}>
            <QrCode size={24} color="#16A34A" />
          </View>
          <Text style={styles.actionLabel}>Scan QR</Text>
        </TouchableOpacity>
      </View>

      {/* Today's Schedule */}
      <Card style={styles.sectionCard}>
        <CardHeader>
          <CardTitle style={styles.sectionTitle}>
            <Calendar size={18} color={Colors.light.primary} style={{ marginRight: 8 }} />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayClasses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No lectures scheduled for today</Text>
            </View>
          ) : (
            todayClasses.map((cls, index) => (
              <View key={index} style={styles.classItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.className}>{cls.className}</Text>
                  <Text style={styles.classInfo}>{cls.teacher}</Text>
                </View>
                <View style={styles.classFooter}>
                  <View style={styles.infoRow}>
                    <Clock size={12} color={Colors.light.mutedForeground} />
                    <Text style={styles.infoText}>{cls.time}</Text>
                  </View>
                  {cls.room && (
                    <View style={styles.infoRow}>
                      <MapPin size={12} color={Colors.light.mutedForeground} />
                      <Text style={styles.infoText}>{cls.room}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </CardContent>
      </Card>

      {/* Enrolled Classes with Attendance */}
      <Card style={styles.sectionCard}>
        <CardHeader>
          <CardTitle style={styles.sectionTitle}>
            <GraduationCap size={18} color={Colors.light.success} style={{ marginRight: 8 }} />
            My Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enrolledClasses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>You're not enrolled in any courses</Text>
            </View>
          ) : (
            enrolledClasses.map((cls) => (
              <TouchableOpacity 
                key={cls.id} 
                style={styles.enrolledItem}
                onPress={() => router.push('/(app)/(student)/enrollment')}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.enrolledName}>{cls.subject_name}</Text>
                  <Text style={styles.enrolledInfo}>{cls.teacher_name} • Y{cls.year}S{cls.section}</Text>
                </View>
                <View style={styles.enrolledAttendance}>
                  <Text style={[
                    styles.attendanceValue,
                    { color: getAttendanceForClass(cls.id) < 75 ? Colors.light.destructive : Colors.light.success }
                  ]}>
                    {getAttendanceForClass(cls.id).toFixed(0)}%
                  </Text>
                </View>
                <ChevronRight size={16} color={Colors.light.mutedForeground} />
              </TouchableOpacity>
            ))
          )}
        </CardContent>
      </Card>

      {/* Tools Quick Nav */}
      <View style={styles.quickNav}>
        <Text style={styles.quickNavTitle}>Quick Links</Text>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(app)/(student)/enrollment')}>
          <View style={[styles.navIcon, { backgroundColor: '#EEF2FF' }]}>
            <BookOpen size={20} color="#4F46E5" />
          </View>
          <Text style={styles.navText}>My Courses & History</Text>
          <ChevronRight size={20} color={Colors.light.mutedForeground} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/(app)/(student)/timetable')}>
          <View style={[styles.navIcon, { backgroundColor: '#FEF2F2' }]}>
            <Calendar size={20} color="#DC2626" />
          </View>
          <Text style={styles.navText}>Weekly Timetable</Text>
          <ChevronRight size={20} color={Colors.light.mutedForeground} />
        </TouchableOpacity>
      </View>

      <StudentAttendanceCodeModal
        visible={codeModalVisible}
        onClose={() => setCodeModalVisible(false)}
        onSuccess={fetchData}
      />

      <StudentQRCodeScanModal
        visible={qrModalVisible}
        onClose={() => setQrModalVisible(false)}
        onSuccess={fetchData}
      />

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  subtitleText: {
    fontSize: 14,
    color: Colors.light.mutedForeground,
    marginTop: 4,
  },
  activeSessionsContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  activeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary + '0D',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.primary + '33',
    marginBottom: 8,
  },
  activeClassName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  activeTime: {
    fontSize: 12,
    color: Colors.light.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  joinBtn: {
    paddingHorizontal: 16,
  },
  statsGrid: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  actionGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  actionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    textAlign: 'left',
    fontSize: 18,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  className: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  classInfo: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    marginTop: 2,
  },
  classFooter: {
    alignItems: 'flex-end',
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 11,
    color: Colors.light.mutedForeground,
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.light.mutedForeground,
    fontSize: 13,
  },
  enrolledItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 12,
  },
  enrolledName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  enrolledInfo: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    marginTop: 2,
  },
  enrolledAttendance: {
    alignItems: 'flex-end',
  },
  attendanceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  quickNav: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  quickNavTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
    paddingLeft: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
});
