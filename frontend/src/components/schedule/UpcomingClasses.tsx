import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Calendar, Clock, MapPin, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ClassSchedule {
  class_id: number;
  subject_name: string;
  subject_code: string;
  year: number;
  section: string;
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
  room_number: string | null;
  teacher_name?: string;
}

interface UpcomingClassesProps {
  userRole: 'professor' | 'student';
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const UpcomingClasses: React.FC<UpcomingClassesProps> = ({ userRole }) => {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayClasses, setTodayClasses] = useState<ClassSchedule[]>([]);
  const [tomorrowClasses, setTomorrowClasses] = useState<ClassSchedule[]>([]);
  const [weekClasses, setWeekClasses] = useState<ClassSchedule[]>([]);
  const [subjectMap, setSubjectMap] = useState<Record<number, { name: string; code: string }>>({});

  useEffect(() => {
    fetchSchedules();
  }, [userRole]);

  const fetchSubjects = async () => {
    if (userRole !== 'professor') return {};

    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/teachers/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const subjects = await res.json();
        const map: Record<number, { name: string; code: string }> = {};
        subjects.forEach((subject: any) => {
          map[subject.id] = { name: subject.name, code: subject.code };
        });
        setSubjectMap(map);
        return map;
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
    return {};
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      const subjects = await fetchSubjects();
      
      // Get all classes for the user
      const classesEndpoint = userRole === 'professor' 
        ? `${API_URL}/teachers/classes`
        : `${API_URL}/enrollments/my-classes`;
        
      const classesResponse = await fetch(classesEndpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!classesResponse.ok) throw new Error('Failed to fetch classes');

      const classesData = await classesResponse.json();
      console.log(`📚 Classes data for ${userRole}:`, classesData);
      const allSchedules: ClassSchedule[] = [];
      
      // Fetch all schedules in ONE batch call instead of sequential calls
      const class_ids = classesData.map((c: any) => c.id);
      
      try {
        const batchResponse = await fetch(`${API_URL}/enrollments/schedules/batch`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ class_ids }),
        });

        const schedulesByClassId = batchResponse.ok ? await batchResponse.json() : {};

        classesData.forEach((classItem: any) => {
          const schedules = schedulesByClassId[classItem.id] || [];
          
          console.log(`📅 Class ${classItem.id}:`, {
            name: classItem.subject_name,
            subject: classItem.subject,
            subject_id: classItem.subject_id,
            schedules: schedules
          });

          schedules.forEach((schedule: any) => {
            // Extract subject info - map by subject_id for professors, or use class fields if present
            const mappedSubject = subjects[classItem.subject_id] || subjectMap[classItem.subject_id];
            const subjectName = mappedSubject?.name || classItem.subject?.name || classItem.subject_name || 'Unknown';
            const subjectCode = mappedSubject?.code || classItem.subject?.code || classItem.subject_code || 'N/A';
            
            allSchedules.push({
              class_id: classItem.id,
              subject_name: subjectName,
              subject_code: subjectCode,
              year: classItem.year,
              section: classItem.section,
              teacher_name: classItem.teacher_name,
              day_of_week: schedule.day_of_week,
              day_name: DAYS[schedule.day_of_week],
              start_time: schedule.start_time,
              end_time: schedule.end_time,
              room_number: schedule.room_number || null,
            });
          });
        });
      } catch (error) {
        console.error(`Failed to fetch schedules batch:`, error);
      }

      setClasses(allSchedules);
      categorizeClasses(allSchedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load upcoming classes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const categorizeClasses = (allSchedules: ClassSchedule[]) => {
    const today = new Date().getDay();
    // Backend uses Monday=0 ... Sunday=6
    const todayIndex = today === 0 ? 6 : today - 1;
    const tomorrowIndex = (todayIndex + 1) % 7;

    const todayList = allSchedules.filter((c) => c.day_of_week === todayIndex);
    const tomorrowList = allSchedules.filter((c) => c.day_of_week === tomorrowIndex);
    const weekList = allSchedules.sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) {
        return a.day_of_week - b.day_of_week;
      }
      return a.start_time.localeCompare(b.start_time);
    });

    setTodayClasses(todayList);
    setTomorrowClasses(tomorrowList);
    setWeekClasses(weekList);
  };

  const ClassCard = ({ schedule }: { schedule: ClassSchedule }) => (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold">
              {schedule.subject_name} ({schedule.subject_code})
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            Year {schedule.year}, Section {schedule.section}
          </p>
          {userRole === 'student' && schedule.teacher_name && (
            <p className="text-sm text-gray-600">
              Prof. {schedule.teacher_name}
            </p>
          )}
        </div>
        <Badge variant="outline">{schedule.day_name}</Badge>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-700 mt-3">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}</span>
        </div>
        {schedule.room_number && (
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{schedule.room_number}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin mr-2" />
          <span>Loading upcoming classes...</span>
        </CardContent>
      </Card>
    );
  }

  if (classes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Classes</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="font-medium">No scheduled classes</p>
          <p className="text-sm">
            {userRole === 'professor'
              ? 'Add schedules to your classes to see them here'
              : 'Your professors haven\'t added class schedules yet'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today's Classes */}
      {todayClasses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              Today's Classes
              <Badge variant="default" className="ml-2">{todayClasses.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayClasses.map((schedule, index) => (
              <ClassCard key={index} schedule={schedule} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tomorrow's Classes */}
      {tomorrowClasses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Tomorrow's Classes
              <Badge variant="outline" className="ml-2">{tomorrowClasses.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tomorrowClasses.map((schedule, index) => (
              <ClassCard key={index} schedule={schedule} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* This Week */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            This Week's Schedule
            <Badge variant="secondary" className="ml-2">{weekClasses.length} classes</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {weekClasses.map((schedule, index) => (
            <ClassCard key={index} schedule={schedule} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default UpcomingClasses;
