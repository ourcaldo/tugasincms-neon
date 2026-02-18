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
import { Plus, MoreHorizontal, Trash, Trash2, Edit, Briefcase, Search } from 'lucide-react'
import { LoadingState } from '../ui/loading-state'
import { EmptyState } from '../ui/empty-state'
import { toast } from 'sonner'
import { useApiClient } from '../../lib/api-client'
import { Checkbox } from '../ui/checkbox'
import { ConfirmDeleteDialog } from '../ConfirmDeleteDialog'

interface EmploymentType {
  id: string
  name: string
  slug: string
  created_at?: string
}

export function EmploymentTypesList() {
  const [types, setTypes] = useState<EmploymentType[]>([])
  const [fetchLoading, setFetchLoading] = useState(true)
  const [mutationLoading, setMutationLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [totalTypes, setTotalTypes] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingType, setEditingType] = useState<EmploymentType | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  })
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const apiClient = useApiClient()

  useEffect(() => {
    fetchTypes()
  }, [])

  const fetchTypes = async () => {
    try {
      setFetchLoading(true)
      const response = await apiClient.get<{ success: boolean; data: EmploymentType[] }>('/job-data/employment-types')
      const typesData = response.data || []
      setTypes(typesData)
      setTotalTypes(typesData.length)
    } catch (error) {
      console.error('Error fetching employment types:', error)
      toast.error('Failed to load employment types')
      setTypes([])
      setTotalTypes(0)
    } finally {
      setFetchLoading(false)
    }
  }

  const handleCreateType = async () => {
    if (!formData.name.trim()) {
      toast.error('Employment type name is required')
      return
    }

    try {
      setMutationLoading(true)
      const response = await apiClient.post<{ success: boolean; data: EmploymentType }>('/job-data/employment-types', {
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, '-'),
      })

      setTypes(prev => [...prev, response.data])
      setTotalTypes(prev => prev + 1)
      setFormData({ name: '', slug: '' })
      setIsCreateDialogOpen(false)
      toast.success('Employment type created successfully')
    } catch (error) {
      console.error('Error creating employment type:', error)
      toast.error('Failed to create employment type')
    } finally {
      setMutationLoading(false)
    }
  }

  const handleUpdateType = async () => {
    if (!editingType || !formData.name.trim()) {
      toast.error('Employment type name is required')
      return
    }

    try {
      setMutationLoading(true)
      const response = await apiClient.put<{ success: boolean; data: EmploymentType }>(`/job-data/employment-types/${editingType.id}`, {
        name: formData.name.trim(),
        slug: formData.slug.trim() || formData.name.toLowerCase().replace(/\s+/g, '-'),
      })

      setTypes(prev => prev.map(type => type.id === editingType.id ? response.data : type))
      setFormData({ name: '', slug: '' })
      setEditingType(null)
      setIsEditDialogOpen(false)
      toast.success('Employment type updated successfully')
    } catch (error) {
      console.error('Error updating employment type:', error)
      toast.error('Failed to update employment type')
    } finally {
      setMutationLoading(false)
    }
  }

  const handleDeleteType = (typeId: string) => {
    setDeleteTarget(typeId)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      setMutationLoading(true)
      await apiClient.delete(`/job-data/employment-types/${deleteTarget}`)
      const newTypes = types.filter(type => type.id !== deleteTarget)
      setTypes(newTypes)
      setTotalTypes(newTypes.length)

      const newTotalPages = Math.ceil(newTypes.length / itemsPerPage)
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages)
      }

      toast.success('Employment type deleted successfully')
    } catch (error) {
      console.error('Error deleting employment type:', error)
      toast.error('Failed to delete employment type')
    } finally {
      setMutationLoading(false)
      setDeleteTarget(null)
    }
  }

  const handleBulkDelete = () => {
    if (selectedTypes.size === 0) return;
    setBulkDeleteOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      setMutationLoading(true);
      await apiClient.post('/job-data/employment-types/bulk-delete', { ids: Array.from(selectedTypes) });

      const newTypes = types.filter(type => !selectedTypes.has(type.id));
      setTypes(newTypes);
      setTotalTypes(newTypes.length);
      setSelectedTypes(new Set());

      const newTotalPages = Math.ceil(newTypes.length / itemsPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }

      toast.success('Selected employment types deleted successfully');
    } catch (error) {
      console.error('Error deleting employment types:', error);
      toast.error('Failed to delete selected employment types');
    } finally {
      setMutationLoading(false);
      setBulkDeleteOpen(false);
    }
  };

  const openEditDialog = (type: EmploymentType) => {
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

  const filteredTypes = types.filter(type =>
    type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    type.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const paginatedTypes = filteredTypes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const isAllCurrentPageSelected = selectedTypes.size === paginatedTypes.length && paginatedTypes.length > 0;
  const isAllDataSelected = selectedTypes.size === filteredTypes.length && filteredTypes.length > 0;

  const handleSelectAll = () => {
    if (isAllDataSelected) {
      setSelectedTypes(new Set());
    } else {
      setSelectedTypes(new Set(types.map(type => type.id)));
    }
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employment Types</h1>
          <p className="text-muted-foreground mt-1">Manage job employment types</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Employment Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Employment Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter employment type name"
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
              <Button onClick={handleCreateType} disabled={mutationLoading}>
                Create Employment Type
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search employment types..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          className="pl-10"
        />
      </div>

      {selectedTypes.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-muted rounded-lg">
          <p className="text-sm">
            {selectedTypes.size} employment type{selectedTypes.size === 1 ? '' : 's'} selected
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
            onClick={() => setSelectedTypes(new Set())}
          >
            Clear Selection
          </Button>
          {isAllCurrentPageSelected && !isAllDataSelected && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSelectAll}
            >
              Select all {filteredTypes.length} data
            </Button>
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {fetchLoading && types.length === 0 ? (
            <LoadingState message="Loading employment types..." />
          ) : types.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No employment types yet"
              description="Manage job employment types."
              action={{ label: 'Create Your First Employment Type', onClick: () => setIsCreateDialogOpen(true) }}
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
                        aria-label="Select all employment types on this page"
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
                          aria-label={`Select employment type ${type.name}`}
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

              {filteredTypes.length > itemsPerPage && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTypes.length)} of {filteredTypes.length} employment types
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
                      {Array.from({ length: Math.ceil(filteredTypes.length / itemsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(filteredTypes.length / itemsPerPage)
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
                      onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredTypes.length / itemsPerPage), prev + 1))}
                      disabled={currentPage === Math.ceil(filteredTypes.length / itemsPerPage)}
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
            <DialogTitle>Edit Employment Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter employment type name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="employment-type-slug"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>Cancel</Button>
            <Button onClick={handleUpdateType} disabled={mutationLoading}>
              Update Employment Type
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        onConfirm={confirmDelete}
        title="Delete Employment Type"
        description="Are you sure you want to delete this employment type? This action cannot be undone."
      />
      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={confirmBulkDelete}
        title="Delete Selected Employment Types"
        description={`Are you sure you want to delete ${selectedTypes.size} selected employment types? This action cannot be undone.`}
      />
    </div>
  )
}