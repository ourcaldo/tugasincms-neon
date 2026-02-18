import { Dispatch, SetStateAction } from 'react';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Calendar } from '../../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Button } from '../../ui/button';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { TiptapEditor } from '../../editor/tiptap-editor';
import { MultiCombobox, ComboboxOption } from '../../ui/multi-combobox';
import { JobFormData, JobCategory, JobTag } from './types';

interface ContentTabProps {
  formData: JobFormData;
  setFormData: Dispatch<SetStateAction<JobFormData>>;
  handleInputChange: (field: string, value: any) => void;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  imageUrl: string;
  setImageUrl: (url: string) => void;
  setImageFromUrl: () => void;
  isCalendarOpen: boolean;
  setIsCalendarOpen: (open: boolean) => void;
  jobCategories: JobCategory[];
  jobTags: JobTag[];
  handleCreateCategory: (name: string) => Promise<ComboboxOption>;
  handleCreateTag: (name: string) => Promise<ComboboxOption>;
  loading: boolean;
}

export function ContentTab({
  formData,
  setFormData,
  handleInputChange,
  handleImageUpload,
  imageUrl,
  setImageUrl,
  setImageFromUrl,
  isCalendarOpen,
  setIsCalendarOpen,
  jobCategories,
  jobTags,
  handleCreateCategory,
  handleCreateTag,
  loading,
}: ContentTabProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Job Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Senior Full Stack Developer"
            />
          </div>

          <div>
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => handleInputChange('slug', e.target.value)}
              placeholder="url-friendly-version"
            />
          </div>

          <div>
            <Label htmlFor="content">Job Description *</Label>
            <TiptapEditor
              content={formData.content}
              onChange={(content) => handleInputChange('content', content)}
              placeholder="Describe the job position, responsibilities, and what you're looking for..."
            />
          </div>

          <div>
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => handleInputChange('excerpt', e.target.value)}
              placeholder="Brief summary of the job (shown in listings)"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Featured Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.featuredImage && (
            <div className="relative w-full h-48 rounded-lg overflow-hidden">
              <ImageWithFallback
                src={formData.featuredImage}
                alt="Featured"
                className="w-full h-full object-cover"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => handleInputChange('featuredImage', '')}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div>
            <Label htmlFor="featuredImageUpload">Upload Image</Label>
            <Input
              id="featuredImageUpload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={loading}
            />
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Or paste image URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
            <Button onClick={setImageFromUrl}>Set</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publishing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: any) => handleInputChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Publish Date</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {format(formData.publishDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.publishDate}
                  onSelect={(date) => {
                    if (date) {
                      handleInputChange('publishDate', date);
                      setIsCalendarOpen(false);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MultiCombobox
            options={jobCategories}
            selectedValues={formData.jobCategories}
            onValueChange={(values) => setFormData(prev => ({ ...prev, jobCategories: values as JobCategory[] }))}
            onCreateNew={handleCreateCategory}
            placeholder="Select or create job categories..."
            searchPlaceholder="Search categories or type to create new..."
            emptyText="No categories found. Type to create a new one."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Job Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MultiCombobox
            options={jobTags}
            selectedValues={formData.jobTags}
            onValueChange={(values) => setFormData(prev => ({ ...prev, jobTags: values as JobTag[] }))}
            onCreateNew={handleCreateTag}
            placeholder="Select or create job tags..."
            searchPlaceholder="Search tags or type to create new..."
            emptyText="No tags found. Type to create a new one."
          />
        </CardContent>
      </Card>
    </>
  );
}
