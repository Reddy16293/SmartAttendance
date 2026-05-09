import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpen, CalendarDays, ClipboardCheck, Camera, Users, Clock, MapPin, Hash, CheckCircle2, XCircle, QrCode } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { AttendanceCodeDialog } from './AttendanceCodeDialog';
import { QRCodeDialog } from './QRCodeDialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface ClassSchedule {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number?: string;
}

interface TeacherClass {
  id: number;
  subject_id: number;
  year: number;
  section: string;
}

interface ClassWithDetails {
  classId: number;
  subjectName: string;
  subjectCode: string;
  year: number;
  section: string;
  schedules: ClassSchedule[];
}

export default function ProfessorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [manualClassId, setManualClassId] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<{ id: number; name: string } | null>(null);
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  useEffect(() => {
    fetchTeacherClasses();
    fetchPendingSubmissions();
    // Refresh pending submissions every 10 seconds
    const interval = setInterval(fetchPendingSubmissions, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchTeacherClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      // Step 1: Fetch classes and subjects in parallel
      const [classesRes, subjectsRes] = await Promise.all([
        fetch(`${API_URL}/teachers/classes`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/teachers/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!classesRes.ok) {
        toast({
          title: 'Error',
          description: 'Failed to load classes',
          variant: 'destructive',
        });
        return;
      }

      const teacherClasses: TeacherClass[] = await classesRes.json();
      const subjects: Subject[] = subjectsRes.ok ? await subjectsRes.json() : [];
      const subjectMap = new Map(subjects.map(s => [s.id, s]));

      // Step 2: Fetch schedules for all classes in ONE batch call
      const class_ids = teacherClasses.map(c => c.id);
      const schedulesRes = await fetch(`${API_URL}/enrollments/schedules/batch`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ class_ids }),
      });

      const schedulesData = schedulesRes.ok ? await schedulesRes.json() : {};

      // Step 3: Build class details from all fetched data
      const classDetails: ClassWithDetails[] = teacherClasses.map(cls => {
        const subject = subjectMap.get(cls.subject_id);
        return {
          classId: cls.id,
          subjectName: subject?.name || 'Unknown',
          subjectCode: subject?.code || 'N/A',
          year: cls.year,
          section: cls.section,
          schedules: schedulesData[cls.id] || [],
        };
      });

      setClasses(classDetails);
      filterTodayClasses(classDetails);
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTodayClasses = (classes: ClassWithDetails[]) => {
    const today = new Date().getDay(); // 0=Sunday, 1=Monday, etc.
    const todayIndex = today === 0 ? 6 : today - 1; // Convert to 0=Monday

    const todaysSchedules = classes.flatMap(cls => 
      cls.schedules
        .filter(schedule => schedule.day_of_week === todayIndex)
        .map(schedule => ({
          classId: cls.classId,
          className: cls.subjectName,
          time: `${schedule.start_time} - ${schedule.end_time}`,
          room: schedule.room_number,
          year: cls.year,
          section: cls.section,
        }))
    );

    setTodayClasses(todaysSchedules);
  };

  const handleGenerateCode = (classId: number, className: string) => {
    setSelectedClass({ id: classId, name: className });
    setCodeDialogOpen(true);
  };

  const handleGenerateQRCode = (classId: number, className: string) => {
    setSelectedClass({ id: classId, name: className });
    setQrDialogOpen(true);
  };

  const handleManualGenerateCode = () => {
    if (!manualClassId) {
      toast({
        title: 'Select a class',
        description: 'Choose a class to generate an attendance code.',
      });
      return;
    }

    const cls = classes.find(c => c.classId === manualClassId);
    setSelectedClass({ id: manualClassId, name: cls?.subjectName || 'Selected Class' });
    setCodeDialogOpen(true);
  };

  const handleManualGenerateQR = () => {
    if (!manualClassId) {
      toast({
        title: 'Select a class',
        description: 'Choose a class to generate a QR code.',
      });
      return;
    }

    const cls = classes.find(c => c.classId === manualClassId);
    setSelectedClass({ id: manualClassId, name: cls?.subjectName || 'Selected Class' });
    setQrDialogOpen(true);
  };

  const fetchPendingSubmissions = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/attendance/pending/code-submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingSubmissions(data || []);
      }
    } catch (error) {
      console.error('Failed to load pending submissions:', error);
    }
  };

  const handleApproveSubmission = async (recordId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/attendance/code-submissions/${recordId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: 'Approved', description: 'Attendance marked as present' });
        fetchPendingSubmissions();
      } else {
        toast({ title: 'Error', description: 'Failed to approve', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error approving submission:', error);
      toast({ title: 'Error', description: 'Failed to approve', variant: 'destructive' });
    }
  };

  const handleRejectSubmission = async (recordId: number, reason: string = 'Code not verified') => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/attendance/code-submissions/${recordId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        toast({ title: 'Rejected', description: 'Marked as absent' });
        fetchPendingSubmissions();
      } else {
        toast({ title: 'Error', description: 'Failed to reject', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error rejecting submission:', error);
      toast({ title: 'Error', description: 'Failed to reject', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">Welcome back, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Here's what's happening with your classes today.</p>
        </div>
        
        {/* Action Buttons - Mobile Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/professor/classes')} className="flex-col h-auto py-3">
            <BookOpen className="h-4 w-4 mb-1" />
            <span className="text-xs">Classes</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/professor/schedule')} className="flex-col h-auto py-3">
            <CalendarDays className="h-4 w-4 mb-1" />
            <span className="text-xs">Schedule</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/professor/timetable')} className="flex-col h-auto py-3">
            <Clock className="h-4 w-4 mb-1" />
            <span className="text-xs">Timetable</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/professor/enrollments')} className="flex-col h-auto py-3">
            <Users className="h-4 w-4 mb-1" />
            <span className="text-xs">Enroll</span>
          </Button>
          <Button size="sm" onClick={() => navigate('/professor/capture')} className="flex-col h-auto py-3">
            <Camera className="h-4 w-4 mb-1" />
            <span className="text-xs">Attend</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/professor/sessions')} className="flex-col h-auto py-3">
            <ClipboardCheck className="h-4 w-4 mb-1" />
            <span className="text-xs">Sessions</span>
          </Button>
        </div>

        {/* Pending Code Submissions */}
        {pendingSubmissions.length > 0 && (
          <Card className="card-shadow border-warning/30 bg-warning/5">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-warning" />
                Pending Code Approvals ({pendingSubmissions.length})
              </CardTitle>
              <CardDescription>Students have submitted codes awaiting your verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingSubmissions.map((submission) => (
                <div key={submission.id} className="p-4 border rounded-lg flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">Student #{submission.student_id}</p>
                    <p className="text-sm text-muted-foreground">Session #{submission.session_id}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApproveSubmission(submission.id)}
                      className="gap-1"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRejectSubmission(submission.id)}
                      className="gap-1"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quick Take Attendance */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Hash className="h-5 w-5 text-primary" />
              Take Attendance
            </CardTitle>
            <CardDescription>Select a class and choose your preferred method: Code, QR, or Camera</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium">Class</p>
              <Select
                value={manualClassId ? manualClassId.toString() : ''}
                onValueChange={(value) => setManualClassId(Number(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.classId} value={cls.classId.toString()}>
                      {cls.subjectName} ({cls.subjectCode}) - Year {cls.year}, Section {cls.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 md:w-auto flex-wrap">
              <Button onClick={handleManualGenerateCode} disabled={!manualClassId}>
                <Hash className="h-4 w-4 mr-2" />
                Generate Code
              </Button>
              <Button
                onClick={handleManualGenerateQR}
                disabled={!manualClassId}
                variant="outline"
              >
                <QrCode className="h-4 w-4 mr-2" />
                QR Code
              </Button>
              <Button
                variant="outline"
                disabled={!manualClassId}
                onClick={() => manualClassId && navigate(`/professor/capture/${manualClassId}`)}
              >
                <Camera className="h-4 w-4 mr-2" />
                Configure Attendance
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Classes"
            value={classes.length}
            subtitle="This semester"
            icon={<BookOpen className="h-5 w-5" />}
            variant="primary"
          />
          <StatCard
            title="Today's Classes"
            value={todayClasses.length}
            subtitle={`${DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]}`}
            icon={<CalendarDays className="h-5 w-5" />}
            variant="success"
          />
          <StatCard
            title="Total Sessions"
            value={classes.reduce((sum, cls) => sum + cls.schedules.length, 0)}
            subtitle="Per week"
            icon={<ClipboardCheck className="h-5 w-5" />}
            variant="warning"
          />
          <StatCard
            title="Active Enrollments"
            value="--"
            subtitle="Coming soon"
            icon={<Users className="h-5 w-5" />}
          />
        </div>

        {/* Today's Classes */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Today's Schedule
            </CardTitle>
            <CardDescription>Your classes for {DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading your schedule...</p>
            ) : todayClasses.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-2">No classes scheduled for today</p>
                <p className="text-sm text-muted-foreground">Enjoy your day off! 🎉</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayClasses.map((cls) => (
                  <div key={cls.classId} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{cls.className}</h3>
                        <p className="text-sm text-muted-foreground">
                          Year {cls.year} Section {cls.section}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{cls.time}</span>
                          </div>
                          {cls.room && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{cls.room}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          size="sm"
                          onClick={() => handleGenerateCode(cls.classId, cls.className)}
                        >
                          <Hash className="h-4 w-4 mr-2" />
                          Generate Code
                        </Button>
                        <Button 
                          size="sm"
                          variant="secondary"
                          onClick={() => handleGenerateQRCode(cls.classId, cls.className)}
                        >
                          <QrCode className="h-4 w-4 mr-2" />
                          QR Code
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/professor/capture/${cls.classId}`)}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Configure Attendance
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Classes */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-success" />
              All My Classes ({classes.length})
            </CardTitle>
            <CardDescription>Classes you're teaching this semester</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : classes.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">You don't have any classes yet</p>
                <Button onClick={() => navigate('/professor/classes')}>
                  Create Your First Class
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((cls) => (
                  <div
                    key={cls.classId}
                    className="p-4 border rounded-lg hover:bg-accent transition cursor-pointer"
                    onClick={() => navigate('/professor/classes')}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{cls.subjectName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Year {cls.year} Section {cls.section}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{cls.schedules.length}</p>
                        <p className="text-xs text-muted-foreground">Sessions/week</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {cls.schedules.map(s => DAYS[s.day_of_week]).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedClass && (
          <>
            <AttendanceCodeDialog
              open={codeDialogOpen}
              onOpenChange={setCodeDialogOpen}
              classId={selectedClass.id}
              className={selectedClass.name}
              faceRecognitionEnabled={false}
            />
            <QRCodeDialog
              open={qrDialogOpen}
              onOpenChange={setQrDialogOpen}
              classId={selectedClass.id}
              className={selectedClass.name}
              faceRecognitionEnabled={false}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
