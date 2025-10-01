import { useState } from 'react';

export type NavigationState = 
  | { page: 'posts'; postId?: string }
  | { page: 'posts-new' }
  | { page: 'posts-edit'; postId: string }
  | { page: 'settings-profile' }
  | { page: 'settings-tokens' }
  | { page: 'categories' }
  | { page: 'tags' }
  | { page: 'media' };

export function useNavigation() {
  const [currentPage, setCurrentPage] = useState<NavigationState>({ page: 'posts' });

  const navigate = (href: string) => {
    switch (href) {
      case '/posts':
        setCurrentPage({ page: 'posts' });
        break;
      case '/posts/new':
        setCurrentPage({ page: 'posts-new' });
        break;
      case '/settings/profile':
        setCurrentPage({ page: 'settings-profile' });
        break;
      case '/settings/tokens':
        setCurrentPage({ page: 'settings-tokens' });
        break;
      case '/categories':
        setCurrentPage({ page: 'categories' });
        break;
      case '/tags':
        setCurrentPage({ page: 'tags' });
        break;
      case '/media':
        setCurrentPage({ page: 'media' });
        break;
      default:
        // Handle dynamic routes like /posts/:id
        if (href.startsWith('/posts/edit/')) {
          const postId = href.replace('/posts/edit/', '');
          setCurrentPage({ page: 'posts-edit', postId });
        } else {
          setCurrentPage({ page: 'posts' });
        }
    }
  };

  const navigateToEditPost = (postId: string) => {
    setCurrentPage({ page: 'posts-edit', postId });
  };

  const getActiveItem = () => {
    switch (currentPage.page) {
      case 'posts':
      case 'posts-new':
      case 'posts-edit':
        return '/posts';
      case 'settings-profile':
        return '/settings/profile';
      case 'settings-tokens':
        return '/settings/tokens';
      case 'categories':
        return '/categories';
      case 'tags':
        return '/tags';
      case 'media':
        return '/media';
      default:
        return '/posts';
    }
  };

  return {
    currentPage,
    navigate,
    navigateToEditPost,
    getActiveItem,
  };
}