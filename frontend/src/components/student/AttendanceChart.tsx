import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SubjectAttendanceData {
  class_id: number;
  subject_name: string;
  subject_code: string;
  total_sessions: number;
  attended_sessions: number;
  attendance_percentage: number;
  year: number;
  section: string;
}

interface AttendanceChartProps {
  attendanceData: SubjectAttendanceData[];
}

export function AttendanceChart({ attendanceData }: AttendanceChartProps) {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 85) return 'bg-success';
    if (percentage >= 75) return 'bg-warning';
    return 'bg-destructive';
  };

  const getStatusText = (percentage: number) => {
    if (percentage >= 85) return { text: 'Good Standing', color: 'text-success' };
    if (percentage >= 75) return { text: 'Warning', color: 'text-warning' };
    return { text: 'Critical', color: 'text-destructive' };
  };

  return (
    <Card className="card-shadow">
      <CardHeader>
        <CardTitle className="font-heading">Subject-wise Attendance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {attendanceData.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No attendance data available</p>
        ) : (
          attendanceData.map((subject, index) => {
            const status = getStatusText(subject.attendance_percentage);
            return (
              <div
                key={subject.class_id}
                className="animate-fade-in border rounded-lg p-4 bg-card hover:bg-muted/30 transition-colors"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm md:text-base">{subject.subject_name}</h4>
                      <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {subject.subject_code}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Year {subject.year}, Section {subject.section}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {subject.attended_sessions}/{subject.total_sessions} classes attended
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-2xl md:text-3xl font-heading font-bold">
                      {Math.round(subject.attendance_percentage)}%
                    </span>
                    <p className={cn('text-xs font-semibold mt-1', status.color)}>{status.text}</p>
                  </div>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-1000 ease-out',
                      getProgressColor(subject.attendance_percentage)
                    )}
                    style={{ width: `${subject.attendance_percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
