import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Checkbox } from '../ui/checkbox';
import { CalendarIcon, Upload, X, Save, Eye, Send, Building2, MapPin, Mail, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { TiptapEditor } from '../editor/tiptap-editor';
import { MultiCombobox, ComboboxOption } from '../ui/multi-combobox';
import { useApiClient } from '../../lib/api-client';
import { uploadImage } from '../../lib/appwrite';
import { toast } from 'sonner';

interface JobCategory {
  id: string;
  name: string;
  slug: string;
}

interface JobTag {
  id: string;
  name: string;
  slug: string;
}

interface EmploymentType {
  id: string;
  name: string;
  slug: string;
}

interface ExperienceLevel {
  id: string;
  name: string;
  slug: string;
  years_min?: number;
  years_max?: number;
}

interface LocationData {
  id: string;
  name: string;
}

interface JobPostEditorProps {
  postId?: string;
  onSave?: (post: any) => void;
  onPreview?: () => void;
  onPublish?: () => void;
}

export function JobPostEditor({ postId, onSave, onPreview, onPublish }: JobPostEditorProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    slug: '',
    featuredImage: '',
    publishDate: new Date(),
    status: 'draft' as 'draft' | 'published' | 'scheduled',
    jobCategories: [] as JobCategory[],
    jobTags: [] as JobTag[],
    seo: {
      title: '',
      metaDescription: '',
      focusKeyword: '',
      slug: '',
    },
    job: {
      companyName: '',
      companyLogo: '',
      companyWebsite: '',
      employmentTypeId: '',
      experienceLevelId: '',
      salaryMin: '',
      salaryMax: '',
      salaryCurrency: 'IDR',
      salaryPeriod: 'month',
      isSalaryNegotiable: false,
      provinceId: '',
      regencyId: '',
      districtId: '',
      villageId: '',
      addressDetail: '',
      isRemote: false,
      isHybrid: false,
      applicationEmail: '',
      applicationUrl: '',
      applicationDeadline: undefined as Date | undefined,
      skills: [] as string[],
      benefits: [] as string[],
      requirements: '',
      responsibilities: '',
    },
  });

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDeadlineCalendarOpen, setIsDeadlineCalendarOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(!!postId);

  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
  const [jobTags, setJobTags] = useState<JobTag[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentType[]>([]);
  const [experienceLevels, setExperienceLevels] = useState<ExperienceLevel[]>([]);
  const [provinces, setProvinces] = useState<LocationData[]>([]);
  const [regencies, setRegencies] = useState<LocationData[]>([]);
  const [districts, setDistricts] = useState<LocationData[]>([]);
  const [villages, setVillages] = useState<LocationData[]>([]);

  const apiClient = useApiClient();
  const { user } = useUser();

  useEffect(() => {
    if (postId) {
      fetchJobPost();
    }
  }, [postId]);

  useEffect(() => {
    fetchJobCategories();
    fetchJobTags();
    fetchEmploymentTypes();
    fetchExperienceLevels();
    fetchProvinces();
  }, []);

  useEffect(() => {
    if (formData.job.provinceId) {
      fetchRegencies(formData.job.provinceId);
    } else {
      setRegencies([]);
      setDistricts([]);
      setVillages([]);
    }
  }, [formData.job.provinceId]);

  useEffect(() => {
    if (formData.job.regencyId) {
      fetchDistricts(formData.job.regencyId);
    } else {
      setDistricts([]);
      setVillages([]);
    }
  }, [formData.job.regencyId]);

  useEffect(() => {
    if (formData.job.districtId) {
      fetchVillages(formData.job.districtId);
    } else {
      setVillages([]);
    }
  }, [formData.job.districtId]);

  const fetchJobPost = async () => {
    if (!postId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/job-posts/${postId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch job post');
      }
      
      const result = await response.json();
      const data = result.data || result;
      
      setFormData({
        title: data.title || '',
        content: data.content || '',
        excerpt: data.excerpt || '',
        slug: data.slug || '',
        featuredImage: data.featured_image || '',
        publishDate: data.publish_date ? new Date(data.publish_date) : new Date(),
        status: data.status || 'draft',
        jobCategories: data.job_categories || [],
        jobTags: data.job_tags || [],
        seo: {
          title: data.seo_title || '',
          metaDescription: data.meta_description || '',
          focusKeyword: data.focus_keyword || '',
          slug: data.slug || '',
        },
        job: {
          companyName: data.job_company_name || '',
          companyLogo: data.job_company_logo || '',
          companyWebsite: data.job_company_website || '',
          employmentTypeId: data.job_employment_type_id || '',
          experienceLevelId: data.job_experience_level_id || '',
          salaryMin: data.job_salary_min?.toString() || '',
          salaryMax: data.job_salary_max?.toString() || '',
          salaryCurrency: data.job_salary_currency || 'IDR',
          salaryPeriod: data.job_salary_period || 'month',
          isSalaryNegotiable: data.job_is_salary_negotiable || false,
          provinceId: data.job_province_id || '',
          regencyId: data.job_regency_id || '',
          districtId: data.job_district_id || '',
          villageId: data.job_village_id || '',
          addressDetail: data.job_address_detail || '',
          isRemote: data.job_is_remote || false,
          isHybrid: data.job_is_hybrid || false,
          applicationEmail: data.job_application_email || '',
          applicationUrl: data.job_application_url || '',
          applicationDeadline: data.job_application_deadline ? new Date(data.job_application_deadline) : undefined,
          skills: data.job_skills || [],
          benefits: data.job_benefits || [],
          requirements: data.job_requirements || '',
          responsibilities: data.job_responsibilities || '',
        },
      });
      setIsInitialLoad(false);
    } catch (error) {
      console.error('Error fetching job post:', error);
      toast.error('Failed to load job post');
      setIsInitialLoad(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobCategories = async () => {
    try {
      const response = await fetch('/api/job-categories');
      if (!response.ok) throw new Error('Failed to fetch job categories');
      const result = await response.json();
      const data = result.data || result;
      setJobCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching job categories:', error);
      setJobCategories([]);
    }
  };

  const fetchJobTags = async () => {
    try {
      const response = await fetch('/api/job-tags');
      if (!response.ok) throw new Error('Failed to fetch job tags');
      const result = await response.json();
      const data = result.data || result;
      setJobTags(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching job tags:', error);
      setJobTags([]);
    }
  };

  const fetchEmploymentTypes = async () => {
    try {
      const response = await fetch('/api/job-data/employment-types');
      if (!response.ok) throw new Error('Failed to fetch employment types');
      const result = await response.json();
      const data = result.data || result;
      setEmploymentTypes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching employment types:', error);
      setEmploymentTypes([]);
    }
  };

  const fetchExperienceLevels = async () => {
    try {
      const response = await fetch('/api/job-data/experience-levels');
      if (!response.ok) throw new Error('Failed to fetch experience levels');
      const result = await response.json();
      const data = result.data || result;
      setExperienceLevels(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching experience levels:', error);
      setExperienceLevels([]);
    }
  };

  const fetchProvinces = async () => {
    try {
      const response = await fetch('/api/location/provinces');
      if (!response.ok) throw new Error('Failed to fetch provinces');
      const result = await response.json();
      const data = result.data || result;
      setProvinces(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching provinces:', error);
      setProvinces([]);
    }
  };

  const fetchRegencies = async (provinceId: string) => {
    try {
      const response = await fetch(`/api/location/regencies/${provinceId}`);
      if (!response.ok) throw new Error('Failed to fetch regencies');
      const result = await response.json();
      const data = result.data || result;
      setRegencies(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching regencies:', error);
      setRegencies([]);
    }
  };

  const fetchDistricts = async (regencyId: string) => {
    try {
      const response = await fetch(`/api/location/districts/${regencyId}`);
      if (!response.ok) throw new Error('Failed to fetch districts');
      const result = await response.json();
      const data = result.data || result;
      setDistricts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching districts:', error);
      setDistricts([]);
    }
  };

  const fetchVillages = async (districtId: string) => {
    try {
      const response = await fetch(`/api/location/villages/${districtId}`);
      if (!response.ok) throw new Error('Failed to fetch villages');
      const result = await response.json();
      const data = result.data || result;
      setVillages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching villages:', error);
      setVillages([]);
    }
  };

  useEffect(() => {
    if (!postId && formData.title) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData(prev => ({
        ...prev,
        slug,
        seo: { ...prev.seo, slug }
      }));
    }
  }, [formData.title, postId]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      seo: {
        ...prev.seo,
        title: prev.seo.title || prev.title,
        metaDescription: prev.seo.metaDescription || prev.excerpt,
      }
    }));
  }, [formData.title, formData.excerpt]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSEOChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      seo: { ...prev.seo, [field]: value }
    }));
  };

  const handleJobChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      job: { ...prev.job, [field]: value }
    }));
  };

  const handleCreateCategory = async (name: string): Promise<ComboboxOption> => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('Category name is required');

    try {
      const newCat = await apiClient.post<JobCategory>('/job-categories', {
        name: trimmedName,
        slug: trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      });
      setJobCategories(prev => [...prev, newCat]);
      toast.success(`Job category "${trimmedName}" created`);
      return { id: newCat.id, name: newCat.name, slug: newCat.slug };
    } catch (error) {
      toast.error('Failed to create job category');
      throw error;
    }
  };

  const handleCreateTag = async (name: string): Promise<ComboboxOption> => {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('Tag name is required');

    try {
      const newTag = await apiClient.post<JobTag>('/job-tags', {
        name: trimmedName,
        slug: trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      });
      setJobTags(prev => [...prev, newTag]);
      toast.success(`Job tag "${trimmedName}" created`);
      return { id: newTag.id, name: newTag.name, slug: newTag.slug };
    } catch (error) {
      toast.error('Failed to create job tag');
      throw error;
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setLoading(true);
        toast.loading('Uploading image...');
        const imageUrl = await uploadImage(file);
        setFormData(prev => ({ ...prev, featuredImage: imageUrl }));
        toast.dismiss();
        toast.success('Image uploaded successfully');
      } catch (error: any) {
        toast.dismiss();
        console.error('Error uploading image:', error);
        
        if (error?.message === 'APPWRITE_NOT_CONFIGURED') {
          toast.error('Image upload not available. Please use an external image URL instead.');
        } else {
          toast.error('Failed to upload image. Use external URL instead.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCompanyLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        setLoading(true);
        toast.loading('Uploading company logo...');
        const logoUrl = await uploadImage(file);
        setFormData(prev => ({
          ...prev,
          job: { ...prev.job, companyLogo: logoUrl }
        }));
        toast.dismiss();
        toast.success('Company logo uploaded successfully');
      } catch (error: any) {
        toast.dismiss();
        console.error('Error uploading company logo:', error);
        
        if (error?.message === 'APPWRITE_NOT_CONFIGURED') {
          toast.error('Image upload not available. Please use an external image URL instead.');
        } else {
          toast.error('Failed to upload image. Use external URL instead.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const setImageFromUrl = () => {
    if (imageUrl.trim()) {
      setFormData(prev => ({ ...prev, featuredImage: imageUrl.trim() }));
      setImageUrl('');
    }
  };

  const setCompanyLogoFromUrl = () => {
    if (companyLogoUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        job: { ...prev.job, companyLogo: companyLogoUrl.trim() }
      }));
      setCompanyLogoUrl('');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    if (!formData.title.trim()) {
      toast.error('Please enter a job title');
      return;
    }
    
    if (!formData.content.trim()) {
      toast.error('Please enter job description');
      return;
    }

    if (!formData.slug.trim()) {
      toast.error('Please enter a slug');
      return;
    }
    
    try {
      setLoading(true);
      const jobPostData = {
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        excerpt: formData.excerpt,
        featured_image: formData.featuredImage || undefined,
        status: formData.status,
        publish_date: formData.publishDate.toISOString(),
        seo_title: formData.seo.title,
        meta_description: formData.seo.metaDescription,
        focus_keyword: formData.seo.focusKeyword,
        
        job_company_name: formData.job.companyName || undefined,
        job_company_logo: formData.job.companyLogo || undefined,
        job_company_website: formData.job.companyWebsite || undefined,
        job_employment_type_id: formData.job.employmentTypeId || undefined,
        job_experience_level_id: formData.job.experienceLevelId || undefined,
        job_salary_min: formData.job.salaryMin ? parseFloat(formData.job.salaryMin) : undefined,
        job_salary_max: formData.job.salaryMax ? parseFloat(formData.job.salaryMax) : undefined,
        job_salary_currency: formData.job.salaryCurrency || undefined,
        job_salary_period: formData.job.salaryPeriod || undefined,
        job_is_salary_negotiable: formData.job.isSalaryNegotiable,
        job_province_id: formData.job.provinceId || undefined,
        job_regency_id: formData.job.regencyId || undefined,
        job_district_id: formData.job.districtId || undefined,
        job_village_id: formData.job.villageId || undefined,
        job_address_detail: formData.job.addressDetail || undefined,
        job_is_remote: formData.job.isRemote,
        job_is_hybrid: formData.job.isHybrid,
        job_application_email: formData.job.applicationEmail || undefined,
        job_application_url: formData.job.applicationUrl || undefined,
        job_application_deadline: formData.job.applicationDeadline?.toISOString() || undefined,
        job_skills: formData.job.skills.length > 0 ? formData.job.skills : undefined,
        job_benefits: formData.job.benefits.length > 0 ? formData.job.benefits : undefined,
        job_requirements: formData.job.requirements || undefined,
        job_responsibilities: formData.job.responsibilities || undefined,
        
        job_categories: formData.jobCategories.map(c => c.id),
        job_tags: formData.jobTags.map(t => t.id),
      };

      let response;
      if (postId) {
        response = await fetch(`/api/job-posts/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jobPostData),
        });
      } else {
        response = await fetch('/api/job-posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jobPostData),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save job post');
      }

      const result = await response.json();
      const savedPost = result.data || result;

      toast.success(postId ? 'Job post updated successfully' : 'Job post created successfully');
      
      if (onSave) {
        onSave(savedPost);
      }
    } catch (error: any) {
      console.error('Error saving job post:', error);
      toast.error(error.message || 'Failed to save job post');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    setFormData(prev => ({ ...prev, status: 'published' }));
    setTimeout(() => handleSave(), 100);
  };

  if (isInitialLoad) {
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
            <h1 className="text-3xl font-bold">{postId ? 'Edit Job Post' : 'New Job Post'}</h1>
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
                <Button variant="outline" onClick={handleSave} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Draft'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save as draft</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handlePublish} disabled={loading}>
                  <Send className="w-4 h-4 mr-2" />
                  {loading ? 'Publishing...' : 'Publish'}
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
          </TabsContent>

          <TabsContent value="job-details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.job.companyName}
                    onChange={(e) => handleJobChange('companyName', e.target.value)}
                    placeholder="e.g., Acme Corporation"
                  />
                </div>

                <div>
                  <Label htmlFor="companyWebsite">Company Website</Label>
                  <Input
                    id="companyWebsite"
                    type="url"
                    value={formData.job.companyWebsite}
                    onChange={(e) => handleJobChange('companyWebsite', e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="companyLogo">Company Logo</Label>
                  {formData.job.companyLogo && (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden mb-2">
                      <ImageWithFallback
                        src={formData.job.companyLogo}
                        alt="Company Logo"
                        className="w-full h-full object-contain"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={() => handleJobChange('companyLogo', '')}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  <Input
                    id="companyLogoUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleCompanyLogoUpload}
                    disabled={loading}
                    className="mb-2"
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Or paste logo URL"
                      value={companyLogoUrl}
                      onChange={(e) => setCompanyLogoUrl(e.target.value)}
                    />
                    <Button onClick={setCompanyLogoFromUrl}>Set</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <Select
                    value={formData.job.employmentTypeId}
                    onValueChange={(value) => handleJobChange('employmentTypeId', value)}
                  >
                    <SelectTrigger id="employmentType">
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                    <SelectContent>
                      {employmentTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="experienceLevel">Experience Level</Label>
                  <Select
                    value={formData.job.experienceLevelId}
                    onValueChange={(value) => handleJobChange('experienceLevelId', value)}
                  >
                    <SelectTrigger id="experienceLevel">
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      {experienceLevels.map(level => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.name}
                          {level.years_min !== null && level.years_max !== null && 
                            ` (${level.years_min}-${level.years_max} years)`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="salaryMin">Salary Min</Label>
                    <Input
                      id="salaryMin"
                      type="number"
                      value={formData.job.salaryMin}
                      onChange={(e) => handleJobChange('salaryMin', e.target.value)}
                      placeholder="e.g., 50000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="salaryMax">Salary Max</Label>
                    <Input
                      id="salaryMax"
                      type="number"
                      value={formData.job.salaryMax}
                      onChange={(e) => handleJobChange('salaryMax', e.target.value)}
                      placeholder="e.g., 80000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={formData.job.salaryCurrency}
                      onValueChange={(value) => handleJobChange('salaryCurrency', value)}
                    >
                      <SelectTrigger id="currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                        <SelectItem value="MYR">MYR - Malaysian Ringgit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="period">Period</Label>
                    <Select
                      value={formData.job.salaryPeriod}
                      onValueChange={(value) => handleJobChange('salaryPeriod', value)}
                    >
                      <SelectTrigger id="period">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hour">Per Hour</SelectItem>
                        <SelectItem value="day">Per Day</SelectItem>
                        <SelectItem value="month">Per Month</SelectItem>
                        <SelectItem value="year">Per Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="negotiable"
                    checked={formData.job.isSalaryNegotiable}
                    onCheckedChange={(checked) => handleJobChange('isSalaryNegotiable', checked)}
                  />
                  <Label htmlFor="negotiable" className="cursor-pointer">
                    Salary is negotiable
                  </Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="location" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Location Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="province">Province</Label>
                    <Select
                      value={formData.job.provinceId}
                      onValueChange={(value) => {
                        handleJobChange('provinceId', value);
                        handleJobChange('regencyId', '');
                        handleJobChange('districtId', '');
                        handleJobChange('villageId', '');
                      }}
                    >
                      <SelectTrigger id="province">
                        <SelectValue placeholder="Select province" />
                      </SelectTrigger>
                      <SelectContent>
                        {provinces.map(province => (
                          <SelectItem key={province.id} value={province.id}>
                            {province.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="regency">Regency/City</Label>
                    <Select
                      value={formData.job.regencyId}
                      onValueChange={(value) => {
                        handleJobChange('regencyId', value);
                        handleJobChange('districtId', '');
                        handleJobChange('villageId', '');
                      }}
                      disabled={!formData.job.provinceId}
                    >
                      <SelectTrigger id="regency">
                        <SelectValue placeholder="Select regency" />
                      </SelectTrigger>
                      <SelectContent>
                        {regencies.map(regency => (
                          <SelectItem key={regency.id} value={regency.id}>
                            {regency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="district">District</Label>
                    <Select
                      value={formData.job.districtId}
                      onValueChange={(value) => {
                        handleJobChange('districtId', value);
                        handleJobChange('villageId', '');
                      }}
                      disabled={!formData.job.regencyId}
                    >
                      <SelectTrigger id="district">
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map(district => (
                          <SelectItem key={district.id} value={district.id}>
                            {district.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="village">Village</Label>
                    <Select
                      value={formData.job.villageId}
                      onValueChange={(value) => handleJobChange('villageId', value)}
                      disabled={!formData.job.districtId}
                    >
                      <SelectTrigger id="village">
                        <SelectValue placeholder="Select village" />
                      </SelectTrigger>
                      <SelectContent>
                        {villages.map(village => (
                          <SelectItem key={village.id} value={village.id}>
                            {village.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="addressDetail">Address Detail</Label>
                  <Textarea
                    id="addressDetail"
                    value={formData.job.addressDetail}
                    onChange={(e) => handleJobChange('addressDetail', e.target.value)}
                    placeholder="Street address, building name, floor, etc."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remote"
                      checked={formData.job.isRemote}
                      onCheckedChange={(checked) => handleJobChange('isRemote', checked)}
                    />
                    <Label htmlFor="remote" className="cursor-pointer">
                      Remote work available
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hybrid"
                      checked={formData.job.isHybrid}
                      onCheckedChange={(checked) => handleJobChange('isHybrid', checked)}
                    />
                    <Label htmlFor="hybrid" className="cursor-pointer">
                      Hybrid work model
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="application" className="space-y-4">
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
          </TabsContent>

          <TabsContent value="additional" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Skills Required
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MultiCombobox
                  options={formData.job.skills.map(skill => ({ name: skill }))}
                  selectedValues={formData.job.skills.map(skill => ({ name: skill }))}
                  onValueChange={(values) => {
                    const skills = values.map(v => v.name);
                    setFormData(prev => ({
                      ...prev,
                      job: { ...prev.job, skills }
                    }));
                  }}
                  onCreateNew={async (name) => ({ name })}
                  placeholder="Add skills..."
                  searchPlaceholder="Type skill name (e.g., React, Node.js)..."
                  emptyText="No skills added. Type to add new skills."
                  allowCreate={true}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Benefits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MultiCombobox
                  options={formData.job.benefits.map(benefit => ({ name: benefit }))}
                  selectedValues={formData.job.benefits.map(benefit => ({ name: benefit }))}
                  onValueChange={(values) => {
                    const benefits = values.map(v => v.name);
                    setFormData(prev => ({
                      ...prev,
                      job: { ...prev.job, benefits }
                    }));
                  }}
                  onCreateNew={async (name) => ({ name })}
                  placeholder="Add benefits..."
                  searchPlaceholder="Type benefit (e.g., Health Insurance, Remote Work)..."
                  emptyText="No benefits added. Type to add new benefits."
                  allowCreate={true}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <TiptapEditor
                  content={formData.job.requirements}
                  onChange={(content) => handleJobChange('requirements', content)}
                  placeholder="List the job requirements, qualifications, and must-haves..."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Responsibilities</CardTitle>
              </CardHeader>
              <CardContent>
                <TiptapEditor
                  content={formData.job.responsibilities}
                  onChange={(content) => handleJobChange('responsibilities', content)}
                  placeholder="Describe the key responsibilities and duties of this role..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>SEO Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="seoTitle">SEO Title</Label>
                  <Input
                    id="seoTitle"
                    value={formData.seo.title}
                    onChange={(e) => handleSEOChange('title', e.target.value)}
                    placeholder="Optimized title for search engines"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.seo.title.length}/60 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={formData.seo.metaDescription}
                    onChange={(e) => handleSEOChange('metaDescription', e.target.value)}
                    placeholder="Brief description for search results"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.seo.metaDescription.length}/160 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="focusKeyword">Focus Keyword</Label>
                  <Input
                    id="focusKeyword"
                    value={formData.seo.focusKeyword}
                    onChange={(e) => handleSEOChange('focusKeyword', e.target.value)}
                    placeholder="Main keyword to target"
                  />
                </div>

                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-semibold mb-2">Preview in Search Results</h4>
                  <div className="space-y-1">
                    <div className="text-blue-600 text-lg">{formData.seo.title || formData.title || 'Job Title'}</div>
                    <div className="text-green-700 text-sm">
                      {`${typeof window !== 'undefined' ? window.location.origin : 'https://example.com'}/jobs/${formData.slug || 'job-slug'}`}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formData.seo.metaDescription || formData.excerpt || 'Job description will appear here...'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
