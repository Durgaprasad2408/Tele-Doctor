import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['patient', 'doctor'],
    required: true
  },
  phone: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: ''
  },
  // Doctor-specific fields
  specialization: {
    type: String,
    validate: {
      validator: function(v) {
        // Query context (during update) - only validate if field is being updated
        if (this && typeof this.getUpdate === 'function') {
          const update = this.getUpdate();
          const set = update.$set || update;
          if (!Object.prototype.hasOwnProperty.call(set, 'specialization')) {
            return true;
          }
          return v && typeof v === 'string' && v.trim().length > 0;
        }
        // Document context (during save) - validate for doctors on updates
        if (this.role === 'doctor' && !this.isNew) {
          return v && v.trim().length > 0;
        }
        return true;
      },
      message: 'Specialization is required for doctors'
    }
  },
  licenseNumber: {
    type: String
  },
  experience: {
    type: Number,
    min: [0, 'Experience cannot be negative'],
    default: null,
    validate: {
      validator: function(v) {
        // Query context (during update) - only validate if field is being updated
        if (this && typeof this.getUpdate === 'function') {
          const update = this.getUpdate();
          const set = update.$set || update;
          if (!Object.prototype.hasOwnProperty.call(set, 'experience')) {
            return true;
          }
          return v !== undefined && v !== null && !Number.isNaN(v) && v >= 0;
        }
        // Document context (during save) - validate for doctors on updates
        if (this.role === 'doctor' && !this.isNew) {
          return v !== undefined && v !== null && v >= 0;
        }
        return true;
      },
      message: 'Experience is required for doctors and must be a positive number'
    }
  },
  consultationFee: {
    type: Number,
    min: [0, 'Consultation fee cannot be negative'],
    default: null,
    validate: {
      validator: function(v) {
        // Query context (during update) - only validate if field is being updated
        if (this && typeof this.getUpdate === 'function') {
          const update = this.getUpdate();
          const set = update.$set || update;
          if (!Object.prototype.hasOwnProperty.call(set, 'consultationFee')) {
            return true;
          }
          return v !== undefined && v !== null && !Number.isNaN(v) && v >= 0;
        }
        // Document context (during save) - validate for doctors on updates
        if (this.role === 'doctor' && !this.isNew) {
          return v !== undefined && v !== null && v >= 0;
        }
        return true;
      },
      message: 'Consultation fee is required for doctors and must be a positive number'
    }
  },
  availability: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    },
    startTime: String,
    endTime: String
  }],
  // Patient-specific fields
  dateOfBirth: {
    type: Date,
    default: null,
    validate: {
      validator: function(v) {
        if (this.role === 'patient' && !this.isNew && v) {
          return v instanceof Date && !isNaN(v.getTime());
        }
        return true;
      },
      message: 'Valid date of birth is required for patients'
    }
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', null],
    default: null,
    validate: {
      validator: function(v) {
        if (this.role === 'patient' && !this.isNew) {
          return v && ['male', 'female', 'other'].includes(v);
        }
        return true;
      },
      message: 'Gender is required for patients'
    }
  },
  medicalHistory: [{
    condition: String,
    diagnosedDate: Date,
    notes: String
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-validate middleware to handle conditional validation during updates
userSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  const options = this.getOptions();
  
  // Skip validation if explicitly disabled
  if (options.runValidators === false) {
    return next();
  }
  
  // Enable validation for updates
  this.setOptions({ runValidators: true, context: 'query' });
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

export default mongoose.model('User', userSchema);