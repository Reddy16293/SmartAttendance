import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { toast } from '@/hooks/use-toast';
import { Copy, Trash2, Plus, Clock, X } from 'lucide-react';

interface EnrollmentCode {
  id: number;
  code: string;
  is_active: boolean;
  created_at: string;
}

interface ClassSchedule {
  id: number;
  class_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number?: string;
  created_at: string;
  updated_at: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
}

interface TeacherClass {
  id: number;
  subject_id: number;
  year: number;
  section: string;
  subject_name?: string;
  subject_code?: string;
}

interface ClassWithDetails {
  classId: number;
  subjectName: string;
  subjectCode: string;
  enrollmentCode: string;
  year: number;
  section: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function TeacherEnrollmentDashboard() {
  const [classesWithDetails, setClassesWithDetails] = useState<ClassWithDetails[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [currentEnrollmentCode, setCurrentEnrollmentCode] = useState<string>('');
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  // New code/schedule state
  const [newDay, setNewDay] = useState<string>('0');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [roomNumber, setRoomNumber] = useState<string>('');

  // Fetch teacher's classes with enrollment codes on mount
  useEffect(() => {
    fetchClassesWithEnrollmentCodes();
  }, []);

  // Fetch schedules when class is selected
  useEffect(() => {
    if (selectedClass) {
      fetchSchedules();
      // Update current enrollment code
      const selected = classesWithDetails.find(c => c.classId.toString() === selectedClass);
      if (selected) {
        setCurrentEnrollmentCode(selected.enrollmentCode);
      }
    }
  }, [selectedClass, classesWithDetails]);

  const fetchClassesWithEnrollmentCodes = async () => {
    try {
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

      const classes: TeacherClass[] = await classesRes.json();
      const subjects: Subject[] = subjectsRes.ok ? await subjectsRes.json() : [];
      const subjectMap = new Map<number, { name: string; code: string }>();
      subjects.forEach((s) => subjectMap.set(s.id, { name: s.name, code: s.code }));

      // Step 2: Fetch enrollment codes for all classes in ONE batch call
      const classIds = classes.map(c => c.id);
      const codesRes = await fetch(`${API_URL}/enrollments/codes/batch`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ class_ids: classIds }),
      });

      const codesData = codesRes.ok ? await codesRes.json() : {};

      // Step 3: Build class details with enrollment codes
      const classDetails: ClassWithDetails[] = [];
      for (const cls of classes) {
        const codes = codesData[cls.id] || [];
        const activeCode = codes.find((c: { is_active: boolean; code: string }) => c.is_active);
        const subject = subjectMap.get(cls.subject_id);

        if (activeCode) {
          classDetails.push({
            classId: cls.id,
            subjectName: subject?.name || cls.subject_name || 'Unknown Subject',
            subjectCode: subject?.code || cls.subject_code || 'N/A',
            enrollmentCode: activeCode.code,
            year: cls.year,
            section: cls.section,
          });
        }
      }

      setClassesWithDetails(classDetails);
      if (classDetails.length > 0) {
        setSelectedClass(classDetails[0].classId.toString());
        setCurrentEnrollmentCode(classDetails[0].enrollmentCode);
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load classes with enrollment codes',
        variant: 'destructive',
      });
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await fetch(`${API_URL}/enrollments/schedules/class/${selectedClass}`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
    } catch (error) {
      console.error('Failed to load schedules:', error);
    }
  };

  const createSchedule = async () => {
    if (!selectedClass) {
      toast({
        title: 'Error',
        description: 'Please select a class first',
        variant: 'destructive',
      });
      return;
    }

    if (!startTime || !endTime) {
      toast({
        title: 'Error',
        description: 'Please fill in all time fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/enrollments/schedules?class_id=${selectedClass}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          day_of_week: parseInt(newDay),
          start_time: startTime,
          end_time: endTime,
          room_number: roomNumber || null,
        }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Class schedule created',
        });
        setStartTime('09:00');
        setEndTime('10:00');
        setRoomNumber('');
        fetchSchedules();
      } else {
        const err = await res.json();
        toast({
          title: 'Error',
          description: err.detail || 'Failed to create schedule',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create schedule',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSchedule = async (scheduleId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/enrollments/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Schedule deleted',
        });
        fetchSchedules();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete schedule',
        variant: 'destructive',
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

  const selectedClassDetails = classesWithDetails.find(c => c.classId.toString() === selectedClass);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Enrollment Management</h1>
          <p className="text-muted-foreground">Manage enrollment codes and class schedules</p>
        </div>

        {/* Class Selection with Enrollment Code Display */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Class</CardTitle>
            <CardDescription>Choose a class to manage its schedules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classesWithDetails.map((cls) => (
                  <SelectItem key={cls.classId} value={cls.classId.toString()}>
                    {cls.subjectCode} - {cls.subjectName} (Year {cls.year}, Section {cls.section})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedClassDetails && (
              <div className="flex items-center justify-between p-4 bg-primary/10 border-2 border-primary/20 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Enrollment Code for this class:</p>
                  <p className="font-mono font-bold text-2xl text-primary">{currentEnrollmentCode}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Share this code with students to enroll
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => copyToClipboard(currentEnrollmentCode)}
                  className="gap-2"
                >
                  <Copy className="h-5 w-5" />
                  Copy Code
                </Button>
              </div>
            )}

            {classesWithDetails.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-2">No classes with enrollment codes found</p>
                <p className="text-sm text-muted-foreground">
                  Create a class first - enrollment codes are generated automatically!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedClass && (
          <div className="grid grid-cols-1 gap-6">
            {/* Class Schedules Section */}
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" /> Weekly Schedule
              </CardTitle>
              <CardDescription>Set class timings for each day of the week</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 p-3 bg-muted rounded-lg">
                <div>
                  <Label>Day of Week</Label>
                  <Select value={newDay} onValueChange={setNewDay}>
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Room Number (Optional)</Label>
                  <Input
                    placeholder="e.g., A101, Lab-2"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                  />
                </div>

                <Button onClick={createSchedule} disabled={loading} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Schedule
                </Button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {schedules.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No schedules yet
                  </p>
                ) : (
                  schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">{DAYS[schedule.day_of_week]}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.start_time} - {schedule.end_time}
                          {schedule.room_number && ` • Room ${schedule.room_number}`}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteSchedule(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          </div>
        )}
      </div>
    </div>
  );
}
