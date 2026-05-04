const express = require('express');
const router = express.Router();
const { 
  getWishlists, 
  createWishlist, 
  addBookToWishlist, 
  removeBookFromWishlist, 
  deleteWishlist 
} = require('../controllers/wishlistController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/')
  .get(getWishlists)
  .post(createWishlist);

router.route('/:id')
  .delete(deleteWishlist);

router.route('/:id/books')
  .post(addBookToWishlist);

router.route('/:id/books/:bookId')
  .delete(removeBookFromWishlist);

module.exports = router;
