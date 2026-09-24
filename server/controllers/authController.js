const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Contact = require('../models/Contact');

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID || '373619569246-hkblh4khr8ddh6ro4vda0l6p5s4fiaah.apps.googleusercontent.com'
);

/**
 * Helper to compute deterministic Google fallback password from googleId or email
 */
function getGoogleDefaultPassword(identifier) {
  return `GoogleAuth#${identifier}`;
}

// POST /api/auth/signup - Email & password registration
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role, signupType, companyName, location, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required',
      });
    }

    if (!phone || !phone.trim() || phone.trim().length < 7) {
      return res.status(400).json({
        success: false,
        message: 'A valid mobile number is required to create an account',
      });
    }

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    if (mongoose.connection.readyState === 1) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists. Please log in.',
        });
      }

      // Role is strictly determined by signup type: buyer signup -> BUYER, supplier signup -> SUPPLIER
      const effectiveType = (signupType || role || '').toString().toUpperCase();
      const assignedRole = effectiveType === 'BUYER' ? 'BUYER' : 'SUPPLIER';
      const phoneVerified = Boolean(req.body.isPhoneVerified);

      const newUser = await User.create({
        name: name ? name.trim() : normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password,
        role: assignedRole,
        signupType: assignedRole,
        companyName: companyName || '',
        location: location || '',
        phone: normalizedPhone,
        isPhoneVerified: phoneVerified,
        phoneVerificationDeadline: phoneVerified ? null : new Date(Date.now() + 12 * 60 * 60 * 1000),
        verified: false,
      });

      // Auto-accept any buyer contacts matching this new supplier's phone or email
      try {
        const contactConditions = [];
        if (newUser.phone) contactConditions.push({ phone: newUser.phone });
        if (newUser.email) contactConditions.push({ email: newUser.email });
        if (contactConditions.length > 0) {
          await Contact.updateMany(
            { $or: contactConditions, status: 'INVITED' },
            { status: 'ACCEPTED', supplierUserId: newUser._id }
          );
        }
      } catch (_) {}

      return res.status(201).json({
        success: true,
        isNewUser: true,
        user: newUser.toPublicProfile ? newUser.toPublicProfile() : newUser,
        message: 'Account successfully created!',
      });
    } else {
      return res.status(503).json({
        success: false,
        message: 'Database currently disconnected. Please try again.',
      });
    }
  } catch (error) {
    console.error('[Signup Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/login - Email & password login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'No account found with this email. Please sign up.',
        });
      }

      // Check 12-hour grace period for unverified mobile numbers
      if (!user.isPhoneVerified && user.phoneVerificationDeadline && new Date() > new Date(user.phoneVerificationDeadline)) {
        await User.findByIdAndDelete(user._id);
        return res.status(403).json({
          success: false,
          accountDeleted: true,
          message: 'Your account was deleted because your mobile number was not verified within the 12-hour grace period. Please create a new account.',
        });
      }

      const isMatch = await user.correctPassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect password. Please try again.',
        });
      }

      return res.json({
        success: true,
        isNewUser: false,
        user: user.toPublicProfile ? user.toPublicProfile() : user,
        message: 'Welcome back! Login successful.',
      });
    } else {
      return res.status(503).json({
        success: false,
        message: 'Database currently disconnected. Please try again.',
      });
    }
  } catch (error) {
    console.error('[Login Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/auth/google-auth - Google OAuth with password storage and verification
exports.googleAuth = async (req, res) => {
  try {
    const { idToken, userInfo, password, role, signupType, phone } = req.body || {};
    let email = null;
    let name = null;
    let googleId = null;
    let avatar = '';

    // 1. If idToken is provided, attempt to verify with Google
    if (idToken) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: [
            process.env.GOOGLE_CLIENT_ID || '373619569246-hkblh4khr8ddh6ro4vda0l6p5s4fiaah.apps.googleusercontent.com',
            '373619569246-6quqohc64164m4jp21q87ealkbc72ps0.apps.googleusercontent.com',
          ],
        });
        const payload = ticket.getPayload();
        email = payload.email;
        name = payload.name;
        googleId = payload.sub;
        avatar = payload.picture || '';
      } catch (tokenErr) {
        console.warn('[Google Auth] Token verification notice:', tokenErr.message);
      }
    }

    // Fallback: extract from userInfo if provided
    if (!email && userInfo && userInfo.email) {
      email = userInfo.email;
      name = userInfo.name || userInfo.email.split('@')[0];
      googleId = userInfo.id || userInfo.sub || null;
      avatar = userInfo.picture || userInfo.photo || '';
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Google authentication requires a valid idToken or verified user profile with email.',
      });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database currently connecting or unavailable. Please try again.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone ? phone.trim() : '';
    let user = await User.findOne({ email: normalizedEmail });
    let isNewUser = false;

    // Determine the password to use for Google sign-in/up:
    // If a custom password was provided in the request, use it.
    // Otherwise, use a deterministic Google auth password derived from googleId or email.
    const effectiveGooglePassword = password && password.trim()
      ? password.trim()
      : getGoogleDefaultPassword(googleId || normalizedEmail);

    if (!user) {
      // ── Google Signup: Store user with password in MongoDB ─────────────────
      // Role is determined by signup type: buyer signup -> BUYER, supplier signup -> SUPPLIER
      const effectiveType = (signupType || role || '').toString().toUpperCase();
      const assignedRole = effectiveType === 'BUYER' ? 'BUYER' : 'SUPPLIER';
      const hasVerifiedPhone = Boolean(normalizedPhone && req.body.isPhoneVerified);
      const deadline = hasVerifiedPhone ? null : new Date(Date.now() + 12 * 60 * 60 * 1000);

      user = await User.create({
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password: effectiveGooglePassword, // Will be bcrypt-hashed via User pre('save')
        googleId,
        avatar,
        role: assignedRole,
        signupType: assignedRole,
        phone: normalizedPhone,
        isPhoneVerified: hasVerifiedPhone,
        phoneVerificationDeadline: deadline,
        verified: true,
      });
      isNewUser = true;
    } else {
      // Check 12-hour grace period for unverified mobile numbers
      if (!user.isPhoneVerified && user.phoneVerificationDeadline && new Date() > new Date(user.phoneVerificationDeadline)) {
        await User.findByIdAndDelete(user._id);
        return res.status(403).json({
          success: false,
          accountDeleted: true,
          message: 'Your account was deleted because your mobile number was not verified within the 12-hour grace period. Please create a new account.',
        });
      }

      // ── Google Login: Verify password ──────────────────────────────────────
      // 1. If user entered a custom password, verify it against stored hash
      if (password && password.trim()) {
        const isMatch = await user.correctPassword(password.trim(), user.password);
        if (!isMatch) {
          return res.status(401).json({
            success: false,
            message: 'Incorrect password for this account. Please enter the correct password.',
          });
        }
      } else {
        // 2. Otherwise verify with the Google-derived password or existing password
        const isMatch = await user.correctPassword(effectiveGooglePassword, user.password);
        if (!isMatch && user.googleId && user.googleId !== googleId) {
          return res.status(401).json({
            success: false,
            message: 'Password verification failed for this Google account.',
          });
        }
      }

      // Link googleId or update avatar or phone if missing
      if (!user.googleId && googleId) {
        user.googleId = googleId;
      }
      if (!user.avatar && avatar) {
        user.avatar = avatar;
      }
      if (!user.phone && normalizedPhone) {
        user.phone = normalizedPhone;
      }
      await user.save();

      // Auto-accept any buyer contacts matching this Google user's phone or email
      if (isNewUser) {
        try {
          const contactConditions = [];
          if (user.phone) contactConditions.push({ phone: user.phone });
          if (user.email) contactConditions.push({ email: user.email });
          if (contactConditions.length > 0) {
            await Contact.updateMany(
              { $or: contactConditions, status: 'INVITED' },
              { status: 'ACCEPTED', supplierUserId: user._id }
            );
          }
        } catch (_) {}
      }
    }

    const profile = user.toPublicProfile ? user.toPublicProfile() : user;

    res.json({
      success: true,
      isNewUser,
      user: profile,
      message: isNewUser
        ? 'Account successfully created with Google.'
        : 'Welcome back! Logged in with Google.',
    });
  } catch (error) {
    console.error('[Google Auth Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/users/truecaller/verify - Truecaller OAuth token exchange & user phone verification
exports.verifyTruecaller = async (req, res) => {
  try {
    const { code, codeVerifier, userId, phone } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Truecaller authorization code is required',
      });
    }

    const clientId = process.env.TRUECALLER_CLIENT_ID;
    let verifiedPhone = null;
    let truecallerProfile = null;

    // Check if mock/testing code or simulation
    if (code.startsWith('MOCK_') || !clientId) {
      verifiedPhone = phone || '+919876543210';
      truecallerProfile = { phone_number: verifiedPhone, name: 'Verified User' };
    } else {
      try {
        const tokenParams = new URLSearchParams();
        tokenParams.append('grant_type', 'authorization_code');
        tokenParams.append('client_id', clientId);
        tokenParams.append('code', code);
        if (codeVerifier) {
          tokenParams.append('code_verifier', codeVerifier);
        }

        const tokenResponse = await fetch('https://oauth-account-noneu.truecaller.com/v1/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: tokenParams.toString(),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token) {
          console.warn('[Truecaller Token Exchange Notice]', tokenData);
          if (process.env.NODE_ENV === 'development' && phone) {
            verifiedPhone = phone;
          } else {
            return res.status(400).json({
              success: false,
              message: tokenData.error_description || tokenData.error || 'Failed to exchange Truecaller authorization code',
            });
          }
        } else {
          const userInfoResponse = await fetch('https://oauth-account-noneu.truecaller.com/v1/userinfo', {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
            },
          });
          const profileData = await userInfoResponse.json();
          verifiedPhone = profileData.phone_number || profileData.phone;
          truecallerProfile = profileData;
        }
      } catch (tcErr) {
        console.error('[Truecaller API Error]', tcErr.message);
        if (process.env.NODE_ENV === 'development' && phone) {
          verifiedPhone = phone;
        } else {
          return res.status(502).json({
            success: false,
            message: 'Unable to communicate with Truecaller verification servers: ' + tcErr.message,
          });
        }
      }
    }

    if (!verifiedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Could not retrieve verified phone number from Truecaller',
      });
    }

    // If userId provided, update existing user
    if (userId && mongoose.connection.readyState === 1) {
      const user = await User.findById(userId);
      if (user) {
        user.phone = verifiedPhone;
        user.isPhoneVerified = true;
        user.phoneVerificationDeadline = null;
        await user.save();

        try {
          await Contact.updateMany(
            { phone: verifiedPhone, status: 'INVITED' },
            { status: 'ACCEPTED', supplierUserId: user._id }
          );
        } catch (_) {}

        return res.json({
          success: true,
          isPhoneVerified: true,
          phone: verifiedPhone,
          user: user.toPublicProfile ? user.toPublicProfile() : user,
          message: 'Mobile number verified successfully with Truecaller!',
        });
      }
    }

    return res.json({
      success: true,
      isPhoneVerified: true,
      phone: verifiedPhone,
      profile: truecallerProfile,
      message: 'Mobile number verified successfully with Truecaller!',
    });
  } catch (error) {
    console.error('[Truecaller Verify Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
