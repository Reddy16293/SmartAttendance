import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface AttendanceCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AttendanceCodeDialog({
  open,
  onOpenChange,
  onSuccess,
}: AttendanceCodeDialogProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Attendance code must be 6 digits',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      const token = localStorage.getItem('auth_token');
      
      console.log('[DEBUG] Submitting attendance code:', code);
      console.log('[DEBUG] API URL:', `${API_URL}/attendance/submit-code`);
      
      const res = await fetch(`${API_URL}/attendance/submit-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      console.log('[DEBUG] Response status:', res.status);
      const data = await res.json();
      console.log('[DEBUG] Response data:', data);
      setResult(data);

      if (data.success) {
        toast({
          title: 'Success',
          description: data.message,
        });
        setTimeout(() => {
          onOpenChange(false);
          setCode('');
          setResult(null);
          onSuccess?.();
        }, 2000);
      } else {
        toast({
          title: 'Failed',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('[ERROR] Failed to submit code:', error);
      setResult({
        success: false,
        message: 'Failed to submit attendance code',
      });
      toast({
        title: 'Error',
        description: 'Failed to submit attendance code',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Attendance</DialogTitle>
          <DialogDescription>
            Enter the 6-digit attendance code provided by your professor
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Attendance Code</Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={code}
              onChange={handleCodeChange}
              maxLength={6}
              className="text-center text-2xl font-mono tracking-wider"
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-center">
              Enter the 6-digit code from your professor
            </p>
          </div>

          {result && (
            <div
              className={`rounded-lg p-4 flex items-start gap-3 ${
                result.success
                  ? 'bg-success/10 border border-success/20'
                  : 'bg-destructive/10 border border-destructive/20'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={`font-semibold text-sm ${
                    result.success ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {result.success ? 'Attendance Marked' : 'Failed'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.message}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setCode('');
                setResult(null);
              }}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || code.length !== 6}>
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
