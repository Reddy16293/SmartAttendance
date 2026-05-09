import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Camera, Hash, QrCode, Users, Settings, CheckCircle2, AlertCircle, Clock, Info } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '../../../src/config';
import { Colors } from '../../../src/constants/Colors';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../src/components/ui/Card';
import { Button } from '../../../src/components/ui/Button';
import { ProfessorAttendanceCodeModal } from '../../../src/components/dashboard/ProfessorAttendanceCodeModal';
import { ProfessorQRCodeModal } from '../../../src/components/dashboard/ProfessorQRCodeModal';
import { ProfessorFaceRecognitionModal } from '../../../src/components/dashboard/ProfessorFaceRecognitionModal';
import { resolveClassSubjectCode, resolveClassSubjectName, normalizeId } from '../../../src/utils/classLabels';

interface AttendanceSettings {
  faceRecognitionEnabled: boolean;
  codeQrEnabled: boolean;
  useQRCode: boolean; // true = QR, false = Code
}

interface ActiveSessionInfo {
  id: number;
  class_id: number;
  status: string;
  created_at: string;
  expires_at: string;
  remaining_seconds: number;
  face_recognition_enabled: boolean;
  has_code: boolean;
  has_qr: boolean;
}

export default function ProfessorCaptureScreen() {
  const router = useRouter();
  const { classId } = useLocalSearchParams<{ classId?: string }>();
  const selectedClassId = Array.isArray(classId) ? classId[0] : classId;
  
  const [settings, setSettings] = useState<AttendanceSettings>({
    faceRecognitionEnabled: false,
    codeQrEnabled: true,
    useQRCode: false,
  });
  
  const [classInfo, setClassInfo] = useState<any>(null);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [faceModalVisible, setFaceModalVisible] = useState(false);
  
  const [activeSession, setActiveSession] = useState<ActiveSessionInfo | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      
      // Fetch classes and subjects to ensure subject names are always available.
      const [classesRes, subjectsRes] = await Promise.all([
        fetch(`${config.apiUrl}/teachers/classes`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${config.apiUrl}/teachers/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (classesRes.ok) {
        const classes = await classesRes.json();
        const subjects = subjectsRes.ok ? await subjectsRes.json() : [];
        const subjectById = new Map((subjects || []).map((s: any) => [Number(s.id), s]));

        const normalizedClasses = (classes || []).map((cls: any) => {
          const subjectName = resolveClassSubjectName(cls, subjectById);

          return {
            ...cls,
            subject_name: subjectName,
            subject_code: resolveClassSubjectCode(cls, subjectById),
          };
        });

        setAllClasses(normalizedClasses);

        if (selectedClassId) {
          const currentClass = normalizedClasses.find((c: any) => c.id === parseInt(selectedClassId, 10));
          setClassInfo(currentClass || null);
        }
      }
      
      if (selectedClassId) {
        await fetchActiveSession(selectedClassId);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchActiveSession = async (cid: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${config.apiUrl}/attendance/class/${cid}/active-session`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setActiveSession(null);
        setRemainingSeconds(0);
        return;
      }

      const data = await res.json();
      if (data.has_active_session && data.session) {
        setActiveSession(data.session);
        setRemainingSeconds(data.session.remaining_seconds || 0);
      } else {
        setActiveSession(null);
        setRemainingSeconds(0);
      }
    } catch (error) {
      console.error('Failed to fetch active session:', error);
      setActiveSession(null);
      setRemainingSeconds(0);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedClassId]);

  useEffect(() => {
    if (!activeSession) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (selectedClassId) fetchActiveSession(selectedClassId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, selectedClassId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleMethodToggle = (useQR: boolean) => {
    setSettings(prev => ({ ...prev, useQRCode: useQR }));
  };

  const formatSessionTime = (seconds: number) => {
    if (seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const disconnectActiveSession = async () => {
    if (!activeSession) return;

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${config.apiUrl}/attendance/session/${activeSession.id}/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to disconnect session');
      }

      Alert.alert('Success', 'Session disconnected.');
      if (classId) fetchActiveSession(classId);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const startNewSession = async () => {
    if (activeSession) {
      await disconnectActiveSession();
    }

    if (settings.faceRecognitionEnabled && !settings.codeQrEnabled) {
      setFaceModalVisible(true);
      return;
    }

    if (settings.codeQrEnabled) {
      if (settings.useQRCode) {
        setQrModalVisible(true);
      } else {
        setCodeModalVisible(true);
      }
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  // If no class selected, show class selector
  if (!selectedClassId) {
    return (
      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Take Attendance</Text>
          <Text style={styles.subtitle}>Select a class to configure attendance</Text>
        </View>

        <View style={styles.content}>
          <Card>
            <CardHeader>
              <CardTitle style={styles.cardTitleWithIcon}>
                <Users size={20} color={Colors.light.primary} style={{ marginRight: 8 }} />
                Select Your Class
              </CardTitle>
              <CardDescription>Choose a class to configure attendance settings</CardDescription>
            </CardHeader>
            <CardContent>
              {allClasses.length > 0 ? (
                <View style={styles.classGrid}>
                  {allClasses.map((cls: any) => (
                    <TouchableOpacity
                      key={cls.id}
                      onPress={() => router.setParams({ classId: cls.id.toString() })}
                      style={styles.classSelectorItem}
                    >
                      <Text style={styles.classSelectorName}>{resolveClassSubjectName(cls)}</Text>
                      <Text style={styles.classSelectorMeta}>
                        Year {cls.year} • Section {cls.section}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No classes found. Create a class first.</Text>
              )}
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Take Attendance</Text>
          <Text style={styles.subtitle}>
            {classInfo ? `${resolveClassSubjectName(classInfo)} • Y${classInfo.year} S${classInfo.section}` : 'Loading...'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Settings Card */}
        <Card style={styles.settingsCard}>
          <CardHeader>
            <CardTitle style={styles.cardTitleWithIcon}>
              <Settings size={20} color={Colors.light.primary} style={{ marginRight: 8 }} />
              Methods
            </CardTitle>
          </CardHeader>
          <CardContent style={styles.settingsContent}>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Facial Recognition</Text>
                <Text style={styles.settingDesc}>Capture classroom photo for AI verification</Text>
              </View>
              <Switch
                value={settings.faceRecognitionEnabled}
                onValueChange={(val) => setSettings(s => ({ ...s, faceRecognitionEnabled: val }))}
                trackColor={{ false: '#767577', true: Colors.light.primary }}
              />
            </View>

            {settings.faceRecognitionEnabled && (
              <View style={styles.dualInfoBox}>
                <Info size={16} color="#2563EB" style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.dualInfoTitle}>Dual Verification Mode</Text>
                  <Text style={styles.dualInfoText}>• Both verified → Marked Present</Text>
                  <Text style={styles.dualInfoText}>• Only one verified → Pending Review</Text>
                </View>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Code or QR Verification</Text>
                <Text style={styles.settingDesc}>Allow students to verify via code or QR</Text>
              </View>
              <Switch
                value={settings.codeQrEnabled}
                onValueChange={(val) => setSettings(s => ({ ...s, codeQrEnabled: val }))}
                trackColor={{ false: '#767577', true: Colors.light.primary }}
              />
            </View>

            {settings.codeQrEnabled && (
              <View style={styles.methodToggleGrid}>
                <TouchableOpacity
                  onPress={() => handleMethodToggle(false)}
                  style={[styles.methodBtn, !settings.useQRCode && styles.methodBtnActive]}
                >
                  <Hash size={20} color={!settings.useQRCode ? Colors.light.primary : Colors.light.mutedForeground} />
                  <Text style={[styles.methodBtnText, !settings.useQRCode && styles.methodBtnTextActive]}>Numeric Code</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleMethodToggle(true)}
                  style={[styles.methodBtn, settings.useQRCode && styles.methodBtnActive]}
                >
                  <QrCode size={20} color={settings.useQRCode ? Colors.light.primary : Colors.light.mutedForeground} />
                  <Text style={[styles.methodBtnText, settings.useQRCode && styles.methodBtnTextActive]}>QR Code</Text>
                </TouchableOpacity>
              </View>
            )}
          </CardContent>
        </Card>

        {/* Active Session Status */}
        {activeSession ? (
          <Card style={styles.activeSessionCard}>
            <CardHeader>
              <CardTitle style={styles.cardTitleWithIcon}>
                <Clock size={20} color={Colors.light.primary} style={{ marginRight: 8 }} />
                Active Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              <View style={styles.timerBox}>
                <Text style={styles.timerLabel}>Remaining before auto-close</Text>
                <Text style={styles.timerValue}>{formatSessionTime(remainingSeconds)}</Text>
              </View>
              <View style={styles.activeSessionActions}>
                <Button variant="destructive" onPress={disconnectActiveSession} style={{ flex: 1, marginRight: 8 }}>
                  End Session
                </Button>
                <Button variant="outline" onPress={startNewSession} style={{ flex: 1 }}>
                  Restart
                </Button>
              </View>

              {activeSession.face_recognition_enabled && (
                <Button
                  variant="outline"
                  onPress={() => setFaceModalVisible(true)}
                  style={{ marginTop: 12 }}
                >
                  <Camera size={16} color={Colors.light.primary} style={{ marginRight: 8 }} />
                  <Text style={{ color: Colors.light.primary, fontWeight: '600' }}>Take or Upload Classroom Image</Text>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* Start Button */}
        <View style={styles.actionContainer}>
          <Button 
            onPress={startNewSession} 
            size="lg"
            style={styles.startBtn}
            disabled={!settings.faceRecognitionEnabled && !settings.codeQrEnabled}
          >
            {settings.faceRecognitionEnabled && (
              <Camera size={20} color="#FFF" style={{ marginRight: 10 }} />
            )}
            <Text style={styles.startBtnText}>
              {activeSession ? 'Update Current Session' : 'Start Attendance Session'}
            </Text>
          </Button>
          
          {!settings.faceRecognitionEnabled && !settings.codeQrEnabled && (
            <Text style={styles.warningText}>Select at least one verification method</Text>
          )}
        </View>
      </View>

      {/* Modals */}
      {classInfo && (
        <>
          <ProfessorAttendanceCodeModal
            visible={codeModalVisible}
            onClose={() => {
              setCodeModalVisible(false);
              if (selectedClassId) fetchActiveSession(selectedClassId);
            }}
            classId={classInfo.id}
            className={`${resolveClassSubjectName(classInfo)} - Y${classInfo.year}`}
            faceRecognitionEnabled={settings.faceRecognitionEnabled}
          />
          <ProfessorQRCodeModal
            visible={qrModalVisible}
            onClose={() => {
              setQrModalVisible(false);
              if (selectedClassId) fetchActiveSession(selectedClassId);
            }}
            classId={classInfo.id}
            className={`${resolveClassSubjectName(classInfo)} - Y${classInfo.year}`}
            faceRecognitionEnabled={settings.faceRecognitionEnabled}
          />
          <ProfessorFaceRecognitionModal
            visible={faceModalVisible}
            onClose={() => {
              setFaceModalVisible(false);
              if (selectedClassId) fetchActiveSession(selectedClassId);
            }}
            classId={classInfo.id}
            className={`${resolveClassSubjectName(classInfo)} - Y${classInfo.year}`}
            existingSessionId={activeSession?.id || null}
          />
        </>
      )}

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
    fontSize: 22,
    fontWeight: '700',
    color: Colors.light.text,
  },
  subtitle: {
    marginTop: 2,
    color: Colors.light.mutedForeground,
    fontSize: 14,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  cardTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classGrid: {
    gap: 12,
  },
  classSelectorItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.accent,
  },
  classSelectorName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  classSelectorMeta: {
    fontSize: 13,
    color: Colors.light.mutedForeground,
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.light.mutedForeground,
    paddingVertical: 20,
  },
  settingsCard: {
    borderRadius: 16,
  },
  settingsContent: {
    gap: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  settingDesc: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
  },
  dualInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  dualInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  dualInfoText: {
    fontSize: 12,
    color: '#1E40AF',
  },
  methodToggleGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  methodBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: 'center',
    gap: 8,
  },
  methodBtnActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.primary + '0D',
  },
  methodBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.mutedForeground,
  },
  methodBtnTextActive: {
    color: Colors.light.primary,
  },
  activeSessionCard: {
    backgroundColor: Colors.light.primary + '05',
    borderColor: Colors.light.primary + '20',
  },
  timerBox: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 16,
  },
  timerLabel: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    marginBottom: 4,
  },
  timerValue: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  activeSessionActions: {
    flexDirection: 'row',
  },
  actionContainer: {
    marginTop: 8,
    gap: 8,
  },
  startBtn: {
    height: 56,
    borderRadius: 16,
  },
  startBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  warningText: {
    textAlign: 'center',
    color: Colors.light.destructive,
    fontSize: 12,
    fontWeight: '600',
  }
});
