import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Clock, Users, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: number;
  className: string;
  faceRecognitionEnabled?: boolean;
  onSuccess?: () => void;
}

interface QRCodeSession {
  success: boolean;
  message: string;
  session_id: number;
  qr_code_data: string;
  qr_code_image: string; // Base64 encoded PNG
  expires_at: string;
}

export function QRCodeDialog({
  open,
  onOpenChange,
  classId,
  className,
  faceRecognitionEnabled = false,
  onSuccess,
}: QRCodeDialogProps) {
  const [session, setSession] = useState<QRCodeSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [hasOpened, setHasOpened] = useState(false);

  // Reset session only when dialog is freshly opened (not on every render)
  useEffect(() => {
    console.log('[QR EFFECT] Dialog open state changed:', open);
    if (open && !hasOpened) {
      console.log('[QR EFFECT] Dialog opened for the first time, ready to generate');
      setHasOpened(true);
    } else if (!open && hasOpened) {
      console.log('[QR EFFECT] Dialog closed, resetting session for next open');
      setSession(null);
      setTimeLeft(0);
      setHasOpened(false);
    }
  }, [open, hasOpened]);

  // Update countdown timer
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      const expiryDate = new Date(session.expires_at + 'Z'); // Add 'Z' to force UTC parsing
      const now = new Date();
      const diff = expiryDate.getTime() - now.getTime();
      const secondsLeft = Math.floor(diff / 1000);
      
      setTimeLeft(secondsLeft);
      
      if (secondsLeft <= 0) {
        clearInterval(interval);
        toast({
          title: 'QR Code Expired',
          description: 'The QR code has expired. Please generate a new one.',
          variant: 'destructive',
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      setSession(null); // Clear any previous session
      const token = localStorage.getItem('auth_token');
      
      console.log('[QR] Generating QR code for class:', classId);
      
      const res = await fetch(
        `${API_URL}/attendance/session/generate-qr-code?class_id=${classId}&face_recognition_enabled=${faceRecognitionEnabled}`,
        {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const error = await res.json();
        console.error('[QR] Generation failed:', error);
        toast({
          title: 'Error',
          description: error.detail || 'Failed to generate QR code',
          variant: 'destructive',
        });
        return;
      }

      const data = await res.json();
      console.log('[QR] QR code generated successfully:', data.session_id);
      console.log('[QR] Full response data:', data);
      console.log('[QR] Has qr_code_image?', !!data.qr_code_image);
      console.log('[QR] QR code image length:', data.qr_code_image?.length);
      console.log('[QR] Expires at (from backend):', data.expires_at);
      
      setSession(data);
      console.log('[QR] Session state set, session object:', data);
      
      // Calculate initial time left - Handle UTC timezone properly
      // The backend sends UTC time, we need to parse it as UTC
      const expiryDate = new Date(data.expires_at + 'Z'); // Add 'Z' to force UTC parsing
      const now = new Date();
      console.log('[QR] Expiry date (UTC):', expiryDate.toISOString());
      console.log('[QR] Current date (local):', now.toISOString());
      
      const diff = expiryDate.getTime() - now.getTime();
      const secondsLeft = Math.floor(diff / 1000);
      setTimeLeft(secondsLeft);
      console.log('[QR] Time difference (ms):', diff);
      console.log('[QR] Timer set to:', secondsLeft, 'seconds');
      
      toast({
        title: 'Success',
        description: 'QR code generated successfully. Valid for 5 minutes.',
      });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate QR code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpired = session && timeLeft <= 0; // Only check expiry if session exists
  const isExpiringSoon = timeLeft > 0 && timeLeft <= 30; // Last 30 seconds

  // Debug logs
  console.log('[QR RENDER] loading:', loading);
  console.log('[QR RENDER] session:', session);
  console.log('[QR RENDER] timeLeft:', timeLeft);
  console.log('[QR RENDER] isExpired:', isExpired);
  console.log('[QR RENDER] Show QR?', session && !loading && timeLeft > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attendance QR Code</DialogTitle>
          <DialogDescription>
            Generate a QR code for students to mark their attendance for {className}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
              <p className="text-primary font-semibold mb-2">Generating QR Code...</p>
              <p className="text-sm text-muted-foreground">Please wait</p>
            </div>
          ) : session && timeLeft > 0 ? (
            <div className="space-y-4">
              {/* QR Code Display */}
              <div className="bg-white rounded-lg p-6 border-2 border-primary/20">
                <div className="flex justify-center">
                  <img
                    src={`data:image/png;base64,${session.qr_code_image}`}
                    alt="Attendance QR Code"
                    className="w-64 h-64"
                    onLoad={() => console.log('[QR] Image loaded successfully')}
                    onError={(e) => console.error('[QR] Image failed to load:', e)}
                  />
                </div>
              </div>

              {/* Timer Display */}
              <div className={`flex items-center justify-center gap-2 text-lg font-semibold ${
                isExpiringSoon ? 'text-destructive animate-pulse' : 'text-primary'
              }`}>
                <Clock className="h-5 w-5" />
                <span>Expires in {formatTime(timeLeft)}</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    isExpiringSoon ? 'bg-destructive' : 'bg-primary'
                  }`}
                  style={{ width: `${(timeLeft / 300) * 100}%` }}
                />
              </div>

              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-sm">Instructions for Students:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Go to Student Dashboard</li>
                  <li>Click "Scan QR Code" or "Upload QR Code"</li>
                  <li>Scan the QR code or upload a photo</li>
                  <li>Attendance will be submitted for approval</li>
                </ol>
              </div>

              {/* Warning Message */}
              {isExpiringSoon && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm text-destructive font-semibold">
                    ⚠️ QR code expiring soon! Students should scan now.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  onClick={generateQRCode} 
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate New QR Code
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">
                {isExpired
                  ? 'QR code has expired. Generate a new one.'
                  : 'Generate a QR code for this class session'}
              </p>
              <Button onClick={generateQRCode} disabled={loading}>
                {isExpired ? 'Generate New QR Code' : 'Generate QR Code'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
