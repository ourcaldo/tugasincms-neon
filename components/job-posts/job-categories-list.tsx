'use client'

import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Plus, MoreHorizontal, Trash, Trash2, Edit, FolderOpen, Search } from 'lucide-react'
import { LoadingState } from '../ui/loading-state'
import { EmptyState } from '../ui/empty-state'
import { toast } from 'sonner'
import { useApiClient } from '../../lib/api-client'
import { Textarea } from '../ui/textarea'
import { Checkbox } from '../ui/checkbox'
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog'

interface JobCategory {
  id: string
  name: string
  slug: string
  description?: string
  created_at?: string
  updated_at?: string
}

export function JobCategoriesList() {
  const [categories, setCategories] = useState<JobCategory[]>([])
  const [fetchLoading, setFetchLoading] = useState(true)
  const [mutationLoading, setMutationLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [totalCategories, setTotalCategories] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<JobCategory | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
  })
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const apiClient = useApiClient()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setFetchLoading(true)
      const response = await apiClient.get<{ success: boolean; data: JobCategory[] }>('/job-categories')
      const categoriesData = response.data || []
      setCategories(categoriesData)
      setTotalCategories(categoriesData.length)
    } catch (error) {
      console.error('Error fetching job categories:', error)
      toast.error('Failed to load job categories')
      setCategories([])
      setTotalCategories(0)
    } finally {
      setFetchLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!formData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      setMutationLoading(true)
      const response = await apiClient.post<{ success: boolean; data: JobCategory }>('/job-categories', {
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, '-'),
        description: formData.description.trim(),
      })

      setCategories(prev => [...prev, response.data])
      setTotalCategories(prev => prev + 1)
      setFormData({ name: '', slug: '', description: '' })
      setIsCreateDialogOpen(false)
      toast.success('Job category created successfully')
    } catch (error) {
      console.error('Error creating job category:', error)
      toast.error('Failed to create job category')
    } finally {
      setMutationLoading(false)
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory || !formData.name.trim()) {
      toast.error('Category name is required')
      return
    }

    try {
      setMutationLoading(true)
      const response = await apiClient.put<{ success: boolean; data: JobCategory }>(`/job-categories/${editingCategory.id}`, {
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, '-'),
        description: formData.description.trim(),
      })

      setCategories(prev => prev.map(cat => cat.id === editingCategory.id ? response.data : cat))
      setFormData({ name: '', slug: '', description: '' })
      setEditingCategory(null)
      setIsEditDialogOpen(false)
      toast.success('Job category updated successfully')
    } catch (error) {
      console.error('Error updating job category:', error)
      toast.error('Failed to update job category')
    } finally {
      setMutationLoading(false)
    }
  }

  const handleDeleteCategory = (categoryId: string) => {
    setDeleteTarget(categoryId)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setMutationLoading(true)
      await apiClient.delete(`/job-categories/${deleteTarget}`)
      const newCategories = categories.filter(cat => cat.id !== deleteTarget)
      setCategories(newCategories)
      setTotalCategories(newCategories.length)

      const newTotalPages = Math.ceil(newCategories.length / itemsPerPage)
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages)
      }

      toast.success('Job category deleted successfully')
    } catch (error) {
      console.error('Error deleting job category:', error)
      toast.error('Failed to delete job category')
    } finally {
      setMutationLoading(false)
      setDeleteTarget(null)
    }
  }

  const handleBulkDelete = () => {
    if (selectedCategories.size === 0) return;
    setBulkDeleteOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      setMutationLoading(true);
      await apiClient.post('/job-categories/bulk-delete', { ids: Array.from(selectedCategories) });

      const newCategories = categories.filter(cat => !selectedCategories.has(cat.id));
      setCategories(newCategories);
      setTotalCategories(newCategories.length);
      setSelectedCategories(new Set());

      const newTotalPages = Math.ceil(newCategories.length / itemsPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }

      toast.success('Selected job categories deleted successfully');
    } catch (error) {
      console.error('Error deleting job categories:', error);
      toast.error('Failed to delete selected job categories');
    } finally {
      setMutationLoading(false);
      setBulkDeleteOpen(false);
    }
  };

  const openEditDialog = (category: JobCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
    })
    setIsEditDialogOpen(true)
  }

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false)
    setFormData({ name: '', slug: '', description: '' })
  }

  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
    setEditingCategory(null)
    setFormData({ name: '', slug: '', description: '' })
  }

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const isAllCurrentPageSelected = selectedCategories.size === paginatedCategories.length && paginatedCategories.length > 0;
  const isAllDataSelected = selectedCategories.size === filteredCategories.length && filteredCategories.length > 0;

  const handleSelectAll = () => {
    if (isAllDataSelected) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(categories.map(cat => cat.id)));
    }
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Job Categories</h1>
          <p className="text-muted-foreground mt-1">Organize job posts with categories</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Job Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Job Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter job category name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="auto-generated-from-name"
                />
                <p className="text-xs text-muted-foreground">Leave blank to auto-generate from name</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter job category description (optional)"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeCreateDialog}>Cancel</Button>
              <Button onClick={handleCreateCategory} disabled={mutationLoading}>
                Create Job Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search job categories..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          className="pl-10"
        />
      </div>

      {selectedCategories.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-muted rounded-lg">
          <p className="text-sm">
            {selectedCategories.size} job categor{selectedCategories.size === 1 ? 'y' : 'ies'} selected
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
            onClick={() => setSelectedCategories(new Set())}
          >
            Clear Selection
          </Button>
          {isAllCurrentPageSelected && !isAllDataSelected && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSelectAll}
            >
              Select all {filteredCategories.length} data
            </Button>
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {fetchLoading && categories.length === 0 ? (
            <LoadingState message="Loading job categories..." />
          ) : categories.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No job categories yet"
              description="Organize job posts with categories."
              action={{ label: 'Create Your First Job Category', onClick: () => setIsCreateDialogOpen(true) }}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={isAllCurrentPageSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all job categories on this page"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCategories.map((category) => (
                    <TableRow key={category.id} data-state={selectedCategories.has(category.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCategories.has(category.id)}
                          onCheckedChange={() => handleSelectCategory(category.id)}
                          aria-label={`Select job category ${category.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{category.slug}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {category.description || '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(category)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteCategory(category.id)}
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

              {filteredCategories.length > itemsPerPage && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredCategories.length)} of {filteredCategories.length} job categories
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
                      {Array.from({ length: Math.ceil(filteredCategories.length / itemsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(filteredCategories.length / itemsPerPage)
                          return page === 1 ||
                                 page === totalPages ||
                                 (page >= currentPage - 1 && page <= currentPage + 1)
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
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredCategories.length / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(filteredCategories.length / itemsPerPage)}
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Job Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter job category name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="job-category-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter job category description (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>Cancel</Button>
            <Button onClick={handleUpdateCategory} disabled={mutationLoading}>
              Update Job Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        onConfirm={confirmDelete}
        title="Delete Job Category"
        description="Are you sure you want to delete this job category? This action cannot be undone."
      />
      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={confirmBulkDelete}
        title="Delete Selected Job Categories"
        description={`Are you sure you want to delete ${selectedCategories.size} selected job categories? This action cannot be undone.`}
      />
    </div>
  )
}