import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { QrCode, X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../ui/Button';
import { Colors } from '../../constants/Colors';
import { config } from '../../config';

interface StudentQRCodeScanModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function StudentQRCodeScanModal({
  visible,
  onClose,
  onSuccess,
}: StudentQRCodeScanModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (visible && !permission) {
      requestPermission();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setScanned(false);
      setResult(null);
      setLoading(false);
    }
  }, [visible]);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${config.apiUrl}/attendance/submit-qr-code`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qr_code_data: data }),
      });

      const responseData = await res.json();
      setResult({
        success: responseData.success,
        message: responseData.message,
      });

      if (responseData.success) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to submit QR code:', error);
      setResult({
        success: false,
        message: 'Failed to process QR code',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return null;
  }

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
            <Text style={styles.modalTitle}>Scan QR Code</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.light.mutedForeground} />
            </TouchableOpacity>
          </View>

          {!permission.granted ? (
            <View style={styles.permissionContainer}>
              <AlertCircle size={48} color={Colors.light.destructive} />
              <Text style={styles.permissionText}>Camera permission is required</Text>
              <Button onPress={requestPermission}>Grant Permission</Button>
            </View>
          ) : result ? (
            <View style={styles.resultContainer}>
              {result.success ? (
                <CheckCircle2 size={64} color={Colors.light.success} />
              ) : (
                <AlertCircle size={64} color={Colors.light.destructive} />
              )}
              <Text style={[
                styles.resultTitle,
                { color: result.success ? Colors.light.success : Colors.light.destructive }
              ]}>
                {result.success ? 'Success!' : 'Failed'}
              </Text>
              <Text style={styles.resultMessage}>{result.message}</Text>
              {!result.success && (
                <Button 
                  variant="outline" 
                  onPress={() => {
                    setResult(null);
                    setScanned(false);
                  }}
                  style={{ marginTop: 20 }}
                >
                  Try Again
                </Button>
              )}
            </View>
          ) : (
            <View style={styles.scannerContainer}>
              <View style={styles.cameraWrapper}>
                <CameraView
                  style={styles.camera}
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                  }}
                />
                <View style={styles.overlay}>
                  <View style={styles.scanFrame} />
                </View>
              </View>
              <Text style={styles.hint}>
                Point your camera at the QR code displayed by your professor
              </Text>
              {loading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={Colors.light.primary} />
                  <Text style={styles.loadingText}>Processing...</Text>
                </View>
              )}
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
    maxHeight: '80%',
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 4,
  },
  permissionContainer: {
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    marginVertical: 16,
    textAlign: 'center',
    color: Colors.light.mutedForeground,
  },
  scannerContainer: {
    alignItems: 'center',
  },
  cameraWrapper: {
    width: 250,
    height: 250,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scanFrame: {
    width: 180,
    height: 180,
    borderWidth: 2,
    borderColor: '#FFF',
    borderRadius: 12,
  },
  hint: {
    marginTop: 20,
    textAlign: 'center',
    color: Colors.light.mutedForeground,
    fontSize: 14,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  resultContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
  },
  resultMessage: {
    fontSize: 16,
    color: Colors.light.mutedForeground,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
  },
});
