const User = require('../models/UserModel');
const Product = require('../models/ProductModel');
const Order = require('../models/OrderModel');
const express = require('express');
const router = express.Router();

router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      revenue,
      recentOrders,
      topProducts
    ] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.find()
        .populate('user', 'name email')
        .populate('items.product', 'name price')
        .limit(5)
        .sort({ createdAt: -1 }),
      Product.aggregate([
        { $match: { isActive: true } },
        { $sort: { 'ratings.average': -1, 'ratings.count': -1 } },
        { $limit: 5 }
      ])
    ]);

    res.json({
      success: true,
      analytics: {
        summary: {
          totalUsers,
          totalProducts,
          totalOrders,
          totalRevenue: revenue[0]?.total || 0
        },
        recentOrders,
        topProducts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
});

module.exports = router;