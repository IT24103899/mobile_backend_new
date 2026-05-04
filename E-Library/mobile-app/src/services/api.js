import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, PYTHON_API_URL } from '../config/api';

// Create main API instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds to allow Render cold starts
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
});

// Create Python AI API instance
const pythonApi = axios.create({
  baseURL: PYTHON_API_URL,
  timeout: 120000, // 120 seconds for complex AI processing
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
});

// Add Request Interceptor for Auth Token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add Response Interceptor for Error Handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.code === 'ECONNABORTED' || error.message.includes('Network Error')) {
      console.log('📡 [Network] Render server is waking up, retrying...');
    }
    return Promise.reject(error);
  }
);

// ─── Authentication ─────────────────────────────────────────────────────────
export const login = (email, password) => api.post('auth/login', { email, password });
export const register = (name, email, password) => api.post('auth/register', { name, email, password });
export const getProfile = () => api.get('auth/profile');
export const updateProfile = (data) => api.put('auth/profile', data);
export const forgotPassword = (email) => api.post('auth/forgot-password', { email });
export const resetPassword = (data) => api.post('auth/reset-password', data);

export const uploadAvatar = async (formData) => {
  const token = await AsyncStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}auth/avatar`, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
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
export const createBook = (formData) => api.post('books', formData);
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
export const createBookshelfList = (name) => api.post('bookshelf/lists', { name });
export const getBookshelfLists = () => api.get('bookshelf/lists');

// ─── Favourites (Legacy support) ───────────────────────────────────────────
export const getFavourites = () => api.get('favourites');
export const addFavourite = (bookId) => api.post('favourites', { bookId });
export const removeFavourite = (bookId) => api.delete(`favourites/${bookId}`);

// ─── Bookmarks ──────────────────────────────────────────────────────────────
export const getBookmarks = (bookId) => api.get(`bookmarks/${bookId}`);
export const addBookmark = (bookId, pageNumber, note) => 
  api.post('bookmarks', { bookId, pageNumber, note });
export const deleteBookmark = (id) => api.delete(`bookmarks/${id}`);

// ─── Highlights ──────────────────────────────────────────────────────────────
export const getHighlights = (bookId) => api.get('reader/highlights', { params: { bookId } });
export const addHighlight = (userId, bookId, pageNumber, content, color = 'yellow') =>
  api.post('reader/highlights', { userId, bookId, pageNumber, content, color });
export const updateHighlight = (id, content, color) =>
  api.put(`reader/highlights/${id}`, { content, color });
export const deleteHighlight = (id) => api.delete(`reader/highlights/${id}`);

// ─── Ratings ────────────────────────────────────────────────────────────────
export const getReaderRating = (userId, bookId) =>
  api.get('reader/rating', { params: { userId, bookId } });
export const saveReaderRating = (userId, bookId, rating) =>
  api.post('reader/rating', { userId, bookId, rating });

// ─── Activity / Reading History ─────────────────────────────────────────────
export const getActivity = () => api.get('activity');
export const getReadingStats = () => api.get('activity/stats');
export const saveReadingProgress = (bookId, pageNumber, totalPages) =>
  api.post('activity/progress', { bookId, pageNumber, totalPages });
export const getReadingProgress = (bookId) =>
  api.get(`activity/progress/${bookId}`);

// ─── Search History ─────────────────────────────────────────────────────────
export const getSearchHistory = () => api.get('search/history');
export const saveSearchHistory = (query) => api.post('search/history', { query });
export const clearSearchHistory = () => api.delete('search/history');

// ─── Feedback ───────────────────────────────────────────────────────────────
export const submitFeedback = (type, message, rating, userId) =>
  api.post('v1/feedback', { type, message, rating, userId });
export const getFeedback = () => api.get('v1/feedback');
export const updateFeedbackStatus = (id, status) => api.put(`v1/feedback/${id}`, { status });

// ─── Admin ──────────────────────────────────────────────────────────────────
export const getAllUsers = () => api.get('admin/users');
export const getDashboardStats = () => api.get('admin/stats');
export const updateAccessRequest = (requestId, status) =>
  api.put(`admin/access-requests/${requestId}`, { status });
export const updateUserRole = (userId, role) =>
  api.put(`admin/users/${userId}/role`, { role });
export const deleteUser = (userId) => api.delete(`admin/users/${userId}`);

// ─── AI & Reading Velocity (Python) ──────────────────────────────────────────
export const getRecommendationsByIdea = (idea) =>
  pythonApi.post('recommend/idea', { idea });
export const logReadingVelocity = (userId, bookId, pagesRead, durationSeconds) =>
  pythonApi.post('velocity/log', { userId, bookId, pagesRead, durationSeconds });
export const getReadingVelocityStats = (userId, bookId) =>
  pythonApi.get(`velocity/stats/${userId}/${bookId}`);

export default api;
