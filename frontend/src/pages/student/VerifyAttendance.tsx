import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { QRVerification } from '@/components/student/QRVerification';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function VerifyAttendance() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3 md:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-xl md:text-2xl font-bold">Verify Attendance</h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">Confirm your presence in class</p>
          </div>
        </div>

        <QRVerification />
      </div>
    </DashboardLayout>
  );
}
