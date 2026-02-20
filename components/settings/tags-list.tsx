'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Plus, MoreHorizontal, Trash, Trash2, Edit, Tag, Search } from 'lucide-react'
import { LoadingState } from '../ui/loading-state'
import { EmptyState } from '../ui/empty-state'
import { Checkbox } from '../ui/checkbox'
import { toast } from 'sonner'
import { useApiClient } from '../../lib/api-client'
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog'

interface TagItem {
  id: string
  name: string
  slug: string
  created_at?: string
  updated_at?: string
}

export function TagsList() {
  const [tags, setTags] = useState<TagItem[]>([])
  const [fetchLoading, setFetchLoading] = useState(true)
  const [mutationLoading, setMutationLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [, setTotalTags] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  })
  const apiClient = useApiClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const fetchTags = useCallback(async () => {
    try {
      setFetchLoading(true)
      const response = await apiClient.get<{ success: boolean; data: TagItem[] }>('/tags')
      const tagsData = response.data || []
      setTags(tagsData)
      setTotalTags(tagsData.length)
    } catch (error) {
      console.error('Error fetching tags:', error)
      toast.error('Failed to load tags')
      setTags([])
      setTotalTags(0)
    } finally {
      setFetchLoading(false)
    }
  }, [apiClient])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  const handleCreateTag = async () => {
    if (!formData.name.trim()) {
      toast.error('Tag name is required')
      return
    }

    try {
      setMutationLoading(true)
      const response = await apiClient.post<{ success: boolean; data: TagItem }>('/tags', {
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, '-'),
      })

      setTags(prev => [...prev, response.data])
      setTotalTags(prev => prev + 1)
      setFormData({ name: '', slug: '' })
      setIsCreateDialogOpen(false)
      toast.success('Tag created successfully')
    } catch (error) {
      console.error('Error creating tag:', error)
      toast.error('Failed to create tag')
    } finally {
      setMutationLoading(false)
    }
  }

  const handleUpdateTag = async () => {
    if (!editingTag || !formData.name.trim()) {
      toast.error('Tag name is required')
      return
    }

    try {
      setMutationLoading(true)
      const response = await apiClient.put<{ success: boolean; data: TagItem }>(`/tags/${editingTag.id}`, {
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, '-'),
      })

      setTags(prev => prev.map(tag => tag.id === editingTag.id ? response.data : tag))
      setFormData({ name: '', slug: '' })
      setEditingTag(null)
      setIsEditDialogOpen(false)
      toast.success('Tag updated successfully')
    } catch (error) {
      console.error('Error updating tag:', error)
      toast.error('Failed to update tag')
    } finally {
      setMutationLoading(false)
    }
  }

  const handleDeleteTag = (tagId: string) => {
    setDeleteTarget(tagId)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setMutationLoading(true)
      await apiClient.delete(`/tags/${deleteTarget}`)
      const newTags = tags.filter(tag => tag.id !== deleteTarget)
      setTags(newTags)
      setTotalTags(newTags.length)

      const newTotalPages = Math.ceil(newTags.length / itemsPerPage)
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages)
      }

      toast.success('Tag deleted successfully')
    } catch (error) {
      console.error('Error deleting tag:', error)
      toast.error('Failed to delete tag')
    } finally {
      setMutationLoading(false)
      setDeleteTarget(null)
    }
  }

  const handleBulkDelete = () => {
    if (selectedTags.size === 0) return
    setBulkDeleteOpen(true)
  }

  const confirmBulkDelete = async () => {
    try {
      setMutationLoading(true)
      await apiClient.post('/tags/bulk-delete', { ids: Array.from(selectedTags) })
      const newTags = tags.filter(tag => !selectedTags.has(tag.id))
      setTags(newTags)
      setTotalTags(newTags.length)
      setSelectedTags(new Set())

      const newTotalPages = Math.ceil(newTags.length / itemsPerPage)
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages)
      }

      toast.success('Selected tags deleted successfully')
    } catch (error) {
      console.error('Error deleting tags:', error)
      toast.error('Failed to delete selected tags')
    } finally {
      setMutationLoading(false)
      setBulkDeleteOpen(false)
    }
  }

  const handleSelectTag = (tagId: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tagId)) {
        newSet.delete(tagId)
      } else {
        newSet.add(tagId)
      }
      return newSet
    })
  }

  const handleSelectAllTags = () => {
    const currentPageIds = paginatedTags.map(tag => tag.id)
    const allCurrentPageSelected = currentPageIds.every(id => selectedTags.has(id))
    
    if (allCurrentPageSelected) {
      // Deselect all on current page
      setSelectedTags(prev => {
        const newSet = new Set(prev)
        currentPageIds.forEach(id => newSet.delete(id))
        return newSet
      })
    } else {
      // Select all on current page
      setSelectedTags(prev => {
        const newSet = new Set(prev)
        currentPageIds.forEach(id => newSet.add(id))
        return newSet
      })
    }
  }

  const handleSelectAllData = () => {
    if (selectedTags.size === tags.length) {
      setSelectedTags(new Set())
    } else {
      setSelectedTags(new Set(tags.map(tag => tag.id)))
    }
  }

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const paginatedTags = filteredTags.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const isAllCurrentPageSelected = paginatedTags.length > 0 && 
    paginatedTags.every(tag => selectedTags.has(tag.id))

  const openEditDialog = (tag: TagItem) => {
    setEditingTag(tag)
    setFormData({
      name: tag.name,
      slug: tag.slug,
    })
    setIsEditDialogOpen(true)
  }

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false)
    setFormData({ name: '', slug: '' })
  }

  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
    setEditingTag(null)
    setFormData({ name: '', slug: '' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
          <p className="text-muted-foreground mt-1">Label your content with tags for better organization</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Tag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter tag name"
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeCreateDialog}>Cancel</Button>
              <Button onClick={handleCreateTag} disabled={mutationLoading}>
                Create Tag
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tags..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          className="pl-10"
        />
      </div>

      {/* Bulk Actions */}
      {selectedTags.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-muted rounded-lg">
          <p className="text-sm">
            {selectedTags.size} tag{selectedTags.size === 1 ? '' : 's'} selected
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
            onClick={() => setSelectedTags(new Set())}
          >
            Clear Selection
          </Button>
          {selectedTags.size < tags.length && (
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleSelectAllData}
            >
              Select All {tags.length} Tags
            </Button>
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {fetchLoading && tags.length === 0 ? (
            <LoadingState message="Loading tags..." />
          ) : tags.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No tags yet"
              description="Label your content with tags for better organization."
              action={{ label: 'Create Your First Tag', onClick: () => setIsCreateDialogOpen(true) }}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox 
                        checked={isAllCurrentPageSelected}
                        onCheckedChange={handleSelectAllTags}
                        aria-label="Select all tags on this page"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedTags.has(tag.id)}
                          onCheckedChange={() => handleSelectTag(tag.id)}
                          aria-label={`Select tag ${tag.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{tag.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tag.slug}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(tag)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteTag(tag.id)}
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

              {filteredTags.length > itemsPerPage && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTags.length)} of {filteredTags.length} tags
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
                      {Array.from({ length: Math.ceil(filteredTags.length / itemsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(filteredTags.length / itemsPerPage)
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
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredTags.length / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(filteredTags.length / itemsPerPage)}
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
            <DialogTitle>Edit Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter tag name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="tag-slug"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>Cancel</Button>
            <Button onClick={handleUpdateTag} disabled={mutationLoading}>
              Update Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        onConfirm={confirmDelete}
        title="Delete Tag"
        description="Are you sure you want to delete this tag? This action cannot be undone."
      />
      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={confirmBulkDelete}
        title="Delete Selected Tags"
        description={`Are you sure you want to delete ${selectedTags.size} selected tag(s)? This action cannot be undone.`}
      />
    </div>
  )
}