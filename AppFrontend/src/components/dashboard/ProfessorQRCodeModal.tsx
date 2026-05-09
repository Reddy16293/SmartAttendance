import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { QrCode, Clock, Users, X, RefreshCw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../ui/Button';
import { Colors } from '../../constants/Colors';
import { config } from '../../config';

interface ProfessorQRCodeModalProps {
  visible: boolean;
  onClose: () => void;
  classId: number;
  className: string;
  faceRecognitionEnabled?: boolean;
}

interface QRCodeSession {
  success: boolean;
  message: string;
  session_id: number;
  qr_code_data: string;
  qr_code_image: string; // Base64 encoded PNG
  expires_at: string;
}

export function ProfessorQRCodeModal({
  visible,
  onClose,
  classId,
  className,
  faceRecognitionEnabled = false,
}: ProfessorQRCodeModalProps) {
  const [session, setSession] = useState<QRCodeSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      
      const res = await fetch(
        `${config.apiUrl}/attendance/session/generate-qr-code?class_id=${classId}&face_recognition_enabled=${faceRecognitionEnabled}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const error = await res.json();
        alert(error.detail || 'Failed to generate QR code');
        return;
      }

      const data = await res.json();
      setSession(data);
      
      const expiryDate = new Date(data.expires_at + 'Z');
      const now = new Date();
      const diff = expiryDate.getTime() - now.getTime();
      setTimeLeft(Math.floor(diff / 1000));
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      alert('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session, timeLeft]);

  useEffect(() => {
    if (visible && !session) {
      generateQRCode();
    }
    if (!visible) {
      setSession(null);
      setTimeLeft(0);
    }
  }, [visible]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpiringSoon = timeLeft > 0 && timeLeft <= 30;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Attendance QR Code</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.light.mutedForeground} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDescription}>
            Scan this QR code to mark attendance for {className}
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.light.primary} />
              <Text style={styles.loadingText}>Generating QR Code...</Text>
            </View>
          ) : session && timeLeft > 0 ? (
            <View style={styles.content}>
              <View style={styles.qrContainer}>
                <Image
                  source={{ uri: `data:image/png;base64,${session.qr_code_image}` }}
                  style={styles.qrImage}
                  resizeMode="contain"
                />
              </View>

              <View style={[styles.timerContainer, isExpiringSoon && styles.timerExpiring]}>
                <Clock size={20} color={isExpiringSoon ? Colors.light.destructive : Colors.light.primary} />
                <Text style={[styles.timerText, isExpiringSoon && styles.timerTextExpiring]}>
                  Expires in {formatTime(timeLeft)}
                </Text>
              </View>

              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${(timeLeft / 180) * 100}%` },
                    isExpiringSoon && { backgroundColor: Colors.light.destructive }
                  ]} 
                />
              </View>

              <View style={styles.instructions}>
                <Text style={styles.instructionTitle}>Instructions for Students:</Text>
                <Text style={styles.instructionItem}>1. Open the Attendance App</Text>
                <Text style={styles.instructionItem}>2. Click "Scan QR Code"</Text>
                <Text style={styles.instructionItem}>3. Point camera at this QR code</Text>
              </View>

              <Button onPress={generateQRCode} variant="outline" style={styles.refreshButton}>
                <RefreshCw size={18} color={Colors.light.primary} style={{ marginRight: 8 }} />
                <Text style={styles.refreshButtonText}>Generate New QR</Text>
              </Button>
            </View>
          ) : (
            <View style={styles.expiredContainer}>
              <Clock size={48} color={Colors.light.destructive} opacity={0.5} />
              <Text style={styles.expiredText}>QR Code Expired</Text>
              <Button onPress={generateQRCode}>Generate New QR Code</Button>
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
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  content: {
    alignItems: 'center',
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.light.accent,
    marginBottom: 20,
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  timerExpiring: {
    // animation handled by reanimated if needed, keeping it simple for now
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  timerTextExpiring: {
    color: Colors.light.destructive,
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.light.accent,
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
  },
  instructions: {
    width: '100%',
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
  refreshButton: {
    width: '100%',
  },
  refreshButtonText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  expiredContainer: {
    padding: 20,
    alignItems: 'center',
    gap: 16,
  },
  expiredText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.destructive,
    marginBottom: 8,
  },
});
