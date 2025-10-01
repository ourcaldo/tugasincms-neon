# TugasCMS - Modern Content Management System

A modern, professional-looking CMS built with React, TypeScript, and Tailwind CSS. Features integration with Neon PostgreSQL, Clerk authentication, and Appwrite storage.

## 🚀 Features

### Content Management
- **WordPress-like Editor**: Rich text editing with title, content, excerpt, and metadata
- **Category & Tag Management**: Organize content with multiple categories and tags
- **Featured Images**: Upload images via Appwrite or use external URLs
- **Post Scheduling**: Schedule posts for future publication
- **SEO Optimization**: Built-in SEO fields with preview functionality

### User Management
- **Profile Settings**: Manage personal information and avatar
- **API Token Management**: Generate and manage API tokens for external access
- **Authentication**: Secure authentication via Clerk

### API Endpoints
- **GET /api/posts**: Retrieve all posts with filtering options
- **POST /api/posts**: Create new posts programmatically
- **POST /api/posts/:id/publish**: Publish posts via API

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS v4
- **UI Components**: Shadcn/ui component library
- **Database**: Neon PostgreSQL
- **Authentication**: Clerk
- **File Storage**: Appwrite
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Notifications**: Sonner

## 📁 Project Structure

```
├── components/
│   ├── layout/
│   │   ├── dashboard-layout.tsx    # Main dashboard layout
│   │   └── app-sidebar.tsx         # Navigation sidebar
│   ├── posts/
│   │   ├── post-editor.tsx         # WordPress-like post editor
│   │   └── posts-list.tsx          # Posts management interface
│   ├── settings/
│   │   ├── profile-settings.tsx    # User profile management
│   │   └── api-tokens.tsx          # API token management
│   └── ui/                         # Shadcn/ui components
├── hooks/
│   └── use-navigation.ts           # Client-side navigation
├── lib/
│   ├── api.ts                      # API client
│   ├── appwrite.ts                 # Appwrite configuration
│   └── mock-data.ts                # Sample data
├── types/
│   └── index.ts                    # TypeScript definitions
├── api/
│   └── posts/
│       └── index.ts                # API endpoints documentation
└── styles/
    └── globals.css                 # Global styles and CSS variables
```

## 🔧 Setup & Installation

### 1. Environment Configuration

Copy the `.env.example` file to `.env` and update with your credentials:

```bash
cp .env.example .env
```

### 2. Required Services

#### Neon Database
- Create a Neon PostgreSQL database
- Update `DATABASE_URL` in your `.env` file

#### Clerk Authentication
- Set up a Clerk application
- Configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`

#### Appwrite Storage
- Create an Appwrite project and bucket
- Configure Appwrite credentials in `.env`

### 3. Database Schema

Create the following tables in your Neon database:

```sql
-- Users table (handled by Clerk)
-- Posts table
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  excerpt TEXT,
  slug VARCHAR(255) UNIQUE NOT NULL,
  featured_image VARCHAR(500),
  publish_date TIMESTAMP,
  status VARCHAR(50) DEFAULT 'draft',
  author_id VARCHAR(255) NOT NULL,
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tags table
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Post-Category relationships
CREATE TABLE post_categories (
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

-- Post-Tag relationships
CREATE TABLE post_tags (
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- API Tokens table
CREATE TABLE api_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 📚 API Documentation

### Authentication
All API requests require a valid API token in the Authorization header:

```bash
Authorization: Bearer your-api-token
```

### Endpoints

#### Get All Posts
```bash
GET /api/posts?status=published&page=1&limit=10
```

**Query Parameters:**
- `status`: Filter by status (draft, published, scheduled)
- `category`: Filter by category ID
- `tag`: Filter by tag ID
- `search`: Search in title and excerpt
- `page`: Page number for pagination
- `limit`: Posts per page

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [...],
    "total": 25,
    "page": 1,
    "limit": 10
  }
}
```

#### Create Post
```bash
POST /api/posts
Content-Type: application/json

{
  "title": "My New Post",
  "content": "<p>Post content...</p>",
  "excerpt": "Brief description",
  "slug": "my-new-post",
  "status": "published",
  "categories": [{"id": "1", "name": "Technology"}],
  "tags": [{"id": "1", "name": "React"}],
  "seo": {
    "title": "SEO Title",
    "metaDescription": "SEO description"
  }
}
```

#### Publish Post
```bash
POST /api/posts/:id/publish
```

## 🎨 UI Features

### Modern Design System
- Clean, professional interface
- Responsive design for all screen sizes
- Dark mode support
- Consistent typography and spacing
- Professional color palette

### User Experience
- Intuitive navigation with sidebar
- Real-time form validation
- Toast notifications for user feedback
- Keyboard shortcuts support
- Accessibility-compliant components

### WordPress-like Editor
- Rich text editing capabilities
- Real-time SEO preview
- Drag-and-drop image uploads
- Category and tag management
- Post scheduling functionality

## 🔒 Security Features

- Secure authentication via Clerk
- API token-based access control
- Input validation and sanitization
- Protected routes and components
- Secure file uploads via Appwrite

## 🚀 Production Deployment

### Environment Variables
Ensure all required environment variables are set in production:

```bash
DATABASE_URL=your-neon-database-url
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-key
CLERK_SECRET_KEY=your-clerk-secret
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-appwrite-project
# ... other Appwrite credentials
```

### Performance Optimizations
- Optimized bundle size with tree shaking
- Lazy loading for large components
- Image optimization with Appwrite
- Efficient database queries with pagination
- Caching strategies for API responses

## 📱 Mobile Responsiveness

The CMS is fully responsive and optimized for:
- Desktop (1024px+)
- Tablet (768px - 1024px)
- Mobile (320px - 768px)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation above
- Review the code comments
- Open an issue on GitHub

---

Built with ❤️ using modern web technologies for a professional content management experience.