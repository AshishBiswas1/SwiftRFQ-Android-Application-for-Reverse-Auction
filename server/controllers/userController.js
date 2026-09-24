const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');

// GET /api/users - List users
exports.getAllUsers = async (req, res) => {
  try {
    const { role, buyerId } = req.query;
    const filter = {};
    if (role) filter.role = role.toUpperCase();

    // Isolation: When a buyer requests their suppliers/contacts, show only suppliers added by this buyer
    if (buyerId) {
      filter.addedBy = String(buyerId);
    }

    let users = [];
    if (mongoose.connection.readyState === 1) {
      users = await User.find(filter).sort({ createdAt: -1 });
    }

    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('[Get Users Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/users/:id - Get user profile
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    let user = null;

    if (mongoose.connection.readyState === 1) {
      try {
        user = await User.findById(id);
      } catch (e) {
        user = null;
      }
    }

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/users - Register or create user profile
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, signupType, companyName, location, phone } = req.body;

    if (!name || !email) {
      return res
        .status(400)
        .json({ success: false, message: 'Name and email are required' });
    }

    const effectiveType = (signupType || role || '').toString().toUpperCase();
    const assignedRole = effectiveType === 'BUYER' ? 'BUYER' : 'SUPPLIER';

    const newUser = await User.create({
      name,
      email: email.trim().toLowerCase(),
      password: password || undefined,
      role: assignedRole,
      signupType: assignedRole,
      companyName: companyName || '',
      location: location || '',
      phone: phone || ''
    });

    res.status(201).json({ success: true, data: newUser.toPublicProfile ? newUser.toPublicProfile() : newUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/users/:id/role - Prevent role changes after creation
exports.updateUserRole = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'User role cannot be changed after registration. The role is permanently determined by the signup type.'
  });
};

// PUT /api/users/:id or PATCH /api/users/:id - Update user profile details
exports.updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, companyName, location, phone, avatar } = req.body;

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database currently disconnected. Please try again.',
      });
    }

    let user = null;
    try {
      user = await User.findById(id);
    } catch (findErr) {
      user = null;
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    // Validate and update email if changed
    if (email && email.trim().toLowerCase() !== user.email) {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
      }
      user.email = normalizedEmail;
    }

    // Update name
    if (name && name.trim()) {
      user.name = name.trim();
    }

    // Update companyName, location, phone, avatar
    if (companyName !== undefined) user.companyName = companyName.trim();
    if (location !== undefined) user.location = location.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (avatar !== undefined) user.avatar = avatar;

    // Update password if provided
    if (password && password.trim().length > 0) {
      if (password.trim().length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long.',
        });
      }
      user.password = password.trim(); // Will be hashed by pre('save') hook
    }

    // Save changes (role and signupType are immutable and preserved)
    await user.save();

    const profile = user.toPublicProfile ? user.toPublicProfile() : user;
    return res.json({
      success: true,
      user: profile,
      message: 'Profile successfully updated!',
    });
  } catch (error) {
    console.error('[Update Profile Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/users/add-supplier - Add or invite a supplier from device contacts
exports.addSupplierFromContact = async (req, res) => {
  try {
    const { name, phone, email, companyName, location, buyerId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required.',
      });
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone ? phone.trim() : '';
    const trimmedEmail = email ? email.trim().toLowerCase() : '';

    if (mongoose.connection.readyState === 1) {
      // Check if supplier already exists by email or phone
      const conditions = [];
      if (trimmedEmail) conditions.push({ email: trimmedEmail });
      if (trimmedPhone) conditions.push({ phone: trimmedPhone });

      let existing = null;
      if (conditions.length > 0) {
        existing = await User.findOne({ $or: conditions });
      }

      if (existing) {
        // Link to this buyer's private directory if not already linked
        if (buyerId) {
          const strBuyerId = String(buyerId);
          if (!Array.isArray(existing.addedBy)) {
            existing.addedBy = [];
          }
          if (!existing.addedBy.includes(strBuyerId)) {
            existing.addedBy.push(strBuyerId);
            await existing.save();
          }
        }
        const profile = existing.toPublicProfile ? existing.toPublicProfile() : existing;
        return res.status(200).json({
          success: true,
          data: profile,
          alreadyExisted: true,
          message: `${profile.name} is added to your supplier directory.`,
        });
      }

      // Generate unique email identifier if contact only has phone number or name
      const cleanPhone = trimmedPhone.replace(/[^0-9]/g, '');
      const uniqueHandle = cleanPhone || `${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const finalEmail = trimmedEmail || `supplier_${uniqueHandle}@swiftrfq.local`;
      const randomPassword = crypto.randomBytes(8).toString('hex') + 'Aa1!';

      const newSupplier = await User.create({
        name: trimmedName,
        email: finalEmail,
        password: randomPassword,
        role: 'SUPPLIER',
        signupType: 'SUPPLIER',
        companyName: companyName ? companyName.trim() : '',
        location: location ? location.trim() : 'India',
        phone: trimmedPhone,
        verified: false,
        addedBy: buyerId ? [String(buyerId)] : [],
      });

      const profile = newSupplier.toPublicProfile ? newSupplier.toPublicProfile() : newSupplier;
      return res.status(201).json({
        success: true,
        data: profile,
        alreadyExisted: false,
        message: `${profile.name} successfully added as a supplier!`,
      });
    }

    // In-memory fallback if database is disconnected
    const fallbackSupplier = {
      id: `sup-${Date.now()}`,
      name: trimmedName,
      email: trimmedEmail || `supplier_${Date.now()}@swiftrfq.local`,
      phone: trimmedPhone,
      role: 'SUPPLIER',
      companyName: companyName || '',
      location: location || 'India',
      status: 'PENDING',
      auctionsWon: 0,
      addedBy: buyerId ? [String(buyerId)] : [],
    };
    return res.status(201).json({
      success: true,
      data: fallbackSupplier,
      alreadyExisted: false,
      message: `${trimmedName} added to suppliers list!`,
    });
  } catch (error) {
    console.error('[Add Supplier Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

