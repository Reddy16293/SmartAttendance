import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { BookOpen, LogOut, Calendar, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function StudentEnrollment() {
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [enrolledClasses, setEnrolledClasses] = useState<EnrolledClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const navigate = useNavigate();

  // Fetch enrolled classes on mount
  useEffect(() => {
    fetchEnrolledClasses();
  }, []);

  const fetchEnrolledClasses = async () => {
    try {
      setLoadingClasses(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/enrollments/my-classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setEnrolledClasses(data);
      } else if (res.status === 401) {
        navigate('/login');
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!enrollmentCode.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an enrollment code',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/enrollments/enroll`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: enrollmentCode.toUpperCase() }),
      });

      if (res.ok) {
        toast({
          title: 'Success! 🎉',
          description: 'You have been enrolled in the class',
        });
        setEnrollmentCode('');
        fetchEnrolledClasses();
      } else {
        const err = await res.json();
        toast({
          title: 'Enrollment Failed',
          description: err.detail || 'Invalid enrollment code',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to enroll',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/login');
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">Class Enrollment</h1>
            <p className="text-muted-foreground text-sm md:text-base">Enroll in classes and view their schedules</p>
          </div>
          <Button variant="outline" onClick={handleLogout} size="sm" className="gap-1 md:gap-2 text-xs md:text-sm flex-shrink-0">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Enrollment Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Enroll in a Class</CardTitle>
              <CardDescription>Enter the enrollment code provided by your teacher</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEnroll} className="space-y-4">
                <div>
                  <Label htmlFor="code">Enrollment Code</Label>
                  <Input
                    id="code"
                    placeholder="e.g., ABC123"
                    value={enrollmentCode}
                    onChange={(e) => setEnrollmentCode(e.target.value.toUpperCase())}
                    className="font-mono text-center text-lg tracking-widest"
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Ask your teacher for the enrollment code
                  </p>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Enrolling...' : 'Enroll'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Enrolled Classes */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg md:text-xl flex items-center gap-2">
                  <BookOpen className="h-5 w-5 flex-shrink-0" />
                  <span>My Classes ({enrolledClasses.length})</span>
                </CardTitle>
                <CardDescription>Classes you are enrolled in</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingClasses ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading your classes...</p>
                  </div>
                ) : enrolledClasses.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground mb-4">
                      You haven't enrolled in any classes yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Enter an enrollment code on the left to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-4">
                    {enrolledClasses.map((cls) => (
                      <div key={cls.id} className="border rounded-lg p-3 md:p-4 hover:bg-accent transition">
                        <div className="mb-3">
                          <h3 className="font-bold text-base md:text-lg truncate">{cls.subject_name}</h3>
                          <p className="text-xs md:text-sm text-muted-foreground truncate">
                            {cls.teacher_name ? `👨‍🏫 ${cls.teacher_name}` : 'Teacher TBA'} • Year {cls.year} Section {cls.section}
                          </p>
                        </div>

                        {cls.schedules.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs md:text-sm font-semibold text-muted-foreground">
                              Weekly Schedule:
                            </p>
                            {cls.schedules.map((schedule) => (
                              <div
                                key={schedule.id}
                                className="flex items-center gap-2 md:gap-3 text-xs md:text-sm bg-muted p-2 rounded"
                              >
                                <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium w-16 md:w-20 flex-shrink-0">{DAYS[schedule.day_of_week]}</span>
                                <span className="flex-1 truncate">{schedule.start_time} - {schedule.end_time}</span>
                                {schedule.room_number && (
                                  <>
                                    <span className="text-muted-foreground">•</span>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <MapPin className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                                      <span className="text-xs">{schedule.room_number}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs md:text-sm text-muted-foreground">
                            Schedule not yet published
                          </p>
                        )}

                        <p className="text-xs text-muted-foreground mt-3">
                          Enrolled on {new Date(cls.enrolled_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
