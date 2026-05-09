import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ImageCapture } from '@/components/attendance/ImageCapture';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CaptureAttendance() {
  const navigate = useNavigate();
  const [, setImageSubmitted] = useState(false);

  const handleImageSubmit = (imageData: string) => {
    setImageSubmitted(true);
    // Navigate to results after processing
    setTimeout(() => {
      navigate('/professor/results');
    }, 500);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-bold">Take Attendance</h1>
            <p className="text-muted-foreground">Computer Science 101 • Section A</p>
          </div>
        </div>

        <ImageCapture onImageSubmit={handleImageSubmit} />
      </div>
    </DashboardLayout>
  );
}
