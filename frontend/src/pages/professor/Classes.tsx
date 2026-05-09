import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ClassCard } from '@/components/dashboard/ClassCard';
import { AddClassDialog } from './AddClassDialog';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Class {
  id: number;
  subject_id: number;
  teacher_id: number;
  year: number;
  section: string;
  subject?: {
    name: string;
    code: string;
  };
}

interface Subject {
  id: number;
  name: string;
}

export default function Classes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjectMap, setSubjectMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/teachers/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setClasses(data);
        
        // Fetch subject details to get subject names
        if (data.length > 0) {
          await fetchSubjects();
        }
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load classes',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load classes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/teachers/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const subjects: Subject[] = await res.json();
        const map: Record<number, string> = {};
        subjects.forEach((subject) => {
          map[subject.id] = subject.name;
        });
        setSubjectMap(map);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const formatClass = (cls: Class) => {
    const subjectName = subjectMap[cls.subject_id] || 'Unknown Subject';
    return {
      id: cls.id.toString(),
      subject: subjectName,
      section: cls.section,
      year: `${cls.year}${cls.year === 1 ? 'st' : cls.year === 2 ? 'nd' : cls.year === 3 ? 'rd' : 'th'} Year`,
      studentCount: 0,
      status: 'ongoing' as const,
    };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">My Classes</h1>
          <p className="text-muted-foreground text-sm md:text-base">Manage your assigned classes and take attendance</p>
          <div className="mt-4">
            <AddClassDialog onClassCreated={fetchClasses} />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading classes...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-lg border border-dashed">
            <p className="text-muted-foreground mb-4">No classes yet</p>
            <AddClassDialog onClassCreated={fetchClasses} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls, index) => (
              <div
                key={cls.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <ClassCard
                  {...formatClass(cls)}
                  onEnter={() => navigate(`/professor/capture/${cls.id}`)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
