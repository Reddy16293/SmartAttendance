import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { CheckCircle2, AlertCircle, X, Hash } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../ui/Button';
import { Colors } from '../../constants/Colors';
import { config } from '../../config';

interface StudentAttendanceCodeModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StudentAttendanceCodeModal({
  visible,
  onClose,
  onSuccess,
}: StudentAttendanceCodeModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async () => {
    if (code.length !== 6) {
      alert('Attendance code must be 6 digits');
      return;
    }

    try {
      Keyboard.dismiss();
      setLoading(true);
      setResult(null);
      const token = await AsyncStorage.getItem('auth_token');
      
      const res = await fetch(`${config.apiUrl}/attendance/submit-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();
      setResult(data);

      if (data.success) {
        setTimeout(() => {
          handleClose();
          onSuccess?.();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to submit code:', error);
      setResult({
        success: false,
        message: 'Failed to submit attendance code',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setCode('');
    setResult(null);
  };

  const handleCodeChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setCode(cleaned);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.centeredView}
      >
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Enter Attendance Code</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={Colors.light.mutedForeground} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDescription}>
            Enter the 6-digit attendance code provided by your professor
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={handleCodeChange}
              placeholder="000000"
              keyboardType="numeric"
              maxLength={6}
              editable={!loading}
              autoFocus
            />
            <Text style={styles.inputHint}>6-digit code</Text>
          </View>

          <View style={styles.resultSlot}>
            {result && (
              <View
                style={[
                  styles.resultContainer,
                  result.success ? styles.successResult : styles.errorResult
                ]}
              >
                {result.success ? (
                  <CheckCircle2 size={20} color={Colors.light.success} style={styles.resultIcon} />
                ) : (
                  <AlertCircle size={20} color={Colors.light.destructive} style={styles.resultIcon} />
                )}
                <View style={styles.resultTextContainer}>
                  <Text style={[styles.resultTitle, result.success ? styles.successText : styles.errorText]}>
                    {result.success ? 'Attendance Marked' : 'Failed'}
                  </Text>
                  <Text style={styles.resultMessage}>{result.message}</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <Button
              variant="outline"
              onPress={handleClose}
              style={styles.actionButton}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onPress={handleSubmit} 
              style={styles.actionButton} 
              isLoading={loading}
              disabled={code.length !== 6}
            >
              Submit
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  inputContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  codeInput: {
    fontSize: 40,
    fontWeight: '700',
    color: Colors.light.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 10,
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.primary,
    width: '100%',
    textAlign: 'center',
    paddingVertical: 10,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    marginTop: 8,
  },
  resultSlot: {
    minHeight: 92,
    marginBottom: 24,
  },
  resultContainer: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  successResult: {
    backgroundColor: Colors.light.success + '1A',
    borderColor: Colors.light.success + '33',
  },
  errorResult: {
    backgroundColor: Colors.light.destructive + '1A',
    borderColor: Colors.light.destructive + '33',
  },
  resultIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  successText: {
    color: Colors.light.success,
  },
  errorText: {
    color: Colors.light.destructive,
  },
  resultMessage: {
    fontSize: 13,
    color: Colors.light.mutedForeground,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
