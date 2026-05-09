import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Modal, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, ChevronDown, Check, ChevronRight, Clock, Hash, QrCode, Camera, AlertCircle, CheckCircle2, XCircle, ArrowLeft, History, X } from 'lucide-react-native';
import api from '../../../src/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';
import { Colors } from '../../../src/constants/Colors';
import { normalizeId, resolveClassSubjectCode, resolveClassSubjectName } from '../../../src/utils/classLabels';
import { useAppData } from '../../../src/contexts/AppDataContext';

interface TeacherClass {
  id: number;
  subject_id?: number | string | null;
  subject_name?: string;
  subject_code?: string;
  year: number;
  section: string;
}

interface SubjectOption {
  id: number | string;
  name?: string;
  code?: string;
}

interface ClassInfo {
  id: number;
  subjectName: string;
  subjectCode: string;
  year: number;
  section: string;
}

interface Session {
  id: number;
  date: string;
  status: string;
  attendance_code?: string;
  qr_enabled: boolean;
  face_recognition_enabled: boolean;
}

interface PendingRecord {
  id: number;
  session_id: number;
  class_id: number;
  student_id: number;
  student_name?: string;
  student_email?: string;
  class_name?: string;
  subject_name?: string;
  session_date?: string;
  submitted_at?: string;
  final_status?: string;
}

interface ClassStudent {
  student_id: number;
  student_name: string;
  roll_number?: string | null;
}

export default function ProfessorSessionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { professorClasses, subjects, refreshProfessorCommonData } = useAppData();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pendingRecords, setPendingRecords] = useState<PendingRecord[]>([]);
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([]);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [classPickerVisible, setClassPickerVisible] = useState(false);

  const mapClassOptions = (classData: TeacherClass[], subjectData: SubjectOption[]): ClassInfo[] => {
    const subjectMap = new Map<number, SubjectOption>();
    for (const subject of (Array.isArray(subjectData) ? subjectData : [])) {
      const subjectId = normalizeId(subject.id);
      if (subjectId !== null) {
        subjectMap.set(subjectId, subject);
      }
    }

    return (Array.isArray(classData) ? classData : []).map((cls) => ({
      id: cls.id,
      subjectName: resolveClassSubjectName(cls, subjectMap),
      subjectCode: resolveClassSubjectCode(cls, subjectMap),
      year: cls.year,
      section: cls.section,
    }));
  };

  const fetchClasses = async () => {
    try {
      let mappedClasses = mapClassOptions(professorClasses, subjects);

      if (mappedClasses.length === 0) {
        const refreshed = await refreshProfessorCommonData();
        mappedClasses = refreshed
          ? mapClassOptions(refreshed.classes, refreshed.subjects)
          : mappedClasses;
      }

      setClasses(mappedClasses);
      if (mappedClasses.length > 0 && selectedClassId === null) {
        setSelectedClassId(mappedClasses[0].id);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSessions = async () => {
    if (selectedClassId === null) return;
    try {
      setLoading(true);
      const data = await api.get<Session[]>(`/teachers/classes/${selectedClassId}/sessions`);
      setSessions(data);
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('expired')) {
        return;
      }
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPendingRecords = async () => {
    if (selectedClassId === null) {
      setPendingRecords([]);
      return;
    }

    try {
      const data = await api.get<PendingRecord[]>('/attendance/pending/code-submissions');
      const filtered = (Array.isArray(data) ? data : []).filter(
        (record: PendingRecord) => record.class_id === selectedClassId
      );
      setPendingRecords(filtered);
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('expired')) {
        setPendingRecords([]);
        return;
      }
      console.error('Error fetching pending records:', error);
    }
  };

  const fetchClassStudents = async () => {
    if (selectedClassId === null) {
      setClassStudents([]);
      return;
    }

    try {
      const data = await api.get<ClassStudent[]>(`/teachers/classes/${selectedClassId}/students`);
      setClassStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes('expired')) {
        setClassStudents([]);
        return;
      }
      console.error('Error fetching class students:', error);
    }
  };

  const handleApproveSubmission = async (recordId: number) => {
    try {
      setProcessingIds((prev) => new Set(prev).add(recordId));
      await api.post(`/attendance/code-submissions/${recordId}/approve`);
      setPendingRecords((prev) => prev.filter((record) => record.id !== recordId));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to approve submission');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(recordId);
        return next;
      });
    }
  };

  const handleRejectSubmission = async (recordId: number) => {
    try {
      setProcessingIds((prev) => new Set(prev).add(recordId));
      await api.post(`/attendance/code-submissions/${recordId}/reject`, {
        reason: 'Code not verified by professor'
      });
      setPendingRecords((prev) => prev.filter((record) => record.id !== recordId));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject submission');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(recordId);
        return next;
      });
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [professorClasses, subjects]);

  useEffect(() => {
    if (selectedClassId !== null) {
      fetchSessions();
      fetchPendingRecords();
      fetchClassStudents();
    }
  }, [selectedClassId]);

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedClassId) {
      Promise.all([fetchSessions(), fetchPendingRecords(), fetchClassStudents()]);
    } else {
      fetchClasses();
    }
  };

  const formatPendingDateTime = (record: PendingRecord) => {
    const rawDate = record.session_date || record.submitted_at;
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

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Attendance Sessions</Text>
          <Text style={styles.subtitle}>Review and manage class attendance</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          <Text style={styles.label}>Select Class</Text>
          <TouchableOpacity 
            style={styles.pickerTrigger} 
            onPress={() => setClassPickerVisible(true)}
          >
            <View style={styles.pickerIcon}>
              <Calendar size={18} color={Colors.light.primary} />
            </View>
            <Text style={styles.pickerValue}>
              {selectedClass ? `${selectedClass.subjectName} (${selectedClass.subjectCode})` : 'Select a class'}
            </Text>
            <ChevronDown size={20} color={Colors.light.mutedForeground} />
          </TouchableOpacity>

          {pendingRecords.length > 0 && (
            <Card style={styles.pendingCard}>
              <CardHeader>
                <CardTitle style={{ color: '#EA580C', fontSize: 16 }}>Pending Approvals</CardTitle>
                <CardDescription>
                  {pendingRecords.length} submission(s) waiting for review
                </CardDescription>
              </CardHeader>
              <CardContent>
                <View style={styles.pendingList}>
                  {pendingRecords.map((record) => {
                    const isProcessing = processingIds.has(record.id);
                    const matchingStudent = classStudents.find((student) => student.student_id === record.student_id);
                    const displayStudentName = matchingStudent?.student_name || record.student_name || `Student #${record.student_id}`;
                    const displayRollNumber = matchingStudent?.roll_number || 'N/A';
                    const displaySubject = record.subject_name || selectedClass?.subjectName || 'Unknown subject';
                    const when = formatPendingDateTime(record);

                    return (
                      <View key={record.id} style={styles.pendingItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pendingStudentName}>
                            {displayStudentName}
                          </Text>
                          <Text style={styles.pendingMeta}>
                            Roll No: {displayRollNumber}
                          </Text>
                          <Text style={styles.pendingMeta}>
                            Subject: {displaySubject}
                          </Text>
                          <Text style={styles.pendingMeta}>
                            {when.date} at {when.time}
                          </Text>
                        </View>

                        <View style={styles.pendingActions}>
                          <TouchableOpacity
                            disabled={isProcessing}
                            style={[styles.actionBtn, styles.approveBtn, isProcessing && styles.disabledBtn]}
                            onPress={() => handleApproveSubmission(record.id)}
                          >
                            <CheckCircle2 size={16} color="#FFF" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            disabled={isProcessing}
                            style={[styles.actionBtn, styles.rejectBtn, isProcessing && styles.disabledBtn]}
                            onPress={() => handleRejectSubmission(record.id)}
                          >
                            <XCircle size={16} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </CardContent>
            </Card>
          )}

          <Text style={styles.label}>Session History</Text>
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
          ) : sessions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <History size={48} color={Colors.light.mutedForeground} opacity={0.3} />
              <Text style={styles.emptyTitle}>No Sessions Yet</Text>
              <Text style={styles.emptySubtitle}>You haven't started any sessions for this class.</Text>
            </View>
          ) : (
            <View style={styles.sessionsList}>
              {sessions.map((session) => (
                <TouchableOpacity 
                  key={session.id} 
                  style={styles.sessionCard}
                  onPress={() => router.push(`/(app)/(professor)/session-details?id=${session.id}&classId=${selectedClassId}`)}
                >
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionDate}>
                      {new Date(session.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Text>
                    <View style={styles.sessionMeta}>
                      <Clock size={12} color={Colors.light.mutedForeground} />
                      <Text style={styles.sessionTime}>
                        {new Date(session.date).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                      <View style={styles.dot} />
                      <Text style={[
                        styles.statusText,
                        { color: session.status === 'open' ? Colors.light.success : Colors.light.mutedForeground }
                      ]}>
                        {session.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.methodIcons}>
                    {session.attendance_code && <Hash size={14} color={Colors.light.primary} />}
                    {session.qr_enabled && <QrCode size={14} color={Colors.light.primary} />}
                    {session.face_recognition_enabled && <Camera size={14} color={Colors.light.primary} />}
                  </View>
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => router.push(`/(app)/(professor)/session-details?id=${session.id}&classId=${selectedClassId}`)}
                    style={styles.resultButton}
                    textStyle={styles.resultButtonText}
                  >
                    View Results
                  </Button>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Class Picker Modal */}
      <Modal visible={classPickerVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Class</Text>
              <TouchableOpacity onPress={() => setClassPickerVisible(false)}>
                <X size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={classes}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.pickerItem}
                  onPress={() => {
                    setSelectedClassId(item.id);
                    setClassPickerVisible(false);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText, 
                    selectedClassId === item.id && styles.selectedPickerItem
                  ]}>
                    {item.subjectName} ({item.subjectCode})
                  </Text>
                  {selectedClassId === item.id && <Check size={20} color={Colors.light.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.mutedForeground,
    marginTop: 2,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.mutedForeground,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
    marginLeft: 4,
    letterSpacing: 1,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 24,
  },
  pickerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.light.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pickerValue: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  pendingCard: {
    marginBottom: 24,
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  pendingList: {
    gap: 10,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  pendingStudentName: {
    color: Colors.light.text,
    fontWeight: '700',
    fontSize: 14,
  },
  pendingMeta: {
    marginTop: 2,
    color: Colors.light.mutedForeground,
    fontSize: 12,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtn: {
    backgroundColor: Colors.light.success,
  },
  rejectBtn: {
    backgroundColor: Colors.light.destructive,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  sessionsList: {
    gap: 12,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sessionTime: {
    fontSize: 13,
    color: Colors.light.mutedForeground,
    marginLeft: 4,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.light.mutedForeground,
    marginHorizontal: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  methodIcons: {
    flexDirection: 'row',
    gap: 8,
    marginRight: 12,
    opacity: 0.6,
  },
  resultButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    marginLeft: 'auto',
  },
  resultButtonText: {
    fontSize: 12,
    fontWeight: '700',
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
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  pickerItemText: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
  },
  selectedPickerItem: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
});
