import { useRef, type SetStateAction } from 'react';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Save, Eye, Send } from 'lucide-react';
import { useJobPostData } from './editor/useJobPostData';
import { useJobPostForm } from './editor/useJobPostForm';
import { ContentTab } from './editor/ContentTab';
import { JobDetailsTab } from './editor/JobDetailsTab';
import { LocationTab } from './editor/LocationTab';
import { ApplicationTab } from './editor/ApplicationTab';
import { AdditionalInfoTab } from './editor/AdditionalInfoTab';
import { SEOTab } from './editor/SEOTab';
import type { JobPostEditorProps, JobCategory, JobTag } from './editor/types';

export function JobPostEditor({ postId, onSave, onPreview, onPublish: _onPublish }: JobPostEditorProps) {
  // Refs to break circular dependency between useJobPostForm ↔ useJobPostData
  const setCategoriesRef = useRef<(v: SetStateAction<JobCategory[]>) => void>(() => {});
  const setTagsRef = useRef<(v: SetStateAction<JobTag[]>) => void>(() => {});

  const form = useJobPostForm({
    postId,
    onSave,
    setJobCategories: (v) => setCategoriesRef.current(v),
    setJobTags: (v) => setTagsRef.current(v),
  });

  const refData = useJobPostData({
    provinceId: form.formData.job.provinceId,
    regencyId: form.formData.job.regencyId,
    districtId: form.formData.job.districtId,
  });

  // Wire up refs after both hooks have initialized
  setCategoriesRef.current = refData.setJobCategories;
  setTagsRef.current = refData.setJobTags;

  if (form.isInitialLoad) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading job post...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{postId ? 'Edit Job Post' : 'New Job Post'}</h1>
            <p className="text-muted-foreground">
              {postId ? 'Update your job posting' : 'Create a new job posting'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onPreview && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={onPreview}>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Preview job post</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={form.handleSave} disabled={form.loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {form.loading ? 'Saving...' : 'Save Draft'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save as draft</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={form.handlePublish} disabled={form.loading}>
                  <Send className="w-4 h-4 mr-2" />
                  {form.loading ? 'Publishing...' : 'Publish'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Publish job post</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <Tabs defaultValue="content" className="w-full">
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="job-details">Job Details</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
            <TabsTrigger value="application">Application</TabsTrigger>
            <TabsTrigger value="additional">Additional Info</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <ContentTab
              formData={form.formData}
              setFormData={form.setFormData}
              handleInputChange={form.handleInputChange}
              handleImageUpload={form.handleImageUpload}
              imageUrl={form.imageUrl}
              setImageUrl={form.setImageUrl}
              setImageFromUrl={form.setImageFromUrl}
              isCalendarOpen={form.isCalendarOpen}
              setIsCalendarOpen={form.setIsCalendarOpen}
              jobCategories={refData.jobCategories}
              jobTags={refData.jobTags}
              handleCreateCategory={form.handleCreateCategory}
              handleCreateTag={form.handleCreateTag}
              loading={form.loading}
            />
          </TabsContent>

          <TabsContent value="job-details" className="space-y-4">
            <JobDetailsTab
              formData={form.formData}
              handleJobChange={form.handleJobChange}
              handleCompanyLogoUpload={form.handleCompanyLogoUpload}
              companyLogoUrl={form.companyLogoUrl}
              setCompanyLogoUrl={form.setCompanyLogoUrl}
              setCompanyLogoFromUrl={form.setCompanyLogoFromUrl}
              employmentTypes={refData.employmentTypes}
              experienceLevels={refData.experienceLevels}
              educationLevels={refData.educationLevels}
              loading={form.loading}
            />
          </TabsContent>

          <TabsContent value="location" className="space-y-4">
            <LocationTab
              formData={form.formData}
              handleJobChange={form.handleJobChange}
              provinces={refData.provinces}
              regencies={refData.regencies}
              districts={refData.districts}
              villages={refData.villages}
            />
          </TabsContent>

          <TabsContent value="application" className="space-y-4">
            <ApplicationTab
              formData={form.formData}
              handleJobChange={form.handleJobChange}
              isDeadlineCalendarOpen={form.isDeadlineCalendarOpen}
              setIsDeadlineCalendarOpen={form.setIsDeadlineCalendarOpen}
            />
          </TabsContent>

          <TabsContent value="additional" className="space-y-4">
            <AdditionalInfoTab
              formData={form.formData}
              setFormData={form.setFormData}
              handleJobChange={form.handleJobChange}
            />
          </TabsContent>

          <TabsContent value="seo" className="space-y-4">
            <SEOTab
              formData={form.formData}
              handleSEOChange={form.handleSEOChange}
            />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
