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
import { Plus, MoreHorizontal, Trash, Edit, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import { useApiClient } from '../../lib/api-client'
import { Checkbox } from '../ui/checkbox'

interface EducationLevel {
  id: string
  name: string
  slug: string
  created_at?: string
}

export function EducationLevelsList() {
  const [types, setTypes] = useState<EducationLevel[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [totalTypes, setTotalTypes] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<EducationLevel | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  })
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const apiClient = useApiClient()

  useEffect(() => {
    fetchTypes()
  }, [])

  const fetchTypes = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get<{ success: boolean; data: EducationLevel[] }>('/job-data/education-levels')
      const typesData = response.data || []
      setTypes(typesData)
      setTotalTypes(typesData.length)
    } catch (error) {
      console.error('Error fetching education levels:', error)
      toast.error('Failed to load education levels')
      setTypes([])
      setTotalTypes(0)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateType = async () => {
    if (!formData.name.trim()) {
      toast.error('Education level name is required')
      return
    }

    try {
      setLoading(true)
      const response = await apiClient.post<{ success: boolean; data: EducationLevel }>('/job-data/education-levels', {
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, '-'),
      })

      setTypes(prev => [...prev, response.data])
      setTotalTypes(prev => prev + 1)
      setFormData({ name: '', slug: '' })
      setIsCreateDialogOpen(false)
      toast.success('Education level created successfully')
    } catch (error) {
      console.error('Error creating education level:', error)
      toast.error('Failed to create education level')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateType = async () => {
    if (!editingType || !formData.name.trim()) {
      toast.error('Education level name is required')
      return
    }

    try {
      setLoading(true)
      const response = await apiClient.put<{ success: boolean; data: EducationLevel }>(`/job-data/education-levels/${editingType.id}`, {
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, '-'),
      })

      setTypes(prev => prev.map(type => type.id === editingType.id ? response.data : type))
      setFormData({ name: '', slug: '' })
      setEditingType(null)
      setIsEditDialogOpen(false)
      toast.success('Education level updated successfully')
    } catch (error) {
      console.error('Error updating education level:', error)
      toast.error('Failed to update education level')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteType = async (typeId: string) => {
    if (!confirm('Are you sure you want to delete this education level? This action cannot be undone.')) {
      return
    }

    try {
      setLoading(true)
      await apiClient.delete(`/job-data/education-levels/${typeId}`)
      const newTypes = types.filter(type => type.id !== typeId)
      setTypes(newTypes)
      setTotalTypes(newTypes.length)

      const newTotalPages = Math.ceil(newTypes.length / itemsPerPage)
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages)
      }

      toast.success('Education level deleted successfully')
    } catch (error) {
      console.error('Error deleting education level:', error)
      toast.error('Failed to delete education level')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedTypes.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedTypes.size} selected education levels? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await Promise.all(Array.from(selectedTypes).map(id => apiClient.delete(`/job-data/education-levels/${id}`)));

      const newTypes = types.filter(type => !selectedTypes.has(type.id));
      setTypes(newTypes);
      setTotalTypes(newTypes.length);
      setSelectedTypes(new Set());

      const newTotalPages = Math.ceil(newTypes.length / itemsPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }

      toast.success('Selected education levels deleted successfully');
    } catch (error) {
      console.error('Error deleting education levels:', error);
      toast.error('Failed to delete selected education levels');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (type: EducationLevel) => {
    setEditingType(type)
    setFormData({
      name: type.name,
      slug: type.slug,
    })
    setIsEditDialogOpen(true)
  }

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false)
    setFormData({ name: '', slug: '' })
  }

  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
    setEditingType(null)
    setFormData({ name: '', slug: '' })
  }

  const paginatedTypes = types.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const isAllCurrentPageSelected = paginatedTypes.length > 0 && paginatedTypes.every(type => selectedTypes.has(type.id));
  const isAllDataSelected = selectedTypes.size === totalTypes && totalTypes > 0;

  const handleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      setSelectedTypes(prev => {
        const newSet = new Set(prev);
        paginatedTypes.forEach(type => newSet.delete(type.id));
        return newSet;
      });
    } else {
      setSelectedTypes(prev => {
        const newSet = new Set(prev);
        paginatedTypes.forEach(type => newSet.add(type.id));
        return newSet;
      });
    }
  };

  const handleSelectAllData = () => {
    setSelectedTypes(new Set(types.map(type => type.id)));
  };

  const handleSelectType = (typeId: string) => {
    setSelectedTypes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(typeId)) {
        newSet.delete(typeId)
      } else {
        newSet.add(typeId)
      }
      return newSet
    })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Education Levels</h1>
          <p className="text-muted-foreground mt-1">Manage job education levels</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Education Level
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Education Level</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter education level name"
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
              <Button onClick={handleCreateType} disabled={loading}>
                Create Education Level
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {selectedTypes.size > 0 && (
        <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
          <p className="text-sm">
            {selectedTypes.size} education level{selectedTypes.size === 1 ? '' : 's'} selected
          </p>
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
            onClick={() => setSelectedTypes(new Set())}
          >
            Clear Selection
          </Button>
          {isAllCurrentPageSelected && !isAllDataSelected && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSelectAllData}
            >
              Select all {totalTypes} data
            </Button>
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading && types.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading education levels...</p>
            </div>
          ) : types.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No education levels yet</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Education Level
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
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all education levels on this page"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTypes.map((type) => (
                    <TableRow key={type.id} data-state={selectedTypes.has(type.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTypes.has(type.id)}
                          onCheckedChange={() => handleSelectType(type.id)}
                          aria-label={`Select education level ${type.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{type.slug}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(type)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteType(type.id)}
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

              {totalTypes > itemsPerPage && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalTypes)} of {totalTypes} education levels
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
                      {Array.from({ length: Math.ceil(totalTypes / itemsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(totalTypes / itemsPerPage)
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
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalTypes / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(totalTypes / itemsPerPage)}
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
            <DialogTitle>Edit Education Level</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter education level name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="education-level-slug"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>Cancel</Button>
            <Button onClick={handleUpdateType} disabled={loading}>
              Update Education Level
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
