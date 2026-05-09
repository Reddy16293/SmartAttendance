import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Clock3, MapPin, BookOpen, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '../../../src/config';
import { Colors } from '../../../src/constants/Colors';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../src/components/ui/Card';
import { resolveClassSubjectCode, resolveClassSubjectName } from '../../../src/utils/classLabels';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface TeacherClass {
  id: number;
  subject_id: number;
  year: number;
  section: string;
}

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

interface UpcomingItem {
  classId: number;
  scheduleId: number;
  subjectName: string;
  subjectCode: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomNumber?: string;
  year: number;
  section: string;
}

function formatTime(value: string) {
  return value ? value.slice(0, 5) : '--:--';
}

function getNextDateForDay(dayOfWeek: number) {
  const today = new Date();
  const todayDay = today.getDay();
  const distance = (dayOfWeek - todayDay + 7) % 7;
  const next = new Date(today);
  next.setDate(today.getDate() + distance);
  return next;
}

function toSortableTimestamp(dayOfWeek: number, startTime: string) {
  const date = getNextDateForDay(dayOfWeek);
  const [hh, mm] = startTime.split(':').map(Number);
  date.setHours(Number.isNaN(hh) ? 0 : hh, Number.isNaN(mm) ? 0 : mm, 0, 0);
  return date.getTime();
}

export default function ProfessorScheduleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ classId?: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<UpcomingItem[]>([]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');

      const [classesRes, subjectsRes] = await Promise.all([
        fetch(`${config.apiUrl}/teachers/classes`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${config.apiUrl}/teachers/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!classesRes.ok || !subjectsRes.ok) {
        return;
      }

      const classes: TeacherClass[] = await classesRes.json();
      const subjects: Subject[] = await subjectsRes.json();
      const subjectMap = new Map(subjects.map((s) => [Number(s.id), s]));

      // Filter classes if classId param is provided
      const classIdParam = params.classId ? parseInt(params.classId, 10) : null;
      const classesToProcess = classIdParam 
        ? classes.filter((cls) => cls.id === classIdParam)
        : classes;

      const nextItems: UpcomingItem[] = [];
      for (const cls of classesToProcess) {
        const scheduleRes = await fetch(`${config.apiUrl}/enrollments/schedules/class/${cls.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!scheduleRes.ok) {
          continue;
        }

        const schedules: ClassSchedule[] = await scheduleRes.json();
        const subject = subjectMap.get(cls.subject_id);

        for (const schedule of schedules) {
          nextItems.push({
            classId: cls.id,
            scheduleId: schedule.id,
            subjectName: resolveClassSubjectName(cls, subjectMap),
            subjectCode: resolveClassSubjectCode(cls, subjectMap),
            dayOfWeek: schedule.day_of_week,
            startTime: schedule.start_time,
            endTime: schedule.end_time,
            roomNumber: schedule.room_number,
            year: cls.year,
            section: cls.section,
          });
        }
      }

      setItems(nextItems);
    } catch (error) {
      console.error('Failed to load schedule:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadSchedule();
  };

  const upcomingClasses = useMemo(() => {
    return [...items]
      .sort((a, b) => toSortableTimestamp(a.dayOfWeek, a.startTime) - toSortableTimestamp(b.dayOfWeek, b.startTime))
      .slice(0, 8);
  }, [items]);

  const groupedByDay = useMemo(() => {
    const groups: Record<number, UpcomingItem[]> = {};
    for (const item of items) {
      if (!groups[item.dayOfWeek]) {
        groups[item.dayOfWeek] = [];
      }
      groups[item.dayOfWeek].push(item);
    }

    Object.keys(groups).forEach((dayKey) => {
      groups[Number(dayKey)].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return groups;
  }, [items]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Schedule</Text>
        <Text style={styles.subtitle}>Upcoming classes and weekly plan</Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/(professor)/timetable')}>
          <Clock3 size={18} color={Colors.light.primary} />
          <Text style={styles.actionTitle}>Weekly Timetable</Text>
          <ChevronRight size={16} color={Colors.light.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/(professor)/sessions')}>
          <CalendarDays size={18} color={Colors.light.success} />
          <Text style={styles.actionTitle}>Attendance Sessions</Text>
          <ChevronRight size={16} color={Colors.light.mutedForeground} />
        </TouchableOpacity>
      </View>

      <Card style={styles.sectionCard}>
        <CardHeader>
          <CardTitle>Next Classes</CardTitle>
          <CardDescription>Nearest upcoming teaching slots</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !refreshing ? (
            <ActivityIndicator size="small" color={Colors.light.primary} style={{ marginVertical: 20 }} />
          ) : upcomingClasses.length === 0 ? (
            <Text style={styles.emptyText}>No scheduled classes found.</Text>
          ) : (
            upcomingClasses.map((item) => (
              <View key={`${item.classId}-${item.scheduleId}`} style={styles.upcomingItem}>
                <View style={styles.upcomingTop}>
                  <Text style={styles.subjectName}>{item.subjectName}</Text>
                  <Text style={styles.subjectCode}>{item.subjectCode}</Text>
                </View>
                <View style={styles.metaRow}>
                  <CalendarDays size={13} color={Colors.light.mutedForeground} />
                  <Text style={styles.metaText}>{DAYS[item.dayOfWeek]}</Text>
                  <Clock3 size={13} color={Colors.light.mutedForeground} />
                  <Text style={styles.metaText}>{formatTime(item.startTime)} - {formatTime(item.endTime)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <BookOpen size={13} color={Colors.light.mutedForeground} />
                  <Text style={styles.metaText}>Year {item.year}, Section {item.section}</Text>
                  {item.roomNumber ? (
                    <>
                      <MapPin size={13} color={Colors.light.mutedForeground} />
                      <Text style={styles.metaText}>{item.roomNumber}</Text>
                    </>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </CardContent>
      </Card>

      <Card style={styles.sectionCard}>
        <CardHeader>
          <CardTitle>Weekly Overview</CardTitle>
          <CardDescription>All sessions grouped by day</CardDescription>
        </CardHeader>
        <CardContent>
          {[1, 2, 3, 4, 5, 6, 0].map((day) => (
            <View key={day} style={styles.dayBlock}>
              <Text style={styles.dayLabel}>{DAYS[day]}</Text>
              {groupedByDay[day]?.length ? (
                groupedByDay[day].map((item) => (
                  <Text key={`${item.classId}-${item.scheduleId}`} style={styles.dayClassText}>
                    {formatTime(item.startTime)} - {formatTime(item.endTime)}  {item.subjectCode} (Y{item.year}-{item.section})
                  </Text>
                ))
              ) : (
                <Text style={styles.dayEmpty}>No classes</Text>
              )}
            </View>
          ))}
        </CardContent>
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.light.text,
  },
  subtitle: {
    marginTop: 4,
    color: Colors.light.mutedForeground,
    fontSize: 14,
  },
  actionsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  actionCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.light.mutedForeground,
    paddingVertical: 10,
  },
  upcomingItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    gap: 6,
  },
  upcomingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
  },
  subjectCode: {
    color: Colors.light.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaText: {
    marginRight: 10,
    color: Colors.light.mutedForeground,
    fontSize: 12,
  },
  dayBlock: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    backgroundColor: Colors.light.accent,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  dayClassText: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    marginBottom: 2,
  },
  dayEmpty: {
    fontSize: 12,
    color: Colors.light.mutedForeground,
    fontStyle: 'italic',
  },
});
