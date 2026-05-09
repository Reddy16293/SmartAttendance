import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, Clock, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface AttendanceCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: number;
  className: string;
  faceRecognitionEnabled?: boolean;
  onSuccess?: () => void;
}

interface AttendanceSession {
  id: number;
  attendance_code: string;
  code_expires_at: string;
  status: string;
}

export function AttendanceCodeDialog({
  open,
  onOpenChange,
  classId,
  className,
  faceRecognitionEnabled = false,
  onSuccess,
}: AttendanceCodeDialogProps) {
  const navigate = useNavigate();
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateCode = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(
        `${API_URL}/attendance/session/create-with-code?class_id=${classId}&face_recognition_enabled=${faceRecognitionEnabled}&generate_code=true`,
        {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const error = await res.json();
        toast({
          title: 'Error',
          description: error.detail || 'Failed to generate attendance code',
          variant: 'destructive',
        });
        return;
      }

      const data = await res.json();
      setSession(data);
      toast({
        title: 'Success',
        description: 'Attendance code generated successfully',
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Failed to generate code:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate attendance code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (session?.attendance_code) {
      navigator.clipboard.writeText(session.attendance_code);
      setCopied(true);
      toast({
        title: 'Copied',
        description: 'Attendance code copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const disconnectSession = async () => {
    if (!session) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(
        `${API_URL}/attendance/session/${session.id}/disconnect`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const error = await res.json();
        toast({
          title: 'Error',
          description: error.detail || 'Failed to disconnect session',
          variant: 'destructive',
        });
        return;
      }

      setSession(null);
      toast({
        title: 'Session Disconnected',
        description: 'Redirecting to dashboard...',
      });
      setTimeout(() => {
        navigate('/professor');
        onOpenChange(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to disconnect session:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect session',
        variant: 'destructive',
      });
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Attendance Code</DialogTitle>
          <DialogDescription>
            Generate a code for students to mark their attendance for {className}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!session ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">
                Generate an attendance code for this class session
              </p>
              <Button onClick={generateCode} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Code'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Code Display */}
              <div className="bg-primary/5 rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">Attendance Code</p>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-5xl font-bold font-mono tracking-wider text-primary">
                    {session.attendance_code}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyCode}
                    className="ml-2"
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-success" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Expiry Info */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Expires in {formatExpiryTime(session.code_expires_at)}</span>
              </div>

              {/* Instructions */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-sm">Instructions for Students:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Go to Student Dashboard</li>
                  <li>Click "Mark Attendance"</li>
                  <li>Enter the 6-digit code</li>
                  <li>Submit to mark attendance</li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={copyCode} className="flex-1">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </Button>
                <Button onClick={generateCode} className="flex-1">
                  Generate New Code
                </Button>
              </div>
              <Button
                variant="destructive"
                onClick={disconnectSession}
                disabled={loading}
                className="w-full"
              >
                Disconnect Session
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
