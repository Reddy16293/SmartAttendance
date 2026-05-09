import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert, Modal, FlatList, Image as RNImage, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, XCircle, Clock, AlertCircle, ArrowLeft, Mail, User, Check, X, Plus, Search, RotateCcw, FileUp } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../../src/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { Colors } from '../../../src/constants/Colors';
import { parseExcelForAttendance, matchRollNumbersWithStudents } from '../../../src/utils/excelParser';

interface AttendanceRecord {
  id: number;
  student_id: number;
  student_name?: string;
  student_email?: string;
  final_status: 'present' | 'absent' | 'pending_approval' | 'manual_review';
  face_detected: boolean;
  qr_verified: boolean;
}

interface Student {
  id: number;
  name: string;
  email: string;
  roll_number?: string;
}

export default function SessionDetailsScreen() {
  const { id, classId: paramClassId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [sessionImages, setSessionImages] = useState<{ original?: string | null; annotated?: string | null } | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Manual attendance states
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [allStudents, setAllAllStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Excel upload states
  const [excelUploadModalVisible, setExcelUploadModalVisible] = useState(false);
  const [excelMatches, setExcelMatches] = useState<Array<{ studentId: number; rollNumber: string; studentName: string }>>([]);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelStats, setExcelStats] = useState<{ total: number; matched: number; unmatched: string[] }>({ total: 0, matched: 0, unmatched: [] });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [classId] = useState<number | null>(() => {
    if (!paramClassId) return null;
    const parsed = parseInt(paramClassId as string, 10);
    return Number.isFinite(parsed) ? parsed : null;
  });

  const presentStudents = records.filter((record) => record.final_status === 'present');
  const attendancePercentage = records.length > 0 ? Math.round((presentStudents.length / records.length) * 100) : 0;

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const data = await api.get<AttendanceRecord[]>(`/teachers/attendance/session/${id}/records`);
      setRecords(data);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchClassStudents = async () => {
    if (!classId) return;
    try {
      const data = await api.get<any[]>(`/teachers/classes/${classId}/students`);
      // Map to Student interface
      const mapped: Student[] = data.map(s => ({
        id: s.student_id,
        name: s.student_name,
        email: s.email,
        roll_number: s.roll_number,
      }));
      setAllAllStudents(mapped);
    } catch (error) {
      console.error('Error fetching class students:', error);
    }
  };

  useEffect(() => {
    if (id) fetchRecords();
  }, [id]);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        if (!id) return;
        const data = await api.get<any>(`/teachers/attendance/session/${id}`);
        // API returns session with original_image and annotated_image
        setSessionImages({ original: data.original_image ?? null, annotated: data.annotated_image ?? null });
      } catch (error) {
        console.error('Error fetching session info:', error);
      }
    };

    fetchSession();
  }, [id]);

  useEffect(() => {
    if (classId) {
      fetchClassStudents();
    }
  }, [classId]);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchRecords(), fetchClassStudents()]);
  };

  const goBackToSessions = () => {
    if (classId) {
      router.replace(`/(app)/(professor)/sessions?classId=${classId}`);
      return;
    }
    router.replace('/(app)/(professor)/sessions');
  };

  const resolveStudentInfo = (record: AttendanceRecord) => {
    const student = allStudents.find((item) => item.id === record.student_id);
    return {
      name: student?.name || record.student_name || `Student #${record.student_id}`,
      email: student?.email || record.student_email || 'No email',
      rollNumber: student?.roll_number || 'N/A',
    };
  };

  const updateAttendanceStatus = async (recordId: number, studentId: number, status: 'present' | 'absent') => {
    try {
      setProcessingId(recordId);
      
      const currentRecord = records.find(r => r.id === recordId);

      const isPendingLike = currentRecord?.final_status === 'pending_approval' || currentRecord?.final_status === 'manual_review';

      // For pending-like records, prefer dedicated code-submission endpoints.
      if (isPendingLike) {
        if (status === 'present') {
          await api.post(`/attendance/code-submissions/${recordId}/approve`);
        } else {
          await api.post(`/attendance/code-submissions/${recordId}/reject`, {
            reason: 'Rejected by professor from session details'
          });
        }
        fetchRecords();
        return;
      }

      // If it's pending_approval, we can use the approve endpoint in attendance.py
      // However, teacher.py has a generic override PATCH endpoint that works for any status
      // and is more robust for manual changes.
      await api.patch(`/teachers/attendance/session/${id}/override`, {
        student_id: studentId,
        final_status: status,
        reason: "Manual override by professor"
      });
      
      fetchRecords();
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to update attendance`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleManualMark = async (studentId: number) => {
    try {
      setLoading(true);
      // Using the override endpoint to mark as present
      await api.patch(`/teachers/attendance/session/${id}/override`, {
        student_id: studentId,
        final_status: 'present',
        reason: "Manual attendance marking"
      });
      
      Alert.alert('Success', 'Attendance marked manually');
      setManualModalVisible(false);
      fetchRecords();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const markAllPresent = async () => {
    const pendingCount = records.filter(r => r.final_status !== 'present').length;
    if (pendingCount === 0) {
      Alert.alert('Info', 'All students are already marked as present.');
      return;
    }

    Alert.alert(
      'Mark All Present',
      `Are you sure you want to mark all ${pendingCount} remaining students as present?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: async () => {
            try {
              setLoading(true);
              // Approve pending-like records through dedicated endpoint; override others.
              await Promise.all(
                records
                  .filter(r => r.final_status !== 'present')
                  .map((record) => {
                    if (record.final_status === 'pending_approval' || record.final_status === 'manual_review') {
                      return api.post(`/attendance/code-submissions/${record.id}/approve`);
                    }

                    return api.patch(`/teachers/attendance/session/${id}/override`, {
                      student_id: record.student_id,
                      final_status: 'present',
                      reason: "Bulk manual approval"
                    });
                  })
              );
              Alert.alert('Success', 'All students marked as present');
              fetchRecords();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to mark some students. Please refresh.');
              fetchRecords();
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handlePickExcelFile = async () => {
    // On web, use native file input; on native, show message
    if (Platform.OS === 'web') {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } else {
      Alert.alert(
        'Excel Upload Not Supported on Mobile',
        'Please use the web version to upload Excel files with student roll numbers. Mobile version will be updated soon.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle file selected via web input
  const handleFileSelected = async (event: any) => {
    try {
      setExcelLoading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = (e.target?.result as string)?.split(',')[1] || '';
          
          // Parse Excel
          const parsed = parseExcelForAttendance(base64, file.name);

          // Match with students
          const studentsForMatching = allStudents.map(s => ({
            id: s.id,
            name: s.name,
            roll_number: s.roll_number,
          }));

          const matches = matchRollNumbersWithStudents(parsed.rollNumbers, studentsForMatching);
          const unmatchedRolls = parsed.rollNumbers.filter(
            roll => !matches.some(m => m.rollNumber === roll)
          );

          setExcelMatches(matches);
          setExcelStats({
            total: parsed.rollNumbers.length,
            matched: matches.length,
            unmatched: unmatchedRolls,
          });

          setExcelUploadModalVisible(true);
          Alert.alert('Excel Loaded', `Found ${matches.length} matching students out of ${parsed.rollNumbers.length}`);
        } catch (parseError: any) {
          Alert.alert('Error', parseError.message || 'Failed to parse Excel file');
          console.error('Excel parse error:', parseError);
        } finally {
          setExcelLoading(false);
          // Reset file input so same file can be selected again
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process file');
      console.error('Excel upload error:', error);
      setExcelLoading(false);
    }
  };

  const handleConfirmExcelAttendance = async () => {
    if (excelMatches.length === 0) {
      Alert.alert('No Matches', 'No students matched from the Excel file.');
      return;
    }
    try {
      setExcelLoading(true);

      // Mark all matched students as present
      const results = await Promise.allSettled(
        excelMatches.map(match =>
          api.patch(`/teachers/attendance/session/${id}/override`, {
            student_id: match.studentId,
            final_status: 'present',
            reason: `Marked from Excel: ${match.rollNumber}`,
          })
        )
      );

      const succeeded = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - succeeded;

      if (succeeded > 0) {
        await fetchRecords();
      }

      if (failed > 0) {
        Alert.alert(
          'Partial Success',
          `${succeeded} students were marked as present. ${failed} update${failed === 1 ? ' failed' : 's failed'}.`
        );
      } else {
        Alert.alert('Success', `${excelMatches.length} students marked as present from Excel`);
      }

      setExcelUploadModalVisible(false);
      setExcelMatches([]);
      setExcelStats({ total: 0, matched: 0, unmatched: [] });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mark attendance from Excel');
    } finally {
      setExcelLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return <CheckCircle2 size={18} color={Colors.light.success} />;
      case 'absent': return <XCircle size={18} color={Colors.light.destructive} />;
      case 'pending_approval': return <Clock size={18} color="#F59E0B" />;
      case 'manual_review': return <AlertCircle size={18} color="#6366F1" />;
      default: return <AlertCircle size={18} color={Colors.light.mutedForeground} />;
    }
  };

  const filteredStudents = allStudents.filter(s => 
    (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     s.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
    !records.some(r => r.student_id === s.id && r.final_status === 'present')
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBackToSessions} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Session Details</Text>
          <Text style={styles.subtitle}>Session ID: {id}</Text>
        </View>
        <TouchableOpacity 
          style={styles.plusButton} 
          onPress={() => {
            if (!classId) {
               Alert.alert("Error", "Class ID missing. Cannot fetch student list.");
               return;
            }
            setExcelUploadModalVisible(true);
          }}
          disabled={excelLoading}
        >
          <FileUp size={24} color={excelLoading ? Colors.light.mutedForeground : Colors.light.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.plusButton} 
          onPress={() => {
            if (!classId) {
               Alert.alert("Error", "Class ID missing. Cannot fetch student list.");
               return;
            }
            setManualModalVisible(true);
          }}
        >
          <Plus size={24} color={Colors.light.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading && !refreshing && records.length === 0 ? (
          <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 40 }} />
        ) : records.length === 0 ? (
          <View style={styles.emptyContainer}>
            <User size={48} color={Colors.light.mutedForeground} />
            <Text style={styles.emptyTitle}>No Records Found</Text>
            <Text style={styles.emptySubtitle}>No attendance records for this session.</Text>
            <Button 
              variant="outline" 
              style={{ marginTop: 20 }}
              onPress={() => setManualModalVisible(true)}
            >
              Mark Manual Attendance
            </Button>
          </View>
        ) : (
          <View style={styles.recordsList}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{records.filter(r => r.final_status === 'present').length}</Text>
                <Text style={styles.summaryLabel}>Present</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{records.filter(r => r.final_status === 'absent').length}</Text>
                <Text style={styles.summaryLabel}>Absent</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{attendancePercentage}%</Text>
                <Text style={styles.summaryLabel}>Attendance</Text>
              </View>
              <View style={styles.summaryDivider} />
              <TouchableOpacity style={styles.summaryItem} onPress={markAllPresent}>
                <CheckCircle2 size={24} color={Colors.light.primary} />
                <Text style={[styles.summaryLabel, { color: Colors.light.primary, fontWeight: '700' }]}>Mark All</Text>
              </TouchableOpacity>
            </View>

            <Card style={styles.presentCard}>
              <CardHeader>
                <CardTitle>Present Students ({presentStudents.length})</CardTitle>
                <CardDescription>Students currently marked present for this session</CardDescription>
              </CardHeader>
              <CardContent>
                {presentStudents.length === 0 ? (
                  <Text style={styles.emptyTextSmall}>No students have been marked present yet.</Text>
                ) : (
                  presentStudents.map((record) => (
                    (() => {
                      const studentInfo = resolveStudentInfo(record);
                      return (
                        <View key={`present-${record.id}`} style={styles.presentItem}>
                          <CheckCircle2 size={16} color={Colors.light.success} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.presentName}>{studentInfo.name}</Text>
                            <Text style={styles.presentMeta}>{studentInfo.email}</Text>
                            <Text style={styles.presentMeta}>Roll No: {studentInfo.rollNumber}</Text>
                          </View>
                        </View>
                      );
                    })()
                  ))
                )}
              </CardContent>
            </Card>

            {/* Session images (original and annotated) */}
            {(sessionImages?.original || sessionImages?.annotated) && (
              <Card style={[styles.presentCard, { marginTop: 12 }]}>
                <CardHeader>
                  <CardTitle>Session Images</CardTitle>
                  <CardDescription>Original classroom photo and annotated result</CardDescription>
                </CardHeader>
                <CardContent>
                  <View style={styles.imageRow}>
                    {sessionImages.original ? (
                      <TouchableOpacity onPress={() => { setSelectedImage(sessionImages.original || null); setImageModalVisible(true); }} style={styles.imageContainer}>
                        <RNImage source={{ uri: sessionImages.original }} style={styles.imageThumb} />
                        <Text style={styles.imageLabel}>Original</Text>
                      </TouchableOpacity>
                    ) : null}

                    {sessionImages.annotated ? (
                      <TouchableOpacity onPress={() => { setSelectedImage(sessionImages.annotated || null); setImageModalVisible(true); }} style={styles.imageContainer}>
                        <RNImage source={{ uri: sessionImages.annotated }} style={styles.imageThumb} />
                        <Text style={styles.imageLabel}>Annotated</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </CardContent>
              </Card>
            )}

            {records.map((record) => {
              const studentInfo = resolveStudentInfo(record);
              return (
              <Card key={record.id} style={styles.recordCard}>
                <CardContent style={styles.recordContent}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{studentInfo.name}</Text>
                    <Text style={styles.studentEmail}>{studentInfo.email}</Text>
                    <Text style={styles.studentEmail}>Roll No: {studentInfo.rollNumber}</Text>
                    <View style={styles.verificationRow}>
                      <View style={[styles.vBadge, record.face_detected ? styles.vSuccess : styles.vEmpty]}>
                        <Text style={[styles.vText, record.face_detected ? styles.vSuccessText : styles.vEmptyText]}>Face</Text>
                      </View>
                      <View style={[styles.vBadge, record.qr_verified ? styles.vSuccess : styles.vEmpty]}>
                        <Text style={[styles.vText, record.qr_verified ? styles.vSuccessText : styles.vEmptyText]}>QR/Code</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.statusAction}>
                    <View style={styles.statusRow}>
                      {getStatusIcon(record.final_status)}
                      <Text style={[styles.statusText, { marginLeft: 6 }]}>
                        {record.final_status.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                    
                    <View style={styles.actionButtons}>
                      {record.final_status !== 'present' && (
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.approveBtn]}
                          onPress={() => updateAttendanceStatus(record.id, record.student_id, 'present')}
                          disabled={processingId === record.id}
                        >
                          {processingId === record.id ? <ActivityIndicator size="small" color="white" /> : <Check size={16} color="white" />}
                        </TouchableOpacity>
                      )}
                      {record.final_status !== 'absent' && (
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.rejectBtn]}
                          onPress={() => updateAttendanceStatus(record.id, record.student_id, 'absent')}
                          disabled={processingId === record.id}
                        >
                          <X size={16} color="white" />
                        </TouchableOpacity>
                      )}
                      {(record.final_status === 'present' || record.final_status === 'absent') && (
                        <TouchableOpacity 
                          style={[styles.actionBtn, styles.resetBtn]}
                          onPress={() => updateAttendanceStatus(record.id, record.student_id, record.final_status === 'present' ? 'absent' : 'present')}
                          disabled={processingId === record.id}
                        >
                          <RotateCcw size={14} color={Colors.light.text} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </CardContent>
              </Card>
            )})}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Manual Attendance Modal */}
      {/* Image Viewer Modal */}
      <Modal
        visible={imageModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={[styles.imageModalOverlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }] }>
          <TouchableOpacity onPress={() => setImageModalVisible(false)} style={styles.imageModalClose}>
            <X size={28} color="#FFF" />
          </TouchableOpacity>
          {selectedImage ? (
            <RNImage source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
      <Modal
        visible={manualModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setManualModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual Attendance</Text>
              <TouchableOpacity onPress={() => setManualModalVisible(false)}>
                <X size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Search size={20} color={Colors.light.mutedForeground} style={styles.searchIcon} />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
              />
            </View>

            {loading && allStudents.length === 0 ? (
              <ActivityIndicator size="small" color={Colors.light.primary} style={{ margin: 20 }} />
            ) : (
              <FlatList
                data={filteredStudents}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.studentItem}
                    onPress={() => handleManualMark(item.id)}
                  >
                    <View>
                      <Text style={styles.studentItemName}>{item.name}</Text>
                      <Text style={styles.studentItemEmail}>{item.email}</Text>
                    </View>
                    <CheckCircle2 size={20} color={Colors.light.primary} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptySearch}>No students found to mark</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Excel Upload Modal */}
      <Modal
        visible={excelUploadModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setExcelUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Excel</Text>
              <TouchableOpacity onPress={() => setExcelUploadModalVisible(false)}>
                <X size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            {excelMatches.length === 0 && !excelLoading ? (
              <View style={styles.excelEmptyContainer}>
                <FileUp size={48} color={Colors.light.mutedForeground} />
                <Text style={styles.excelEmptyTitle}>No Excel Data Loaded</Text>
                <Text style={styles.excelEmptySubtitle}>Upload an Excel file with roll numbers to mark attendance</Text>
                <Button
                  onPress={handlePickExcelFile}
                  disabled={excelLoading}
                  style={{ marginTop: 20 }}
                >
                  {excelLoading ? 'Loading...' : 'Choose Excel File'}
                </Button>
              </View>
            ) : excelLoading ? (
              <View style={styles.excelLoadingContainer}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
                <Text style={styles.excelLoadingText}>Processing Excel...</Text>
              </View>
            ) : (
              <ScrollView style={styles.excelModalContent}>
                <View style={styles.excelStatsContainer}>
                  <View style={styles.excelStatItem}>
                    <Text style={styles.excelStatValue}>{excelStats.total}</Text>
                    <Text style={styles.excelStatLabel}>Total in Excel</Text>
                  </View>
                  <View style={styles.excelStatItem}>
                    <Text style={[styles.excelStatValue, { color: Colors.light.success }]}>{excelStats.matched}</Text>
                    <Text style={styles.excelStatLabel}>Matched</Text>
                  </View>
                  <View style={styles.excelStatItem}>
                    <Text style={[styles.excelStatValue, { color: Colors.light.destructive }]}>{excelStats.unmatched.length}</Text>
                    <Text style={styles.excelStatLabel}>Unmatched</Text>
                  </View>
                </View>

                <Text style={styles.excelSectionTitle}>Matched Students</Text>
                {excelMatches.length > 0 ? (
                  <View style={styles.excelMatchesList}>
                    {excelMatches.map((match, idx) => (
                      <View key={idx} style={styles.excelMatchItem}>
                        <View style={styles.excelMatchInfo}>
                          <Text style={styles.excelMatchName}>{match.studentName}</Text>
                          <Text style={styles.excelMatchRoll}>Roll: {match.rollNumber}</Text>
                        </View>
                        <CheckCircle2 size={20} color={Colors.light.success} />
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.excelEmptySearch}>No matched students</Text>
                )}

                {excelStats.unmatched.length > 0 && (
                  <>
                    <Text style={styles.excelSectionTitle}>Unmatched Roll Numbers</Text>
                    <View style={styles.excelUnmatchedList}>
                      {excelStats.unmatched.map((roll, idx) => (
                        <View key={idx} style={styles.excelUnmatchedItem}>
                          <Text style={styles.excelUnmatchedText}>{roll}</Text>
                          <XCircle size={16} color={Colors.light.destructive} />
                        </View>
                      ))}
                    </View>
                  </>
                )}

                <View style={styles.excelButtonContainer}>
                  <Button
                    onPress={handlePickExcelFile}
                    variant="outline"
                    style={{ flex: 1 }}
                  >
                    Choose Different File
                  </Button>
                  <Button
                    onPress={handleConfirmExcelAttendance}
                    style={{ flex: 1 }}
                    disabled={excelMatches.length === 0}
                  >
                    Mark {excelMatches.length} as Present
                  </Button>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Hidden file input for web-based Excel upload */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef as any}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelected}
          style={{ display: 'none' }}
        />
      )}
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
  plusButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.light.border,
  },
  presentCard: {
    borderRadius: 16,
    marginBottom: 8,
  },
  presentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  presentName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  presentMeta: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    marginTop: 2,
  },
  emptyTextSmall: {
    color: Colors.light.mutedForeground,
    fontSize: 13,
  },
  recordsList: {
    gap: 12,
  },
  recordCard: {
    borderRadius: 12,
  },
  recordContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
  },
  studentEmail: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    marginTop: 2,
  },
  verificationRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6,
  },
  vBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  vSuccess: {
    backgroundColor: Colors.light.success + '1A',
    borderColor: Colors.light.success + '40',
  },
  vEmpty: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.border,
  },
  vText: {
    fontSize: 10,
    fontWeight: '600',
  },
  vSuccessText: {
    color: Colors.light.success,
  },
  vEmptyText: {
    color: Colors.light.mutedForeground,
  },
  statusAction: {
    alignItems: 'flex-end',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: Colors.light.success,
  },
  rejectBtn: {
    backgroundColor: Colors.light.destructive,
  },
  resetBtn: {
    backgroundColor: Colors.light.accent,
    borderWidth: 1,
    borderColor: Colors.light.border,
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
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  studentItemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  studentItemEmail: {
    fontSize: 13,
    color: Colors.light.mutedForeground,
  },
  emptySearch: {
    textAlign: 'center',
    color: Colors.light.mutedForeground,
    marginTop: 20,
  }
  ,
  imageRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 6,
  },
  imageContainer: {
    alignItems: 'center',
    width: 140,
  },
  imageThumb: {
    width: 140,
    height: 100,
    borderRadius: 8,
    backgroundColor: Colors.light.accent,
  },
  imageLabel: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.light.mutedForeground,
    fontWeight: '600',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
  },
  fullImage: {
    width: '100%',
    flex: 1,
    alignSelf: 'stretch',
  },
  imageModalClose: {
    position: 'absolute',
    top: 12,
    right: 20,
    zIndex: 20,
  },
  excelEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  excelEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 16,
  },
  excelEmptySubtitle: {
    fontSize: 14,
    color: Colors.light.mutedForeground,
    marginTop: 8,
    textAlign: 'center',
  },
  excelLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  excelLoadingText: {
    marginTop: 12,
    color: Colors.light.mutedForeground,
    fontSize: 14,
  },
  excelModalContent: {
    flex: 1,
    padding: 16,
  },
  excelStatsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  excelStatItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
  },
  excelStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  excelStatLabel: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    marginTop: 4,
  },
  excelSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
    marginTop: 16,
  },
  excelMatchesList: {
    gap: 8,
    marginBottom: 16,
  },
  excelMatchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: Colors.light.accent,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.success,
  },
  excelMatchInfo: {
    flex: 1,
  },
  excelMatchName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  excelMatchRoll: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    marginTop: 4,
  },
  excelUnmatchedList: {
    gap: 8,
    marginBottom: 16,
  },
  excelUnmatchedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: Colors.light.accent,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.destructive,
  },
  excelUnmatchedText: {
    fontSize: 13,
    color: Colors.light.text,
    fontWeight: '500',
  },
  excelEmptySearch: {
    textAlign: 'center',
    color: Colors.light.mutedForeground,
    marginVertical: 20,
  },
  excelButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  }
});
