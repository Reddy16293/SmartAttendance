import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface AddClassDialogProps {
  onClassCreated: () => void;
}

export function AddClassDialog({ onClassCreated }: AddClassDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    subject_name: '',
    subject_code: '',
    year: '',
    section: '',
  });
  const { toast } = useToast();

  const getOrCreateSubjectId = async (name: string, code: string, token: string): Promise<number> => {
    // Try to create the subject first
    const createRes = await fetch(`${API_URL}/teachers/subjects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, code }),
    });

    if (createRes.ok) {
      const subject = await createRes.json();
      return subject.id;
    }

    // If subject already exists (code conflict), try to find it by code
    let err: any = {};
    try { err = await createRes.json(); } catch {}
    const detail: string | undefined = typeof err?.detail === 'string' ? err.detail : undefined;
    if (createRes.status === 400 && detail && detail.toLowerCase().includes('exists')) {
      const listRes = await fetch(`${API_URL}/teachers/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (listRes.ok) {
        const subjects = await listRes.json();
        const found = subjects.find((s: any) => s.code === code);
        if (found) return found.id;
      }
    }

    throw new Error(detail || 'Failed to create or find subject');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject_name || !formData.subject_code || !formData.year || !formData.section) {
      toast({
        title: 'Error',
        description: 'Please fill in subject, code, year, and section',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!user?.id) {
        throw new Error('Missing current user information');
      }

      // Resolve subject_id from name/code (create or reuse)
      const subjectId = await getOrCreateSubjectId(formData.subject_name.trim(), formData.subject_code.trim(), token || '');

      const res = await fetch(`${API_URL}/teachers/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject_id: subjectId,
          teacher_id: parseInt(user.id as string, 10),
          year: parseInt(formData.year),
          section: formData.section,
        }),
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Class created successfully',
        });
        setFormData({
          subject_name: '',
          subject_code: '',
          year: '',
          section: '',
        });
        setOpen(false);
        onClassCreated();
      } else {
        const err = await res.json();
        const errorMsg = typeof err.detail === 'string' ? err.detail : 'Failed to create class';
        toast({
          title: 'Error',
          description: errorMsg,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error creating class:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create class',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Class
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Class</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject_name">Subject Name</Label>
            <Input
              id="subject_name"
              placeholder="e.g., Data Structures"
              value={formData.subject_name}
              onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject_code">Subject Code</Label>
            <Input
              id="subject_code"
              placeholder="e.g., CS201"
              value={formData.subject_code}
              onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Select
              value={formData.year}
              onValueChange={(value) =>
                setFormData({ ...formData, year: value })
              }
            >
              <SelectTrigger id="year">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1st Year</SelectItem>
                <SelectItem value="2">2nd Year</SelectItem>
                <SelectItem value="3">3rd Year</SelectItem>
                <SelectItem value="4">4th Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="section">Section</Label>
            <Input
              id="section"
              placeholder="e.g., Section A, Section B"
              value={formData.section}
              onChange={(e) =>
                setFormData({ ...formData, section: e.target.value })
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Class'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
