import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Search, CheckCircle2, ChevronRight, Hash, Plus, X, GraduationCap, BarChart3, Clock, MapPin, User, AlertCircle } from 'lucide-react-native';
import api from '../../../src/services/api';
import { Colors } from '../../../src/constants/Colors';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface Course {
  id: number;
  subject_name: string;
  subject_code: string;
  teacher_name: string;
  year: number;
  section: string;
  schedules: any[];
}

interface AttendanceSummary {
  class_id: number;
  subject_name: string;
  total_sessions: number;
  attended_sessions: number;
  attendance_percentage: number;
}

export default function StudentCoursesScreen() {
  const router = useRouter();
  const [view, setView] = useState<'my' | 'join'>('my');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [attendanceSummaries, setAttendanceSummaries] = useState<AttendanceSummary[]>([]);
  
  // Join Course State
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [courses, attendance] = await Promise.all([
        api.get<Course[]>('/enrollments/my-classes'),
        api.get<AttendanceSummary[]>('/attendance/my-attendance'),
      ]);
      setEnrolledCourses(courses);
      setAttendanceSummaries(attendance);
    } catch (error) {
      console.error('Failed to load courses data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleEnroll = async () => {
    const normalizedCode = enrollmentCode.trim().toUpperCase();

    if (!normalizedCode) {
      Alert.alert('Error', 'Please enter an enrollment code.');
      return;
    }

    try {
      setIsEnrolling(true);
      await api.post('/enrollments/enroll', { code: normalizedCode });
      Alert.alert('Success', 'You have successfully enrolled in the course!');
      setEnrollmentCode('');
      setView('my');
      await fetchData();
    } catch (error: any) {
      Alert.alert('Enrollment Failed', error.message || 'Invalid code or already enrolled.');
    } finally {
      setIsEnrolling(false);
    }
  };

  const getAttendanceForCourse = (classId: number) => {
    return attendanceSummaries.find(a => a.class_id === classId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Courses</Text>
            <Text style={styles.subtitle}>Manage your studies and progress</Text>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, view === 'my' && styles.activeTab]}
            onPress={() => setView('my')}
          >
            <BookOpen size={18} color={view === 'my' ? Colors.light.primary : Colors.light.mutedForeground} />
            <Text style={[styles.tabText, view === 'my' && styles.activeTabText]}>My Courses</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, view === 'join' && styles.activeTab]}
            onPress={() => setView('join')}
          >
            <Plus size={18} color={view === 'join' ? Colors.light.primary : Colors.light.mutedForeground} />
            <Text style={[styles.tabText, view === 'join' && styles.activeTabText]}>Join Course</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          {view === 'my' ? (
            loading && !refreshing ? (
              <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
            ) : enrolledCourses.length === 0 ? (
              <View style={styles.emptyContainer}>
                <GraduationCap size={64} color={Colors.light.mutedForeground} opacity={0.3} />
                <Text style={styles.emptyTitle}>No Enrolled Courses</Text>
                <Text style={styles.emptySubtitle}>You haven't joined any courses yet for this semester.</Text>
                <Button 
                  style={{ marginTop: 24 }}
                  onPress={() => setView('join')}
                >
                  Join Your First Course
                </Button>
              </View>
            ) : (
              <View style={styles.coursesList}>
                {enrolledCourses.map(course => {
                  const summary = getAttendanceForCourse(course.id);
                  return (
                    <Card key={course.id} style={styles.courseCard}>
                      <CardHeader>
                        <View style={styles.courseHeader}>
                          <View style={{ flex: 1 }}>
                            <CardTitle>{course.subject_name}</CardTitle>
                            <CardDescription>{course.subject_code} • Y{course.year}S{course.section}</CardDescription>
                          </View>
                          <View style={styles.attendanceBadge}>
                            <Text style={[
                              styles.attendancePercent,
                              { color: (summary?.attendance_percentage || 0) < 75 ? Colors.light.destructive : Colors.light.success }
                            ]}>
                              {summary?.attendance_percentage.toFixed(0) || 0}%
                            </Text>
                          </View>
                        </View>
                      </CardHeader>
                      <CardContent>
                        <View style={styles.teacherInfo}>
                          <User size={14} color={Colors.light.mutedForeground} />
                          <Text style={styles.teacherName}>{course.teacher_name}</Text>
                        </View>
                        
                          <View style={styles.schedulePreview}>
                          {course.schedules.length > 0 ? (
                            course.schedules.map((s, idx) => (
                              <View key={idx} style={styles.scheduleItem}>
                                <Clock size={12} color={Colors.light.mutedForeground} />
                                <Text style={styles.scheduleText}>
                                  {DAYS[s.day_of_week].substring(0, 3)} {s.start_time}-{s.end_time}
                                </Text>
                              </View>
                            ))
                          ) : (
                            <Text style={styles.noSchedule}>No regular lectures set</Text>
                          )}
                        </View>

                        <Button 
                          variant="outline" 
                          size="sm" 
                          style={styles.historyBtn}
                          onPress={() => router.push('/(app)/(student)/attendance')}
                        >
                          <BarChart3 size={14} color={Colors.light.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.historyBtnText}>View Attendance History</Text>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </View>
            )
          ) : (
            <View style={styles.joinContainer}>
              <Card>
                <CardHeader>
                  <CardTitle>Join a New Course</CardTitle>
                  <CardDescription>Enter the 6-digit enrollment code provided by your teacher</CardDescription>
                </CardHeader>
                <CardContent>
                  <View style={styles.enrollInputGroup}>
                    <Input
                      placeholder="ENTER CODE"
                      value={enrollmentCode}
                      onChangeText={(text) => setEnrollmentCode(text.replace(/\s/g, '').toUpperCase())}
                      autoCapitalize="characters"
                      style={styles.enrollInput}
                      maxLength={20}
                    />
                    <Button 
                      onPress={handleEnroll} 
                      isLoading={isEnrolling}
                      disabled={enrollmentCode.trim().length === 0}
                    >
                      Enroll in Course
                    </Button>
                  </View>
                  
                  <View style={styles.infoBox}>
                    <AlertCircle size={16} color={Colors.light.mutedForeground} />
                    <Text style={styles.infoText}>
                      Enrollment codes are unique to each course section and generated by professors.
                    </Text>
                  </View>
                </CardContent>
              </Card>
            </View>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// Reuse styles from Professor Classes for consistency
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
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  subtitle: {
    marginTop: 4,
    color: Colors.light.mutedForeground,
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 8,
  },
  activeTab: {
    borderBottomColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.mutedForeground,
  },
  activeTabText: {
    color: Colors.light.primary,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  coursesList: {
    gap: 12,
  },
  courseCard: {
    marginBottom: 4,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  attendanceBadge: {
    backgroundColor: Colors.light.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  attendancePercent: {
    fontSize: 16,
    fontWeight: '800',
  },
  teacherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  teacherName: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '500',
  },
  schedulePreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleText: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
  },
  noSchedule: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    fontStyle: 'italic',
  },
  historyBtn: {
    height: 40,
  },
  historyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.light.mutedForeground,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  joinContainer: {
    paddingTop: 8,
  },
  enrollInputGroup: {
    gap: 16,
  },
  enrollInput: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 4,
    height: 64,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: Colors.light.accent,
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.light.mutedForeground,
    lineHeight: 18,
  }
});
