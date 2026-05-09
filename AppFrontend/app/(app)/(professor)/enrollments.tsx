import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, Modal, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Calendar, Clock, MapPin, Plus, Trash2, Copy, X, ChevronDown, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useAppData } from '../../../src/contexts/AppDataContext';
import { API_URL } from '../../../src/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { Colors } from '../../../src/constants/Colors';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface EnrollmentCode {
  id: number;
  code: string;
  is_active: boolean;
}

interface ClassSchedule {
  id: number;
  class_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number?: string;
}

interface ClassWithDetails {
  classId: number;
  subjectName: string;
  subjectCode: string;
  enrollmentCode: string;
  year: number;
  section: string;
}

interface StudentEnrollment {
  enrollment_id: number;
  student_id: number;
  student_name: string;
  email: string;
  roll_number?: string;
  enrolled_date: string;
  status: string;
  attendance_percentage?: number;
}

interface SubjectOption {
  id: number;
  name: string;
  code: string;
}

export default function EnrollmentsScreen() {
  const { user } = useAuth();
  const { professorClasses, subjects: cachedSubjects, refreshProfessorCommonData } = useAppData();
  const teacherId = user?.id ? Number(user.id) : NaN;
  const [classesWithDetails, setClassesWithDetails] = useState<ClassWithDetails[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [students, setStudents] = useState<StudentEnrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [classPickerVisible, setClassPickerVisible] = useState(false);
  const [addScheduleVisible, setAddScheduleVisible] = useState(false);
  const [addClassVisible, setAddClassVisible] = useState(false);

  // New schedule state
  const [newDay, setNewDay] = useState(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [roomNumber, setRoomNumber] = useState('');

  // New class state
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [newYear, setNewYear] = useState('1');
  const [newSection, setNewSection] = useState('A');

  const fetchClassesWithEnrollmentCodes = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');

      let teacherClasses: any[] = professorClasses;
      let subjects: any[] = cachedSubjects;

      if (teacherClasses.length === 0 || subjects.length === 0) {
        const refreshed = await refreshProfessorCommonData();
        if (refreshed) {
          teacherClasses = refreshed.classes;
          subjects = refreshed.subjects;
        }
      }

      if (teacherClasses.length === 0 || subjects.length === 0) {
        const classesRes = await fetch(`${API_URL}/teachers/classes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!classesRes.ok) return;
        teacherClasses = await classesRes.json();

        const subjectsRes = await fetch(`${API_URL}/teachers/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        subjects = subjectsRes.ok ? await subjectsRes.json() : [];
      }

      setSubjects(subjects);
      const subjectMap = new Map<number, { name: string; code: string }>();
      subjects.forEach((s: any) => subjectMap.set(s.id, { name: s.name, code: s.code }));

      const classDetails: ClassWithDetails[] = [];
      for (const cls of teacherClasses) {
        const subject = subjectMap.get(cls.subject_id);
        let enrollmentCode = 'No code';

        // Try to fetch enrollment codes, but don't skip class if there are none
        try {
          const codesRes = await fetch(`${API_URL}/enrollments/codes/class/${cls.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (codesRes.ok) {
            const codes: EnrollmentCode[] = await codesRes.json();
            const activeCode = codes.find(c => c.is_active);
            if (activeCode) {
              enrollmentCode = activeCode.code;
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch codes for class ${cls.id}:`, error);
        }

        // Add class regardless of enrollment code availability
        classDetails.push({
          classId: cls.id,
          subjectName: subject?.name || 'Unknown Subject',
          subjectCode: subject?.code || 'N/A',
          enrollmentCode: enrollmentCode,
          year: cls.year,
          section: cls.section,
        });
      }

      setClassesWithDetails(classDetails);
      if (classDetails.length > 0 && selectedClassId === null) {
        setSelectedClassId(classDetails[0].classId);
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchSchedules = async () => {
    if (selectedClassId === null) return;
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/enrollments/schedules/class/${selectedClassId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const text = await res.text();
        if (text) {
          const data = JSON.parse(text);
          setSchedules(data);
        } else {
          setSchedules([]);
        }
      } else {
        console.warn(`Failed to fetch schedules: HTTP ${res.status}`);
        setSchedules([]);
      }
    } catch (error) {
      console.error('Failed to load schedules:', error);
      setSchedules([]);
    }
  };

  const fetchStudents = async () => {
    if (selectedClassId === null) return;
    try {
      setLoadingStudents(true);
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/teachers/classes/${selectedClassId}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const enrichedStudents = await Promise.all(
          data.map(async (student: StudentEnrollment) => {
            try {
              const percentageRes = await fetch(
                `${API_URL}/attendance/student/${student.student_id}/class/${selectedClassId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (percentageRes.ok) {
                const stats = await percentageRes.json();
                return {
                  ...student,
                  attendance_percentage: Number(stats.attendance_percentage ?? 0),
                };
              }
            } catch (percentageError) {
              console.error('Failed to load student attendance percentage:', percentageError);
            }

            return student;
          })
        );

        setStudents(enrichedStudents);
      }
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchClassesWithEnrollmentCodes();
  }, [professorClasses, cachedSubjects]);

  useEffect(() => {
    if (selectedClassId !== null) {
      fetchSchedules();
      fetchStudents();
    }
  }, [selectedClassId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClassesWithEnrollmentCodes();
  };

  const handleRemoveStudent = async (enrollmentId: number, studentName: string) => {
    Alert.alert(
      'Remove Student',
      `Are you sure you want to remove ${studentName} from this class?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              const res = await fetch(`${API_URL}/enrollments/${enrollmentId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });

              if (res.ok) {
                fetchStudents();
              } else {
                Alert.alert('Error', 'Failed to remove student');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove student');
            }
          }
        }
      ]
    );
  };

  const createSchedule = async () => {
    if (selectedClassId === null) return;
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/enrollments/schedules?class_id=${selectedClassId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          day_of_week: newDay,
          start_time: startTime,
          end_time: endTime,
          room_number: roomNumber || null,
        }),
      });

      if (res.ok) {
        Alert.alert('Success', 'Class schedule created');
        setAddScheduleVisible(false);
        setRoomNumber('');
        fetchSchedules();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.detail || 'Failed to create schedule');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create schedule');
    } finally {
      setLoading(false);
    }
  };

  const createClass = async () => {
    const subjectName = newSubjectName.trim();
    const subjectCode = newSubjectCode.trim().toUpperCase();

    if (!subjectName) {
      Alert.alert('Missing subject name', 'Please enter a subject name.');
      return;
    }

    if (!subjectCode) {
      Alert.alert('Missing subject code', 'Please enter a subject code.');
      return;
    }

    const parsedYear = Number(newYear);
    if (!Number.isInteger(parsedYear) || parsedYear < 1 || parsedYear > 4) {
      Alert.alert('Invalid year', 'Year must be a number between 1 and 4.');
      return;
    }

    const section = newSection.trim().toUpperCase();
    if (!section) {
      Alert.alert('Invalid section', 'Section is required.');
      return;
    }

    if (!Number.isFinite(teacherId)) {
      Alert.alert('Error', 'Could not identify professor account. Please login again.');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');

      const subjectRes = await fetch(`${API_URL}/teachers/subjects`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: subjectName, code: subjectCode }),
      });

      if (!subjectRes.ok) {
        const err = await subjectRes.json().catch(() => ({}));
        Alert.alert('Error', err?.detail || 'Failed to create subject');
        return;
      }

      const createdSubject = await subjectRes.json();
      const res = await fetch(`${API_URL}/teachers/classes`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject_id: createdSubject.id,
          teacher_id: teacherId,
          year: parsedYear,
          section,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Error', err?.detail || 'Failed to create class');
        return;
      }

      const createdClass = await res.json();
      Alert.alert('Success', 'Class created successfully');
      setAddClassVisible(false);
      setNewSubjectName('');
      setNewSubjectCode('');
      setSelectedClassId(createdClass.id);
      await fetchClassesWithEnrollmentCodes();
    } catch (error) {
      Alert.alert('Error', 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  const deleteSchedule = async (scheduleId: number) => {
    Alert.alert(
      'Delete Schedule',
      'Are you sure you want to delete this schedule?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              const res = await fetch(`${API_URL}/enrollments/schedules/${scheduleId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });

              if (res.ok) {
                fetchSchedules();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete schedule');
            }
          }
        }
      ]
    );
  };

  const selectedClass = classesWithDetails.find(c => c.classId === selectedClassId);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Manage Enrollments</Text>
        <Text style={styles.subtitle}>Configure class codes and schedules</Text>
        <Button style={styles.headerButton} onPress={() => setAddClassVisible(true)}>
          <Plus size={16} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.miniButtonText}>Add Class</Text>
        </Button>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Select Class</Text>
        <TouchableOpacity 
          style={styles.pickerTrigger} 
          onPress={() => setClassPickerVisible(true)}
        >
          <Text style={styles.pickerValue}>
            {selectedClass ? `${selectedClass.subjectName} (${selectedClass.subjectCode})` : 'Select a class'}
          </Text>
          <ChevronDown size={20} color={Colors.light.mutedForeground} />
        </TouchableOpacity>

        {selectedClass && (
          <>
            <Card style={styles.card}>
              <CardHeader>
                <CardTitle>Enrollment Code</CardTitle>
                <CardDescription>Share this code with students to enroll</CardDescription>
              </CardHeader>
              <CardContent>
                <View style={styles.codeContainer}>
                  <Text style={styles.codeText}>{selectedClass.enrollmentCode}</Text>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onPress={() => {
                      // Clipboard not imported correctly in some environments, but we can try
                      Alert.alert('Enrollment Code', selectedClass.enrollmentCode);
                    }}
                  >
                    <Copy size={16} color={Colors.light.primary} />
                  </Button>
                </View>
              </CardContent>
            </Card>

            <Card style={styles.card}>
              <CardHeader style={styles.rowHeader}>
                <View>
                  <CardTitle>Class Schedules</CardTitle>
                  <CardDescription>Current weekly sessions</CardDescription>
                </View>
                <Button size="sm" onPress={() => setAddScheduleVisible(true)}>
                  <Plus size={16} color="#FFF" style={{ marginRight: 4 }} />
                  <Text style={styles.miniButtonText}>Add</Text>
                </Button>
              </CardHeader>
              <CardContent>
                {schedules.length === 0 ? (
                  <Text style={styles.emptyText}>No schedules added yet</Text>
                ) : (
                  schedules.map((schedule) => (
                    <View key={schedule.id} style={styles.scheduleItem}>
                      <View style={styles.scheduleInfo}>
                        <Text style={styles.scheduleDay}>{DAYS[schedule.day_of_week]}</Text>
                        <View style={styles.scheduleTimeRow}>
                          <Clock size={12} color={Colors.light.mutedForeground} />
                          <Text style={styles.scheduleTime}>
                            {schedule.start_time} - {schedule.end_time}
                          </Text>
                          {schedule.room_number && (
                            <>
                              <MapPin size={12} color={Colors.light.mutedForeground} style={{ marginLeft: 8 }} />
                              <Text style={styles.scheduleTime}>{schedule.room_number}</Text>
                            </>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity 
                        onPress={() => deleteSchedule(schedule.id)}
                        style={styles.deleteBtn}
                      >
                        <Trash2 size={18} color={Colors.light.destructive} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </CardContent>
            </Card>

            <Card style={styles.card}>
              <CardHeader>
                <CardTitle>Enrolled Students ({students.length})</CardTitle>
                <CardDescription>Manage students in this class</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStudents ? (
                  <ActivityIndicator size="small" color={Colors.light.primary} style={{ marginVertical: 20 }} />
                ) : students.length === 0 ? (
                  <Text style={styles.emptyText}>No students enrolled yet</Text>
                ) : (
                  students.map((student) => (
                    <View key={student.student_id} style={styles.studentItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.studentName}>{student.student_name}</Text>
                        <Text style={styles.studentEmail}>{student.email}</Text>
                        {student.roll_number && (
                          <Text style={styles.studentRoll}>Roll: {student.roll_number}</Text>
                        )}
                        <View style={styles.attendanceBadge}>
                          <Text style={styles.attendanceBadgeLabel}>Attendance</Text>
                          <Text style={styles.attendanceBadgeValue}>
                            {typeof student.attendance_percentage === 'number' ? `${student.attendance_percentage}%` : 'N/A'}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        onPress={() => handleRemoveStudent(student.enrollment_id, student.student_name)}
                        style={styles.deleteBtn}
                      >
                        <Trash2 size={18} color={Colors.light.destructive} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </View>

      {/* Class Picker Modal */}
      <Modal visible={classPickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Class</Text>
              <TouchableOpacity onPress={() => setClassPickerVisible(false)}>
                <X size={24} color={Colors.light.mutedForeground} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={classesWithDetails}
              keyExtractor={(item) => item.classId.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedClassId(item.classId);
                    setClassPickerVisible(false);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText, 
                    selectedClassId === item.classId && styles.selectedPickerItem
                  ]}>
                    {item.subjectName} ({item.subjectCode})
                  </Text>
                  {selectedClassId === item.classId && <Check size={20} color={Colors.light.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Add Schedule Modal */}
      <Modal visible={addScheduleVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.addModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Schedule</Text>
              <TouchableOpacity onPress={() => setAddScheduleVisible(false)}>
                <X size={24} color={Colors.light.mutedForeground} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={styles.fieldLabel}>Day of Week</Text>
              <View style={styles.dayGrid}>
                {DAYS.map((day, index) => (
                  <TouchableOpacity 
                    key={day} 
                    style={[styles.dayChip, newDay === index && styles.selectedDayChip]}
                    onPress={() => setNewDay(index)}
                  >
                    <Text style={[styles.dayChipText, newDay === index && styles.selectedDayChipText]}>
                      {day.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Start Time</Text>
                  <Input 
                    value={startTime} 
                    onChangeText={setStartTime} 
                    placeholder="HH:MM" 
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.fieldLabel}>End Time</Text>
                  <Input 
                    value={endTime} 
                    onChangeText={setEndTime} 
                    placeholder="HH:MM" 
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Room Number (Optional)</Text>
              <Input 
                value={roomNumber} 
                onChangeText={setRoomNumber} 
                placeholder="e.g. Room 101" 
              />

              <Button 
                onPress={createSchedule} 
                style={{ marginTop: 24 }}
                isLoading={loading}
              >
                Create Schedule
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Class Modal */}
      <Modal visible={addClassVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.addModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Class</Text>
              <TouchableOpacity onPress={() => setAddClassVisible(false)}>
                <X size={24} color={Colors.light.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.fieldLabel}>Subject Name</Text>
              <Input value={newSubjectName} onChangeText={setNewSubjectName} placeholder="e.g. Data Structures" />

              <Text style={styles.fieldLabel}>Subject Code</Text>
              <Input value={newSubjectCode} onChangeText={setNewSubjectCode} placeholder="e.g. CS301" autoCapitalize="characters" />

              <Text style={styles.fieldLabel}>Year</Text>
              <Input value={newYear} onChangeText={setNewYear} placeholder="1 to 4" keyboardType="numeric" />

              <Text style={styles.fieldLabel}>Section</Text>
              <Input value={newSection} onChangeText={setNewSection} placeholder="e.g. A" autoCapitalize="characters" />

              <Button onPress={createClass} style={{ marginTop: 24 }} isLoading={loading}>
                Create Class
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    height: 40,
    paddingHorizontal: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  attendanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.light.accent,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  attendanceBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  attendanceBadgeValue: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.mutedForeground,
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 20,
  },
  pickerValue: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
  },
  card: {
    marginBottom: 16,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.accent,
    padding: 16,
    borderRadius: 12,
  },
  codeText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.primary,
    letterSpacing: 2,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleDay: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  scheduleTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  scheduleTime: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    marginLeft: 4,
  },
  deleteBtn: {
    padding: 8,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  studentEmail: {
    fontSize: 13,
    color: Colors.light.mutedForeground,
  },
  studentRoll: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.light.mutedForeground,
    paddingVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
  },
  addModal: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  pickerItemText: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
  },
  selectedPickerItem: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.accent,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  selectedDayChip: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  dayChipText: {
    fontSize: 12,
    color: Colors.light.text,
  },
  selectedDayChipText: {
    color: 'white',
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
  },
  subjectList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.accent,
  },
  selectedSubjectChip: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary,
  },
  subjectChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.text,
  },
  selectedSubjectChipText: {
    color: '#FFF',
  },
  helperText: {
    marginTop: 8,
    color: Colors.light.mutedForeground,
    fontSize: 12,
  },
});
