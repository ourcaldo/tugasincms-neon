'use client'

import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Plus, MoreHorizontal, Trash, Edit, Tag } from 'lucide-react'
import { Checkbox } from '../ui/checkbox'
import { toast } from 'sonner'
import { useApiClient } from '../../lib/api-client'

interface TagItem {
  id: string
  name: string
  slug: string
  created_at?: string
  updated_at?: string
}

export function TagsList() {
  const [tags, setTags] = useState<TagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [totalTags, setTotalTags] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  })
  const apiClient = useApiClient()
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    try {
      setLoading(true)
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
      setLoading(false)
    }
  }

  const handleCreateTag = async () => {
    if (!formData.name.trim()) {
      toast.error('Tag name is required')
      return
    }

    try {
      setLoading(true)
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
      setLoading(false)
    }
  }

  const handleUpdateTag = async () => {
    if (!editingTag || !formData.name.trim()) {
      toast.error('Tag name is required')
      return
    }

    try {
      setLoading(true)
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
      setLoading(false)
    }
  }

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      await apiClient.delete(`/tags/${tagId}`)
      const newTags = tags.filter(tag => tag.id !== tagId)
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
      setLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedTags.size === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedTags.size} selected tag(s)? This action cannot be undone.`)) {
      return
    }

    try {
      setLoading(true)
      await Promise.all(Array.from(selectedTags).map(id => apiClient.delete(`/tags/${id}`)))
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
      setLoading(false)
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

  const paginatedTags = tags.slice(
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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tags</h1>
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
              <Button onClick={handleCreateTag} disabled={loading}>
                Create Tag
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bulk Actions */}
      {selectedTags.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <p className="text-sm">
            {selectedTags.size} tag{selectedTags.size === 1 ? '' : 's'} selected
          </p>
          {selectedTags.size < tags.length && (
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleSelectAllData}
            >
              Select All {tags.length} Tags
            </Button>
          )}
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleBulkDelete}
          >
            <Trash className="w-4 h-4 mr-2" />
            Delete Selected
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setSelectedTags(new Set())}
          >
            Clear Selection
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading && tags.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading tags...</p>
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No tags yet</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Tag
              </Button>
            </div>
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

              {totalTags > itemsPerPage && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalTags)} of {totalTags} tags
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
                      {Array.from({ length: Math.ceil(totalTags / itemsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(totalTags / itemsPerPage)
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
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalTags / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(totalTags / itemsPerPage)}
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
            <Button onClick={handleUpdateTag} disabled={loading}>
              Update Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}