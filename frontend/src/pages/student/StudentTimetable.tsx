import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Timetable } from '@/components/timetable/WeeklyTimetable';

const StudentTimetable: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 p-3 md:p-6">
      <div className="flex items-center gap-3 md:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/student/dashboard')} className="flex-shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Weekly Time Table</h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">Your complete class schedule for the week</p>
        </div>
      </div>

      <Timetable userRole="student" />
    </div>
  );
};

export default StudentTimetable;
