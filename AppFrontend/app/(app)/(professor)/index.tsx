import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, CalendarDays, ClipboardCheck, Camera, Users, Clock, MapPin, Hash, QrCode, CheckCircle2, XCircle, ChevronRight, BarChart3, History, Plus } from 'lucide-react-native';
import { useAuth } from '../../../src/contexts/AuthContext';
import api from '../../../src/services/api';
import { config } from '../../../src/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatCard } from '../../../src/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';
import { Colors } from '../../../src/constants/Colors';
import { ProfessorAttendanceCodeModal } from '../../../src/components/dashboard/ProfessorAttendanceCodeModal';
import { ProfessorQRCodeModal } from '../../../src/components/dashboard/ProfessorQRCodeModal';
import { ProfessorFaceRecognitionModal } from '../../../src/components/dashboard/ProfessorFaceRecognitionModal';
import { resolveClassSubjectCode, resolveClassSubjectName, normalizeId } from '../../../src/utils/classLabels';
import { useAppData } from '../../../src/contexts/AppDataContext';
import { LoadingBar } from '../../../src/components/ui/LoadingBar';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface ClassWithDetails {
  classId: number;
  subjectName: string;
  subjectCode: string;
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

interface PendingSubmission {
  id: number;
  session_id: number;
  class_id: number;
  student_id: number;
  student_name?: string;
  subject_name?: string;
  session_date?: string;
  submitted_at?: string;
}

interface ClassStudent {
  student_id: number;
  student_name: string;
  roll_number?: string | null;
}

export default function ProfessorDashboard() {
  const { user } = useAuth();
  const { professorClasses, subjects, refreshProfessorCommonData } = useAppData();
  const router = useRouter();
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
  const [studentRollMap, setStudentRollMap] = useState<Record<number, string>>({});
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  
  // Modal states
  const [selectedClass, setSelectedClass] = useState<{ id: number; name: string } | null>(null);
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [faceModalVisible, setFaceModalVisible] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      let teacherClasses = professorClasses;
      let subjectList = subjects;

      if (teacherClasses.length === 0 || subjectList.length === 0) {
        const refreshed = await refreshProfessorCommonData();
        if (refreshed) {
          teacherClasses = refreshed.classes;
          subjectList = refreshed.subjects;
        }
      }

      if (teacherClasses.length === 0 || subjectList.length === 0) {
        const [fallbackClasses, fallbackSubjects] = await Promise.all([
          api.get<any[]>('/teachers/classes'),
          api.get<any[]>('/teachers/subjects'),
        ]);
        teacherClasses = fallbackClasses;
        subjectList = fallbackSubjects;
      }

      const classDetails: ClassWithDetails[] = [];
      const rollMap: Record<number, string> = {};
      const subjectMap = new Map(subjectList.map((subject: any) => [Number(subject.id), subject]));

      // OPTIMIZATION: Use batch endpoints to fetch all data in parallel instead of N+1 calls
      const classIds = teacherClasses.map((cls: any) => cls.id);
      
      // Fetch all schedules, students, and active sessions in parallel using batch endpoints
      const [schedulesData, studentsData, activeSessionsData] = await Promise.all([
        api.post<Record<number, any[]>>('/enrollments/schedules/batch', { class_ids: classIds })
          .catch(() => ({})),
        api.post<Record<number, ClassStudent[]>>('/teachers/classes/students/batch', { class_ids: classIds })
          .catch(() => ({})),
        api.post<Record<number, any>>('/attendance/classes/active-sessions/batch', { class_ids: classIds })
          .catch(() => ({})),
      ]);

      // Build roll map from all students at once
      Object.values(studentsData).forEach((students: ClassStudent[]) => {
        students.forEach((student: ClassStudent) => {
          if (student.roll_number) {
            rollMap[student.student_id] = student.roll_number;
          }
        });
      });

      // Build class details using batch results
      const activeSes: ActiveSession[] = [];
      for (const cls of teacherClasses) {
        const subject = subjectMap.get(normalizeId(cls.subject_id) ?? -1);
        const subjectName = resolveClassSubjectName(cls, subjectMap);
        const subjectCode = resolveClassSubjectCode(cls, subjectMap);

        const schedules = schedulesData[cls.id] || [];

        classDetails.push({
          classId: cls.id,
          subjectName,
          subjectCode,
          year: cls.year,
          section: cls.section,
          schedules,
        });

        // Check if there's an active session for this class
        if (activeSessionsData[cls.id]?.has_active_session && activeSessionsData[cls.id]?.session) {
          activeSes.push({
            id: activeSessionsData[cls.id].session.id,
            classId: cls.id,
            className: subjectName,
            remainingSeconds: activeSessionsData[cls.id].session.remaining_seconds || 0
          });
        }
      }

      setClasses(classDetails);
      setStudentRollMap(rollMap);
      setActiveSessions(activeSes);
      filterTodayClasses(classDetails);
      fetchPendingSubmissions();
    } catch (error) {
      console.error('Failed to load professor data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPendingSubmissions = async () => {
    try {
      const data = await api.get<PendingSubmission[]>('/attendance/pending/code-submissions');
      setPendingSubmissions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load pending submissions:', error);
    }
  };

  const formatPendingDateTime = (submission: PendingSubmission) => {
    const rawDate = submission.session_date || submission.submitted_at;
    if (!rawDate) {
      return { date: 'Date unavailable', time: 'Time unavailable' };
    }

    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
      return { date: 'Date unavailable', time: 'Time unavailable' };
    }

    return {
      date: parsed.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      time: parsed.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchPendingSubmissions, 30000);
    return () => clearInterval(interval);
  }, [professorClasses, subjects]);

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

  const filterTodayClasses = (classes: ClassWithDetails[]) => {
    const today = new Date().getDay(); 
    const todayIndex = today === 0 ? 6 : today - 1;

    const todaysSchedules = classes.flatMap(cls => 
      cls.schedules
        .filter(schedule => schedule.day_of_week === todayIndex)
        .map(schedule => ({
          classId: cls.classId,
          className: cls.subjectName,
          time: `${schedule.start_time} - ${schedule.end_time}`,
          room: schedule.room_number,
          year: cls.year,
          section: cls.section,
        }))
    );

    setTodayClasses(todaysSchedules);
  };

  const handleApproveSubmission = async (recordId: number) => {
    try {
      await api.post(`/attendance/code-submissions/${recordId}/approve`);
      Alert.alert('Success', 'Attendance marked as present');
      fetchPendingSubmissions();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve submission');
    }
  };

  const handleRejectSubmission = async (recordId: number) => {
    Alert.alert(
      'Reject Attendance',
      'Are you sure you want to reject this attendance submission?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/attendance/code-submissions/${recordId}/reject`, {
                reason: 'Code not verified by professor'
              });
              Alert.alert('Rejected', 'Marked as absent');
              fetchPendingSubmissions();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject submission');
            }
          }
        }
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && !refreshing) {
    return <LoadingBar message="Fetching classes and attendance metrics..." />;
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.welcomeText}>Hello, Prof. {user?.name?.split(' ')[0]}!</Text>
            <Text style={styles.subtitleText}>Manage your courses and attendance</Text>
          </View>
        </View>
      </View>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <View style={styles.activeSessionsContainer}>
          <Text style={styles.sectionHeading}>Live Sessions</Text>
          {activeSessions.map(session => (
            <TouchableOpacity 
              key={session.id} 
              style={styles.liveSessionCard}
              onPress={() => router.push(`/(app)/(professor)/capture?classId=${session.classId}`)}
            >
              <View style={styles.liveSessionInfo}>
                <View style={styles.pulseDot} />
                <Text style={styles.liveSessionTitle}>{session.className}</Text>
              </View>
              <View style={styles.liveSessionTimer}>
                <Clock size={14} color={Colors.light.primary} />
                <Text style={styles.timerText}>{formatTime(session.remainingSeconds)}</Text>
                <ChevronRight size={16} color={Colors.light.mutedForeground} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            title="My Courses"
            value={classes.length}
            icon={<BookOpen />}
            variant="primary"
          />
          <StatCard
            title="Today"
            value={todayClasses.length}
            subtitle={DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]}
            icon={<CalendarDays />}
            variant="success"
          />
        </View>
      </View>

      {/* Pending Code Submissions */}
      {pendingSubmissions.length > 0 && (
        <Card style={[styles.sectionCard, styles.pendingCard]}>
          <CardHeader>
            <CardTitle style={[styles.sectionTitle, { color: Colors.light.warning }]}>
              <ClipboardCheck size={18} color={Colors.light.warning} style={{ marginRight: 8 }} />
              Pending Approvals ({pendingSubmissions.length})
            </CardTitle>
            <CardDescription>Verify student code submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingSubmissions.map((submission) => {
              const displayName = submission.student_name || `Student #${submission.student_id}`;
              const rollNumber = studentRollMap[submission.student_id] || 'N/A';
              const subjectName = submission.subject_name || 'Unknown subject';
              const when = formatPendingDateTime(submission);

              return (
              <View key={submission.id} style={styles.submissionItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.submissionStudent}>{displayName}</Text>
                  <Text style={styles.submissionSession}>Roll No: {rollNumber}</Text>
                  <Text style={styles.submissionSession}>Subject: {subjectName}</Text>
                  <Text style={styles.submissionSession}>{when.date} at {when.time}</Text>
                </View>
                <View style={styles.submissionActions}>
                  <TouchableOpacity 
                    onPress={() => handleApproveSubmission(submission.id)}
                    style={[styles.miniActionBtn, styles.approveBtn]}
                  >
                    <CheckCircle2 size={18} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleRejectSubmission(submission.id)}
                    style={[styles.miniActionBtn, styles.rejectBtn]}
                  >
                    <XCircle size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )})}
          </CardContent>
        </Card>
      )}

      {/* Today's Schedule */}
      <Card style={styles.sectionCard}>
        <CardHeader>
          <CardTitle style={styles.sectionTitle}>
            <CalendarDays size={18} color={Colors.light.primary} style={{ marginRight: 8 }} />
            Today's Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayClasses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No classes scheduled for today</Text>
            </View>
          ) : (
            todayClasses.map((cls, index) => (
              <View key={index} style={styles.classItem}>
                <View style={styles.classHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.className}>{cls.className}</Text>
                    <Text style={styles.classInfo}>Year {cls.year} Section {cls.section}</Text>
                  </View>
                </View>
                <View style={styles.classFooter}>
                  <View style={styles.infoRow}>
                    <Clock size={14} color={Colors.light.mutedForeground} />
                    <Text style={styles.infoText}>{cls.time}</Text>
                  </View>
                  {cls.room && (
                    <View style={styles.infoRow}>
                      <MapPin size={14} color={Colors.light.mutedForeground} />
                      <Text style={styles.infoText}>{cls.room}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.actionRow}>
                  <Button 
                    size="sm" 
                    onPress={() => router.push(`/(app)/(professor)/capture?classId=${cls.classId}`)}
                    style={styles.miniButton}
                  >
                    <Camera size={14} color="#FFF" style={{ marginRight: 4 }} />
                    <Text style={styles.miniButtonTextPrimary}>Take Attendance</Text>
                  </Button>
                </View>
              </View>
            ))
          )}
        </CardContent>
      </Card>

      {/* Quick Access Grid */}
      <View style={styles.quickAccessGrid}>
        <Text style={styles.sectionHeading}>Management</Text>
        <View style={styles.gridRow}>
          <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/(app)/(professor)/classes')}>
            <View style={[styles.gridIcon, { backgroundColor: '#EEF2FF' }]}>
              <Users size={24} color="#4F46E5" />
            </View>
            <Text style={styles.gridTitle}>All Courses</Text>
            <Text style={styles.gridDesc}>{classes.length} active</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.gridCard} onPress={() => router.push('/(app)/(professor)/sessions')}>
            <View style={[styles.gridIcon, { backgroundColor: '#F0FDF4' }]}>
              <History size={24} color="#16A34A" />
            </View>
            <Text style={styles.gridTitle}>History</Text>
            <Text style={styles.gridDesc}>Past sessions</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Button 
          variant="primary" 
          onPress={() => router.push('/(app)/(professor)/capture')}
          style={styles.mainActionButton}
        >
          <Camera size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.mainActionText}>Quick Attendance</Text>
        </Button>
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
  liveSessionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.primary + '40',
    marginBottom: 8,
  },
  liveSessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.primary,
  },
  liveSessionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  liveSessionTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.primary,
    fontVariant: ['tabular-nums'],
  },
  statsGrid: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  pendingCard: {
    backgroundColor: Colors.light.warning + '0D',
    borderColor: Colors.light.warning + '33',
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    textAlign: 'left',
    fontSize: 18,
  },
  submissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  submissionStudent: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  submissionSession: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
  },
  submissionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  miniActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: Colors.light.success,
  },
  rejectBtn: {
    backgroundColor: Colors.light.destructive,
  },
  classItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  classInfo: {
    fontSize: 13,
    color: Colors.light.mutedForeground,
    marginTop: 2,
  },
  classFooter: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  miniButton: {
    flex: 1,
    height: 40,
    paddingVertical: 0,
  },
  miniButtonTextPrimary: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.light.mutedForeground,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  quickAccessGrid: {
    paddingVertical: 8,
  },
  gridRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  gridCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: 'flex-start',
  },
  gridIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gridTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  gridDesc: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    marginTop: 2,
  },
  quickActions: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  mainActionButton: {
    height: 56,
    borderRadius: 16,
  },
  mainActionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
