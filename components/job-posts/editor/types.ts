export interface JobCategory {
  id: string;
  name: string;
  slug: string;
}

export interface JobTag {
  id: string;
  name: string;
  slug: string;
}

export interface EmploymentType {
  id: string;
  name: string;
  slug: string;
}

export interface ExperienceLevel {
  id: string;
  name: string;
  slug: string;
  years_min?: number;
  years_max?: number;
}

export interface EducationLevel {
  id: string;
  name: string;
  slug: string;
}

export interface LocationData {
  id: string;
  name: string;
}

export interface JobFormData {
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  featuredImage: string;
  publishDate: Date;
  status: 'draft' | 'published' | 'scheduled';
  jobCategories: JobCategory[];
  jobTags: JobTag[];
  seo: {
    title: string;
    metaDescription: string;
    focusKeyword: string;
    slug: string;
  };
  job: {
    companyName: string;
    companyLogo: string;
    companyWebsite: string;
    employmentTypeId: string;
    experienceLevelId: string;
    educationLevelId: string;
    salaryMin: string;
    salaryMax: string;
    salaryCurrency: string;
    salaryPeriod: string;
    isSalaryNegotiable: boolean;
    provinceId: string;
    regencyId: string;
    districtId: string;
    villageId: string;
    addressDetail: string;
    isRemote: boolean;
    isHybrid: boolean;
    applicationEmail: string;
    applicationUrl: string;
    applicationDeadline: Date | undefined;
    skills: string[];
    benefits: string[];
    requirements: string;
    responsibilities: string;
  };
}

export interface JobPostEditorProps {
  postId?: string;
  onSave?: (post: Record<string, unknown>) => void;
  onPreview?: () => void;
  onPublish?: () => void;
}
