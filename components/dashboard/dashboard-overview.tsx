'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { PageHeader } from '../layout/page-header'
import { LoadingState } from '../ui/loading-state'
import { useApiClient } from '../../lib/api-client'
import {
  FileText,
  File,
  Briefcase,
  BarChart3,
  Plus,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { format } from 'date-fns'

interface DashboardStats {
  totalPosts: number
  totalPages: number
  totalJobPosts: number
  publishedCount: number
  draftCount: number
}

interface RecentItem {
  id: string
  title: string
  status: string
  type: 'post' | 'page' | 'job-post'
  updatedAt: string
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPosts: 0,
    totalPages: 0,
    totalJobPosts: 0,
    publishedCount: 0,
    draftCount: 0,
  })
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [loading, setLoading] = useState(true)
  const apiClient = useApiClient()
  const router = useRouter()

  useEffect(() => {
    fetchDashboardData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [postsRes, pagesRes, jobPostsRes] = await Promise.all([
        apiClient.get<Record<string, unknown>>('/posts?limit=5'),
        apiClient.get<Record<string, unknown>>('/pages?limit=5'),
        apiClient.get<Record<string, unknown>>('/job-posts?limit=5'),
      ])

      const postsData = postsRes.data || postsRes
      const pagesData = pagesRes.data || pagesRes
      const jobPostsData = jobPostsRes.data || jobPostsRes

      const posts: Record<string, unknown>[] = Array.isArray(postsData) ? postsData : ((postsData as Record<string, unknown>).posts as Record<string, unknown>[]) || []
      const pages: Record<string, unknown>[] = Array.isArray(pagesData) ? pagesData : ((pagesData as Record<string, unknown>).pages as Record<string, unknown>[]) || []
      const jobPosts: Record<string, unknown>[] = Array.isArray(jobPostsData) ? jobPostsData : ((jobPostsData as Record<string, unknown>).jobPosts as Record<string, unknown>[]) || []

      const allItems: (Record<string, unknown> & { type: 'post' | 'page' | 'job-post' })[] = [
        ...posts.map((p: Record<string, unknown>) => ({ ...p, type: 'post' as const })),
        ...pages.map((p: Record<string, unknown>) => ({ ...p, type: 'page' as const })),
        ...jobPosts.map((p: Record<string, unknown>) => ({ ...p, type: 'job-post' as const })),
      ]

      const published = allItems.filter((i) => i.status === 'published').length
      const draft = allItems.filter((i) => i.status === 'draft').length

      setStats({
        totalPosts: (postsData as Record<string, unknown>).total as number || posts.length,
        totalPages: (pagesData as Record<string, unknown>).total as number || pages.length,
        totalJobPosts: (jobPostsData as Record<string, unknown>).total as number || jobPosts.length,
        publishedCount: published,
        draftCount: draft,
      })

      // Combine and sort by date
      const recent: RecentItem[] = allItems
        .map((item: Record<string, unknown> & { type: 'post' | 'page' | 'job-post' }) => ({
          id: item.id as string,
          title: item.title as string,
          status: item.status as string,
          type: item.type,
          updatedAt: (item.updatedAt || item.updated_at || item.createdAt || item.created_at) as string,
        }))
        .sort((a: RecentItem, b: RecentItem) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 5)

      setRecentItems(recent)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingState message="Loading dashboard..." />
  }

  const statCards = [
    {
      title: 'Total Posts',
      value: stats.totalPosts,
      icon: FileText,
      href: '/posts',
    },
    {
      title: 'Total Pages',
      value: stats.totalPages,
      icon: File,
      href: '/pages',
    },
    {
      title: 'Total Job Posts',
      value: stats.totalJobPosts,
      icon: Briefcase,
      href: '/job-posts',
    },
    {
      title: 'Published / Draft',
      value: `${stats.publishedCount} / ${stats.draftCount}`,
      icon: BarChart3,
      href: '#',
    },
  ]

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'post': return 'Post'
      case 'page': return 'Page'
      case 'job-post': return 'Job Post'
      default: return type
    }
  }

  const getTypePath = (type: string, id: string) => {
    switch (type) {
      case 'post': return `/posts/edit/${id}`
      case 'page': return `/pages/edit/${id}`
      case 'job-post': return `/job-posts/edit/${id}`
      default: return '#'
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome back. Here's an overview of your content."
      />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card
            key={stat.title}
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => stat.href !== '#' && router.push(stat.href)}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No recent activity
              </p>
            ) : (
              <div className="space-y-3">
                {recentItems.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => router.push(getTypePath(item.type, item.id))}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {getTypeLabel(item.type)}
                        {item.updatedAt && ` · ${format(new Date(item.updatedAt), 'MMM d, yyyy')}`}
                      </p>
                    </div>
                    <Badge variant={item.status === 'published' ? 'default' : 'secondary'} className="ml-2 shrink-0">
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => router.push('/posts/new')}
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Create New Post
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => router.push('/pages/new')}
            >
              <span className="flex items-center gap-2">
                <File className="h-4 w-4" />
                Create New Page
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => router.push('/job-posts/new')}
            >
              <span className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Create New Job Post
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
