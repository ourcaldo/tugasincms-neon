import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { JobFormData } from './types';

interface SEOTabProps {
  formData: JobFormData;
  handleSEOChange: (field: string, value: string) => void;
}

export function SEOTab({ formData, handleSEOChange }: SEOTabProps) {
  return (
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
            {(formData.seo.title ?? '').length}/60 characters
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
            {(formData.seo.metaDescription ?? '').length}/160 characters
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
              {`${process.env.NEXT_PUBLIC_SITE_URL || 'https://nexjob.tech'}/jobs/${formData.slug || 'job-slug'}`}
            </div>
            <div className="text-sm text-gray-600">
              {formData.seo.metaDescription || formData.excerpt || 'Job description will appear here...'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
