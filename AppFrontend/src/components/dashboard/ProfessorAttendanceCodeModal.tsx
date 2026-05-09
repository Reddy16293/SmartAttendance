import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Clipboard, Platform } from 'react-native';
import { Copy, Check, Clock, Users, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../ui/Button';
import { Colors } from '../../constants/Colors';
import { config } from '../../config';

interface ProfessorAttendanceCodeModalProps {
  visible: boolean;
  onClose: () => void;
  classId: number;
  className: string;
  faceRecognitionEnabled?: boolean;
}

interface AttendanceSession {
  id: number;
  attendance_code: string;
  code_expires_at: string;
  status: string;
}

export function ProfessorAttendanceCodeModal({
  visible,
  onClose,
  classId,
  className,
  faceRecognitionEnabled = false,
}: ProfessorAttendanceCodeModalProps) {
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateCode = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(
        `${config.apiUrl}/attendance/session/create-with-code?class_id=${classId}&face_recognition_enabled=${faceRecognitionEnabled}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const error = await res.json();
        alert(error.detail || 'Failed to generate attendance code');
        return;
      }

      const data = await res.json();
      setSession(data);
    } catch (error) {
      console.error('Failed to generate code:', error);
      alert('Failed to generate attendance code');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (session?.attendance_code) {
      Clipboard.setString(session.attendance_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const disconnectSession = async () => {
    if (!session) return;

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(
        `${config.apiUrl}/attendance/session/${session.id}/disconnect`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const error = await res.json();
        alert(error.detail || 'Failed to disconnect session');
        return;
      }

      setSession(null);
      alert('Session disconnected. You can now create a new session.');
    } catch (error) {
      console.error('Failed to disconnect session:', error);
      alert('Failed to disconnect session');
    } finally {
      setLoading(false);
    }
  };

  const formatExpiryTime = (expiry: string) => {
    const expiryDate = new Date(expiry);
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 0) return 'Expired';
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Attendance Code</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.light.mutedForeground} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDescription}>
            Generate a code for students to mark their attendance for {className}
          </Text>

          {!session ? (
            <View style={styles.initialState}>
              <Users size={64} color={Colors.light.mutedForeground} style={styles.icon} opacity={0.3} />
              <Text style={styles.initialText}>
                Generate an attendance code for this class session
              </Text>
              <Button onPress={generateCode} isLoading={loading}>
                Generate Code
              </Button>
            </View>
          ) : (
            <View style={styles.sessionState}>
              <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>Attendance Code</Text>
                <View style={styles.codeRow}>
                  <Text style={styles.codeText}>{session.attendance_code}</Text>
                  <TouchableOpacity onPress={copyCode} style={styles.copyButton}>
                    {copied ? (
                      <Check size={20} color={Colors.light.primary} />
                    ) : (
                      <Copy size={20} color={Colors.light.mutedForeground} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.expiryRow}>
                <Clock size={16} color={Colors.light.mutedForeground} />
                <Text style={styles.expiryText}>
                  Expires in {formatExpiryTime(session.code_expires_at)}
                </Text>
              </View>

              <View style={styles.instructions}>
                <Text style={styles.instructionTitle}>Instructions for Students:</Text>
                <Text style={styles.instructionItem}>1. Go to Student Dashboard</Text>
                <Text style={styles.instructionItem}>2. Click "Enter Attendance Code"</Text>
                <Text style={styles.instructionItem}>3. Enter the 6-digit code: {session.attendance_code}</Text>
                <Text style={styles.instructionItem}>4. Submit to mark attendance</Text>
              </View>

              <View style={styles.actions}>
                <Button variant="outline" onPress={copyCode} style={styles.actionButton}>
                  <Copy size={18} color={Colors.light.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.actionButtonText}>Copy Code</Text>
                </Button>
                <Button onPress={generateCode} style={styles.actionButton} isLoading={loading}>
                  Generate New
                </Button>
              </View>

              <Button
                variant="destructive"
                onPress={disconnectSession}
                isLoading={loading}
                style={{ marginTop: 12 }}
              >
                Disconnect Session
              </Button>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.light.mutedForeground,
    marginBottom: 24,
  },
  initialState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  icon: {
    marginBottom: 16,
  },
  initialText: {
    textAlign: 'center',
    color: Colors.light.mutedForeground,
    marginBottom: 24,
    fontSize: 14,
  },
  sessionState: {
    width: '100%',
  },
  codeContainer: {
    backgroundColor: Colors.light.accent,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.light.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 4,
  },
  copyButton: {
    marginLeft: 12,
    padding: 8,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  expiryText: {
    fontSize: 14,
    color: Colors.light.mutedForeground,
  },
  instructions: {
    backgroundColor: Colors.light.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 8,
  },
  instructionItem: {
    fontSize: 13,
    color: Colors.light.mutedForeground,
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  actionButtonText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
