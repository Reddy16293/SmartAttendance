import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AttendanceTable } from '@/components/attendance/AttendanceTable';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ClassInfo {
  id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  year: number;
  section: string;
}

export default function AttendanceResults() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
      // Fetch classes and subjects in parallel
      const [res, subjectsRes] = await Promise.all([
        fetch(`${API_URL}/teachers/classes`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/teachers/subjects`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!res.ok) {
        throw new Error('Failed to fetch classes');
      }

      const rawClasses = await res.json();
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
      
      // Auto-select first class if available
      if (enriched.length > 0) {
        setSelectedClassId(enriched[0].id);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load classes',
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
        <div className="flex items-center gap-3 md:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-xl md:text-2xl lg:text-3xl font-bold\">Attendance Results</h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1\">Review and approve student attendance</p>
          </div>
        </div>

        {classes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No classes found. Create a class first.</p>
        ) : (
          <>
            <div className="space-y-3 md:space-y-0 md:flex md:items-center md:gap-4">
              <label className="text-sm font-medium whitespace-nowrap">Select Class:</label>
              <Select
                value={selectedClassId?.toString()}
                onValueChange={(value) => setSelectedClassId(parseInt(value))}
              >
                <SelectTrigger className="w-full md:w-[400px]">
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
            </div>

            {selectedClassId && <AttendanceTable classId={selectedClassId} />}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
