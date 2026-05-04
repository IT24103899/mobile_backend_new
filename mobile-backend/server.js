const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const favouriteRoutes = require('./routes/favouriteRoutes');
const activityRoutes = require('./routes/activityRoutes');
const readerRoutes = require('./routes/readerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const bookshelfRoutes = require('./routes/bookshelfRoutes');
const searchRoutes = require('./routes/searchRoutes');
const bookmarkRoutes = require('./routes/bookmarkRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const aiRoutes = require('./routes/aiRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));

// Request Logger (Debug)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/profiles'];
uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`📁 Created directory: ${fullPath}`);
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/favourites', favouriteRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/reader', readerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bookshelf', bookshelfRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wishlists', wishlistRoutes);

// Root Route (Welcome/Health Check)
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to E-Library Mobile API',
    status: 'Server is active',
    version: '2.1'
  });
});

// Feedback routes migrated to /api/v1/feedback (routes/feedbackRoutes.js)

// Basic Health Check Route
app.get('/api/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Mobile Backend running smoothly',
    port: process.env.PORT || 4000
  });
});

// --- LEGACY JAVA BACKEND ALIASES ---
// Allows unmodified old React components to cleanly load stats from Mongo without crashing.

// Helper: resolve MongoDB user._id from either a MongoDB ObjectId string or a numeric MySQL legacyId
const MONGO_ID_REGEX = /^[a-f\d]{24}$/i;
const resolveMongoUserId = async (userId) => {
  if (!userId) return null;
  const User = require('./models/User');
  const mongoose = require('mongoose');
  const idStr = String(userId);
  if (MONGO_ID_REGEX.test(idStr)) {
    // Already a MongoDB ObjectId — return it directly
    return new mongoose.Types.ObjectId(idStr);
  }
  // Numeric legacy MySQL ID — look up by legacyId field
  const user = await User.findOne({ legacyId: Number(idStr) });
  return user ? user._id : null;
};

// Helper: normalize bookId to a consistent storable value.
// Numeric string → Number (backward-compatible with old Activity records)
// MongoDB ObjectId string → kept as String (for books without legacyId)
const resolveBookId = (id) => {
  if (id == null) return null;
  const n = Number(id);
  return isNaN(n) ? String(id) : n;
};

// GET /api/bookshelf/all?userId=<legacyId>  — called by Bookshelf.jsx
app.get('/api/bookshelf/all', async (req, res) => {
  try {
    const Favourite = require('./models/Favourite');
    const mongoUserId = await resolveMongoUserId(req.query.userId);
    const filter = mongoUserId ? { user: mongoUserId } : {};
    const items = await Favourite.find(filter).sort('-createdAt');
    res.json(items);
  } catch(e) { res.json([]) }
});

// DELETE /api/bookshelf/remove/:bookId?userId=<legacyId>  — called by Bookshelf.jsx
// bookId can be a MongoDB ObjectId (Favourite._id) or a numeric bookId
app.delete('/api/bookshelf/remove/:bookId', async (req, res) => {
  try {
    const Favourite = require('./models/Favourite');
    const mongoose = require('mongoose');
    const mongoUserId = await resolveMongoUserId(req.query.userId);
    const idParam = req.params.bookId;
    let filter = {};
    if (MONGO_ID_REGEX.test(idParam)) {
      filter._id = new mongoose.Types.ObjectId(idParam);
    } else {
      filter.bookId = Number(idParam);
    }
    if (mongoUserId) filter.user = mongoUserId;
    await Favourite.findOneAndDelete(filter);
    res.json({ message: 'Removed from bookshelf' });
  } catch(e) { res.status(500).json({ message: 'Server error' }) }
});

// POST /api/bookshelf/add  — called by BooksPage.jsx, ActivityDashboard.jsx
app.post('/api/bookshelf/add', async (req, res) => {
  try {
    const Favourite = require('./models/Favourite');
    const { userId, bookId, title, author, listName, coverImage, status, progress, rating, genre, emoji } = req.body;
    const mongoUserId = await resolveMongoUserId(userId);
    if (!mongoUserId) return res.status(400).json({ message: 'Invalid user' });
    const resolvedBookId = resolveBookId(bookId);
    const entry = new Favourite({
      user: mongoUserId,
      bookId: resolvedBookId,
      title: title || 'Unknown Title',
      author: author || 'Unknown',
      listName: listName || 'favourites',
      coverImage: coverImage || '',
      status: status || 'new',
      progress: progress || 0,
      rating: rating || 0,
      genre: genre || '',
      emoji: emoji || '📚'
    });
    await entry.save();
    res.status(201).json(entry);
  } catch(e) { res.status(500).json({ message: 'Server error', error: e.message }) }
});

// GET /api/bookshelf/user/:userId
app.get('/api/bookshelf/user/:userId', async (req, res) => {
  try {
    const Favourite = require('./models/Favourite');
    const mongoUserId = await resolveMongoUserId(req.params.userId);
    const filter = mongoUserId ? { user: mongoUserId } : {};
    const items = await Favourite.find(filter).sort('-createdAt');
    res.json(items);
  } catch(e) { res.json([]) }
});

// GET /api/activity/user/:userId
app.get('/api/activity/user/:userId', async (req, res) => {
  try {
    const Activity = require('./models/Activity');
    const mongoUserId = await resolveMongoUserId(req.params.userId);
    const filter = mongoUserId ? { user: mongoUserId } : {};
    const items = await Activity.find(filter).sort('-lastReadAt');
    const enriched = await enrichWithBookData(items);
    res.json(enriched);
  } catch(e) { res.json([]) }
});

// GET /api/stats?userId=<legacyId or mongoId>
app.get('/api/stats', async (req, res) => {
  try {
    const Activity = require('./models/Activity');
    const Favourite = require('./models/Favourite');
    const mongoose = require('mongoose');
    const mongoUserId = await resolveMongoUserId(req.query.userId);
    const filter = mongoUserId ? { user: mongoUserId } : {};

    const allActivity = await Activity.find(filter).sort('-lastReadAt');
    const favs = await Favourite.countDocuments(filter);

    // Distinct books read
    const distinctBooks = new Set(allActivity.map(a => a.bookId));
    const booksRead = distinctBooks.size;

    // Reading velocity: average pageNumber across recent 10 activities
    const recent = allActivity.slice(0, 10);
    const readingVelocity = recent.length > 0
      ? Math.round(recent.reduce((sum, a) => sum + (a.pageNumber || 0), 0) / recent.length)
      : 0;

    // Current streak: count consecutive days with activity up to today
    const daySet = new Set(allActivity.map(a => new Date(a.lastReadAt).toDateString()));
    let currentStreak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (daySet.has(d.toDateString())) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }

    res.json({ totalReads: allActivity.length, totalFavourites: favs, booksRead, readingVelocity, currentStreak });
  } catch(e) { res.json({ totalReads: 0, totalFavourites: 0, booksRead: 0, readingVelocity: 0, currentStreak: 0 }) }
});

// GET /api/progress?userId=...&bookId=...
app.get('/api/progress', async (req, res) => {
  try {
    const Activity = require('./models/Activity');
    const mongoUserId = await resolveMongoUserId(req.query.userId);
    if (!mongoUserId) return res.json({ currentPage: 0, totalPages: 0 });
    const bookId = resolveBookId(req.query.bookId);
    const act = await Activity.findOne({ user: mongoUserId, bookId });
    if (!act) return res.json({ currentPage: 0, totalPages: 0 });
    res.json({ currentPage: act.pageNumber || 0, totalPages: act.totalPages || 0 });
  } catch(e) { res.json({ currentPage: 0, totalPages: 0 }) }
});

// PUT /api/progress?userId=...&bookId=...&currentPage=...&totalPages=...
app.put('/api/progress', async (req, res) => {
  try {
    const Activity = require('./models/Activity');
    const { userId, currentPage, totalPages } = req.query;
    const bookId = resolveBookId(req.query.bookId);
    const mongoUserId = await resolveMongoUserId(userId);
    if (!mongoUserId || bookId == null) return res.status(400).json({ message: 'Missing required params' });
    const act = await Activity.findOneAndUpdate(
      { user: mongoUserId, bookId },
      { $set: { pageNumber: Number(currentPage) || 0, totalPages: Number(totalPages) || 0, lastReadAt: Date.now() } },
      { upsert: true, new: true }
    );
    res.json({ currentPage: act.pageNumber || 0, totalPages: act.totalPages || 0 });
  } catch(e) { res.status(500).json({ message: 'Server error' }) }
});

// Helper: enrich activity records with book metadata (title, author, coverUrl)
const enrichWithBookData = async (activities) => {
  const Book = require('./models/Book');
  const mongoose = require('mongoose');

  const bookIds = [...new Set(activities.map(a => a.bookId).filter(id => id != null))];

  // Separate numeric legacyIds from ObjectId strings
  const numericIds = bookIds.filter(id => typeof id === 'number');
  const objectIdStrings = bookIds.filter(id => typeof id === 'string' && MONGO_ID_REGEX.test(id));

  const [booksByLegacy, booksByObjectId] = await Promise.all([
    numericIds.length ? Book.find({ legacyId: { $in: numericIds } }).lean() : [],
    objectIdStrings.length ? Book.find({ _id: { $in: objectIdStrings.map(id => new mongoose.Types.ObjectId(id)) } }).lean() : []
  ]);

  const bookMap = {};
  booksByLegacy.forEach(b => { if (b.legacyId != null) bookMap[b.legacyId] = b; });
  booksByObjectId.forEach(b => { bookMap[b._id.toString()] = b; });

  return activities.map(a => {
    const b = bookMap[a.bookId] || bookMap[String(a.bookId)];
    const aObj = a.toObject ? a.toObject() : a;
    return {
      ...aObj,
      title: b?.title || aObj.title || 'Untitled Book',
      author: b?.author || aObj.author || 'Unknown Author',
      coverUrl: b?.coverUrl || aObj.coverUrl || '',
      // Expose currentPage explicitly so frontend doesn't need to know the field is called pageNumber
      currentPage: aObj.pageNumber || 0,
      // Prefer stored totalPages (from activity) when book isn't in MongoDB yet
      totalPages: b?.totalPages || aObj.totalPages || 0,
      pdfUrl: b?.pdfUrl || aObj.pdfUrl || '',
      category: b?.category || aObj.category || '',
      id: b?._id || null
    };
  });
};

// GET /api/history?userId=<legacyId>
app.get('/api/history', async (req, res) => {
  try {
    const Activity = require('./models/Activity');
    const mongoUserId = await resolveMongoUserId(req.query.userId);
    const filter = mongoUserId ? { user: mongoUserId } : {};
    const items = await Activity.find(filter).sort('-lastReadAt').limit(20);
    const enriched = await enrichWithBookData(items);
    res.json(enriched);
  } catch(e) { res.json([]) }
});

// --- SEARCH HISTORY ROUTES ---

// GET /api/search-history/:userId  — load history for user (AdvancedSearchBar)
app.get('/api/search-history/:userId', async (req, res) => {
  try {
    const SearchHistory = require('./models/SearchHistory');
    const mongoUserId = await resolveMongoUserId(req.params.userId);
    if (!mongoUserId) return res.json([]);
    const items = await SearchHistory.find({ userId: mongoUserId }).sort('-createdAt').limit(20);
    // Map 'term' → 'searchQuery' to match frontend localStorage format
    res.json(items.map(i => ({ _id: i._id, id: i._id, searchQuery: i.term, timestamp: i.createdAt })));
  } catch(e) { res.json([]) }
});

// POST /api/search-history  — save a new search term (AdvancedSearchBar)
app.post('/api/search-history', async (req, res) => {
  try {
    const SearchHistory = require('./models/SearchHistory');
    const { userId, searchQuery } = req.body;
    if (!userId || !searchQuery) return res.status(400).json({ message: 'userId and searchQuery required' });
    const mongoUserId = await resolveMongoUserId(userId);
    if (!mongoUserId) return res.status(400).json({ message: 'Invalid user' });
    const entry = await SearchHistory.findOneAndUpdate(
      { userId: mongoUserId, term: searchQuery.trim() },
      { userId: mongoUserId, term: searchQuery.trim(), resultsCount: 0 },
      { upsert: true, new: true }
    );
    res.status(201).json({ _id: entry._id, id: entry._id, searchQuery: entry.term, timestamp: entry.createdAt });
  } catch(e) { res.status(500).json({ message: 'Server error', error: e.message }) }
});

// DELETE /api/search-history/user/:userId  — clear all history for user (AdvancedSearchBar)
app.delete('/api/search-history/user/:userId', async (req, res) => {
  try {
    const SearchHistory = require('./models/SearchHistory');
    const mongoUserId = await resolveMongoUserId(req.params.userId);
    if (!mongoUserId) return res.json({ message: 'No user found' });
    await SearchHistory.deleteMany({ userId: mongoUserId });
    res.json({ message: 'Search history cleared' });
  } catch(e) { res.status(500).json({ message: 'Server error' }) }
});

// DELETE /api/search-history/item/:id  — delete a single history item by its _id
app.delete('/api/search-history/item/:id', async (req, res) => {
  try {
    const SearchHistory = require('./models/SearchHistory');
    const mongoose = require('mongoose');
    if (!MONGO_ID_REGEX.test(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    await SearchHistory.findByIdAndDelete(new mongoose.Types.ObjectId(req.params.id));
    res.json({ message: 'Deleted' });
  } catch(e) { res.status(500).json({ message: 'Server error' }) }
});

// GET /api/books/:id/pdf-proxy  — streams external PDF to bypass CORS
app.get('/api/books/:id/pdf-proxy', async (req, res) => {
  try {
    const Book = require('./models/Book');
    const https = require('https');
    const http = require('http');

    const book = await Book.findById(req.params.id).lean();
    if (!book || !book.pdfUrl) {
      return res.status(404).json({ message: 'PDF not found for this book' });
    }

    const pdfUrl = book.pdfUrl;
    console.log(`📄 [PDF-PROXY] Request for: ${pdfUrl}`);

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/pdf,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Referer': 'https://www.planetebook.com/'
      }
    };

    const protocol = pdfUrl.startsWith('https') ? https : http;
    const request = protocol.get(pdfUrl, options, (response) => {
      // Handle redirects (e.g. 301, 302)
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        console.log(`↪️  [PDF-PROXY] Redirecting to: ${response.headers.location}`);
        // For simplicity, recursive call or just redirect the client to the new proxy dest
        const newUrlParam = encodeURIComponent(response.headers.location);
        return res.redirect(`/api/books/${req.params.id}/pdf-proxy-redirect?url=${newUrlParam}`);
      }

      if (response.statusCode !== 200) {
        console.error(`❌ [PDF-PROXY] Source returned ${response.statusCode}`);
        return res.status(response.statusCode).json({ message: `Source returned status ${response.statusCode}` });
      }

      // Pass essential headers back to the reader
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (response.headers['content-length']) res.setHeader('Content-Length', response.headers['content-length']);
      if (response.headers['accept-ranges']) res.setHeader('Accept-Ranges', response.headers['accept-ranges']);

      response.pipe(res);
    });

    request.on('error', (e) => {
      console.error('❌ [PDF-PROXY] Proxy Error:', e.message);
      res.status(500).json({ message: 'Proxy connection error' });
    });

  } catch (e) {
    console.error('❌ [PDF-PROXY] Server Error:', e.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Redirect handler for PDF proxy
app.get('/api/books/:id/pdf-proxy-redirect', async (req, res) => {
  try {
    const https = require('https');
    const http = require('http');
    const redirectUrl = req.query.url;
    if (!redirectUrl) return res.status(400).json({ message: 'Missing url param' });

    const protocol = redirectUrl.startsWith('https') ? https : http;
    protocol.get(redirectUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/pdf,*/*',
      }
    }, (response) => {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (response.headers['content-length']) {
        res.setHeader('Content-Length', response.headers['content-length']);
      }
      response.pipe(res);
    }).on('error', (e) => {
      res.status(500).json({ message: 'Redirect fetch failed', error: e.message });
    });
  } catch (e) {
    res.status(500).json({ message: 'Server error', error: e.message });
  }
});

// 404 Handler (Always JSON)
app.use((req, res) => {
  console.log(`⚠️ 404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ message: `Route ${req.url} not found` });
});

// Final Error Handler (Always JSON)
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [v2.1-AI-READY] Mobile Backend Server running on port ${PORT}`);
});
