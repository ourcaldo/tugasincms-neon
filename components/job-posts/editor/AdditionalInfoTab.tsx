import { Dispatch, SetStateAction } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Info } from 'lucide-react';
import { TiptapEditor } from '../../editor/tiptap-editor';
import { MultiCombobox } from '../../ui/multi-combobox';
import { JobFormData } from './types';

interface AdditionalInfoTabProps {
  formData: JobFormData;
  setFormData: Dispatch<SetStateAction<JobFormData>>;
  handleJobChange: (field: string, value: any) => void;
}

export function AdditionalInfoTab({
  formData,
  setFormData,
  handleJobChange,
}: AdditionalInfoTabProps) {
  return (
    <>
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
    </>
  );
}
