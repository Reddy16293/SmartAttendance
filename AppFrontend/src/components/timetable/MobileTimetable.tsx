import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import { Clock, MapPin, BookOpen, User, AlertTriangle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { config } from '../../config';

interface ClassSchedule {
  class_id: number;
  subject_name: string;
  subject_code: string;
  year: number;
  section: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room_number: string | null;
  teacher_name?: string;
}

interface MobileTimetableProps {
  userRole: 'professor' | 'student';
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

const COLOR_PALETTE = [
  '#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6B9D', '#FF8C42', '#9D4EDD'
];

export const MobileTimetable: React.FC<MobileTimetableProps> = ({ userRole }) => {
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay() > 0 && new Date().getDay() < 6 ? new Date().getDay() - 1 : 0);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('auth_token');

      let subjectMap: Record<number, { name: string; code: string }> = {};

      if (userRole === 'professor') {
        const subjectsRes = await fetch(`${config.apiUrl}/teachers/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const subjects = subjectsRes.ok ? await subjectsRes.json() : [];
        subjects.forEach((subject: any) => {
          subjectMap[subject.id] = { name: subject.name, code: subject.code };
        });
      }

      const classesEndpoint = userRole === 'professor'
        ? `${config.apiUrl}/teachers/classes`
        : `${config.apiUrl}/enrollments/my-classes`;

      const classesResponse = await fetch(classesEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!classesResponse.ok) throw new Error('Failed to fetch classes');

      const classesData = await classesResponse.json();
      const allSchedules: ClassSchedule[] = [];

      for (const classItem of classesData) {
        try {
          const scheduleEndpoint = userRole === 'professor'
            ? `${config.apiUrl}/teachers/classes/${classItem.id}/schedules`
            : `${config.apiUrl}/enrollments/schedules/class/${classItem.id}`;

          const scheduleResponse = await fetch(scheduleEndpoint, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (scheduleResponse.ok) {
            const schedules = await scheduleResponse.json();

            schedules.forEach((schedule: any) => {
              let subjectName = 'Unknown';
              let subjectCode = 'N/A';

              if (userRole === 'professor') {
                const mappedSubject = subjectMap[classItem.subject_id];
                if (mappedSubject) {
                  subjectName = mappedSubject.name;
                  subjectCode = mappedSubject.code;
                } else {
                  subjectName = classItem.subject?.name || classItem.subject_name || 'Unknown';
                  subjectCode = classItem.subject?.code || classItem.subject_code || 'N/A';
                }
              } else {
                subjectName = classItem.subject?.name || classItem.subject_name || 'Unknown';
                subjectCode = classItem.subject?.code || classItem.subject_code || 'N/A';
              }

              allSchedules.push({
                class_id: classItem.id,
                subject_name: subjectName,
                subject_code: subjectCode,
                year: classItem.year,
                section: classItem.section,
                teacher_name: classItem.teacher_name,
                day_of_week: schedule.day_of_week,
                start_time: schedule.start_time,
                end_time: schedule.end_time,
                room_number: schedule.room_number,
              });
            });
          }
        } catch (error) {
          console.error(`Failed to fetch schedule for class ${classItem.id}`);
        }
      }

      setClasses(allSchedules);
    } catch (error) {
      console.error('Error loading timetable:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [userRole]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedules();
  };

  const subjectColorMap = useMemo(() => {
    const uniqueSubjects = Array.from(new Set(classes.map((c) => c.subject_code)));
    const colorMap: Record<string, string> = {};
    uniqueSubjects.forEach((subject, index) => {
      colorMap[subject] = COLOR_PALETTE[index % COLOR_PALETTE.length];
    });
    return colorMap;
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes
      .filter(c => c.day_of_week === selectedDay)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [classes, selectedDay]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading timetable...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isLandscape && styles.containerLandscape]}>
      <View style={[styles.daySelector, isLandscape && styles.daySelectorLandscape]}>
        {DAY_SHORT.map((day, index) => (
          <TouchableOpacity 
            key={day} 
            style={[styles.dayButton, isLandscape && styles.dayButtonLandscape, selectedDay === index && styles.selectedDayButton]}
            onPress={() => setSelectedDay(index)}
          >
            <Text style={[styles.dayButtonText, selectedDay === index && styles.selectedDayButtonText]}>
              {day}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={[styles.scheduleList, isLandscape && styles.scheduleListLandscape]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.dayTitle}>{DAYS[selectedDay]}</Text>
        
        {filteredClasses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AlertTriangle size={48} color={Colors.light.mutedForeground} opacity={0.3} />
            <Text style={styles.emptyText}>No lectures scheduled for this day</Text>
          </View>
        ) : (
          filteredClasses.map((cls, index) => (
            <View key={index} style={styles.classCard}>
              <View style={[styles.colorBar, { backgroundColor: subjectColorMap[cls.subject_code] }]} />
              <View style={styles.cardContent}>
                <View style={styles.timeRow}>
                  <Clock size={16} color={Colors.light.primary} />
                  <Text style={styles.timeText}>{cls.start_time.substring(0, 5)} - {cls.end_time.substring(0, 5)}</Text>
                </View>
                
                <Text style={styles.subjectName}>{cls.subject_name}</Text>
                <Text style={styles.subjectCode}>{cls.subject_code}</Text>
                
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <MapPin size={14} color={Colors.light.mutedForeground} />
                    <Text style={styles.detailText}>{cls.room_number || 'TBA'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <BookOpen size={14} color={Colors.light.mutedForeground} />
                    <Text style={styles.detailText}>Sec {cls.section}</Text>
                  </View>
                </View>

                {userRole === 'student' && cls.teacher_name && (
                  <View style={[styles.detailItem, { marginTop: 8 }]}>
                    <User size={14} color={Colors.light.mutedForeground} />
                    <Text style={styles.detailText}>{cls.teacher_name}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerLandscape: {
    flexDirection: 'row',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: Colors.light.mutedForeground,
  },
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  daySelectorLandscape: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    gap: 8,
    width: 96,
    borderBottomWidth: 0,
    borderRightWidth: 1,
    borderRightColor: Colors.light.border,
    paddingVertical: 16,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.accent,
  },
  dayButtonLandscape: {
    alignItems: 'center',
  },
  selectedDayButton: {
    backgroundColor: Colors.light.primary,
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.mutedForeground,
  },
  selectedDayButtonText: {
    color: 'white',
  },
  scheduleList: {
    flex: 1,
    padding: 16,
  },
  scheduleListLandscape: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    color: Colors.light.mutedForeground,
    fontSize: 15,
  },
  classCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  colorBar: {
    width: 6,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },
  subjectCode: {
    fontSize: 13,
    color: Colors.light.mutedForeground,
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: Colors.light.mutedForeground,
  },
});
