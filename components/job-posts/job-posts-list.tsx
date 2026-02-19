import { useState, useEffect } from 'react';
import { useDebounce } from '../../hooks/use-debounce';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Checkbox } from '../ui/checkbox';
import { Search, Plus, MoreHorizontal, Edit, Trash, Eye, Calendar, Trash2, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { LoadingState } from '../ui/loading-state';
import { EmptyState } from '../ui/empty-state';
import { useApiClient } from '../../lib/api-client';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog';

interface JobPost {
  id: string;
  title: string;
  job_company_name?: string;
  employment_type?: { id: string; name: string; slug: string; } | null;
  experience_level?: { id: string; name: string; slug: string; years_min?: number; years_max?: number; } | null;
  province?: { id: string; name: string; } | null;
  regency?: { id: string; name: string; province_id: string; } | null;
  job_is_remote?: boolean;
  job_is_hybrid?: boolean;
  status: 'draft' | 'published' | 'scheduled';
  publish_date?: string;
  job_deadline?: string;
  created_at?: string;
  updated_at?: string;
  job_categories?: Array<{ id: string; name: string; }>;
  job_tags?: Array<{ id: string; name: string; }>;
}

interface JobPostFilters {
  search?: string;
  status?: string;
  employment_type?: string;
  experience_level?: string;
  job_category?: string;
}

interface JobPostsListProps {
  onCreatePost: () => void;
  onEditPost: (post: JobPost) => void;
  onViewPost: (post: JobPost) => void;
  onDeletePost: (postId: string) => void;
}

export function JobPostsList({ onCreatePost, onEditPost, onViewPost, onDeletePost }: JobPostsListProps) {
  const [posts, setPosts] = useState<JobPost[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalPosts, setTotalPosts] = useState(0);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<JobPostFilters>({
    search: '',
    status: undefined,
    employment_type: undefined,
    experience_level: undefined,
    job_category: undefined,
  });
  const [, setJobCategories] = useState<Array<{ id: string; name: string; }>>([]);
  const [employmentTypes, setEmploymentTypes] = useState<Array<{ id: string; name: string; slug: string; }>>([]);
  const [experienceLevels, setExperienceLevels] = useState<Array<{ id: string; name: string; slug: string; }>>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const apiClient = useApiClient();
  const debouncedSearch = useDebounce(filters.search, 300);

  useEffect(() => {
    fetchPosts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch, filters.status, filters.employment_type, filters.experience_level, filters.job_category]);

  useEffect(() => {
    fetchJobCategories();
    fetchEmploymentTypes();
    fetchExperienceLevels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPosts = async () => {
    try {
      setFetchLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.employment_type) params.append('employment_type', filters.employment_type);
      if (filters.experience_level) params.append('experience_level', filters.experience_level);
      if (filters.job_category) params.append('job_category', filters.job_category);
      
      const response = await apiClient.get<{ posts?: JobPost[]; total?: number; data?: { posts: JobPost[]; total: number } }>(`/job-posts?${params.toString()}`);
      const data = response?.data || response;
      setPosts(Array.isArray(data.posts) ? data.posts : Array.isArray(data) ? data : []);
      setTotalPosts(data.total || (Array.isArray(data) ? data.length : 0));
    } catch (error) {
      console.error('Error fetching job posts:', error);
      toast.error('Failed to fetch job posts');
      setPosts([]);
      setTotalPosts(0);
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchJobCategories = async () => {
    try {
      const response = await apiClient.get<{ data?: Array<{ id: string; name: string }> }>('/job-categories');
      const categoriesData = response?.data || response || [];
      setJobCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Error fetching job categories:', error);
      setJobCategories([]);
    }
  };

  const fetchEmploymentTypes = async () => {
    try {
      const response = await apiClient.get<{ data?: Array<{ id: string; name: string; slug: string }> }>('/job-data/employment-types');
      const types = response?.data || response || [];
      setEmploymentTypes(Array.isArray(types) ? types : []);
    } catch (error) {
      console.error('Error fetching employment types:', error);
      setEmploymentTypes([]);
    }
  };

  const fetchExperienceLevels = async () => {
    try {
      const response = await apiClient.get<{ data?: Array<{ id: string; name: string; slug: string }> }>('/job-data/experience-levels');
      const levels = response?.data || response || [];
      setExperienceLevels(Array.isArray(levels) ? levels : []);
    } catch (error) {
      console.error('Error fetching experience levels:', error);
      setExperienceLevels([]);
    }
  };

  const handleDelete = (postId: string) => {
    setDeleteTarget(postId);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/job-posts/${deleteTarget}`);
      toast.success('Job post deleted successfully');
      await fetchPosts();
      onDeletePost(deleteTarget);
    } catch (error) {
      console.error('Error deleting job post:', error);
      toast.error('Failed to delete job post');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPosts(new Set(displayPosts.map(p => p.id)));
    } else {
      setSelectedPosts(new Set());
    }
  };

  const handleSelectPost = (postId: string, checked: boolean) => {
    const newSelected = new Set(selectedPosts);
    if (checked) {
      newSelected.add(postId);
    } else {
      newSelected.delete(postId);
    }
    setSelectedPosts(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedPosts.size === 0) return;
    setBulkDeleteOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const postIds = Array.from(selectedPosts);
      await apiClient.post('/job-posts/bulk-delete', { postIds });
      
      setSelectedPosts(new Set());
      toast.success(`${postIds.length} job post(s) deleted successfully`);
      await fetchPosts();
      postIds.forEach(id => onDeletePost(id));
    } catch (error) {
      console.error('Error bulk deleting job posts:', error);
      toast.error('Failed to delete job posts');
    } finally {
      setBulkDeleteOpen(false);
    }
  };

  const displayPosts = Array.isArray(posts) ? posts : [];
  const totalPages = Math.ceil(totalPosts / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalPosts);

  const getStatusBadge = (status: JobPost['status']) => {
    const variants = {
      draft: 'secondary',
      published: 'default',
      scheduled: 'outline'
    } as const;

    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleFilterChange = (key: keyof JobPostFilters, value: string | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
    setCurrentPage(1);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Job Posts</h1>
            <p className="text-muted-foreground">
              Manage your job postings
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={onCreatePost}>
                <Plus className="w-4 h-4 mr-2" />
                New Job Post
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Create a new job posting</p>
            </TooltipContent>
          </Tooltip>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search job posts..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filters.status || "all"} onValueChange={(value) => handleFilterChange('status', value === "all" ? undefined : value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.employment_type || "all"} onValueChange={(value) => handleFilterChange('employment_type', value === "all" ? undefined : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Employment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {employmentTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.experience_level || "all"} onValueChange={(value) => handleFilterChange('experience_level', value === "all" ? undefined : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Experience Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {experienceLevels.map((level) => (
                  <SelectItem key={level.id} value={level.name}>
                    {level.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" onClick={() => setFilters({ search: '', status: undefined, employment_type: undefined, experience_level: undefined, job_category: undefined })}>
                  Clear Filters
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset all filters to show all job posts</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      {selectedPosts.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-muted rounded-lg">
          <p className="text-sm">
            {selectedPosts.size} job post(s) selected
          </p>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleBulkDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSelectedPosts(new Set())}
          >
            Clear Selection
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {fetchLoading && displayPosts.length === 0 ? (
            <LoadingState message="Loading job posts..." />
          ) : displayPosts.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No job posts found"
              description="Get started by creating your first job post."
              action={{ label: 'Create Your First Job Post', onClick: onCreatePost }}
            />
          ) : (
          <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={displayPosts.length > 0 && selectedPosts.size === displayPosts.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayPosts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedPosts.has(post.id)}
                      onCheckedChange={(checked) => handleSelectPost(post.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="cursor-pointer hover:text-primary transition-colors" onClick={() => onEditPost(post)}>
                      <p className="font-medium">{post.title}</p>
                      <div className="flex gap-1 mt-1">
                        {post.job_is_remote && <Badge variant="outline" className="text-xs">Remote</Badge>}
                        {post.job_is_hybrid && <Badge variant="outline" className="text-xs">Hybrid</Badge>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{post.job_company_name || '-'}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {post.employment_type && <div>{post.employment_type.name}</div>}
                      {post.experience_level && <div className="text-muted-foreground text-xs">{post.experience_level.name}</div>}
                      {!post.employment_type && !post.experience_level && '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {post.province ? post.province.name : '-'}
                    {post.regency && `, ${post.regency.name}`}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(post.status)}
                  </TableCell>
                  <TableCell>
                    {post.job_deadline ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(post.job_deadline), 'MMM dd, yyyy')}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Job post actions</p>
                        </TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewPost(post)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditPost(post)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(post.id)}
                          className="text-destructive"
                        >
                          <Trash className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {endIndex} of {totalPosts} job posts
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      return page === 1 || 
                             page === totalPages || 
                             (page >= currentPage - 1 && page <= currentPage + 1);
                    })
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      </div>
                    ))
                  }
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
          )}
        </CardContent>
      </Card>
      </div>

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Job Post?"
        description="This action cannot be undone. This will permanently delete this job post."
      />
      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={confirmBulkDelete}
        title="Delete Selected Job Posts?"
        description={`This action cannot be undone. This will permanently delete ${selectedPosts.size} selected job post(s).`}
      />
    </TooltipProvider>
  );
}
