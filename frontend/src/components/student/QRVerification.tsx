import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Keyboard, CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { QRCodeScanDialog } from '@/pages/student/QRCodeScanDialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type VerificationStatus = 'idle' | 'scanning' | 'verifying' | 'success' | 'pending' | 'failed';

export function QRVerification() {
  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const handleQRScan = async () => {
    // Open QR code scanner dialog instead of simulating
    setQrDialogOpen(true);
  };

  const handleQRSuccess = () => {
    // Called when QR code is successfully scanned and submitted
    setStatus('success');
    toast({ 
      title: 'Attendance Submitted!', 
      description: 'Your attendance has been submitted for professor approval.' 
    });
  };

  const handleManualSubmit = async () => {
    if (manualCode.length < 6) {
      toast({ title: 'Invalid Code', description: 'Please enter a valid 6-digit code.', variant: 'destructive' });
      return;
    }
    setStatus('verifying');

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setStatus('failed');
        toast({ title: 'Not logged in', description: 'Please log in again.', variant: 'destructive' });
        return;
      }

      const res = await fetch(`${API_URL}/attendance/submit-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: manualCode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus('failed');
        toast({
          title: 'Verification Failed',
          description: data?.message || 'Invalid or expired code.',
          variant: 'destructive',
        });
        return;
      }

      // Backend returns success with message "Awaiting professor approval" when manual review is needed
      const awaitingApproval = typeof data.message === 'string' && data.message.toLowerCase().includes('awaiting');
      setStatus(awaitingApproval ? 'pending' : 'success');
      toast({
        title: awaitingApproval ? 'Pending Review' : 'Attendance Confirmed!',
        description: data.message || (awaitingApproval ? 'Awaiting professor approval.' : 'You have been marked present.'),
      });
    } catch (error) {
      console.error('Manual code verification failed', error);
      setStatus('failed');
      toast({ title: 'Error', description: 'Could not verify the code. Please try again.', variant: 'destructive' });
    }
  };

  const resetStatus = () => {
    setStatus('idle');
    setManualCode('');
  };

  const renderStatusUI = () => {
    switch (status) {
      case 'success':
        return (
          <div className="text-center py-8 animate-scale-in">
            <div className="w-20 h-20 mx-auto bg-success/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <h3 className="font-heading text-xl font-bold text-success">Attendance Confirmed</h3>
            <p className="text-muted-foreground mt-2">Your presence has been successfully verified.</p>
            <Button variant="outline" className="mt-6" onClick={resetStatus}>
              Done
            </Button>
          </div>
        );
      case 'pending':
        return (
          <div className="text-center py-8 animate-scale-in">
            <div className="w-20 h-20 mx-auto bg-warning/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-10 w-10 text-warning" />
            </div>
            <h3 className="font-heading text-xl font-bold text-warning">Pending Manual Review</h3>
            <p className="text-muted-foreground mt-2">
              Your attendance requires professor verification.
            </p>
            <Button variant="outline" className="mt-6" onClick={resetStatus}>
              Try Again
            </Button>
          </div>
        );
      case 'failed':
        return (
          <div className="text-center py-8 animate-scale-in">
            <div className="w-20 h-20 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h3 className="font-heading text-xl font-bold text-destructive">Marked Absent</h3>
            <p className="text-muted-foreground mt-2">
              Verification failed. Please contact your professor.
            </p>
            <Button variant="outline" className="mt-6" onClick={resetStatus}>
              Try Again
            </Button>
          </div>
        );
      case 'scanning':
      case 'verifying':
        return (
          <div className="text-center py-8 animate-fade-in">
            <div className="relative">
              <Loader2 className="h-16 w-16 mx-auto text-primary animate-spin" />
            </div>
            <p className="mt-4 font-medium">
              {status === 'scanning' ? 'Scanning QR Code...' : 'Verifying...'}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  if (status !== 'idle') {
    return (
      <Card className="card-shadow max-w-md mx-auto">
        <CardContent className="pt-6">{renderStatusUI()}</CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-shadow max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-3">
          <QrCode className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="font-heading">Verify Your Attendance</CardTitle>
        <CardDescription>
          Scan or upload QR code, or enter the verification code manually
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!showManualInput ? (
          <>
            <Button onClick={handleQRScan} className="w-full gap-2 h-14 text-base">
              <QrCode className="h-5 w-5" />
              Scan or Upload QR Code
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowManualInput(true)}
              className="w-full gap-2"
            >
              <Keyboard className="h-4 w-4" />
              Enter Code Manually
            </Button>
          </>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                placeholder="Enter 6-digit code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl tracking-widest font-mono h-14"
                maxLength={6}
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowManualInput(false)}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleManualSubmit}
                className="flex-1"
                disabled={manualCode.length < 6}
              >
                Verify
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-accent/50 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-2">ℹ️ How to verify attendance:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>📱 <strong>Scan QR Code:</strong> Use your camera to scan live</li>
            <li>📤 <strong>Upload QR Image:</strong> Choose a saved photo</li>
            <li>⌨️ <strong>Enter Code:</strong> Type the 6-digit code manually</li>
            <li className="text-xs pt-1">✅ All submissions require professor approval</li>
          </ul>
        </div>
      </CardContent>
      
      {/* QR Code Scanner Dialog */}
      <QRCodeScanDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        onSuccess={handleQRSuccess}
      />
    </Card>
  );
}
