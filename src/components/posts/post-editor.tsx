import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
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
import { CalendarIcon, Upload, X, Save, Eye, Send } from 'lucide-react';
import { format } from 'date-fns';
import { Post, Category, Tag } from '../../types';
import { mockCategories, mockTags } from '../../lib/mock-data';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { TiptapEditor } from '../editor/tiptap-editor';
import { useApiClient } from '../../lib/api-client';
import { toast } from 'sonner';

interface PostEditorProps {
  post?: Post;
  postId?: string;
  onSave: (post: Partial<Post>) => void;
  onPreview?: () => void;
  onPublish?: () => void;
}

export function PostEditor({ post, postId, onSave, onPreview, onPublish }: PostEditorProps) {
  const [formData, setFormData] = useState({
    title: post?.title || '',
    content: post?.content || '',
    excerpt: post?.excerpt || '',
    slug: post?.slug || '',
    featuredImage: post?.featuredImage || '',
    publishDate: post?.publishDate || new Date(),
    status: post?.status || 'draft' as const,
    categories: post?.categories || [],
    tags: post?.tags || [],
    seo: {
      title: post?.seo?.title || '',
      metaDescription: post?.seo?.metaDescription || '',
      focusKeyword: post?.seo?.focusKeyword || '',
      slug: post?.seo?.slug || '',
    },
  });

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const apiClient = useApiClient();
  const { user } = useUser();

  useEffect(() => {
    if (postId && !post) {
      fetchPost();
    }
  }, [postId]);

  const fetchPost = async () => {
    if (!postId) return;
    try {
      setLoading(true);
      const data = await apiClient.get<Post>(`/posts/${postId}`);
      setFormData({
        title: data.title,
        content: data.content,
        excerpt: data.excerpt || '',
        slug: data.slug,
        featuredImage: data.featuredImage || '',
        publishDate: data.publishDate || new Date(),
        status: data.status,
        categories: data.categories || [],
        tags: data.tags || [],
        seo: {
          title: data.seo?.title || '',
          metaDescription: data.seo?.metaDescription || '',
          focusKeyword: data.seo?.focusKeyword || '',
          slug: data.seo?.slug || '',
        },
      });
    } catch (error) {
      console.error('Error fetching post:', error);
      toast.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate slug from title
  useEffect(() => {
    if (!post && formData.title) {
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
  }, [formData.title, post]);

  // Auto-fill SEO fields
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

  const addCategory = (categoryId: string) => {
    const category = mockCategories.find(c => c.id === categoryId);
    if (category && !formData.categories.find(c => c.id === categoryId)) {
      setFormData(prev => ({
        ...prev,
        categories: [...prev.categories, category]
      }));
    }
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real implementation, this would upload to Appwrite
      const mockUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, featuredImage: mockUrl }));
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
      const postData = {
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        excerpt: formData.excerpt,
        featuredImage: formData.featuredImage,
        status: formData.status,
        publishDate: formData.publishDate,
        seoTitle: formData.seo.title,
        metaDescription: formData.seo.metaDescription,
        focusKeyword: formData.seo.focusKeyword,
        authorId: user.id,
        categoryIds: formData.categories.map(c => c.id),
        tagIds: formData.tags.map(t => t.id),
      };

      if (postId) {
        await apiClient.put(`/posts/${postId}`, postData);
        toast.success('Post updated successfully');
      } else {
        await apiClient.post('/posts', postData);
        toast.success('Post created successfully');
      }
      
      onSave(formData);
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Failed to save post');
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
      const postData = {
        title: publishData.title,
        slug: publishData.slug,
        content: publishData.content,
        excerpt: publishData.excerpt,
        featuredImage: publishData.featuredImage,
        status: publishData.status,
        publishDate: publishData.publishDate,
        seoTitle: publishData.seo.title,
        metaDescription: publishData.seo.metaDescription,
        focusKeyword: publishData.seo.focusKeyword,
        authorId: user.id,
        categoryIds: publishData.categories.map(c => c.id),
        tagIds: publishData.tags.map(t => t.id),
      };

      if (postId) {
        await apiClient.put(`/posts/${postId}`, postData);
      } else {
        await apiClient.post('/posts', postData);
      }
      
      setFormData(publishData);
      toast.success('Post published successfully');
      onSave(publishData);
      if (onPublish) onPublish();
    } catch (error) {
      console.error('Error publishing post:', error);
      toast.error('Failed to publish post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1>{post ? 'Edit Post' : 'Create New Post'}</h1>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={onPreview}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Preview how your post will look when published</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleSave}>
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
                <Button onClick={handlePublish}>
                  <Send className="w-4 h-4 mr-2" />
                  Publish
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Publish your post immediately</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Content */}
          <Card>
            <CardHeader>
              <CardTitle>Post Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter post title..."
                />
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <TiptapEditor
                  content={formData.content}
                  onChange={(content) => handleInputChange('content', content)}
                  placeholder="Write your post content..."
                />
              </div>

              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label htmlFor="excerpt">Excerpt</Label>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>A short summary that appears in post listings and search results</p>
                  </TooltipContent>
                </Tooltip>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => handleInputChange('excerpt', e.target.value)}
                  placeholder="Brief description of the post..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* SEO Settings */}
          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="seo" className="w-full">
                <TabsList>
                  <TabsTrigger value="seo">SEO</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="seo" className="space-y-4">
                  <div>
                    <Label htmlFor="seo-title">SEO Title</Label>
                    <Input
                      id="seo-title"
                      value={formData.seo.title}
                      onChange={(e) => handleSEOChange('title', e.target.value)}
                      placeholder="SEO optimized title..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="seo-description">Meta Description</Label>
                    <Textarea
                      id="seo-description"
                      value={formData.seo.metaDescription}
                      onChange={(e) => handleSEOChange('metaDescription', e.target.value)}
                      placeholder="Meta description for search engines..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Label htmlFor="seo-keyword">Focus Keyword</Label>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The main keyword you want this post to rank for in search engines</p>
                      </TooltipContent>
                    </Tooltip>
                    <Input
                      id="seo-keyword"
                      value={formData.seo.focusKeyword}
                      onChange={(e) => handleSEOChange('focusKeyword', e.target.value)}
                      placeholder="Primary keyword for SEO..."
                    />
                  </div>
                </TabsContent>
                <TabsContent value="preview" className="space-y-4">
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h3 className="text-blue-600 text-lg mb-1">
                      {formData.seo.title || formData.title || 'Your Post Title'}
                    </h3>
                    <p className="text-green-700 text-sm mb-2">
                      yourdomain.com/{formData.seo.slug || formData.slug}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formData.seo.metaDescription || formData.excerpt || 'Your post description will appear here...'}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Publish Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Publish Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
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
                      <CalendarIcon className="mr-2 h-4 w-4" />
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
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label htmlFor="slug">Slug</Label>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>The URL-friendly version of your post title (e.g., "my-awesome-post")</p>
                  </TooltipContent>
                </Tooltip>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="post-url-slug"
                />
              </div>
            </CardContent>
          </Card>

          {/* Featured Image */}
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

              <div>
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

          {/* Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select onValueChange={addCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select categories..." />
                </SelectTrigger>
                <SelectContent>
                  {mockCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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

          {/* Tags */}
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
                <Button
                  onClick={() => newTag.trim() && addTag(newTag.trim())}
                  size="sm"
                >
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag.id} variant="outline" className="pr-1">
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
        </div>
      </div>
      </div>
    </TooltipProvider>
  );
}