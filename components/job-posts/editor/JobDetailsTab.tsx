import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Building2, X } from 'lucide-react';
import { ImageWithFallback } from '../../figma/ImageWithFallback';
import { JobFormData, EmploymentType, ExperienceLevel, EducationLevel } from './types';

interface JobDetailsTabProps {
  formData: JobFormData;
  handleJobChange: (field: string, value: JobFormData['job'][keyof JobFormData['job']]) => void;
  handleCompanyLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  companyLogoUrl: string;
  setCompanyLogoUrl: (url: string) => void;
  setCompanyLogoFromUrl: () => void;
  employmentTypes: EmploymentType[];
  experienceLevels: ExperienceLevel[];
  educationLevels: EducationLevel[];
  loading: boolean;
}

export function JobDetailsTab({
  formData,
  handleJobChange,
  handleCompanyLogoUpload,
  companyLogoUrl,
  setCompanyLogoUrl,
  setCompanyLogoFromUrl,
  employmentTypes,
  experienceLevels,
  educationLevels,
  loading,
}: JobDetailsTabProps) {
  return (
    <>
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

          <div>
            <Label htmlFor="educationLevel">Education Level</Label>
            <Select
              value={formData.job.educationLevelId}
              onValueChange={(value) => handleJobChange('educationLevelId', value)}
            >
              <SelectTrigger id="educationLevel">
                <SelectValue placeholder="Select education level" />
              </SelectTrigger>
              <SelectContent>
                {educationLevels.map(level => (
                  <SelectItem key={level.id} value={level.id}>
                    {level.name}
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
                  <SelectItem value="jam">Per Jam</SelectItem>
                  <SelectItem value="hari">Per Hari</SelectItem>
                  <SelectItem value="bulan">Per Bulan</SelectItem>
                  <SelectItem value="tahun">Per Tahun</SelectItem>
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
    </>
  );
}
