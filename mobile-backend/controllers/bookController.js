const Book = require('../models/Book');
const mongoose = require('mongoose');

const MONGO_ID_REGEX = /^[a-f\d]{24}$/i;

// @desc    Get all active books natively directly from MongoDB
// @route   GET /api/books
// @access  Public
const getBooks = async (req, res) => {
  try {
    const books = await Book.find({ isDeleted: false, isAvailable: true });
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching books from database', error: error.message });
  }
};

// @desc    Get single book by legacy ID natively
// @route   GET /api/books/:id
// @access  Public
const getBookById = async (req, res) => {
  try {
    const idParam = req.params.id;
    let book = null;

    // Try legacyId first (numeric), then fall back to MongoDB ObjectId
    const legacyNum = Number(idParam);
    if (!isNaN(legacyNum)) {
      book = await Book.findOne({ legacyId: legacyNum });
    }
    if (!book && MONGO_ID_REGEX.test(idParam)) {
      book = await Book.findById(idParam);
    }
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching book from database', error: error.message });
  }
};

// @desc    Search books natively utilizing Mongo regex mapping
// @route   GET /api/books/search
// @access  Public
const searchBooks = async (req, res) => {
  try {
    const { q, category, author, isbn, year, sort } = req.query;
    if (!q) {
      return res.status(400).json({ message: 'Search query parameter "q" is required' });
    }
    
    // Build filter object
    const filter = {
      isDeleted: false,
      isAvailable: true,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { author: { $regex: q, $options: 'i' } }
      ]
    };

    // Add category filter if provided
    if (category && category.trim()) {
      filter.category = { $regex: category.trim(), $options: 'i' };
    }

    // Add author filter if provided
    if (author && author.trim()) {
      filter.author = { $regex: author.trim(), $options: 'i' };
    }

    // Add ISBN filter if provided
    if (isbn && isbn.trim()) {
      filter.isbn = { $regex: isbn.trim(), $options: 'i' };
    }

    // Add Year filter if provided
    if (year && !isNaN(Number(year))) {
      filter.publicationYear = Number(year);
    }
    
    // Handle Sorting
    let sortOption = { createdAt: -1 };
    if (sort === 'title') sortOption = { title: 1 };
    if (sort === 'oldest') sortOption = { createdAt: 1 };
    if (sort === 'year') sortOption = { publicationYear: -1 };
    
    const books = await Book.find(filter).sort(sortOption);
    
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: 'Error searching books', error: error.message });
  }
};

// @desc    Create a new book
// @route   POST /api/books
// @access  Private/Admin
const createBook = async (req, res) => {
  try {
    const { title, author, description, category, legacyId, coverUrl, pdfUrl } = req.body;
    
    const bookData = {
      title,
      author,
      description,
      category,
      legacyId: legacyId ? Number(legacyId) : undefined,
      coverUrl: coverUrl || undefined,
      pdfUrl: pdfUrl || undefined
    };

    if (req.files) {
      if (req.files.cover) {
        bookData.coverUrl = `/uploads/covers/${req.files.cover[0].filename}`;
      }
      if (req.files.pdf) {
        bookData.pdfUrl = `/uploads/pdfs/${req.files.pdf[0].filename}`;
      }
    }

    const book = await Book.create(bookData);
    res.status(201).json(book);
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ message: 'Error creating book', error: error.message });
  }
};

// @desc    Update a book
// @route   PUT /api/books/:id
// @access  Private/Admin
const updateBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const { title, author, description, category, isAvailable, coverUrl, pdfUrl } = req.body;
    
    book.title = title || book.title;
    book.author = author || book.author;
    book.description = description || book.description;
    book.category = category || book.category;
    if (isAvailable !== undefined) book.isAvailable = isAvailable === 'true' || isAvailable === true;
    
    if (coverUrl) book.coverUrl = coverUrl;
    if (pdfUrl) book.pdfUrl = pdfUrl;

    if (req.files) {
      if (req.files.cover) {
        book.coverUrl = `/uploads/covers/${req.files.cover[0].filename}`;
      }
      if (req.files.pdf) {
        book.pdfUrl = `/uploads/pdfs/${req.files.pdf[0].filename}`;
      }
    }

    await book.save();
    res.json(book);
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ message: 'Error updating book', error: error.message });
  }
};

// @desc    Delete a book (soft delete)
// @route   DELETE /api/books/:id
// @access  Private/Admin
const deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    book.isDeleted = true;
    await book.save();
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ message: 'Error deleting book', error: error.message });
  }
};

module.exports = { getBooks, getBookById, searchBooks, createBook, updateBook, deleteBook };
