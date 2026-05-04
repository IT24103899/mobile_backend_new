const Wishlist = require('../models/Wishlist');

// @desc    Get user's wishlists
// @route   GET /api/wishlists
// @access  Private
const getWishlists = async (req, res) => {
  try {
    const wishlists = await Wishlist.find({ user: req.user._id }).populate('books');
    res.json(wishlists);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching wishlists', error: error.message });
  }
};

// @desc    Create a new wishlist
// @route   POST /api/wishlists
// @access  Private
const createWishlist = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Wishlist name is required' });

    const wishlist = await Wishlist.create({
      user: req.user._id,
      name: name.trim(),
      books: []
    });
    res.status(201).json(wishlist);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A wishlist with this name already exists' });
    }
    res.status(500).json({ message: 'Error creating wishlist', error: error.message });
  }
};

// @desc    Add book to wishlist
// @route   POST /api/wishlists/:id/books
// @access  Private
const addBookToWishlist = async (req, res) => {
  try {
    const { bookId } = req.body;
    const wishlist = await Wishlist.findOne({ _id: req.params.id, user: req.user._id });

    if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });

    if (wishlist.books.includes(bookId)) {
      return res.status(400).json({ message: 'Book already in this wishlist' });
    }

    wishlist.books.push(bookId);
    await wishlist.save();
    res.json(wishlist);
  } catch (error) {
    res.status(500).json({ message: 'Error adding book to wishlist', error: error.message });
  }
};

// @desc    Remove book from wishlist
// @route   DELETE /api/wishlists/:id/books/:bookId
// @access  Private
const removeBookFromWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ _id: req.params.id, user: req.user._id });

    if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });

    wishlist.books = wishlist.books.filter(id => id.toString() !== req.params.bookId);
    await wishlist.save();
    res.json(wishlist);
  } catch (error) {
    res.status(500).json({ message: 'Error removing book', error: error.message });
  }
};

// @desc    Delete wishlist
// @route   DELETE /api/wishlists/:id
// @access  Private
const deleteWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });
    res.json({ message: 'Wishlist deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting wishlist', error: error.message });
  }
};

module.exports = {
  getWishlists,
  createWishlist,
  addBookToWishlist,
  removeBookFromWishlist,
  deleteWishlist
};
