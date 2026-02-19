'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Webhook, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'

interface WebhookLog {
  id: string
  event_type: string
  event_id: string | null
  source: string
  status: 'success' | 'error'
  clerk_user_id: string | null
  payload: Record<string, unknown> | null
  error_message: string | null
  ip_address: string | null
  processing_ms: number | null
  created_at: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function WebhookLogsPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [eventTypeFilter, setEventTypeFilter] = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (eventTypeFilter.trim()) params.set('event_type', eventTypeFilter.trim())

      const res = await fetch(`/api/v1/webhooks/logs?${params}`, {
        headers: { Authorization: `Bearer ${getApiToken()}` },
      })
      const json = await res.json()
      if (json.success) {
        setLogs(json.data.logs)
        setPagination(json.data.pagination)
      }
    } catch (err) {
      console.error('Failed to fetch webhook logs:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, eventTypeFilter])

  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  function getApiToken(): string {
    // Use the internal API token stored in env (exposed via server action or hardcoded for internal use)
    return process.env.NEXT_PUBLIC_API_TOKEN || ''
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Webhook Logs</h1>
        <p className="text-muted-foreground">
          Audit trail of all incoming Clerk webhook events
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Event Type</label>
              <Input
                className="w-[200px]"
                placeholder="e.g. user.created"
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLogs(1)}
              />
            </div>

            <Button variant="outline" size="sm" onClick={() => fetchLogs(1)}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Events ({pagination.total})</CardTitle>
          <CardDescription>
            Page {pagination.page} of {pagination.totalPages || 1}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead className="w-[80px]">ms</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No webhook events found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <>
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                      >
                        <TableCell className="text-xs font-mono">
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{log.event_type}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[200px] truncate">
                          {log.clerk_user_id || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-right">{log.processing_ms ?? '—'}</TableCell>
                        <TableCell className="text-xs font-mono">{log.ip_address || '—'}</TableCell>
                      </TableRow>
                      {expandedRow === log.id && (
                        <TableRow key={`${log.id}-detail`}>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <div className="space-y-2">
                              <div className="flex gap-4 text-xs">
                                <span><strong>Event ID:</strong> {log.event_id || '—'}</span>
                                <span><strong>Source:</strong> {log.source}</span>
                              </div>
                              {log.error_message && (
                                <div className="text-sm text-destructive">
                                  <strong>Error:</strong> {log.error_message}
                                </div>
                              )}
                              {log.payload && (
                                <details>
                                  <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                                    View Payload
                                  </summary>
                                  <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto max-h-[300px]">
                                    {JSON.stringify(log.payload, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchLogs(pagination.page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchLogs(pagination.page + 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
