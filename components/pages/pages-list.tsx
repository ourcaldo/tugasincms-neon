import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Checkbox } from '../ui/checkbox';
import { Search, Plus, MoreHorizontal, Edit, Trash, Eye, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useApiClient } from '../../lib/api-client';
import { toast } from 'sonner';

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
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: '',
  });
  const apiClient = useApiClient();

  useEffect(() => {
    fetchPages();
  }, [currentPage, filters.search, filters.status, filters.category]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });
      
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      
      const response = await apiClient.get<any>(`/pages?${params.toString()}`);
      const data = response?.data || response;
      setPages(Array.isArray(data.pages) ? data.pages : []);
      setTotalPages(data.total || 0);
    } catch (error) {
      console.error('Error fetching pages:', error);
      toast.error('Failed to fetch pages');
      setPages([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get<any>('/categories');
      const categoriesData = response?.data || response || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const handleDelete = async (pageId: string) => {
    try {
      await apiClient.delete(`/pages/${pageId}`);
      toast.success('Page deleted successfully');
      await fetchPages();
      onDeletePage(pageId);
    } catch (error) {
      console.error('Error deleting page:', error);
      toast.error('Failed to delete page');
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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Pages</CardTitle>
          <Button onClick={onCreatePage}>
            <Plus className="mr-2 h-4 w-4" />
            New Page
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search pages..."
                  className="pl-8"
                  value={filters.search}
                  onChange={(e) => {
                    setFilters({ ...filters, search: e.target.value });
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
            <Select
              value={filters.status}
              onValueChange={(value) => {
                setFilters({ ...filters, status: value });
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.category}
              onValueChange={(value) => {
                setFilters({ ...filters, category: value });
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPages.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedPages.size} selected
              </span>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pages found. Create your first page to get started.
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedPages.has(page.id)}
                            onCheckedChange={(checked) => handleSelectPage(page.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{page.title}</div>
                            <div className="text-sm text-muted-foreground">{page.slug}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              page.status === 'published'
                                ? 'default'
                                : page.status === 'scheduled'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {page.status}
                          </Badge>
                        </TableCell>
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
                            {page.publish_date && format(new Date(page.publish_date), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onEditPage(page)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onViewPage(page)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(page.id)}
                                className="text-destructive"
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPageCount > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalPages)} of {totalPages} pages
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPageCount, prev + 1))}
                      disabled={currentPage === totalPageCount}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
