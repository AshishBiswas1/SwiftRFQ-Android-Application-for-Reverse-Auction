const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'A password should be of minimum 8 characters']
    },
    role: {
      type: String,
      enum: ['BUYER', 'SUPPLIER'],
      default: 'SUPPLIER',
      immutable: true,
      required: true
    },
    signupType: {
      type: String,
      enum: ['BUYER', 'SUPPLIER'],
      default: 'SUPPLIER',
      immutable: true
    },
    companyName: {
      type: String,
      trim: true,
      default: ''
    },
    location: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    isPhoneVerified: {
      type: Boolean,
      default: false
    },
    phoneVerificationDeadline: {
      type: Date,
      default: null,
      index: true
    },
    googleId: {
      type: String,
      default: null,
      index: true
    },
    avatar: {
      type: String,
      default: ''
    },
    verified: {
      type: Boolean,
      default: false
    },
    auctionsWon: {
      type: Number,
      default: 0,
      min: 0
    },
    addedBy: {
      type: [String],
      default: [],
      index: true
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;

  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  const hash = userPassword || this.password;
  if (!hash || !candidatePassword) return false;
  return bcrypt.compare(candidatePassword, hash);
};
// Helpful instance method to serialize safe public profile
userSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    signupType: this.signupType || this.role,
    companyName: this.companyName,
    location: this.location,
    phone: this.phone,
    isPhoneVerified: this.isPhoneVerified || false,
    phoneVerificationDeadline: this.phoneVerificationDeadline || null,
    avatar: this.avatar,
    verified: this.verified,
    auctionsWon: this.auctionsWon,
    addedBy: this.addedBy,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
