import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { SignIn, SignedIn, SignedOut, UserButton, useUser } from '@clerk/clerk-react';
import { DashboardLayout } from './components/layout/dashboard-layout';
import { PostsList } from './components/posts/posts-list';
import { PostEditor } from './components/posts/post-editor';
import { ProfileSettings } from './components/settings/profile-settings';
import { ApiTokens } from './components/settings/api-tokens';
import { Toaster } from './components/ui/sonner';
import { ThemeProvider } from './components/theme-provider';
import { useEffect } from 'react';
import { useApiClient } from './lib/api-client';

function PostsListPage() {
  const navigate = useNavigate();
  
  return (
    <PostsList
      onCreatePost={() => navigate('/posts/new')}
      onEditPost={(post) => navigate(`/posts/edit/${post.id}`)}
      onViewPost={(post) => window.open(`/posts/${post.id}`, '_blank')}
      onDeletePost={() => {}}
    />
  );
}

function PostEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  return (
    <PostEditor
      postId={id}
      onSave={() => navigate('/posts')}
      onPreview={() => {}}
      onPublish={() => {}}
    />
  );
}

function UserSync() {
  const { user, isLoaded } = useUser();
  const apiClient = useApiClient();

  useEffect(() => {
    async function syncUser() {
      if (!isLoaded || !user) return;

      try {
        const response = await fetch(`/api/settings/profile/${user.id}`);
        
        if (response.status === 404) {
          await apiClient.post('/settings/profile', {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress || '',
            name: user.fullName || user.firstName || '',
            avatar: user.imageUrl || '',
          });
          console.log('User synced to database');
        }
      } catch (error) {
        console.error('Error syncing user:', error);
      }
    }

    syncUser();
  }, [user, isLoaded, apiClient]);

  return null;
}

export default function App() {
  const { user } = useUser();
  
  return (
    <ThemeProvider defaultTheme="system" storageKey="tugascms-theme">
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <SignIn routing="hash" />
        </div>
      </SignedOut>
      
      <SignedIn>
        <UserSync />
        <div className="min-h-screen bg-background">
          <DashboardLayout>
            <Routes>
              <Route path="/" element={<Navigate to="/posts" replace />} />
              <Route path="/posts" element={<PostsListPage />} />
              <Route path="/posts/new" element={<PostEditorPage />} />
              <Route path="/posts/edit/:id" element={<PostEditorPage />} />
              <Route path="/settings/profile" element={<ProfileSettings />} />
              <Route path="/settings/tokens" element={<ApiTokens />} />
              <Route path="/categories" element={
                <div className="text-center py-12">
                  <h2 className="text-2xl font-semibold mb-2">Categories Management</h2>
                  <p className="text-muted-foreground">Category management functionality coming soon</p>
                </div>
              } />
              <Route path="/tags" element={
                <div className="text-center py-12">
                  <h2 className="text-2xl font-semibold mb-2">Tags Management</h2>
                  <p className="text-muted-foreground">Tag management functionality coming soon</p>
                </div>
              } />
              <Route path="/media" element={
                <div className="text-center py-12">
                  <h2 className="text-2xl font-semibold mb-2">Media Library</h2>
                  <p className="text-muted-foreground">Media library functionality coming soon</p>
                </div>
              } />
            </Routes>
          </DashboardLayout>
          <Toaster />
        </div>
      </SignedIn>
    </ThemeProvider>
  );
}
