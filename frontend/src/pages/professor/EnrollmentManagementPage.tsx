import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Mail,
  User,
  Copy,
  Clock,
  MapPin,
  Calendar,
  Users,
  Code,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface ClassInfo {
  id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  year: number;
  section: string;
}

interface StudentEnrollment {
  enrollment_id: number;
  student_id: number;
  student_name: string;
  email: string;
  roll_number?: string;
  enrolled_date: string;
  status: string;
  attendance_percentage?: number;
}

interface ClassSchedule {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number?: string;
}

interface EnrollmentCode {
  id: number;
  code: string;
  is_active: boolean;
  created_at: string;
}

interface AvailableStudent {
  id: number;
  name: string;
  email: string;
  roll_number?: string;
}

export default function EnrollmentManagementPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [enrollmentCode, setEnrollmentCode] = useState<string>('');
  
  // Students state
  const [students, setStudents] = useState<StudentEnrollment[]>([]);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [addingStudent, setAddingStudent] = useState(false);
  
  // Schedules state
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    day_of_week: '0',
    start_time: '09:00',
    end_time: '10:00',
    room_number: '',
  });
  const [addingSchedule, setAddingSchedule] = useState(false);
  const [deletingScheduleIds, setDeletingScheduleIds] = useState<Set<number>>(new Set());
  const [attendanceFilter, setAttendanceFilter] = useState<string>('all');

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchEnrollmentCode();
      fetchStudents();
      fetchSchedules();
    }
  }, [selectedClassId]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/teachers/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch classes');
      const rawClasses = await res.json();

      // Fetch subjects to enrich with name/code
      const subjectsRes = await fetch(`${API_URL}/teachers/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const subjects = subjectsRes.ok ? await subjectsRes.json() : [];
      const subjectMap = new Map<number, { name: string; code: string }>();
      subjects.forEach((s: any) => subjectMap.set(s.id, { name: s.name, code: s.code }));

      const enriched = rawClasses.map((cls: any) => {
        const subj = subjectMap.get(cls.subject_id);
        return {
          ...cls,
          subject_name: subj?.name || cls.subject_name || 'Unknown Subject',
          subject_code: subj?.code || cls.subject_code || 'N/A',
        };
      });

      setClasses(enriched);
      if (enriched.length > 0) {
        setSelectedClassId(enriched[0].id);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load classes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollmentCode = async () => {
    if (!selectedClassId) return;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/enrollments/codes/class/${selectedClassId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const codes: EnrollmentCode[] = await res.json();
        const activeCode = codes.find(c => c.is_active);
        setEnrollmentCode(activeCode?.code || '');
      }
    } catch (error) {
      console.error('Error fetching enrollment code:', error);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClassId) return;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/teachers/classes/${selectedClassId}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch students');
      let data = await res.json();
      
      // Fetch attendance percentage for each student
      const studentsWithAttendance = await Promise.all(
        data.map(async (student: StudentEnrollment) => {
          try {
            const attendanceRes = await fetch(
              `${API_URL}/attendance/student/${student.student_id}/class/${selectedClassId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (attendanceRes.ok) {
              const attendanceData = await attendanceRes.json();
              return {
                ...student,
                attendance_percentage: attendanceData.attendance_percentage || 0,
              };
            }
          } catch (err) {
            console.error('Error fetching attendance:', err);
          }
          return { ...student, attendance_percentage: 0 };
        })
      );
      
      setStudents(studentsWithAttendance);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students',
        variant: 'destructive',
      });
    }
  };

  const fetchSchedules = async () => {
    if (!selectedClassId) return;

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/teachers/classes/${selectedClassId}/schedules`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const handleRemoveStudent = async (studentId: number) => {
    if (!selectedClassId) return;

    try {
      setRemovingIds(prev => new Set(prev).add(studentId));
      const token = localStorage.getItem('auth_token');
      const res = await fetch(
        `${API_URL}/teachers/classes/${selectedClassId}/students/${studentId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Failed to remove student');

      const data = await res.json();
      toast({
        title: 'Success',
        description: data.message,
      });

      setStudents(prev => prev.filter(s => s.student_id !== studentId));
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove student',
        variant: 'destructive',
      });
    } finally {
      setRemovingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });
    }
  };

  const handleAddStudent = async () => {
    if (!selectedClassId || !selectedStudentId) {
      toast({
        title: 'Error',
        description: 'Please select a student',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAddingStudent(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/teachers/classes/${selectedClassId}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ student_id: parseInt(selectedStudentId) }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to add student');
      }

      const data = await res.json();
      toast({
        title: 'Success',
        description: data.message,
      });

      setShowAddDialog(false);
      setSelectedStudentId('');
      fetchStudents();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add student',
        variant: 'destructive',
      });
    } finally {
      setAddingStudent(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!selectedClassId) return;

    if (!scheduleForm.start_time || !scheduleForm.end_time) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAddingSchedule(true);
      const token = localStorage.getItem('auth_token');
      
      // Check for schedule conflicts
      const dayOfWeek = parseInt(scheduleForm.day_of_week);
      const newStartTime = scheduleForm.start_time;
      const newEndTime = scheduleForm.end_time;
      
      const hasConflict = schedules.some(sched => {
        if (sched.day_of_week !== dayOfWeek) return false;
        
        // Check for time overlap: new schedule conflicts if it overlaps with existing
        return (newStartTime < sched.end_time && newEndTime > sched.start_time);
      });
      
      if (hasConflict) {
        toast({
          title: 'Schedule Conflict ⚠️',
          description: 'This time slot conflicts with an existing schedule on the same day. Please choose a different time.',
          variant: 'destructive',
        });
        setAddingSchedule(false);
        return;
      }
      
      const res = await fetch(`${API_URL}/teachers/classes/${selectedClassId}/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          day_of_week: parseInt(scheduleForm.day_of_week),
          start_time: scheduleForm.start_time,
          end_time: scheduleForm.end_time,
          room_number: scheduleForm.room_number || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to add schedule');
      }

      toast({
        title: 'Success',
        description: 'Schedule added successfully',
      });

      setShowScheduleDialog(false);
      setScheduleForm({
        day_of_week: '0',
        start_time: '09:00',
        end_time: '10:00',
        room_number: '',
      });
      fetchSchedules();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add schedule',
        variant: 'destructive',
      });
    } finally {
      setAddingSchedule(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!selectedClassId) return;

    try {
      setDeletingScheduleIds(prev => new Set(prev).add(scheduleId));
      const token = localStorage.getItem('auth_token');
      const res = await fetch(
        `${API_URL}/teachers/classes/${selectedClassId}/schedules/${scheduleId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Failed to delete schedule');

      toast({
        title: 'Success',
        description: 'Schedule deleted successfully',
      });

      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete schedule',
        variant: 'destructive',
      });
    } finally {
      setDeletingScheduleIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(scheduleId);
        return newSet;
      });
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copied! 📋',
      description: `Code "${code}" copied to clipboard`,
    });
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);

  if (loading && classes.length === 0) {
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
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-heading text-2xl font-bold">Enrollment Management</h1>
            <p className="text-muted-foreground">Manage enrollment codes, schedules, and student enrollments</p>
          </div>
        </div>

        {classes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No classes found. Create a class first.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Class Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Class</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedClassId?.toString()}
                  onValueChange={(value) => setSelectedClassId(parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.subject_code} - {cls.subject_name} (Year {cls.year}, Section {cls.section})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Enrollment Code Display */}
            {enrollmentCode && (
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Code className="h-5 w-5 text-primary" />
                        <p className="text-sm font-medium text-muted-foreground">Enrollment Code</p>
                      </div>
                      <p className="font-mono font-bold text-3xl text-primary mb-1">{enrollmentCode}</p>
                      <p className="text-sm text-muted-foreground">
                        Share this code with students to enroll in this class
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => copyToClipboard(enrollmentCode)}
                      className="gap-2"
                    >
                      <Copy className="h-5 w-5" />
                      Copy Code
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tabs for Schedules and Students */}
            <Tabs defaultValue="students" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="students" className="gap-2">
                  <Users className="h-4 w-4" />
                  Enrolled Students ({students.length})
                </TabsTrigger>
                <TabsTrigger value="schedules" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Class Schedule ({schedules.length})
                </TabsTrigger>
              </TabsList>

              {/* Students Tab */}
              <TabsContent value="students">
                <Card>
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <CardTitle>Enrolled Students</CardTitle>
                        {selectedClass && (
                          <CardDescription className="mt-1">
                            {selectedClass.subject_name} - Year {selectedClass.year}, Section {selectedClass.section}
                          </CardDescription>
                        )}
                      </div>
                      <Button
                        onClick={() => setShowAddDialog(true)}
                        className="gap-2"
                        size="sm"
                      >
                        <Plus className="h-4 w-4" />
                        Add Student
                      </Button>
                    </div>
                    {students.length > 0 && (
                      <div className="flex items-center gap-3">
                        <Label className="text-sm font-medium">Filter by Attendance:</Label>
                        <Select value={attendanceFilter} onValueChange={setAttendanceFilter}>
                          <SelectTrigger className="w-[220px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Students</SelectItem>
                            <SelectItem value="50">Less than 50%</SelectItem>
                            <SelectItem value="60">Less than 60%</SelectItem>
                            <SelectItem value="75">Less than 75%</SelectItem>
                            <SelectItem value="80">Less than 80%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    {students.length === 0 ? (
                      <div className="text-center py-12">
                        <User className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">No students enrolled</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Students can enroll using the code above, or you can add them manually
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Roll No.</TableHead>
                              <TableHead>Attendance %</TableHead>
                              <TableHead>Enrolled Date</TableHead>
                              <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {students
                              .filter((student) => {
                                const attendance = student.attendance_percentage || 0;
                                if (attendanceFilter === 'all') return true;
                                const threshold = parseInt(attendanceFilter);
                                return attendance < threshold;
                              })
                              .map((student, index) => (
                                <TableRow
                                  key={student.enrollment_id}
                                  className="animate-fade-in"
                                  style={{ animationDelay: `${index * 50}ms` }}
                                >
                                  <TableCell className="font-medium">{student.student_name}</TableCell>
                                  <TableCell className="text-sm">
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-4 w-4 text-muted-foreground" />
                                      {student.email}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {student.roll_number || '-'}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={
                                        (student.attendance_percentage || 0) >= 80
                                          ? 'bg-green-50 text-green-700 border-green-200'
                                          : (student.attendance_percentage || 0) >= 75
                                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                                          : (student.attendance_percentage || 0) >= 60
                                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                          : 'bg-red-50 text-red-700 border-red-200'
                                      }
                                    >
                                      {student.attendance_percentage || 0}%
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {new Date(student.enrolled_date).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveStudent(student.student_id)}
                                      disabled={removingIds.has(student.student_id)}
                                      className="gap-2 text-destructive hover:text-destructive"
                                    >
                                      {removingIds.has(student.student_id) ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                      Remove
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Schedules Tab */}
              <TabsContent value="schedules">
                <Card>
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Weekly Class Schedule</CardTitle>
                        <CardDescription className="mt-1">
                          Set class timings for each day of the week
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => setShowScheduleDialog(true)}
                        className="gap-2"
                        size="sm"
                      >
                        <Plus className="h-4 w-4" />
                        Add Schedule
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {schedules.length === 0 ? (
                      <div className="text-center py-12">
                        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">No schedules set</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Add class timings to help students know when classes occur
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {schedules.map((schedule) => (
                          <div
                            key={schedule.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-semibold">{DAYS[schedule.day_of_week]}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    {schedule.start_time} - {schedule.end_time}
                                  </span>
                                </div>
                                {schedule.room_number && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                      {schedule.room_number}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              disabled={deletingScheduleIds.has(schedule.id)}
                              className="gap-2 text-destructive hover:text-destructive"
                            >
                              {deletingScheduleIds.has(schedule.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Add Student Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Student to Class</DialogTitle>
            <DialogDescription>
              {selectedClass && `Add a student to ${selectedClass.subject_name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Sample Student 1</SelectItem>
                <SelectItem value="2">Sample Student 2</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Note: Only students not already enrolled in this class are shown
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={addingStudent}
            >
              Cancel
            </Button>
            <Button onClick={handleAddStudent} disabled={addingStudent || !selectedStudentId}>
              {addingStudent ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                'Add Student'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Class Schedule</DialogTitle>
            <DialogDescription>
              Set the day and time for this class
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Day of Week</Label>
              <Select
                value={scheduleForm.day_of_week}
                onValueChange={(value) =>
                  setScheduleForm({ ...scheduleForm, day_of_week: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={scheduleForm.start_time}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, start_time: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={scheduleForm.end_time}
                  onChange={(e) =>
                    setScheduleForm({ ...scheduleForm, end_time: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Room Number (Optional)</Label>
              <Input
                placeholder="e.g., A101, Lab-2"
                value={scheduleForm.room_number}
                onChange={(e) =>
                  setScheduleForm({ ...scheduleForm, room_number: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowScheduleDialog(false)}
              disabled={addingSchedule}
            >
              Cancel
            </Button>
            <Button onClick={handleAddSchedule} disabled={addingSchedule}>
              {addingSchedule ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                'Add Schedule'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
