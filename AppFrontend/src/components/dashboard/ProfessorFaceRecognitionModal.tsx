import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert, Image as RNImage, Platform } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Camera as CameraIcon, X, AlertCircle, Upload } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../ui/Button';
import { Colors } from '../../constants/Colors';
import { config } from '../../config';

interface ProfessorFaceRecognitionModalProps {
  visible: boolean;
  onClose: () => void;
  classId: number;
  className: string;
  existingSessionId?: number | null;
}

type SelectedImage = {
  uri: string;
  fileName?: string;
  mimeType?: string;
};

export function ProfessorFaceRecognitionModal({
  visible,
  onClose,
  classId,
  className,
  existingSessionId = null,
}: ProfessorFaceRecognitionModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<{
    updatedRecords: number;
    recognizedStudents: Array<{ name: string; confidence: number }>;
    annotatedImage: string | null;
  } | null>(null);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (visible && !permission) {
      requestPermission();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setSessionId(existingSessionId);
    } else {
      setCapturedImage(null);
      setSelectedImage(null);
      setIsCapturing(false);
      setLoading(false);
      setSessionId(existingSessionId);
      setRecognitionResult(null);
    }
  }, [visible, existingSessionId]);

  const createSessionIfNeeded = async (): Promise<number | null> => {
    if (sessionId) return sessionId;

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');
      const res = await fetch(`${config.apiUrl}/attendance/session/create-with-code?class_id=${classId}&face_recognition_enabled=true&generate_code=false`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to create session');
      }

      const data = await res.json();
      setSessionId(data.id);
      return data.id;
    } catch (error: any) {
      Alert.alert('Error', error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const startCameraCapture = async () => {
    const sid = await createSessionIfNeeded();
    if (!sid) return;

    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result?.granted) {
        Alert.alert('Permission Needed', 'Camera permission is required to take a photo.');
        return;
      }
    }

    setIsCapturing(true);
  };

  const pickImageFromGallery = async () => {
    const sid = await createSessionIfNeeded();
    if (!sid) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setCapturedImage(asset.uri);
        setSelectedImage({
          uri: asset.uri,
          fileName: asset.fileName ?? `classroom-${Date.now()}.jpg`,
          mimeType: asset.mimeType ?? 'image/jpeg',
        });
      }
    } catch (error) {
      console.error('Image picker error:', error);
      const helper = Platform.OS === 'web'
        ? 'Try restarting Metro and hard-refreshing the browser. If it still fails, use Take Photo.'
        : 'Please restart the app and try again, or use Take Photo.';
      Alert.alert('Gallery unavailable', helper);
    }
  };

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        setLoading(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
        });
        if (photo) {
          setCapturedImage(photo.uri);
          setSelectedImage({
            uri: photo.uri,
            fileName: `classroom-${Date.now()}.jpg`,
            mimeType: 'image/jpeg',
          });
          setIsCapturing(false);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take photo');
      } finally {
        setLoading(false);
      }
    }
  };

  const submitForRecognition = async () => {
    if (!selectedImage || !sessionId) return;

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');

      const formData = new FormData();
      const fileName = selectedImage.fileName || `classroom-${Date.now()}.jpg`;
      const fileType = selectedImage.mimeType || 'image/jpeg';

      // Blob-first path is more reliable across Android/iOS URI schemes.
      try {
        const response = await fetch(selectedImage.uri);
        const blob = await response.blob();
        formData.append('image', blob as any, fileName);
      } catch {
        // Fallback to classic React Native file object if blob conversion fails.
        // @ts-ignore
        formData.append('image', {
          uri: selectedImage.uri,
          name: fileName,
          type: fileType,
        });
      }

      const res = await fetch(`${config.apiUrl}/attendance/session/${sessionId}/upload-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setRecognitionResult({
          updatedRecords: data.updated_records || 0,
          recognizedStudents: data.recognized_students || [],
          annotatedImage: data.image_with_boxes ? `data:image/jpeg;base64,${data.image_with_boxes}` : null,
        });
        Alert.alert('Recognition Complete', `Marked ${data.updated_records || 0} attendance record(s).`);
      } else {
        const contentType = res.headers.get('content-type') || '';
        let errorMessage = 'Failed to process image';

        try {
          if (contentType.includes('application/json')) {
            const error = await res.json();
            errorMessage = error.detail || error.message || errorMessage;
          } else {
            const text = await res.text();
            if (text) errorMessage = text;
          }
        } catch {
          // Keep default message if parsing fails.
        }

        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Recognition error:', error);
      Alert.alert('Error', 'Failed to submit image for recognition');
    } finally {
      setLoading(false);
    }
  };

  if (!permission) return null;

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
            <Text style={styles.modalTitle}>AI Attendance</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Colors.light.mutedForeground} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDescription}>
            Capture a photo of the classroom for {className}
          </Text>

          {recognitionResult ? (
            <View style={styles.resultPanel}>
              {recognitionResult.annotatedImage ? (
                <RNImage source={{ uri: recognitionResult.annotatedImage }} style={styles.resultImage} />
              ) : null}

              <Text style={styles.resultTitle}>Recognition Results</Text>
              <Text style={styles.resultSubtitle}>
                {recognitionResult.updatedRecords} record(s) updated
              </Text>

              {recognitionResult.recognizedStudents.length > 0 ? (
                <View style={styles.resultsList}>
                  {recognitionResult.recognizedStudents.map((student) => (
                    <View key={`${student.name}-${student.confidence}`} style={styles.resultItem}>
                      <Text style={styles.resultItemName}>{student.name}</Text>
                      <Text style={styles.resultItemConfidence}>{Math.round(student.confidence * 100)}%</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyResultText}>No known students were recognized in this image.</Text>
              )}

              <Button
                variant="outline"
                onPress={() => {
                  setRecognitionResult(null);
                  setCapturedImage(null);
                    setSelectedImage(null);
                }}
                style={{ marginTop: 12 }}
              >
                Scan Another Image
              </Button>

              <Button onPress={onClose} style={{ marginTop: 8 }}>
                Close
              </Button>
            </View>
          ) : null}

          {!permission.granted ? (
            <View style={styles.permissionContainer}>
              <AlertCircle size={48} color={Colors.light.destructive} />
              <Text style={styles.permissionText}>Camera permission is required</Text>
              <Button onPress={requestPermission}>Grant Permission</Button>
            </View>
          ) : capturedImage ? (
            <View style={styles.previewContainer}>
              <RNImage source={{ uri: capturedImage }} style={styles.previewImage} />
              <View style={styles.actionRow}>
                <Button 
                  variant="outline" 
                  onPress={() => {
                    setCapturedImage(null);
                    setSelectedImage(null);
                  }}
                  style={{ flex: 1, marginRight: 8 }}
                  disabled={loading}
                >
                  Retake
                </Button>
                <Button 
                  onPress={submitForRecognition}
                  style={{ flex: 1 }}
                  isLoading={loading}
                >
                  Process Faces
                </Button>
              </View>
            </View>
          ) : isCapturing ? (
            <View style={styles.cameraContainer}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
              />
              <TouchableOpacity 
                style={styles.captureButton} 
                onPress={takePhoto}
                disabled={loading}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelCameraButton} 
                onPress={() => setIsCapturing(false)}
              >
                <Text style={{ color: 'white' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.startContainer}>
              <View style={styles.iconCircle}>
                <CameraIcon size={40} color={Colors.light.primary} />
              </View>
              <Text style={styles.infoText}>
                Provide a classroom image for AI verification.
              </Text>
              <View style={styles.startActions}>
                <Button
                  onPress={startCameraCapture}
                  isLoading={loading}
                  style={{ width: '100%' }}
                >
                    <View style={styles.buttonContentRow}>
                      <CameraIcon size={16} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.buttonContentTextLight}>Take Photo</Text>
                    </View>
                </Button>
                <Button
                  variant="outline"
                  onPress={pickImageFromGallery}
                  disabled={loading}
                  style={{ width: '100%' }}
                >
                    <View style={styles.buttonContentRow}>
                      <Upload size={16} color={Colors.light.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.buttonContentTextOutline}>Upload Image</Text>
                    </View>
                </Button>
              </View>
            </View>
          )}

          {loading && !capturedImage && !isCapturing && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={Colors.light.primary} />
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
  resultPanel: {
    marginBottom: 16,
  },
  resultImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: Colors.light.border,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  resultSubtitle: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
    color: Colors.light.mutedForeground,
  },
  resultsList: {
    gap: 8,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.accent,
  },
  resultItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  resultItemConfidence: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  emptyResultText: {
    fontSize: 13,
    color: Colors.light.mutedForeground,
    marginBottom: 8,
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
  startContainer: {
    alignItems: 'center',
  },
  startActions: {
    width: '100%',
    gap: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.primary + '1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  infoText: {
    textAlign: 'center',
    color: Colors.light.mutedForeground,
    marginBottom: 24,
    fontSize: 14,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContentTextLight: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContentTextOutline: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    height: 400,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  captureButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  captureButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'white',
  },
  cancelCameraButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
  },
  previewContainer: {
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  }
});
