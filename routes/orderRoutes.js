const Order = require('../models/OrderModel');
const Product = require('../models/ProductModel');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (userId) query.user = userId;
    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name price images')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    const total = await Order.countDocuments(query);
    res.json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { userId, items, shippingAddress } = req.body;
    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User ID and items are required'
      });
    }
    // Calculate total and validate products
    let total = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product with ID ${item.productId} not found`
        });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
        });
      }
      const itemTotal = product.price * item.quantity;
      total += itemTotal;
      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });
      // Update product stock
      product.stock -= item.quantity;
      await product.save();
    }
    const order = new Order({
      user: userId,
      items: orderItems,
      total,
      shippingAddress
    });
    await order.save();
    await order.populate('user', 'name email');
    await order.populate('items.product', 'name price images');
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
});

module.exports = router;