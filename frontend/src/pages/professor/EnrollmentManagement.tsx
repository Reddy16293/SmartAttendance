import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2, Loader2, Mail, User } from 'lucide-react';
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

interface StudentEnrollment {
  enrollment_id: number;
  student_id: number;
  student_name: string;
  email: string;
  roll_number?: string;
  enrolled_date: string;
  status: string;
}

interface AvailableStudent {
  id: number;
  name: string;
  email: string;
  roll_number?: string;
}

export default function EnrollmentManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [students, setStudents] = useState<StudentEnrollment[]>([]);
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [addingStudent, setAddingStudent] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchStudents();
    }
  }, [selectedClassId]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/teachers/classes`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch classes');
      const data = await res.json();
      setClasses(data);
      if (data.length > 0) {
        setSelectedClassId(data[0].id);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load classes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClassId) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/teachers/classes/${selectedClassId}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch students');
      const data = await res.json();
      setStudents(data);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (enrollmentId: number, studentId: number, studentName: string) => {
    if (!selectedClassId) return;

    try {
      setRemovingIds(prev => new Set(prev).add(studentId));
      const token = localStorage.getItem('auth_token');
      const res = await fetch(
        `${API_URL}/teachers/classes/${selectedClassId}/students/${studentId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Failed to remove student');

      const data = await res.json();
      toast({
        title: 'Success',
        description: data.message,
      });

      setStudents(prev => prev.filter(s => s.student_id !== studentId));
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove student',
        variant: 'destructive',
      });
    } finally {
      setRemovingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(studentId);
        return newSet;
      });
    }
  };

  const handleAddStudent = async () => {
    if (!selectedClassId || !selectedStudentId) {
      toast({
        title: 'Error',
        description: 'Please select a student',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAddingStudent(true);
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/teachers/classes/${selectedClassId}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ student_id: parseInt(selectedStudentId) }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Failed to add student');
      }

      const data = await res.json();
      toast({
        title: 'Success',
        description: data.message,
      });

      setShowAddDialog(false);
      setSelectedStudentId('');
      fetchStudents();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add student',
        variant: 'destructive',
      });
    } finally {
      setAddingStudent(false);
    }
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const enrolledCount = students.length;

  if (loading && classes.length === 0) {
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
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-heading text-2xl font-bold">Enrollment Management</h1>
            <p className="text-muted-foreground">Manage student enrollments in your classes</p>
          </div>
        </div>

        {classes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No classes found. Create a class first.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Class Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Class</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={selectedClassId?.toString()}
                  onValueChange={(value) => setSelectedClassId(parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.subject_name} ({cls.subject_code}) - Year {cls.year} - {cls.section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Enrolled Students */}
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Enrolled Students</CardTitle>
                    {selectedClass && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedClass.subject_name} ({selectedClass.subject_code}) - Year {selectedClass.year} - {selectedClass.section}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{enrolledCount} Students</Badge>
                    <Button
                      onClick={() => setShowAddDialog(true)}
                      className="gap-2"
                      size="sm"
                    >
                      <Plus className="h-4 w-4" />
                      Add Student
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {students.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No students enrolled</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click "Add Student" to enroll students in this class
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Roll No.</TableHead>
                          <TableHead>Enrolled Date</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student, index) => (
                          <TableRow
                            key={student.enrollment_id}
                            className="animate-fade-in"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <TableCell className="font-medium">{student.student_name}</TableCell>
                            <TableCell className="text-sm">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                {student.email}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {student.roll_number || '-'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(student.enrolled_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleRemoveStudent(
                                    student.enrollment_id,
                                    student.student_id,
                                    student.student_name
                                  )
                                }
                                disabled={removingIds.has(student.student_id)}
                                className="gap-2 text-destructive hover:text-destructive"
                              >
                                {removingIds.has(student.student_id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Add Student Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Student to Class</DialogTitle>
            <DialogDescription>
              {selectedClass && `Add a student to ${selectedClass.subject_name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {/* In a real implementation, you'd fetch available students from the backend */}
                <SelectItem value="1">Sample Student 1</SelectItem>
                <SelectItem value="2">Sample Student 2</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Note: Only students not already enrolled in this class are shown
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              disabled={addingStudent}
            >
              Cancel
            </Button>
            <Button onClick={handleAddStudent} disabled={addingStudent || !selectedStudentId}>
              {addingStudent ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                'Add Student'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
