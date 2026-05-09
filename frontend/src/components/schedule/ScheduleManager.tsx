import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Trash2, Clock, MapPin } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Schedule {
  id: number;
  day_of_week: number;
  day_name: string;
  start_time: string;
  end_time: string;
  room_number: string | null;
}

interface ScheduleManagerProps {
  classId: number;
}

const ScheduleManager: React.FC<ScheduleManagerProps> = ({ classId }) => {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  
  // Form state
  const [formData, setFormData] = useState({
    day_of_week: '0',
    start_time: '10:00',
    end_time: '11:00',
    room_number: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchSchedules();
  }, [classId]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/teachers/classes/${classId}/schedules`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch schedules');

      const data = await response.json();
      setSchedules(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load schedules',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.start_time >= formData.end_time) {
      toast({
        title: 'Error',
        description: 'End time must be after start time',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/teachers/classes/${classId}/schedules`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            day_of_week: Number(formData.day_of_week),
            start_time: `${formData.start_time}:00`,
            end_time: `${formData.end_time}:00`,
            room_number: formData.room_number || null,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to add schedule');

      const result = await response.json();
      toast({
        title: 'Success',
        description: result.message,
      });

      setShowAddDialog(false);
      setFormData({
        day_of_week: '0',
        start_time: '10:00',
        end_time: '11:00',
        room_number: '',
      });
      fetchSchedules();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add schedule',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;

    try {
      setDeletingIds(new Set([...deletingIds, scheduleId]));

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/teachers/classes/${classId}/schedules/${scheduleId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete schedule');

      const result = await response.json();
      toast({
        title: 'Success',
        description: result.message,
      });

      setSchedules(schedules.filter((s) => s.id !== scheduleId));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete schedule',
        variant: 'destructive',
      });
    } finally {
      setDeletingIds(new Set([...deletingIds].filter((id) => id !== scheduleId)));
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Weekly Schedule</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Set class timings for each day of the week
            </p>
          </div>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Schedule
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin mr-2" />
              <span>Loading schedules...</span>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">No schedule added yet</p>
              <p className="text-sm">Click "Add Schedule" to set class timings</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.day_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {schedule.room_number ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          {schedule.room_number}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        disabled={deletingIds.has(schedule.id)}
                      >
                        {deletingIds.has(schedule.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Class Schedule</DialogTitle>
            <DialogDescription>
              Set the day and time for this class
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSchedule} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="day">Day of Week</Label>
                <Select
                  value={formData.day_of_week}
                  onValueChange={(value) =>
                    setFormData({ ...formData, day_of_week: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((day, index) => (
                      <SelectItem key={index} value={String(index)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="room">Room Number</Label>
                <Input
                  id="room"
                  placeholder="e.g., A101, Lab-2"
                  value={formData.room_number}
                  onChange={(e) =>
                    setFormData({ ...formData, room_number: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="start">Start Time</Label>
                <Input
                  id="start"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="end">End Time</Label>
                <Input
                  id="end"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ScheduleManager;
