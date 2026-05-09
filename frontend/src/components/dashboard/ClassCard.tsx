import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClassCardProps {
  subject: string;
  section: string;
  year: string;
  time?: string;
  studentCount: number;
  status?: 'upcoming' | 'ongoing' | 'completed';
  onEnter: () => void;
}

const statusConfig = {
  upcoming: { label: 'Upcoming', className: 'bg-muted text-muted-foreground' },
  ongoing: { label: 'In Progress', className: 'bg-success/10 text-success border-success/20' },
  completed: { label: 'Completed', className: 'bg-primary/10 text-primary border-primary/20' },
};

export function ClassCard({ subject, section, year, time, studentCount, status = 'upcoming', onEnter }: ClassCardProps) {
  const statusStyle = statusConfig[status];

  return (
    <Card className="card-shadow hover:shadow-elevated transition-all duration-300 group cursor-pointer border-transparent hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-heading font-semibold text-lg group-hover:text-primary transition-colors">
              {subject}
            </h3>
            <p className="text-sm text-muted-foreground">
              {section} • {year}
            </p>
          </div>
          <Badge variant="outline" className={cn('text-xs', statusStyle.className)}>
            {statusStyle.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{studentCount} students</span>
          </div>
          {time && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{time}</span>
            </div>
          )}
        </div>
        <Button
          onClick={onEnter}
          className="w-full group/btn"
          variant={status === 'ongoing' ? 'default' : 'outline'}
        >
          Enter Class
          <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
