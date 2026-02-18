import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Calendar } from '../../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Button } from '../../ui/button';
import { CalendarIcon, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { JobFormData } from './types';

interface ApplicationTabProps {
  formData: JobFormData;
  handleJobChange: (field: string, value: any) => void;
  isDeadlineCalendarOpen: boolean;
  setIsDeadlineCalendarOpen: (open: boolean) => void;
}

export function ApplicationTab({
  formData,
  handleJobChange,
  isDeadlineCalendarOpen,
  setIsDeadlineCalendarOpen,
}: ApplicationTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Application Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="applicationEmail">Application Email</Label>
          <Input
            id="applicationEmail"
            type="email"
            value={formData.job.applicationEmail}
            onChange={(e) => handleJobChange('applicationEmail', e.target.value)}
            placeholder="careers@example.com"
          />
        </div>

        <div>
          <Label htmlFor="applicationUrl">Application URL</Label>
          <Input
            id="applicationUrl"
            type="url"
            value={formData.job.applicationUrl}
            onChange={(e) => handleJobChange('applicationUrl', e.target.value)}
            placeholder="https://example.com/apply"
          />
        </div>

        <div>
          <Label>Application Deadline</Label>
          <Popover open={isDeadlineCalendarOpen} onOpenChange={setIsDeadlineCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {formData.job.applicationDeadline
                  ? format(formData.job.applicationDeadline, 'PPP')
                  : 'Select deadline date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.job.applicationDeadline}
                onSelect={(date) => {
                  handleJobChange('applicationDeadline', date);
                  setIsDeadlineCalendarOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          {formData.job.applicationDeadline && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => handleJobChange('applicationDeadline', undefined)}
            >
              Clear deadline
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
