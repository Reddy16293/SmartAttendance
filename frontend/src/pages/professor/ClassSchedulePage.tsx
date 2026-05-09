import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ScheduleManager from '@/components/schedule/ScheduleManager';

interface ClassInfo {
  id: number;
  subject_name: string;
  subject_code: string;
  year: number;
  section: string;
}

const ClassSchedulePage: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClassInfo();
  }, [classId]);

  const fetchClassInfo = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/teachers/classes/${classId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch class info');

      const data = await response.json();
      setClassInfo(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load class information',
        variant: 'destructive',
      });
      navigate('/professor/classes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin mr-2" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!classInfo) {
    return <div>Class not found</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/professor/classes')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {classInfo.subject_name} ({classInfo.subject_code})
          </h1>
          <p className="text-gray-600">
            Year {classInfo.year}, Section {classInfo.section} - Manage Class Schedule
          </p>
        </div>
      </div>

      <ScheduleManager classId={Number(classId)} />
    </div>
  );
};

export default ClassSchedulePage;
