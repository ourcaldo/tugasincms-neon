import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { useUser } from '@clerk/nextjs';
import { useApiClient } from '../../../lib/api-client';
import { uploadImage } from '../../../lib/appwrite';
import { ComboboxOption } from '../../ui/multi-combobox';
import { toast } from 'sonner';
import { JobFormData, JobCategory, JobTag } from './types';

const defaultFormData: JobFormData = {
  title: '',
  content: '',
  excerpt: '',
  slug: '',
  featuredImage: '',
  publishDate: new Date(),
  status: 'draft',
  jobCategories: [],
  jobTags: [],
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
    educationLevelId: '',
    salaryMin: '',
    salaryMax: '',
    salaryCurrency: 'IDR',
    salaryPeriod: 'bulan',
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
    applicationDeadline: undefined,
    skills: [],
    benefits: [],
    requirements: '',
    responsibilities: '',
  },
};

interface UseJobPostFormOptions {
  postId?: string;
  onSave?: (post: any) => void;
  setJobCategories: Dispatch<SetStateAction<JobCategory[]>>;
  setJobTags: Dispatch<SetStateAction<JobTag[]>>;
}

export function useJobPostForm({
  postId,
  onSave,
  setJobCategories,
  setJobTags,
}: UseJobPostFormOptions) {
  const [formData, setFormData] = useState<JobFormData>({ ...defaultFormData });
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(!!postId);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDeadlineCalendarOpen, setIsDeadlineCalendarOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');

  const apiClient = useApiClient();
  const { user } = useUser();

  // Fetch existing job post
  useEffect(() => {
    if (postId) {
      fetchJobPost();
    }
  }, [postId]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!postId && formData.title) {
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData(prev => ({
        ...prev,
        slug,
        seo: { ...prev.seo, slug },
      }));
    }
  }, [formData.title, postId]);

  // Sync SEO fields from title/excerpt
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      seo: {
        ...prev.seo,
        title: prev.seo.title || prev.title,
        metaDescription: prev.seo.metaDescription || prev.excerpt,
      },
    }));
  }, [formData.title, formData.excerpt]);

  const fetchJobPost = async () => {
    if (!postId) return;
    try {
      setLoading(true);
      const result = await apiClient.get<any>(`/job-posts/${postId}`);
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
          educationLevelId: data.job_education_level_id || '',
          salaryMin: data.job_salary_min?.toString() || '',
          salaryMax: data.job_salary_max?.toString() || '',
          salaryCurrency: data.job_salary_currency || 'IDR',
          salaryPeriod: data.job_salary_period || 'bulan',
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
          applicationDeadline: data.job_application_deadline
            ? new Date(data.job_application_deadline)
            : undefined,
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

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSEOChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      seo: { ...prev.seo, [field]: value },
    }));
  };

  const handleJobChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      job: { ...prev.job, [field]: value },
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
        const url = await uploadImage(file);
        setFormData(prev => ({ ...prev, featuredImage: url }));
        toast.dismiss();
        toast.success('Image uploaded successfully');
      } catch (error: unknown) {
        toast.dismiss();
        console.error('Error uploading image:', error);
        if (error instanceof Error && error.message === 'APPWRITE_NOT_CONFIGURED') {
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
          job: { ...prev.job, companyLogo: logoUrl },
        }));
        toast.dismiss();
        toast.success('Company logo uploaded successfully');
      } catch (error: unknown) {
        toast.dismiss();
        console.error('Error uploading company logo:', error);
        if (error instanceof Error && error.message === 'APPWRITE_NOT_CONFIGURED') {
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
        job: { ...prev.job, companyLogo: companyLogoUrl.trim() },
      }));
      setCompanyLogoUrl('');
    }
  };

  const buildJobPostData = (overrides: Record<string, any> = {}) => ({
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
    job_education_level_id: formData.job.educationLevelId || undefined,
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
    ...overrides,
  });

  const validateRequiredFields = (): boolean => {
    if (!formData.title.trim()) {
      toast.error('Please enter a job title');
      return false;
    }
    if (!formData.content.trim()) {
      toast.error('Please enter job description');
      return false;
    }
    if (!formData.slug.trim()) {
      toast.error('Please enter a slug');
      return false;
    }
    return true;
  };

  const submitJobPost = async (data: Record<string, any>) => {
    const result = postId
      ? await apiClient.put<any>(`/job-posts/${postId}`, data)
      : await apiClient.post<any>('/job-posts', data);
    return result.data || result;
  };

  const handleSave = async () => {
    if (!user) return;
    if (!validateRequiredFields()) return;

    try {
      setLoading(true);
      const savedPost = await submitJobPost(buildJobPostData());
      toast.success(postId ? 'Job post updated successfully' : 'Job post created successfully');
      onSave?.(savedPost);
    } catch (error: unknown) {
      console.error('Error saving job post:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save job post');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!user) return;
    if (!validateRequiredFields()) return;

    try {
      setLoading(true);
      const savedPost = await submitJobPost(
        buildJobPostData({ status: 'published', publish_date: new Date().toISOString() })
      );
      setFormData(prev => ({ ...prev, status: 'published', publishDate: new Date() }));
      toast.success('Job post published successfully');
      onSave?.(savedPost);
    } catch (error: unknown) {
      console.error('Error publishing job post:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to publish job post');
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    setFormData,
    loading,
    isInitialLoad,
    isCalendarOpen,
    setIsCalendarOpen,
    isDeadlineCalendarOpen,
    setIsDeadlineCalendarOpen,
    imageUrl,
    setImageUrl,
    companyLogoUrl,
    setCompanyLogoUrl,
    handleInputChange,
    handleSEOChange,
    handleJobChange,
    handleCreateCategory,
    handleCreateTag,
    handleImageUpload,
    handleCompanyLogoUpload,
    setImageFromUrl,
    setCompanyLogoFromUrl,
    handleSave,
    handlePublish,
  };
}
