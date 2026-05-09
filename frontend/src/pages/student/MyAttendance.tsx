import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AttendanceChart } from '@/components/student/AttendanceChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, CheckCircle2, XCircle, AlertCircle, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface AttendanceRecord {
  id: number;
  date: string;
  status: string;
  subject: string;
  subject_name?: string;
  subject_code?: string;
}

interface SubjectAttendance {
  class_id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  year: number;
  section: string;
  total_sessions: number;
  attended_sessions: number;
  attendance_percentage: number;
  recent_records: AttendanceRecord[];
}

const statusConfig = {
  present: { label: 'Present', icon: CheckCircle2, className: 'status-present' },
  manual_review: { label: 'Under Review', icon: AlertCircle, className: 'status-review' },
  absent: { label: 'Absent', icon: XCircle, className: 'status-absent' },
  pending_approval: { label: 'Pending Approval', icon: Clock, className: 'status-review' },
};

export default function MyAttendance() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<SubjectAttendance[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/attendance/my-attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch attendance data');
      }

      const data: SubjectAttendance[] = await res.json();
      setAttendanceData(data);
      
      // Combine all recent records from all subjects with subject info
      const allRecords: AttendanceRecord[] = [];
      data.forEach(subject => {
        subject.recent_records.forEach(record => {
          allRecords.push({
            ...record,
            subject_name: subject.subject_name,
            subject_code: subject.subject_code,
          });
        });
      });
      
      // Sort by date (most recent first) and take top 6
      allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentAttendance(allRecords.slice(0, 6));
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to load attendance data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-2 md:gap-4 flex-1">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-heading text-xl md:text-2xl font-bold truncate">My Attendance</h1>
              <p className="text-muted-foreground text-xs md:text-sm truncate">Complete attendance overview</p>
            </div>
          </div>
          <Button variant="outline" className="gap-1 md:gap-2 text-xs md:text-sm flex-shrink-0">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <AttendanceChart attendanceData={attendanceData} />
          
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="font-heading text-lg md:text-xl">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAttendance.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No recent attendance records</p>
                ) : (
                  recentAttendance.map((record, index) => {
                    const config = statusConfig[record.status as keyof typeof statusConfig];
                    const StatusIcon = config.icon;
                    
                    return (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors animate-fade-in gap-3"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <p className="font-semibold text-sm md:text-base">
                              {record.subject_name || 'Unknown Subject'}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              ({record.subject_code || 'N/A'})
                            </span>
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground mt-1">
                            {new Date(record.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn('gap-1 flex-shrink-0', config.className)}>
                          <StatusIcon className="h-3 w-3" />
                          <span className="text-xs md:text-sm">{config.label}</span>
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
