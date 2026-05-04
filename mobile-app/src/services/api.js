import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, PYTHON_API_URL } from '../config/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Increased to 60s for Render cold start
  headers: { 'Content-Type': 'application/json' },
});

const pythonApi = axios.create({
  baseURL: PYTHON_API_URL,
  timeout: 120000, // 120s for AI wake up
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
const attachToken = async (config) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) {}
  return config;
};

api.interceptors.request.use(attachToken);
pythonApi.interceptors.request.use(attachToken);

// ─── Auth ───────────────────────────────────────────────────────────────────
export const register = (name, email, password) =>
  api.post('auth/register', { name, email, password });

export const login = (email, password) =>
  api.post('auth/login', { email, password });

export const forgotPassword = (email) =>
  api.post('auth/forgot-password', { email });

export const resetPassword = (email, token, newPassword) =>
  api.post('auth/reset-password', { email, token, newPassword });

export const getProfile = () => api.get('auth/profile');

export const updateProfile = (data) => api.put('auth/profile', data);

export const changePassword = (currentPassword, newPassword) =>
  api.put('auth/change-password', { currentPassword, newPassword });

export const uploadAvatar = async (formData) => {
  const token = await AsyncStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}auth/avatar`, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      // Note: Do NOT set Content-Type for FormData with fetch, it sets it automatically with the boundary
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Upload failed');
  }
  
  return response.json();
};

// ─── Books ──────────────────────────────────────────────────────────────────
export const getBooks = (params) => api.get('books', { params });

export const getBookById = (id) => api.get(`books/${id}`);

export const searchBooks = (q, filters = {}) =>
  api.get('books/search', { params: { q, ...filters } });

export const createBook = (formData) =>
  api.post('books', formData);

export const updateBook = (id, data) => api.put(`books/${id}`, data);

export const deleteBook = (id) => api.delete(`books/${id}`);

// ─── Bookshelf ──────────────────────────────────────────────────────────────
export const getBookshelf = () => api.get('bookshelf');

export const addToBookshelf = (bookId, listType = 'favourites') =>
  api.post('bookshelf', { bookId, listType });

export const removeFromBookshelf = (bookId) => api.delete(`bookshelf/${bookId}`);

export const updateBookshelfStatus = (bookId, status) =>
  api.put(`bookshelf/${bookId}`, { status });

export const moveBookshelfItem = (bookId, targetList) =>
  api.put(`bookshelf/${bookId}/move`, { targetList });

export const createBookshelfList = (name) =>
  api.post('bookshelf/lists', { name });

export const deleteBookshelfList = (listId) =>
  api.delete(`bookshelf/lists/${listId}`);

export const clearBookshelfList = (listType) =>
  api.delete(`bookshelf/lists/${listType}/clear`);

// ─── Wishlists (Custom Named Lists) ────────────────────────────────────────
export const getWishlists = () => api.get('wishlists');

export const createWishlist = (name) => api.post('wishlists', { name });

export const addBookToWishlist = (wishlistId, bookId) => 
  api.post(`wishlists/${wishlistId}/books`, { bookId });

export const removeBookFromWishlist = (wishlistId, bookId) => 
  api.delete(`wishlists/${wishlistId}/books/${bookId}`);

export const deleteWishlist = (id) => api.delete(`wishlists/${id}`);

// ─── Favourites ─────────────────────────────────────────────────────────────
export const getFavourites = () => api.get('favourites');

export const addFavourite = (bookId) => api.post('favourites', { bookId });

export const removeFavourite = (bookId) => api.delete(`favourites/${bookId}`);

// ─── Bookmarks ──────────────────────────────────────────────────────────────
export const getBookmarks = (bookId) => api.get(`bookmarks/${bookId}`);

export const addBookmark = (bookId, pageNumber, note) => 
  api.post('bookmarks', { bookId, pageNumber, note });

export const deleteBookmark = (id) => api.delete(`bookmarks/${id}`);

// ─── Activity / Reading History ─────────────────────────────────────────────
export const getActivity = () => api.get('activity');

export const getReadingStats = () => api.get('activity/stats');

export const saveReadingProgress = (bookId, pageNumber, totalPages) =>
  api.post('activity/progress', { bookId, pageNumber, totalPages });

export const getReadingProgress = (bookId) =>
  api.get(`activity/progress/${bookId}`);

// ─── Search History ─────────────────────────────────────────────────────────
export const getSearchHistory = () => api.get('search/history');

export const saveSearchHistory = (query) =>
  api.post('search/history', { query });

export const clearSearchHistory = () => api.delete('search/history');

// ─── Feedback ───────────────────────────────────────────────────────────────
export const submitFeedback = (type, message, rating, userId) =>
  api.post('v1/feedback', { type, message, rating, userId });

export const getFeedback = () => api.get('v1/feedback');

export const updateFeedbackStatus = (id, status) =>
  api.put(`v1/feedback/${id}`, { status });

// ─── Admin ──────────────────────────────────────────────────────────────────
export const getAllUsers = () => api.get('admin/users');

export const getDashboardStats = () => api.get('admin/stats');

export const updateAccessRequest = (requestId, status) =>
  api.put(`admin/access-requests/${requestId}`, { status });

export const updateUserRole = (userId, role) =>
  api.put(`admin/users/${userId}/role`, { role });

export const deleteUser = (userId) =>
  api.delete(`admin/users/${userId}`);

// ─── AI & Reading Velocity (Python) ──────────────────────────────────────────
export const getRecommendationsByIdea = (idea) =>
  pythonApi.post('recommend/idea', { idea });

export const logReadingVelocity = (userId, bookId, pagesRead, durationSeconds) =>
  pythonApi.post('velocity/log', { userId, bookId, pagesRead, durationSeconds });

export const getReadingVelocityStats = (userId, bookId) =>
  pythonApi.get(`velocity/stats/${userId}/${bookId}`);

export default api;
