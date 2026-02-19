// C-10: Profile is managed by Clerk — this page shows real data from Clerk
// and hides fake password/2FA controls that were silently discarding input.

'use client'

import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { User, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../layout/page-header';
import { LoadingState } from '../ui/loading-state';

export function ProfileSettings() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <LoadingState message="Loading profile..." />;
  }

  if (!user) {
    return (
      <div>
        <p className="text-muted-foreground">Please sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile Settings"
        description="Your profile is managed through Clerk authentication."
      />

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="w-20 h-20">
              <AvatarImage src={user.imageUrl} />
              <AvatarFallback>
                <User className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{user.fullName || user.firstName || 'User'}</p>
              <p className="text-sm text-muted-foreground">{user.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-muted-foreground">First Name</p>
              <p>{user.firstName || '—'}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Last Name</p>
              <p>{user.lastName || '—'}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Email</p>
              <p>{user.primaryEmailAddress?.emailAddress || '—'}</p>
            </div>
            <div>
              <p className="font-medium text-muted-foreground">Member Since</p>
              <p>{user.createdAt ? format(new Date(user.createdAt), 'MMMM d, yyyy') : '—'}</p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => window.open(process.env.NEXT_PUBLIC_CLERK_ACCOUNT_URL || 'https://accounts.clerk.dev/user', '_blank')}
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Manage Profile on Clerk
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}