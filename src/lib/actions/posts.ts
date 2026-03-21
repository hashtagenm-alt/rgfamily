// Barrel re-export for backward compatibility
// All consumers can continue importing from '@/lib/actions/posts'

// Post CRUD & search
export {
  createPost,
  updatePost,
  deletePost,
  getPosts,
  getPostById,
  getPostDetail,
  deleteMultiplePosts,
} from './posts-crud'

// Comment operations & likes
export {
  createComment,
  updateComment,
  deleteComment,
  getCommentsByPostId,
  getPostComments,
  checkUserLike,
  addComment,
  toggleLike,
} from './posts-comments'

// Admin-only operations
export {
  getAdminPosts,
  getAdminComments,
  createAdminPost,
  updateAdminPost,
  deleteAdminPost,
  deleteAdminComment,
  hardDeletePost,
  restorePost,
} from './posts-admin'
