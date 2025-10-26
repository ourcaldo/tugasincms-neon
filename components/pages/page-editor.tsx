import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { CalendarIcon, Upload, X, Save, Eye, Send } from 'lucide-react';
import { format } from 'date-fns';
import { Category } from '../../types';
import { mockTags } from '../../lib/mock-data';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { TiptapEditor } from '../editor/tiptap-editor';
import { useApiClient } from '../../lib/api-client';
import { uploadImage } from '../../lib/appwrite';
import { toast } from 'sonner';

interface PageData {
  id?: string;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  featuredImage?: string;
  publishDate: Date;
  status: 'draft' | 'published' | 'scheduled';
  categories: Category[];
  tags: any[];
  template?: string;
  parentPageId?: string;
  menuOrder?: number;
  seo?: {
    title?: string;
    metaDescription?: string;
    focusKeyword?: string;
    slug?: string;
  };
}

interface PageEditorProps {
  page?: PageData;
  pageId?: string;
  onSave: (page: Partial<PageData>) => void;
  onPreview?: () => void;
  onPublish?: () => void;
}

export function PageEditor({ page, pageId, onSave, onPreview, onPublish }: PageEditorProps) {
  const [formData, setFormData] = useState<PageData>({
    title: page?.title || '',
    content: page?.content || '',
    excerpt: page?.excerpt || '',
    slug: page?.slug || '',
    featuredImage: page?.featuredImage || '',
    publishDate: page?.publishDate || new Date(),
    status: page?.status || 'draft',
    categories: page?.categories || [],
    tags: page?.tags || [],
    template: page?.template || 'default',
    parentPageId: page?.parentPageId || '',
    menuOrder: page?.menuOrder || 0,
    seo: {
      title: page?.seo?.title || '',
      metaDescription: page?.seo?.metaDescription || '',
      focusKeyword: page?.seo?.focusKeyword || '',
      slug: page?.seo?.slug || '',
    },
  });

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(!!pageId && !page);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pages, setPages] = useState<PageData[]>([]);
  const apiClient = useApiClient();
  const { user } = useUser();

  useEffect(() => {
    if (pageId && !page) {
      fetchPage();
    }
  }, [pageId]);

  useEffect(() => {
    fetchCategories();
    fetchPages();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const result = await response.json();
      const data = result.data || result;
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      setCategories([]);
    }
  };

  const fetchPages = async () => {
    try {
      const response = await fetch('/api/pages');
      if (!response.ok) throw new Error('Failed to fetch pages');
      const result = await response.json();
      const data = result.data?.pages || result.data || result;
      setPages(Array.isArray(data) ? data : []);
    } catch (error) {
      setPages([]);
    }
  };

  const fetchPage = async () => {
    if (!pageId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/pages/${pageId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch page');
      }
      
      const result = await response.json();
      const data = result.data || result;
      
      setFormData({
        title: data.title,
        content: data.content,
        excerpt: data.excerpt || '',
        slug: data.slug,
        featuredImage: data.featuredImage || '',
        publishDate: data.publishDate ? new Date(data.publishDate) : new Date(),
        status: data.status,
        categories: data.categories || [],
        tags: data.tags || [],
        template: data.template || 'default',
        parentPageId: data.parentPageId || '',
        menuOrder: data.menuOrder || 0,
        seo: {
          title: data.seo?.title || '',
          metaDescription: data.seo?.metaDescription || '',
          focusKeyword: data.seo?.focusKeyword || '',
          slug: data.seo?.slug || '',
        },
      });
      setIsInitialLoad(false);
    } catch (error) {
      toast.error('Failed to load page');
      setIsInitialLoad(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!page && formData.title) {
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
  }, [formData.title, page]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      seo: {
        ...prev.seo,
        title: prev.seo?.title || prev.title,
        metaDescription: prev.seo?.metaDescription || prev.excerpt,
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

  const addCategory = async (categoryName: string) => {
    const trimmedName = categoryName.trim();
    if (!trimmedName) return;

    const existingCategory = categories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    
    if (existingCategory) {
      if (!formData.categories.find(c => c.id === existingCategory.id)) {
        setFormData(prev => ({
          ...prev,
          categories: [...prev.categories, existingCategory]
        }));
      }
    } else {
      try {
        const newCat = await apiClient.post<Category>('/categories', {
          name: trimmedName,
          slug: trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        });
        setCategories(prev => [...prev, newCat]);
        setFormData(prev => ({
          ...prev,
          categories: [...prev.categories, newCat]
        }));
        toast.success(`Category "${trimmedName}" created`);
      } catch (error) {
        toast.error('Failed to create category');
      }
    }
    setNewCategory('');
  };

  const removeCategory = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== categoryId)
    }));
  };

  const addTag = (tagName: string) => {
    const existingTag = mockTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
    const tag = existingTag || {
      id: `new-${Date.now()}`,
      name: tagName,
      slug: tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!formData.tags.find(t => t.id === tag.id)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
    setNewTag('');
  };

  const removeTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t.id !== tagId)
    }));
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

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const pageData = {
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        excerpt: formData.excerpt,
        featuredImage: formData.featuredImage,
        status: formData.status,
        publishDate: formData.publishDate.toISOString(),
        seo: {
          title: formData.seo?.title,
          metaDescription: formData.seo?.metaDescription,
          focusKeyword: formData.seo?.focusKeyword,
        },
        template: formData.template,
        parentPageId: formData.parentPageId || null,
        menuOrder: formData.menuOrder,
        categories: formData.categories.map(c => c.id),
        tags: formData.tags.map(t => t.id),
      };

      if (pageId) {
        await apiClient.put(`/pages/${pageId}`, pageData);
        toast.success('Page updated successfully');
      } else {
        await apiClient.post('/pages', pageData);
        toast.success('Page created successfully');
      }
      
      onSave(formData);
    } catch (error) {
      toast.error('Failed to save page');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!user) return;
    
    const publishData = {
      ...formData,
      status: 'published' as const,
      publishDate: new Date(),
    };
    
    try {
      setLoading(true);
      const pageData = {
        title: publishData.title,
        slug: publishData.slug,
        content: publishData.content,
        excerpt: publishData.excerpt,
        featuredImage: publishData.featuredImage,
        status: publishData.status,
        publishDate: publishData.publishDate.toISOString(),
        seo: {
          title: publishData.seo?.title,
          metaDescription: publishData.seo?.metaDescription,
          focusKeyword: publishData.seo?.focusKeyword,
        },
        template: publishData.template,
        parentPageId: publishData.parentPageId || null,
        menuOrder: publishData.menuOrder,
        categories: publishData.categories.map(c => c.id),
        tags: publishData.tags.map(t => t.id),
      };

      if (pageId) {
        await apiClient.put(`/pages/${pageId}`, pageData);
      } else {
        await apiClient.post('/pages', pageData);
      }
      
      setFormData(publishData);
      toast.success('Page published successfully');
      onSave(publishData);
      if (onPublish) onPublish();
    } catch (error) {
      toast.error('Failed to publish page');
    } finally {
      setLoading(false);
    }
  };

  if (isInitialLoad) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-muted-foreground">Loading page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{page || pageId ? 'Edit Page' : 'Create New Page'}</h1>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={onPreview}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Preview how your page will look when published</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleSave} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Draft
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save your changes as a draft</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={handlePublish} disabled={loading}>
                  <Send className="w-4 h-4 mr-2" />
                  {pageId || page ? 'Update' : 'Publish'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{pageId || page ? 'Update your page' : 'Publish your page immediately'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Page Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter page title..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <TiptapEditor
                content={formData.content}
                onChange={(content) => handleInputChange('content', content)}
                placeholder="Write your page content..."
              />
            </div>

            <div className="space-y-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Label htmlFor="excerpt">Excerpt</Label>
                </TooltipTrigger>
                <TooltipContent>
                  <p>A short summary that may appear in listings and search results</p>
                </TooltipContent>
              </Tooltip>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) => handleInputChange('excerpt', e.target.value)}
                placeholder="Brief description of the page..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Publish Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: string) => handleInputChange('status', value)}>
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

              <div className="space-y-2">
                <Label>Publish Date</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.publishDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.publishDate}
                      onSelect={(date: Date | undefined) => {
                        if (date) {
                          handleInputChange('publishDate', date);
                          setIsCalendarOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label htmlFor="slug">Slug</Label>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>The URL-friendly version of your page title (e.g., "about-us")</p>
                  </TooltipContent>
                </Tooltip>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="page-url-slug"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Page Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label htmlFor="template">Template</Label>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Choose a template for this page</p>
                  </TooltipContent>
                </Tooltip>
                <Select value={formData.template} onValueChange={(value: string) => handleInputChange('template', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="full-width">Full Width</SelectItem>
                    <SelectItem value="sidebar">With Sidebar</SelectItem>
                    <SelectItem value="landing">Landing Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label htmlFor="parent-page">Parent Page</Label>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create a hierarchical structure by setting a parent page</p>
                  </TooltipContent>
                </Tooltip>
                <Select value={formData.parentPageId || 'none'} onValueChange={(value: string) => handleInputChange('parentPageId', value === 'none' ? null : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="None (Top Level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Top Level)</SelectItem>
                    {pages.filter(p => p.id !== pageId).map((p) => (
                      <SelectItem key={p.id} value={p.id!}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label htmlFor="menu-order">Menu Order</Label>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Set the order for this page in menus (lower numbers appear first)</p>
                  </TooltipContent>
                </Tooltip>
                <Input
                  id="menu-order"
                  type="number"
                  min="0"
                  value={formData.menuOrder}
                  onChange={(e) => handleInputChange('menuOrder', parseInt(e.target.value) || 0)}
                  placeholder="0"
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
                <div className="relative">
                  <ImageWithFallback
                    src={formData.featuredImage}
                    alt="Featured image preview"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => handleInputChange('featuredImage', '')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remove featured image</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="image-upload">Upload Image</Label>
                <Input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Or paste image URL..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={setImageFromUrl} size="sm">
                      <Upload className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Set featured image from URL</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type to search or add new category..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newCategory.trim()) {
                        e.preventDefault();
                        addCategory(newCategory.trim());
                      }
                    }}
                  />
                  <Button
                    onClick={() => newCategory.trim() && addCategory(newCategory.trim())}
                    size="sm"
                  >
                    Add
                  </Button>
                </div>
                {newCategory && (
                  <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {categories
                      .filter(c => 
                        c.name.toLowerCase().includes(newCategory.toLowerCase()) &&
                        !formData.categories.find(fc => fc.id === c.id)
                      )
                      .map((category) => (
                        <div
                          key={category.id}
                          className="px-3 py-2 hover:bg-muted cursor-pointer"
                          onClick={() => addCategory(category.name)}
                        >
                          {category.name}
                        </div>
                      ))}
                    {!categories.find(c => c.name.toLowerCase() === newCategory.toLowerCase()) && (
                      <div className="px-3 py-2 text-sm text-muted-foreground border-t">
                        Press Enter or click Add to create "{newCategory}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.categories.map((category) => (
                  <Badge key={category.id} variant="secondary" className="pr-1">
                    {category.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => removeCategory(category.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add new tag..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newTag.trim()) {
                      addTag(newTag.trim());
                    }
                  }}
                />
                <Button onClick={() => newTag.trim() && addTag(newTag.trim())} size="sm">
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary" className="pr-1">
                    {tag.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => removeTag(tag.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seo-title">SEO Title</Label>
                <Input
                  id="seo-title"
                  value={formData.seo?.title}
                  onChange={(e) => handleSEOChange('title', e.target.value)}
                  placeholder="Page title for search engines"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meta-description">Meta Description</Label>
                <Textarea
                  id="meta-description"
                  value={formData.seo?.metaDescription}
                  onChange={(e) => handleSEOChange('metaDescription', e.target.value)}
                  placeholder="Brief description for search results"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="focus-keyword">Focus Keyword</Label>
                <Input
                  id="focus-keyword"
                  value={formData.seo?.focusKeyword}
                  onChange={(e) => handleSEOChange('focusKeyword', e.target.value)}
                  placeholder="Primary keyword for SEO"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </TooltipProvider>
  );
}
