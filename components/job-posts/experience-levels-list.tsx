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
import { Plus, MoreHorizontal, Trash, Trash2, Edit, Award, Search } from 'lucide-react'
import { LoadingState } from '../ui/loading-state'
import { EmptyState } from '../ui/empty-state'
import { toast } from 'sonner'
import { useApiClient } from '../../lib/api-client'
import { Checkbox } from '../ui/checkbox'
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog'

interface ExperienceLevel {
  id: string
  name: string
  slug: string
  years_min?: number | null
  years_max?: number | null
  created_at?: string
}

export function ExperienceLevelsList() {
  const [levels, setLevels] = useState<ExperienceLevel[]>([])
  const [fetchLoading, setFetchLoading] = useState(true)
  const [mutationLoading, setMutationLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [, setTotalLevels] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingLevel, setEditingLevel] = useState<ExperienceLevel | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    years_min: '',
    years_max: '',
  })
  const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const apiClient = useApiClient()

  const fetchLevels = useCallback(async () => {
    try {
      setFetchLoading(true)
      const response = await apiClient.get<{ success: boolean; data: ExperienceLevel[] }>('/job-data/experience-levels')
      const levelsData = response.data || []
      setLevels(levelsData)
      setTotalLevels(levelsData.length)
    } catch (error) {
      console.error('Error fetching experience levels:', error)
      toast.error('Failed to load experience levels')
      setLevels([])
      setTotalLevels(0)
    } finally {
      setFetchLoading(false)
    }
  }, [apiClient])

  useEffect(() => {
    fetchLevels()
  }, [fetchLevels])

  const handleCreateLevel = async () => {
    if (!formData.name.trim()) {
      toast.error('Experience level name is required')
      return
    }

    try {
      setMutationLoading(true)
      const response = await apiClient.post<{ success: boolean; data: ExperienceLevel }>('/job-data/experience-levels', {
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, '-'),
        years_min: formData.years_min ? parseInt(formData.years_min) : null,
        years_max: formData.years_max ? parseInt(formData.years_max) : null,
      })

      setLevels(prev => [...prev, response.data])
      setTotalLevels(prev => prev + 1)
      setFormData({ name: '', slug: '', years_min: '', years_max: '' })
      setIsCreateDialogOpen(false)
      toast.success('Experience level created successfully')
    } catch (error) {
      console.error('Error creating experience level:', error)
      toast.error('Failed to create experience level')
    } finally {
      setMutationLoading(false)
    }
  }

  const handleUpdateLevel = async () => {
    if (!editingLevel || !formData.name.trim()) {
      toast.error('Experience level name is required')
      return
    }

    try {
      setMutationLoading(true)
      const response = await apiClient.put<{ success: boolean; data: ExperienceLevel }>(`/job-data/experience-levels/${editingLevel.id}`, {
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, '-'),
        years_min: formData.years_min ? parseInt(formData.years_min) : null,
        years_max: formData.years_max ? parseInt(formData.years_max) : null,
      })

      setLevels(prev => prev.map(level => level.id === editingLevel.id ? response.data : level))
      setFormData({ name: '', slug: '', years_min: '', years_max: '' })
      setEditingLevel(null)
      setIsEditDialogOpen(false)
      toast.success('Experience level updated successfully')
    } catch (error) {
      console.error('Error updating experience level:', error)
      toast.error('Failed to update experience level')
    } finally {
      setMutationLoading(false)
    }
  }

  const handleDeleteLevel = (levelId: string) => {
    setDeleteTarget(levelId)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setMutationLoading(true)
      await apiClient.delete(`/job-data/experience-levels/${deleteTarget}`)
      const newLevels = levels.filter(level => level.id !== deleteTarget)
      setLevels(newLevels)
      setTotalLevels(newLevels.length)

      const newTotalPages = Math.ceil(newLevels.length / itemsPerPage)
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages)
      }

      toast.success('Experience level deleted successfully')
    } catch (error) {
      console.error('Error deleting experience level:', error)
      toast.error('Failed to delete experience level')
    } finally {
      setMutationLoading(false)
      setDeleteTarget(null)
    }
  }

  const handleBulkDelete = () => {
    if (selectedLevels.size === 0) return;
    setBulkDeleteOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      setMutationLoading(true);
      await apiClient.post('/job-data/experience-levels/bulk-delete', { ids: Array.from(selectedLevels) });

      const newLevels = levels.filter(level => !selectedLevels.has(level.id));
      setLevels(newLevels);
      setTotalLevels(newLevels.length);
      setSelectedLevels(new Set());

      const newTotalPages = Math.ceil(newLevels.length / itemsPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }

      toast.success('Selected experience levels deleted successfully');
    } catch (error) {
      console.error('Error deleting experience levels:', error);
      toast.error('Failed to delete selected experience levels');
    } finally {
      setMutationLoading(false);
      setBulkDeleteOpen(false);
    }
  };

  const openEditDialog = (level: ExperienceLevel) => {
    setEditingLevel(level)
    setFormData({
      name: level.name,
      slug: level.slug,
      years_min: level.years_min?.toString() || '',
      years_max: level.years_max?.toString() || '',
    })
    setIsEditDialogOpen(true)
  }

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false)
    setFormData({ name: '', slug: '', years_min: '', years_max: '' })
  }

  const closeEditDialog = () => {
    setIsEditDialogOpen(false)
    setEditingLevel(null)
    setFormData({ name: '', slug: '', years_min: '', years_max: '' })
  }

  const filteredLevels = levels.filter(level =>
    level.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    level.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const paginatedLevels = filteredLevels.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const isAllCurrentPageSelected = selectedLevels.size === paginatedLevels.length && paginatedLevels.length > 0;
  const isAllDataSelected = selectedLevels.size === filteredLevels.length && filteredLevels.length > 0;

  const handleSelectAll = () => {
    if (isAllDataSelected) {
      setSelectedLevels(new Set());
    } else {
      setSelectedLevels(new Set(levels.map(level => level.id)));
    }
  };

  const handleSelectLevel = (levelId: string) => {
    setSelectedLevels(prev => {
      const newSet = new Set(prev)
      if (newSet.has(levelId)) {
        newSet.delete(levelId)
      } else {
        newSet.add(levelId)
      }
      return newSet
    })
  }

  const formatYearsRange = (level: ExperienceLevel) => {
    if (level.years_min !== null && level.years_min !== undefined && level.years_max !== null && level.years_max !== undefined) {
      return `${level.years_min}-${level.years_max} years`
    } else if (level.years_min !== null && level.years_min !== undefined) {
      return `${level.years_min}+ years`
    } else if (level.years_max !== null && level.years_max !== undefined) {
      return `Up to ${level.years_max} years`
    }
    return '-'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Experience Levels</h1>
          <p className="text-muted-foreground mt-1">Manage job experience levels</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Experience Level
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Experience Level</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter experience level name"
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="years_min">Min Years</Label>
                  <Input
                    id="years_min"
                    type="number"
                    min="0"
                    value={formData.years_min}
                    onChange={(e) => setFormData({ ...formData, years_min: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="years_max">Max Years</Label>
                  <Input
                    id="years_max"
                    type="number"
                    min="0"
                    value={formData.years_max}
                    onChange={(e) => setFormData({ ...formData, years_max: e.target.value })}
                    placeholder="10"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeCreateDialog}>Cancel</Button>
              <Button onClick={handleCreateLevel} disabled={mutationLoading}>
                Create Experience Level
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search experience levels..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          className="pl-10"
        />
      </div>

      {selectedLevels.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-muted rounded-lg">
          <p className="text-sm">
            {selectedLevels.size} experience level{selectedLevels.size === 1 ? '' : 's'} selected
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
            onClick={() => setSelectedLevels(new Set())}
          >
            Clear Selection
          </Button>
          {isAllCurrentPageSelected && !isAllDataSelected && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSelectAll}
            >
              Select all {filteredLevels.length} data
            </Button>
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {fetchLoading && levels.length === 0 ? (
            <LoadingState message="Loading experience levels..." />
          ) : levels.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No experience levels yet"
              description="Manage job experience levels."
              action={{ label: 'Create Your First Experience Level', onClick: () => setIsCreateDialogOpen(true) }}
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
                        aria-label="Select all experience levels on this page"
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Years Range</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLevels.map((level) => (
                    <TableRow key={level.id} data-state={selectedLevels.has(level.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selectedLevels.has(level.id)}
                          onCheckedChange={() => handleSelectLevel(level.id)}
                          aria-label={`Select experience level ${level.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{level.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{level.slug}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatYearsRange(level)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(level)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteLevel(level.id)}
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

              {filteredLevels.length > itemsPerPage && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredLevels.length)} of {filteredLevels.length} experience levels
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
                      {Array.from({ length: Math.ceil(filteredLevels.length / itemsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(filteredLevels.length / itemsPerPage)
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
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredLevels.length / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(filteredLevels.length / itemsPerPage)}
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
            <DialogTitle>Edit Experience Level</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter experience level name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="experience-level-slug"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-years_min">Min Years</Label>
                <Input
                  id="edit-years_min"
                  type="number"
                  min="0"
                  value={formData.years_min}
                  onChange={(e) => setFormData({ ...formData, years_min: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-years_max">Max Years</Label>
                <Input
                  id="edit-years_max"
                  type="number"
                  min="0"
                  value={formData.years_max}
                  onChange={(e) => setFormData({ ...formData, years_max: e.target.value })}
                  placeholder="10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>Cancel</Button>
            <Button onClick={handleUpdateLevel} disabled={mutationLoading}>
              Update Experience Level
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        onConfirm={confirmDelete}
        title="Delete Experience Level"
        description="Are you sure you want to delete this experience level? This action cannot be undone."
      />
      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={confirmBulkDelete}
        title="Delete Selected Experience Levels"
        description={`Are you sure you want to delete ${selectedLevels.size} selected experience levels? This action cannot be undone.`}
      />
    </div>
  )
}