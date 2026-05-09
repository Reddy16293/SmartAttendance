import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, XCircle, Check, X, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface PendingRecord {
  id: number;
  session_id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  class_id: number;
  date: string;
  year: number;
  section: string;
  subject_name: string;
  subject_code: string;
}

interface AttendanceTableProps {
  classId: number;
}

const statusConfig = {
  manual_review: {
    label: 'Pending Review',
    icon: AlertCircle,
    className: 'status-review',
  },
};

export function AttendanceTable({ classId }: AttendanceTableProps) {
  const [records, setRecords] = useState<PendingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchPendingRecords();
  }, [classId]);

  const fetchPendingRecords = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      console.log('[DEBUG] Fetching pending records for class:', classId);
      
      const res = await fetch(`${API_URL}/attendance/pending/code-submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch pending records');
      }

      const data = await res.json();
      console.log('[DEBUG] All pending records:', data);
      
      // Filter records for the selected class
      const filtered = data.filter((r: PendingRecord) => r.class_id === classId);
      console.log('[DEBUG] Filtered records for class', classId, ':', filtered);
      setRecords(filtered);
    } catch (error) {
      console.error('Error fetching pending records:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending attendance records',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (recordId: number) => {
    try {
      setProcessingIds(prev => new Set(prev).add(recordId));
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/attendance/code-submissions/${recordId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to approve attendance');
      }

      toast({
        title: 'Success',
        description: 'Attendance approved successfully',
      });

      // Remove the record from the list
      setRecords(prev => prev.filter(r => r.id !== recordId));
    } catch (error) {
      console.error('Error approving attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve attendance',
        variant: 'destructive',
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(recordId);
        return newSet;
      });
    }
  };

  const handleReject = async (recordId: number) => {
    try {
      setProcessingIds(prev => new Set(prev).add(recordId));
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/attendance/code-submissions/${recordId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          approved: false,
          reason: 'Rejected by professor',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to reject attendance');
      }

      toast({
        title: 'Success',
        description: 'Attendance rejected',
      });

      // Remove the record from the list
      setRecords(prev => prev.filter(r => r.id !== recordId));
    } catch (error) {
      console.error('Error rejecting attendance:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject attendance',
        variant: 'destructive',
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(recordId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <Card className="card-shadow">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const pendingCount = records.length;

  return (
    <Card className="card-shadow">
      <CardHeader className="border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="font-heading">Pending Attendance Approvals</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Review and approve student attendance submissions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPendingRecords}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Badge className="status-review border">
              <AlertCircle className="h-3 w-3 mr-1" />
              {pendingCount} Pending
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {records.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No pending attendance submissions</p>
            <p className="text-sm text-muted-foreground mt-1">
              Students will appear here after submitting attendance codes
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Student Name</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Subject</TableHead>
                  <TableHead className="font-semibold">Class</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold text-center">Status</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record, index) => {
                  const config = statusConfig.manual_review;
                  const StatusIcon = config.icon;
                  const isProcessing = processingIds.has(record.id);

                  return (
                    <TableRow
                      key={record.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <TableCell className="font-medium">{record.student_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.student_email}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{record.subject_name}</div>
                          <div className="text-xs text-muted-foreground">{record.subject_code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">Year {record.year}, {record.section}</div>
                          <div className="text-xs text-muted-foreground">Section</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(record.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn('gap-1', config.className)}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-success hover:bg-success/10"
                            onClick={() => handleApprove(record.id)}
                            disabled={processingIds.has(record.id)}
                          >
                            {processingIds.has(record.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-3 w-3" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-destructive hover:bg-destructive/10"
                            onClick={() => handleReject(record.id)}
                            disabled={processingIds.has(record.id)}
                          >
                            {processingIds.has(record.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <X className="h-3 w-3" />
                                Reject
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
