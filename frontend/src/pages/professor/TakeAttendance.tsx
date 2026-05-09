import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Camera, Hash, QrCode, Users, Settings, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AttendanceCodeDialog } from './AttendanceCodeDialog';
import { QRCodeDialog } from './QRCodeDialog';
import { FaceCaptureDialog } from './FaceCaptureDialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

export default function TakeAttendance() {
  const navigate = useNavigate();
  const { classId } = useParams();
  const [settings, setSettings] = useState<AttendanceSettings>({
    faceRecognitionEnabled: false,
    codeQrEnabled: true,
    useQRCode: false,
  });
  const [classInfo, setClassInfo] = useState<any>(null);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [faceDialogOpen, setFaceDialogOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSessionInfo | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    fetchAllClasses();
  }, []);

  useEffect(() => {
    if (classId) {
      fetchClassInfo();
      fetchActiveSession();
    }
  }, [classId]);

  useEffect(() => {
    if (!activeSession) return;

    setRemainingSeconds(activeSession.remaining_seconds);
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          fetchActiveSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const fetchAllClasses = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/teachers/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const classes = await res.json();
        // Also fetch subjects to resolve subject names when API returns only subject_id
        try {
          const subjRes = await fetch(`${API_URL}/teachers/subjects`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const subjects = subjRes.ok ? await subjRes.json() : [];
          const subjMap: Record<number, any> = {};
          subjects.forEach((s: any) => (subjMap[s.id] = s));

          const enriched = classes.map((c: any) => ({
            ...c,
            subject: c.subject || subjMap[c.subject_id] || { name: c.subject_name || 'Unknown Subject' },
          }));
          setAllClasses(enriched);
        } catch (err) {
          setAllClasses(classes);
        }
        // If classId exists in URL but wasn't in params (edge case), find it
        if (classId) {
          const currentClass = classes.find((c: any) => c.id === parseInt(classId || '0'));
          // try to enrich currentClass similarly
          if (currentClass) {
            const token2 = localStorage.getItem('auth_token');
            try {
              const subjRes2 = await fetch(`${API_URL}/teachers/subjects`, { headers: { Authorization: `Bearer ${token2}` } });
              const subjects2 = subjRes2.ok ? await subjRes2.json() : [];
              const subjMap2: Record<number, any> = {};
              subjects2.forEach((s: any) => (subjMap2[s.id] = s));
              setClassInfo({
                ...currentClass,
                subject: currentClass.subject || subjMap2[currentClass.subject_id] || { name: currentClass.subject_name || 'Unknown Subject' },
              });
            } catch (err) {
              setClassInfo(currentClass);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchClassInfo = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/teachers/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const classes = await res.json();
        const currentClass = classes.find((c: any) => c.id === parseInt(classId || '0'));
        if (currentClass) {
          try {
            const subjRes = await fetch(`${API_URL}/teachers/subjects`, { headers: { Authorization: `Bearer ${token}` } });
            const subjects = subjRes.ok ? await subjRes.json() : [];
            const subjMap: Record<number, any> = {};
            subjects.forEach((s: any) => (subjMap[s.id] = s));
            setClassInfo({
              ...currentClass,
              subject: currentClass.subject || subjMap[currentClass.subject_id] || { name: currentClass.subject_name || 'Unknown Subject' },
            });
          } catch (err) {
            setClassInfo(currentClass);
          }
        } else {
          setClassInfo(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch class info:', error);
    }
  };

  const handleSelectClass = (id: number) => {
    navigate(`/professor/capture/${id}`);
  };

  const fetchActiveSession = async () => {
    if (!classId) return;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/attendance/class/${classId}/active-session`, {
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

  const handleFaceRecognitionToggle = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, faceRecognitionEnabled: enabled }));
    toast({
      title: enabled ? 'Facial Recognition Enabled' : 'Facial Recognition Disabled',
      description: enabled
        ? 'Students must verify via both face and code/QR'
        : 'Students only need code or QR verification',
    });
  };

  const handleMethodToggle = (useQR: boolean) => {
    setSettings(prev => ({ ...prev, useQRCode: useQR }));
    toast({
      title: useQR ? 'Switched to QR Code' : 'Switched to Numeric Code',
      description: useQR
        ? 'Generate QR codes for attendance'
        : 'Generate 6-digit codes for attendance',
    });
  };

  const handleCodeQrToggle = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, codeQrEnabled: enabled }));
    toast({
      title: enabled ? 'Code/QR Enabled' : 'Code/QR Disabled',
      description: enabled
        ? 'Students can verify using a code or QR'
        : 'Only facial recognition will be used for verification',
    });
  };

  const handleGenerateCode = () => {
    if (!classInfo) return;
    setCodeDialogOpen(true);
  };

  const handleGenerateQR = () => {
    if (!classInfo) return;
    setQrDialogOpen(true);
  };

  const handleFaceCapture = () => {
    if (!classInfo) return;
    setFaceDialogOpen(true);
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
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/attendance/session/${activeSession.id}/disconnect`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to disconnect session');
      }

      toast({
        title: 'Session Disconnected',
        description: 'Redirecting to dashboard...',
      });
      setTimeout(() => {
        navigate('/professor');
      }, 1000);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to disconnect session',
        variant: 'destructive',
      });
    }
  };

  const addNewSession = async () => {
    if (activeSession) {
      await disconnectActiveSession();
    }

    if (settings.faceRecognitionEnabled) {
      setFaceDialogOpen(true);
      return;
    }

    if (settings.codeQrEnabled) {
      if (settings.useQRCode) {
        setQrDialogOpen(true);
      } else {
        setCodeDialogOpen(true);
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* If no class selected, show class selector */}
        {!classId ? (
          <>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/professor/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-heading text-2xl font-bold">Take Attendance</h1>
                <p className="text-muted-foreground">Select a class to configure attendance</p>
              </div>
            </div>

            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Select Your Class
                </CardTitle>
                <CardDescription>
                  Choose a class to configure attendance settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {allClasses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allClasses.map((cls: any) => (
                      <button
                        key={cls.id}
                        onClick={() => handleSelectClass(cls.id)}
                        className="text-left p-4 border rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <p className="font-semibold">{cls.subject?.name || 'Unknown Subject'}</p>
                        <p className="text-sm text-muted-foreground">
                          Year {cls.year} • Section {cls.section}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {cls.teacher?.name}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No classes found. Create a class first.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Class selected - show settings */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/professor/capture')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="font-heading text-2xl font-bold">Take Attendance</h1>
                <p className="text-muted-foreground">
                  {classInfo ? `${classInfo.subject?.name} • Year ${classInfo.year} Section ${classInfo.section}` : 'Loading...'}
                </p>
              </div>
            </div>

        {/* Settings Card */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Attendance Method Settings
            </CardTitle>
            <CardDescription>
              Enable the methods you want to use for this session
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Facial Recognition Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="face-recognition" className="text-base font-semibold">
                    Facial Recognition
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Capture classroom photo for face verification
                  </p>
                </div>
                <Switch
                  id="face-recognition"
                  checked={settings.faceRecognitionEnabled}
                  onCheckedChange={handleFaceRecognitionToggle}
                />
              </div>

              {settings.faceRecognitionEnabled && (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold text-blue-900 dark:text-blue-100">
                        Dual Verification Mode
                      </p>
                      <ul className="text-blue-700 dark:text-blue-300 space-y-1 ml-2">
                        <li>✅ <strong>Both verified</strong> (Face + Code/QR) → Marked Present</li>
                        <li>⚠️ <strong>Only one verified</strong> → Pending Professor Review</li>
                        <li>❌ <strong>Neither verified</strong> → Marked Absent</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Code/QR Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="code-qr" className="text-base font-semibold">
                    Code or QR Verification
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow students to verify via code or QR
                  </p>
                </div>
                <Switch
                  id="code-qr"
                  checked={settings.codeQrEnabled}
                  onCheckedChange={handleCodeQrToggle}
                />
              </div>

              {settings.codeQrEnabled && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Verification Method</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleMethodToggle(false)}
                      className={`relative flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all ${
                        !settings.useQRCode
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      {!settings.useQRCode && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        !settings.useQRCode ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <Hash className={`h-6 w-6 ${!settings.useQRCode ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">Numeric Code</p>
                        <p className="text-xs text-muted-foreground">6-digit code • 5-minute session window</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleMethodToggle(true)}
                      className={`relative flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all ${
                        settings.useQRCode
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      {settings.useQRCode && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        settings.useQRCode ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <QrCode className={`h-6 w-6 ${settings.useQRCode ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold">QR Code</p>
                        <p className="text-xs text-muted-foreground">Scan/Upload • 5-minute session window</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Session Card */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Session Status
            </CardTitle>
            <CardDescription>
              View timer and control current session from here
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSession ? (
              <>
                <div className="rounded-lg border p-4 bg-primary/5 space-y-2">
                  <p className="text-sm text-muted-foreground">Active session #{activeSession.id}</p>
                  <p className="text-2xl font-bold text-primary">{formatSessionTime(remainingSeconds)}</p>
                  <p className="text-sm text-muted-foreground">Remaining before auto-close</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" className="flex-1" onClick={disconnectActiveSession}>
                    Disconnect Session
                  </Button>
                  <Button className="flex-1" onClick={addNewSession}>
                    Add New Session
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-lg border p-4 bg-muted/30">
                <p className="font-medium">No active session</p>
                <p className="text-sm text-muted-foreground">Create a new session based on your current settings.</p>
                <Button className="mt-3" onClick={addNewSession}>Add New Session</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Start Attendance Collection
            </CardTitle>
            <CardDescription>
              Choose how to collect attendance based on your settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Facial Recognition Action */}
            {settings.faceRecognitionEnabled && (
              <>
                <Button
                  onClick={handleFaceCapture}
                  className="w-full h-14 text-base gap-3"
                  size="lg"
                >
                  <Camera className="h-5 w-5" />
                  Capture Classroom Photo
                </Button>
                <div className="flex items-center gap-2">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground uppercase">And</span>
                  <Separator className="flex-1" />
                </div>
              </>
            )}

            {/* Code or QR Generation */}
            {settings.codeQrEnabled && (
              settings.useQRCode ? (
                <Button
                  onClick={handleGenerateQR}
                  variant={settings.faceRecognitionEnabled ? 'outline' : 'default'}
                  className="w-full h-14 text-base gap-3"
                  size="lg"
                >
                  <QrCode className="h-5 w-5" />
                  Generate QR Code (5 min)
                </Button>
              ) : (
                <Button
                  onClick={handleGenerateCode}
                  variant={settings.faceRecognitionEnabled ? 'outline' : 'default'}
                  className="w-full h-14 text-base gap-3"
                  size="lg"
                >
                  <Hash className="h-5 w-5" />
                  Generate Attendance Code (5 min)
                </Button>
              )
            )}

            {/* Info Box */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-sm">📋 Current Configuration:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • <strong>Facial Recognition:</strong>{' '}
                  {settings.faceRecognitionEnabled ? 'Enabled' : 'Disabled'}
                </li>
                <li>
                  • <strong>Code/QR:</strong>{' '}
                  {settings.codeQrEnabled
                    ? settings.useQRCode
                      ? 'QR Code Enabled'
                      : 'Numeric Code Enabled'
                    : 'Disabled'}
                </li>
                <li>
                  • <strong>Verification:</strong>{' '}
                  {settings.faceRecognitionEnabled && settings.codeQrEnabled
                    ? 'Dual (both face and code/QR required)'
                    : settings.faceRecognitionEnabled
                      ? 'Face only'
                      : settings.codeQrEnabled
                        ? 'Code/QR only'
                        : 'None'}
                </li>
                <li>
                  • <strong>Auto-approve:</strong>{' '}
                  {settings.faceRecognitionEnabled && settings.codeQrEnabled
                    ? 'Only if both verified'
                    : settings.codeQrEnabled
                      ? 'Yes, for code/QR'
                      : 'No (manual review)'}
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Dialogs */}
        {classInfo && (
          <>
            <AttendanceCodeDialog
              open={codeDialogOpen}
              onOpenChange={(open) => {
                setCodeDialogOpen(open);
                if (!open) fetchActiveSession();
              }}
              classId={parseInt(classId || '0')}
              className={`${classInfo.subject?.name} - Year ${classInfo.year} ${classInfo.section}`}
              faceRecognitionEnabled={settings.faceRecognitionEnabled && settings.codeQrEnabled}
            />
            <QRCodeDialog
              open={qrDialogOpen}
              onOpenChange={(open) => {
                setQrDialogOpen(open);
                if (!open) fetchActiveSession();
              }}
              classId={parseInt(classId || '0')}
              className={`${classInfo.subject?.name} - Year ${classInfo.year} ${classInfo.section}`}
              faceRecognitionEnabled={settings.faceRecognitionEnabled && settings.codeQrEnabled}
            />
            <FaceCaptureDialog
              open={faceDialogOpen}
              onOpenChange={(open) => {
                setFaceDialogOpen(open);
                if (!open) fetchActiveSession();
              }}
              classId={parseInt(classId || '0')}
              className={`${classInfo.subject?.name} - Year ${classInfo.year} ${classInfo.section}`}
              sessionId={activeSession?.id}
              dualVerificationEnabled={settings.faceRecognitionEnabled && settings.codeQrEnabled}
            />
          </>
        )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
