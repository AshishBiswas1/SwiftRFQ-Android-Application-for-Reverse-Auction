const mongoose = require('mongoose');
const Contact = require('../models/Contact');
const User = require('../models/User');

// In-memory fallback store if database is disconnected
const inMemoryContacts = new Map();

// GET /api/contacts - Retrieve contacts belonging strictly to the requesting buyer
exports.getContacts = async (req, res) => {
  try {
    const { buyerId } = req.query;

    if (!buyerId) {
      return res.status(400).json({
        success: false,
        message: 'buyerId is required to retrieve private contacts.',
      });
    }

    if (mongoose.connection.readyState === 1) {
      const contacts = await Contact.find({ buyerId }).sort({ createdAt: -1 });

      // If any contact is linked to a registered user, populate their auctionsWon or active status
      const formatted = contacts.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        phone: c.phone || '',
        email: c.email || '',
        companyName: c.companyName || '',
        location: c.location || 'India',
        status: c.status || 'INVITED',
        supplierUserId: c.supplierUserId ? c.supplierUserId.toString() : null,
        invitedAt: c.invitedAt,
        createdAt: c.createdAt,
      }));

      return res.json({ success: true, count: formatted.length, data: formatted });
    }

    // In-memory fallback
    const list = Array.from(inMemoryContacts.values()).filter(
      (c) => String(c.buyerId) === String(buyerId)
    );
    return res.json({ success: true, count: list.length, data: list });
  } catch (error) {
    console.error('[Get Contacts Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/contacts - Add a new supplier contact to the buyer's private list (without creating a dummy user)
exports.addContact = async (req, res) => {
  try {
    const { buyerId, buyerName, name, phone, email, companyName, location } = req.body;

    if (!buyerId || !name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'buyerId and contact name are required.',
      });
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone ? phone.trim() : '';
    const trimmedEmail = email ? email.trim().toLowerCase() : '';
    const trimmedCompany = companyName ? companyName.trim() : '';
    const trimmedLocation = location ? location.trim() : 'India';

    if (mongoose.connection.readyState === 1) {
      // 1. Check if this buyer already added this contact
      const duplicateConditions = [];
      if (trimmedPhone) duplicateConditions.push({ buyerId, phone: trimmedPhone });
      if (trimmedEmail) duplicateConditions.push({ buyerId, email: trimmedEmail });

      let existingContact = null;
      if (duplicateConditions.length > 0) {
        existingContact = await Contact.findOne({ $or: duplicateConditions });
      }

      if (existingContact) {
        return res.status(200).json({
          success: true,
          data: {
            id: existingContact._id.toString(),
            name: existingContact.name,
            phone: existingContact.phone,
            email: existingContact.email,
            companyName: existingContact.companyName,
            location: existingContact.location,
            status: existingContact.status,
            supplierUserId: existingContact.supplierUserId,
          },
          alreadyExisted: true,
          message: `${existingContact.name} is already in your supplier list.`,
        });
      }

      // 2. Check if a registered Supplier already exists with this phone or email
      let matchingSupplier = null;
      const userConditions = [];
      if (trimmedPhone) userConditions.push({ phone: trimmedPhone });
      if (trimmedEmail) userConditions.push({ email: trimmedEmail });

      if (userConditions.length > 0) {
        matchingSupplier = await User.findOne({
          $or: userConditions,
          role: 'SUPPLIER',
        });
      }

      const initialStatus = matchingSupplier ? 'ACCEPTED' : 'INVITED';
      const supplierUserId = matchingSupplier ? matchingSupplier._id : null;

      // 3. Create the contact entry in the Contact collection
      const newContact = await Contact.create({
        buyerId,
        buyerName: buyerName || '',
        name: trimmedName,
        phone: trimmedPhone,
        email: trimmedEmail,
        companyName: trimmedCompany,
        location: trimmedLocation,
        status: initialStatus,
        supplierUserId,
      });

      return res.status(201).json({
        success: true,
        data: {
          id: newContact._id.toString(),
          name: newContact.name,
          phone: newContact.phone,
          email: newContact.email,
          companyName: newContact.companyName,
          location: newContact.location,
          status: newContact.status,
          supplierUserId: newContact.supplierUserId,
          createdAt: newContact.createdAt,
        },
        alreadyExisted: false,
        message: `${newContact.name} added to your supplier contacts!`,
      });
    }

    // In-memory fallback
    const fallbackId = `cnt-${Date.now()}`;
    const fallbackContact = {
      id: fallbackId,
      buyerId: String(buyerId),
      buyerName: buyerName || '',
      name: trimmedName,
      phone: trimmedPhone,
      email: trimmedEmail,
      companyName: trimmedCompany,
      location: trimmedLocation,
      status: 'INVITED',
      supplierUserId: null,
      createdAt: new Date(),
    };
    inMemoryContacts.set(fallbackId, fallbackContact);

    return res.status(201).json({
      success: true,
      data: fallbackContact,
      alreadyExisted: false,
      message: `${trimmedName} added to your contacts!`,
    });
  } catch (error) {
    console.error('[Add Contact Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/contacts/:id - Remove a contact from buyer's private list
exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { buyerId } = req.query;

    if (mongoose.connection.readyState === 1) {
      const filter = { _id: id };
      if (buyerId) filter.buyerId = buyerId;
      await Contact.deleteOne(filter);
    } else {
      inMemoryContacts.delete(id);
    }

    res.json({ success: true, message: 'Contact removed successfully.' });
  } catch (error) {
    console.error('[Delete Contact Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
