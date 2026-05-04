const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  books: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }]
}, { timestamps: true });

// Ensure unique wishlist names per user
wishlistSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
