export interface AttendanceSession {
  id: number;
  class_id: number;
  date: string;
  status: 'open' | 'closed';
  attendance_code?: string;
  qr_code?: string;
  qr_expires_at?: string;
  face_recognition_enabled: boolean;
}

export interface AttendanceRecord {
  id: number;
  session_id: number;
  student_id: number;
  face_detected: boolean;
  qr_verified: boolean;
  final_status: 'present' | 'absent' | 'pending_approval';
  created_at: string;
  updated_at: string;
}

export interface QRVerificationResponse {
  verified: boolean;
  message: string;
  attendance_record?: AttendanceRecord;
}

export interface QRCodeSubmitRequest {
  qr_code_data: string;
}

export interface QRCodeUploadResponse {
  success: boolean;
  message: string;
  qr_code_data?: string;
  session_id?: number;
  record_id?: number;
}
