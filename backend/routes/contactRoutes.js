const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Contact = require('../models/Contact');
const { protect, admin } = require('../middleware/authMiddleware');

// @desc    Submit a contact form
// @route   POST /api/contact
// @access  Public
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        error: 'Name, email and message are required.',
      });
    }

    // Check email submission limit (max 2 forever)
    const emailCount = await Contact.countDocuments({
      email: email.toLowerCase(),
    });
    if (emailCount >= 2) {
      return res.status(429).json({
        success: false,
        error: 'This email has reached the maximum of 2 submissions allowed.',
      });
    }

    const contact = await Contact.create({
      name,
      email: email.toLowerCase(),
      subject,
      message,
    });

    res.status(201).json({
      success: true,
      message: 'Contact form submitted successfully!',
      data: contact,
    });
  })
);

// @desc    Get all contact submissions
// @route   GET /api/contact
// @access  Private/Admin
router.get(
  '/',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const contacts = await Contact.find({})
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      count: contacts.length,
      data: contacts,
    });
  })
);

// @desc    Update contact status (New / Read / Replied)
// @route   PUT /api/contact/:id/status
// @access  Private/Admin
router.put(
  '/:id/status',
  protect,
  admin,
  asyncHandler(async (req, res) => {
    const { status } = req.body;

    if (!['New', 'Read', 'Replied'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be New, Read, or Replied.',
      });
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found.',
      });
    }

    res.json({
      success: true,
      message: 'Contact status updated successfully.',
      data: contact,
    });
  })
);

module.exports = router;
