import { useState } from 'react';
import { DashboardLayout } from './components/layout/dashboard-layout';
import { PostsList } from './components/posts/posts-list';
import { PostEditor } from './components/posts/post-editor';
import { ProfileSettings } from './components/settings/profile-settings';
import { ApiTokens } from './components/settings/api-tokens';
import { AppSidebar } from './components/layout/app-sidebar';
import { useNavigation } from './hooks/use-navigation';
import { Post } from './types';
import { mockPosts } from './lib/mock-data';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const { currentPage, navigate, navigateToEditPost, getActiveItem } = useNavigation();
  const [posts, setPosts] = useState<Post[]>(mockPosts);

  const handleCreatePost = () => {
    navigate('/posts/new');
  };

  const handleEditPost = (post: Post) => {
    navigateToEditPost(post.id);
  };

  const handleViewPost = (post: Post) => {
    // In a real application, this would navigate to a preview page
    toast.info(`Viewing post: ${post.title}`);
  };

  const handleDeletePost = (postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
    toast.success('Post deleted successfully');
  };

  const handleSavePost = (postData: Partial<Post>) => {
    if (currentPage.page === 'posts-new') {
      // Create new post
      const newPost: Post = {
        id: Date.now().toString(),
        ...postData,
        authorId: 'user_1',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Post;
      
      setPosts(prev => [newPost, ...prev]);
      toast.success('Post created successfully');
      navigate('/posts');
    } else if (currentPage.page === 'posts-edit' && currentPage.postId) {
      // Update existing post
      setPosts(prev => prev.map(post => 
        post.id === currentPage.postId 
          ? { ...post, ...postData, updatedAt: new Date() }
          : post
      ));
      toast.success('Post updated successfully');
      navigate('/posts');
    }
  };

  const handlePreview = () => {
    toast.info('Preview functionality would open in a new tab');
  };

  const handlePublish = () => {
    toast.success('Post published successfully');
  };

  const getCurrentPost = (): Post | undefined => {
    if (currentPage.page === 'posts-edit' && currentPage.postId) {
      return posts.find(post => post.id === currentPage.postId);
    }
    return undefined;
  };

  const renderCurrentPage = () => {
    switch (currentPage.page) {
      case 'posts':
        return (
          <PostsList
            onCreatePost={handleCreatePost}
            onEditPost={handleEditPost}
            onViewPost={handleViewPost}
            onDeletePost={handleDeletePost}
          />
        );
      
      case 'posts-new':
        return (
          <PostEditor
            onSave={handleSavePost}
            onPreview={handlePreview}
            onPublish={handlePublish}
          />
        );
      
      case 'posts-edit':
        const currentPost = getCurrentPost();
        return currentPost ? (
          <PostEditor
            post={currentPost}
            onSave={handleSavePost}
            onPreview={handlePreview}
            onPublish={handlePublish}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Post not found</p>
          </div>
        );
      
      case 'settings-profile':
        return <ProfileSettings />;
      
      case 'settings-tokens':
        return <ApiTokens />;
      
      case 'categories':
        return (
          <div className="text-center py-12">
            <h2>Categories Management</h2>
            <p className="text-muted-foreground">Category management functionality coming soon</p>
          </div>
        );
      
      case 'tags':
        return (
          <div className="text-center py-12">
            <h2>Tags Management</h2>
            <p className="text-muted-foreground">Tag management functionality coming soon</p>
          </div>
        );
      
      case 'media':
        return (
          <div className="text-center py-12">
            <h2>Media Library</h2>
            <p className="text-muted-foreground">Media library functionality coming soon</p>
          </div>
        );
      
      default:
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Page not found</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardLayout 
        activeItem={getActiveItem()} 
        onNavigate={navigate}
      >
        {renderCurrentPage()}
      </DashboardLayout>
      <Toaster />
    </div>
  );
}