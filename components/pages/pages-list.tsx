import { useState, useEffect } from 'react';
import { useDebounce } from '../../hooks/use-debounce';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { TooltipProvider } from '../ui/tooltip';
import { Checkbox } from '../ui/checkbox';
import { Search, Plus, MoreHorizontal, Edit, Trash2, Eye, File } from 'lucide-react';
import { format } from 'date-fns';
import { useApiClient } from '../../lib/api-client';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog';
import { PageHeader } from '../layout/page-header';
import { LoadingState } from '../ui/loading-state';
import { EmptyState } from '../ui/empty-state';

interface Page {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'scheduled';
  template?: string;
  menu_order?: number;
  publish_date?: string;
  created_at?: string;
  updated_at?: string;
  categories?: Array<{ id: string; name: string; slug: string }>;
  tags?: Array<{ id: string; name: string; slug: string }>;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

interface PagesListProps {
  onCreatePage: () => void;
  onEditPage: (page: Page) => void;
  onViewPage: (page: Page) => void;
  onDeletePage: (pageId: string) => void;
}

export function PagesList({ onCreatePage, onEditPage, onViewPage, onDeletePage }: PagesListProps) {
  const [pages, setPages] = useState<Page[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Category[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    category: 'all',
  });
  const apiClient = useApiClient();
  const debouncedSearch = useDebounce(filters.search, 300);

  useEffect(() => {
    fetchPages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch, filters.status, filters.category]);

  useEffect(() => {
    fetchCategories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPages = async () => {
    try {
      setFetchLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      
      if (filters.search) params.append('search', filters.search);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.category && filters.category !== 'all') params.append('category', filters.category);
      
      const response = await apiClient.get<{ pages?: Page[]; total?: number; data?: { pages: Page[]; total: number } }>(`/pages?${params.toString()}`);
      const data = response?.data || response;
      setPages(Array.isArray(data.pages) ? data.pages : []);
      setTotalPages(data.total || 0);
    } catch (error) {
      console.error('Error fetching pages:', error);
      toast.error('Failed to fetch pages');
      setPages([]);
      setTotalPages(0);
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get<{ data?: Category[] }>('/categories');
      const categoriesData = response?.data || response || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const handleDelete = async (pageId: string) => {
    setDeleteTarget(pageId);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/pages/${deleteTarget}`);
      toast.success('Page deleted successfully');
      await fetchPages();
      onDeletePage(deleteTarget);
    } catch (error) {
      console.error('Error deleting page:', error);
      toast.error('Failed to delete page');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPages.size === 0) return;
    setBulkDeleteOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      await apiClient.post('/pages/bulk-delete', { pageIds: Array.from(selectedPages) });
      toast.success('Selected pages deleted successfully');
      setSelectedPages(new Set());
      await fetchPages();
    } catch (error) {
      console.error('Error deleting pages:', error);
      toast.error('Failed to delete selected pages');
    } finally {
      setBulkDeleteOpen(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPages(new Set(pages.map(p => p.id)));
    } else {
      setSelectedPages(new Set());
    }
  };

  const handleSelectPage = (pageId: string, checked: boolean) => {
    const newSelected = new Set(selectedPages);
    if (checked) {
      newSelected.add(pageId);
    } else {
      newSelected.delete(pageId);
    }
    setSelectedPages(newSelected);
  };

  const totalPageCount = Math.ceil(totalPages / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(currentPage * itemsPerPage, totalPages);

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      published: 'default',
      scheduled: 'outline',
    } as const;
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <PageHeader
          title="Pages"
          description="Manage your site pages"
          actions={
            <Button onClick={onCreatePage}>
              <Plus className="w-4 h-4 mr-2" />
              New Page
            </Button>
          }
        />

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search pages..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters({ ...filters, search: e.target.value });
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => {
                  setFilters({ ...filters, status: value });
                  setCurrentPage(1);
                }}
              >
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

              <Select
                value={filters.category || 'all'}
                onValueChange={(value) => {
                  setFilters({ ...filters, category: value });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setFilters({ search: '', status: 'all', category: 'all' });
                  setCurrentPage(1);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedPages.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 p-4 bg-muted rounded-lg">
            <p className="text-sm">{selectedPages.size} page(s) selected</p>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPages(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        )}

        {/* Pages Table */}
        <Card>
          <CardContent className="p-0">
            {fetchLoading ? (
              <LoadingState message="Loading pages..." />
            ) : pages.length === 0 ? (
              <EmptyState
                icon={File}
                title="No pages found"
                description="Create your first page to get started."
                action={{ label: 'Create Page', onClick: onCreatePage }}
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedPages.size === pages.length && pages.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Categories</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedPages.has(page.id)}
                            onCheckedChange={(checked) =>
                              handleSelectPage(page.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div
                            className="cursor-pointer hover:text-primary transition-colors"
                            onClick={() => onEditPage(page)}
                          >
                            <p className="font-medium">{page.title}</p>
                            <p className="text-sm text-muted-foreground">{page.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(page.status)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {page.categories && page.categories.length > 0 ? (
                              page.categories.map((cat) => (
                                <Badge key={cat.id} variant="outline" className="text-xs">
                                  {cat.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {page.template || 'default'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {page.publish_date &&
                              format(new Date(page.publish_date), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEditPage(page)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onViewPage(page)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(page.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPageCount > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1} to {endIndex} of {totalPages} pages
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPageCount }, (_, i) => i + 1)
                          .filter(
                            (page) =>
                              page === 1 ||
                              page === totalPageCount ||
                              (page >= currentPage - 1 && page <= currentPage + 1),
                          )
                          .map((page, index, array) => (
                            <div key={page} className="flex items-center">
                              {index > 0 && array[index - 1] !== page - 1 && (
                                <span className="px-2 text-muted-foreground">...</span>
                              )}
                              <Button
                                variant={currentPage === page ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </Button>
                            </div>
                          ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((prev) => Math.min(totalPageCount, prev + 1))
                        }
                        disabled={currentPage === totalPageCount}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <ConfirmDeleteDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onConfirm={confirmDelete}
          title="Delete Page?"
          description="This action cannot be undone. This will permanently delete this page."
        />
        <ConfirmDeleteDialog
          open={bulkDeleteOpen}
          onOpenChange={setBulkDeleteOpen}
          onConfirm={confirmBulkDelete}
          title="Delete Selected Pages?"
          description={`This action cannot be undone. This will permanently delete ${selectedPages.size} selected page(s).`}
        />
      </div>
    </TooltipProvider>
  );
}
