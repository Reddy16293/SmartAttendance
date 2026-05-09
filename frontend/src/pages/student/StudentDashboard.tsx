import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpen, CalendarDays, CheckCircle2, QrCode, BarChart3, Clock, MapPin, Hash, AlertTriangle, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { AttendanceCodeDialog } from './AttendanceCodeDialog';
import { QRCodeScanDialog } from './QRCodeScanDialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface ClassSchedule {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number?: string;
}

interface EnrolledClass {
  id: number;
  subject_name?: string;
  teacher_name?: string;
  year: number;
  section: string;
  schedules: ClassSchedule[];
  enrolled_at: string;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<EnrolledClass | null>(null);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);

  useEffect(() => {
    fetchEnrolledClasses();
    fetchAttendanceData();
  }, []);

  const fetchEnrolledClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/enrollments/my-classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setEnrolledClasses(data);
        filterTodayClasses(data);
      } else if (res.status === 401) {
        navigate('/login');
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTodayClasses = (classes: EnrolledClass[]) => {
    const today = new Date().getDay(); // 0=Sunday, 1=Monday, etc.
    const todayIndex = today === 0 ? 6 : today - 1; // Convert to 0=Monday

    const todaysSchedules = classes.flatMap(cls => 
      cls.schedules
        .filter(schedule => schedule.day_of_week === todayIndex)
        .map(schedule => ({
          className: cls.subject_name || 'Unknown Subject',
          teacher: cls.teacher_name || 'TBA',
          time: `${schedule.start_time} - ${schedule.end_time}`,
          room: schedule.room_number,
          year: cls.year,
          section: cls.section,
        }))
    );

    setTodayClasses(todaysSchedules);
  };

  const fetchAttendanceData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/attendance/my-attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setAttendanceData(data);
      }
    } catch (error) {
      console.error('Failed to load attendance data:', error);
    }
  };

  const getAttendanceForClass = (classId: number) => {
    const attendance = attendanceData.find(a => a.class_id === classId);
    return attendance ? attendance.attendance_percentage : 0;
  };

  const handleAttendanceSuccess = () => {
    // Refresh attendance data after code submission
    setTimeout(() => {
      fetchAttendanceData();
    }, 500);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">Welcome, {user?.name?.split(' ')[0]}!</h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1">Track your attendance and verify your presence.</p>
        </div>

        {/* Action Buttons - Mobile Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
          <Button onClick={() => navigate('/student/schedule')} variant="outline" size="sm" className="flex-col h-auto py-3">
            <CalendarDays className="h-4 w-4 mb-1" />
            <span className="text-xs">Schedule</span>
          </Button>
          <Button onClick={() => navigate('/student/timetable')} variant="outline" size="sm" className="flex-col h-auto py-3">
            <Clock className="h-4 w-4 mb-1" />
            <span className="text-xs\">Timetable</span>
          </Button>
          <Button onClick={() => navigate('/student/verify')} size="sm" className="flex-col h-auto py-3 col-span-2 sm:col-span-1">
            <QrCode className="h-4 w-4 mb-1" />
            <span className="text-xs\">Verify</span>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            title="Enrolled Classes"
            value={enrolledClasses.length}
            subtitle="Active enrollments"
            icon={<BookOpen className="h-5 w-5" />}
            variant="primary"
          />
          <StatCard
            title="Overall Attendance"
            value="--"
            subtitle="Coming soon"
            icon={<BarChart3 className="h-5 w-5" />}
            variant="success"
          />
          <StatCard
            title="Today's Classes"
            value={todayClasses.length}
            subtitle={`${DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]}`}
            icon={<Calendar className="h-5 w-5" />}
          />
          <StatCard
            title="Total Sessions"
            value="--"
            subtitle="Coming soon"
            icon={<CheckCircle2 className="h-5 w-5" />}
            variant="warning"
          />
        </div>

        {/* Today's Classes */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="font-heading text-lg md:text-xl flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
              <span>Today's Schedule</span>
            </CardTitle>
            <CardDescription>Your classes for {DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading your schedule...</p>
            ) : todayClasses.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-2">No classes scheduled for today</p>
                <p className="text-sm text-muted-foreground">Enjoy your day off! 🎉</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayClasses.map((cls, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg hover:bg-accent transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{cls.className}</h3>
                        <p className="text-sm text-muted-foreground">
                          👨‍🏫 {cls.teacher} • Year {cls.year} Section {cls.section}
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enrolled Classes */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              My Enrolled Classes ({enrolledClasses.length})
            </CardTitle>
            <CardDescription>All your enrolled classes with attendance</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : enrolledClasses.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">You're not enrolled in any classes yet</p>
                <Button onClick={() => navigate('/student/enroll')}>
                  Enroll in Classes
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enrolledClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-4 border rounded-lg hover:bg-accent transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{cls.subject_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {cls.teacher_name} • Year {cls.year} Section {cls.section}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-success">
                          {getAttendanceForClass(cls.id).toFixed(0)}%
                        </p>
                        <p className="text-xs text-muted-foreground">Attendance</p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {cls.schedules.length} session{cls.schedules.length !== 1 ? 's' : ''} per week
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="font-heading">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => {
                if (enrolledClasses.length > 0) {
                  setSelectedClass(enrolledClasses[0]);
                  setCodeDialogOpen(true);
                } else {
                  toast({
                    title: 'Error',
                    description: 'Please enroll in a class first',
                    variant: 'destructive',
                  });
                }
              }}
            >
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Hash className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">Enter Attendance Code</div>
                <div className="text-xs text-muted-foreground">6-digit code from professor</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => {
                if (enrolledClasses.length > 0) {
                  setQrDialogOpen(true);
                } else {
                  toast({
                    title: 'Error',
                    description: 'Please enroll in a class first',
                    variant: 'destructive',
                  });
                }
              }}
            >
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <QrCode className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">Scan or Upload QR Code</div>
                <div className="text-xs text-muted-foreground">Camera scan or image upload</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => navigate('/student/enroll')}
            >
              <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              Enroll in More Classes
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => navigate('/student/attendance')}
            >
              <div className="w-8 h-8 bg-warning/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-warning" />
              </div>
              View Full Report
            </Button>
          </CardContent>
        </Card>

        {/* Attendance Records */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-success" />
              Your Attendance Records
            </CardTitle>
            <CardDescription>Attendance across your enrolled classes</CardDescription>
          </CardHeader>
          <CardContent>
            {attendanceData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No attendance data yet</p>
            ) : (
              <div className="space-y-4">
                {attendanceData.map((att) => {
                  const cls = enrolledClasses.find(c => c.id === att.class_id);
                  return (
                    <div key={att.class_id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{cls?.subject_name || 'Unknown Subject'}</h4>
                          <p className="text-sm text-muted-foreground">Year {att.year} Section {att.section}</p>
                          <div className="mt-2 text-sm space-y-1">
                            <p>Attended: <span className="font-medium text-success">{att.attended_sessions}</span> / {att.total_sessions}</p>
                            <p>Percentage: <span className="font-medium">{att.attendance_percentage}%</span></p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-primary">{att.attendance_percentage}%</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {att.attendance_percentage >= 75 ? '✓ Good' : '! At Risk'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {codeDialogOpen && (
          <AttendanceCodeDialog
            open={codeDialogOpen}
            onOpenChange={setCodeDialogOpen}
            onSuccess={handleAttendanceSuccess}
          />
        )}
        
        {qrDialogOpen && (
          <QRCodeScanDialog
            open={qrDialogOpen}
            onOpenChange={setQrDialogOpen}
            onSuccess={handleAttendanceSuccess}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
