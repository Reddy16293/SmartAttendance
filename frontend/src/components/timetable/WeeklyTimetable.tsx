import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';

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

interface TimetableProps {
  userRole: 'professor' | 'student';
}

// Predefined color palette for subjects
const COLOR_PALETTE = [
  { bg: '#FF6B6B', text: '#FFFFFF' }, // Red
  { bg: '#4ECDC4', text: '#FFFFFF' }, // Teal
  { bg: '#FFD93D', text: '#000000' }, // Yellow
  { bg: '#6BCB77', text: '#FFFFFF' }, // Green
  { bg: '#4D96FF', text: '#FFFFFF' }, // Blue
  { bg: '#FF6B9D', text: '#FFFFFF' }, // Pink
  { bg: '#FF8C42', text: '#FFFFFF' }, // Orange
  { bg: '#9D4EDD', text: '#FFFFFF' }, // Purple
  { bg: '#06FFA5', text: '#000000' }, // Mint
  { bg: '#F77F00', text: '#FFFFFF' }, // Burnt Orange
  { bg: '#06D6A0', text: '#FFFFFF' }, // Turquoise
  { bg: '#E63946', text: '#FFFFFF' }, // Crimson
  { bg: '#118AB2', text: '#FFFFFF' }, // Dark Blue
  { bg: '#9B59B6', text: '#FFFFFF' }, // Lavender
  { bg: '#F39C12', text: '#FFFFFF' }, // Gold
  { bg: '#16A085', text: '#FFFFFF' }, // Sea Green
];

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const TIME_SLOTS = ['8-9', '9-10', '10-11', '11-12', '12-1', '1-2', '2-3', '3-4', '4-5', '5-6'];

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const Timetable: React.FC<TimetableProps> = ({ userRole }) => {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const timetableRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, [userRole]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      // Fetch subjects - only for professors
      let subjectMap: Record<number, { name: string; code: string }> = {};

      if (userRole === 'professor') {
        const subjectsRes = await fetch(`${API_URL}/teachers/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const subjects = subjectsRes.ok ? await subjectsRes.json() : [];
        subjects.forEach((subject: any) => {
          subjectMap[subject.id] = { name: subject.name, code: subject.code };
        });
      }

      // Get all classes for the user
      const classesEndpoint = userRole === 'professor'
        ? `${API_URL}/teachers/classes`
        : `${API_URL}/enrollments/my-classes`;

      const classesResponse = await fetch(classesEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!classesResponse.ok) throw new Error('Failed to fetch classes');

      const classesData = await classesResponse.json();

      // Fetch all schedules in ONE batch call instead of sequential calls
      const allSchedules: ClassSchedule[] = [];
      const class_ids = classesData.map((c: any) => c.id);

      try {
        // Use batch endpoint to fetch all schedules at once
        const batchEndpoint = userRole === 'professor'
          ? `${API_URL}/enrollments/schedules/batch`
          : `${API_URL}/enrollments/schedules/batch`;

        const batchResponse = await fetch(batchEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ class_ids }),
        });

        const schedulesByClassId = batchResponse.ok ? await batchResponse.json() : {};

        // Process all schedules
        classesData.forEach((classItem: any) => {
          const schedules = schedulesByClassId[classItem.id] || [];

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

            const subject = { name: subjectName, code: subjectCode };

            console.log(`  ➡️ Adding schedule:`, {
              subject: subject.code,
              day: schedule.day_of_week,
              time: schedule.start_time,
              room: schedule.room_number,
            });

            allSchedules.push({
              class_id: classItem.id,
              subject_name: subject.name,
              subject_code: subject.code,
              year: classItem.year,
              section: classItem.section,
              teacher_name: classItem.teacher_name,
              day_of_week: schedule.day_of_week,
              start_time: schedule.start_time,
              end_time: schedule.end_time,
              room_number: schedule.room_number,
            });
          });
        });
      } catch (error) {
        console.error('Failed to fetch schedules batch:', error);
      }

      setClasses(allSchedules);
      console.log('✅ Timetable loaded:', allSchedules.length, 'total schedules');
      console.log('📊 All schedules:', allSchedules);
    } catch (error) {
      console.error('❌ Error loading timetable:', error);
      toast({
        title: 'Error',
        description: 'Failed to load timetable',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate subject → color mapping dynamically
  const subjectColorMap = useMemo(() => {
    const uniqueSubjects = Array.from(new Set(classes.map((c) => c.subject_code)));
    const colorMap: Record<string, { bg: string; text: string }> = {};

    uniqueSubjects.forEach((subject, index) => {
      colorMap[subject] = COLOR_PALETTE[index % COLOR_PALETTE.length];
    });

    return colorMap;
  }, [classes]);

  // Helper: Convert time to slot index
  const getTimeSlotIndex = (startTime: string): number => {
    if (!startTime) {
      console.warn('⚠️ No start time provided');
      return -1;
    }

    // Parse time in HH:MM or HH:MM:SS format (24-hour)
    const timeParts = startTime.split(':');
    const hour = parseInt(timeParts[0], 10);

    // Time slots: 8-9, 9-10, 10-11, 11-12, 12-1, 1-2, 2-3, 3-4, 4-5, 5-6
    // Map: 8→0, 9→1, 10→2, 11→3, 12→4, 13→5, 14→6, 15→7, 16→8, 17→9
    if (hour >= 8 && hour <= 17) {
      return hour - 8;
    }

    console.warn(`⚠️ Time ${startTime} (hour=${hour}) is outside 8 AM - 6 PM range`);
    return -1;
  };

  // Helper: Get day index (Backend: Monday=0 ... Sunday=6)
  const getDayIndex = (dayOfWeek: number): number => {
    // We only show Mon-Fri, so: Mon=0→0, Tue=1→1, Wed=2→2, Thu=3→3, Fri=4→4
    if (dayOfWeek >= 0 && dayOfWeek <= 4) {
      return dayOfWeek;
    }
    return -1;
  };

  // Build timetable grid - now supports multiple classes per slot
  const timetableGrid = useMemo(() => {
    const grid: (ClassSchedule[] | null)[][] = Array(5)
      .fill(null)
      .map(() => Array(10).fill(null).map(() => []));

    console.log('🔨 Building timetable grid from', classes.length, 'classes');

    const unplacedClasses: ClassSchedule[] = [];

    classes.forEach((cls, index) => {
      const dayIdx = getDayIndex(cls.day_of_week);
      const timeIdx = getTimeSlotIndex(cls.start_time);

      console.log(`📍 Class ${index + 1}:`, {
        subject: `${cls.subject_code} (${cls.subject_name})`,
        day: cls.day_of_week,
        dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][cls.day_of_week] || 'Unknown',
        dayIdx,
        time: cls.start_time,
        timeIdx,
        timeSlot: TIME_SLOTS[timeIdx] || 'Invalid',
        room: cls.room_number,
        willBePlaced: dayIdx >= 0 && dayIdx < 5 && timeIdx >= 0 && timeIdx < 10,
      });

      if (dayIdx >= 0 && dayIdx < 5 && timeIdx >= 0 && timeIdx < 10) {
        grid[dayIdx][timeIdx]!.push(cls);
        if (grid[dayIdx][timeIdx]!.length > 1) {
          console.warn(
            `⚠️ MULTI-CLASS SLOT at ${DAYS[dayIdx]} ${TIME_SLOTS[timeIdx]}:`,
            grid[dayIdx][timeIdx]!.map((c) => c.subject_code).join(', '),
          );
        }
      } else {
        console.error(`❌ Class NOT PLACED: "${cls.subject_code}"`, {
          reason: dayIdx < 0 || dayIdx >= 5 ? 'Invalid day (not Mon-Fri)' : 'Invalid time slot',
          dayIdx,
          timeIdx,
        });
        unplacedClasses.push(cls);
      }
    });

    if (unplacedClasses.length > 0) {
      console.error(`🚨 ${unplacedClasses.length} classes could not be placed:`, unplacedClasses);
    }

    return grid;
  }, [classes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const totalSubjects = Object.keys(subjectColorMap).length;
  const hasClasses = classes.length > 0;
  const gridColumns = 'grid grid-cols-[64px_repeat(10,minmax(80px,1fr))] gap-2';

  const handleDownload = async () => {
    if (!timetableRef.current) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(timetableRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      link.download = `timetable-${userRole}-${stamp}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to download timetable image:', error);
      toast({
        title: 'Download failed',
        description: 'Unable to export the timetable image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          Weekly Studio
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {downloading ? 'Exporting...' : 'Download Image'}
        </button>
      </div>

      <div
        ref={timetableRef}
        className="relative mx-auto w-full max-w-none overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-2xl font-space"
      >
        <div className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.28),_transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-24 left-0 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_70%)]" />

        <div className="relative p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 font-unbounded">
                Timetable Flow
              </h2>
              <p className="text-sm text-slate-600 max-w-lg">
                A bold, visual schedule surface built for quick scanning, collision visibility, and multi-class clarity.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Mon-Fri
                </span>
                <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  8AM - 6PM
                </span>
                <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  {classes.length} Sessions
                </span>
                <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                  {totalSubjects} Subjects
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p>
                <p className="text-sm font-bold text-slate-900">
                  {userRole === 'professor' ? 'Professor' : 'Student'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mode</p>
                <p className="text-sm font-bold text-slate-900">Live Grid</p>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto md:overflow-x-hidden">
            {hasClasses ? (
              <div className="w-full min-w-[720px] md:min-w-0 space-y-2">
                <div className={`${gridColumns} items-center text-xs font-semibold uppercase tracking-widest text-slate-500`}>
                  <div className="pl-2">Day</div>
                  {TIME_SLOTS.map((slot) => (
                    <div
                      key={slot}
                      className="rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-center text-slate-700 shadow-sm"
                    >
                      {slot}
                    </div>
                  ))}
                </div>

                {DAYS.map((day, dayIdx) => (
                  <div key={day} className={`${gridColumns} items-stretch`}>
                    <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-100 px-2 text-xs font-bold text-slate-700 shadow-sm">
                      {day}
                    </div>
                    {TIME_SLOTS.map((slot, slotIdx) => {
                      const classesData = timetableGrid[dayIdx][slotIdx];
                      const isEmpty = !classesData || classesData.length === 0;

                      return (
                        <div
                          key={`${day}-${slot}`}
                          className="min-h-[96px] rounded-2xl border border-slate-200 bg-white/70 p-2 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.6)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.6)]"
                        >
                          {isEmpty ? (
                            <div className="flex h-full items-center justify-center text-xs text-slate-400">
                              —
                            </div>
                          ) : (
                            <div
                              className={`grid ${classesData.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 h-full`}
                            >
                              {classesData.map((classData, classIdx) => {
                                const colors = subjectColorMap[classData.subject_code];
                                return (
                                  <div
                                    key={`${classData.class_id}-${classIdx}`}
                                    className="rounded-xl p-2 text-left shadow-sm transition hover:-translate-y-0.5"
                                    style={{
                                      backgroundColor: colors.bg,
                                      color: colors.text,
                                      boxShadow: `0 16px 30px -20px ${colors.bg}`,
                                    }}
                                  >
                                    <div className="text-[11px] font-extrabold tracking-wide">
                                      {classData.subject_code}
                                    </div>
                                    <div className="text-[11px] opacity-90 truncate">
                                      {classData.subject_name}
                                    </div>
                                    <div className="mt-1.5 flex flex-wrap gap-1 text-[9px] uppercase tracking-wider opacity-80">
                                      {classData.room_number && (
                                        <span className="rounded-full bg-black/15 px-2 py-0.5">
                                          Room {classData.room_number}
                                        </span>
                                      )}
                                      {userRole === 'student' && classData.teacher_name && (
                                        <span className="rounded-full bg-black/15 px-2 py-0.5 truncate">
                                          {classData.teacher_name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-12 text-center shadow-sm">
                <div className="text-5xl">📅</div>
                <h3 className="mt-4 text-lg font-bold text-slate-800">No Classes Yet</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {userRole === 'professor'
                    ? 'Start by adding schedules to your classes.'
                    : 'Your enrolled classes will appear here once scheduled.'}
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 text-xs text-slate-500 md:hidden">
            Tip: Rotate your phone to landscape or swipe horizontally to view all times.
          </div>

          {totalSubjects > 0 && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white/85 p-6 shadow-sm">
              <div className="flex items-center gap-3 text-sm font-bold text-slate-800">
                <span className="h-6 w-2 rounded-full bg-blue-500" />
                Subject Palette
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {Object.entries(subjectColorMap).map(([subjectCode, colors]) => {
                  const subjectName =
                    classes.find((c) => c.subject_code === subjectCode)?.subject_name || subjectCode;
                  return (
                    <div
                      key={subjectCode}
                      className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-3 py-2 shadow-sm"
                    >
                      <span
                        className="h-8 w-8 rounded-full"
                        style={{ backgroundColor: colors.bg }}
                      ></span>
                      <div className="text-xs">
                        <div className="font-semibold text-slate-900">{subjectCode}</div>
                        <div className="text-slate-500 truncate max-w-[140px]">{subjectName}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
