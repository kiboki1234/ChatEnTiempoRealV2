const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    password: {
        type: String,
        required: false // Opcional para usuarios que solo usan el sistema de chat
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    // 2FA fields
    twoFactorSecret: {
        type: String,
        default: null
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    // Track active rooms created by this user
    activeRooms: [{
        roomId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room'
        },
        pin: String,
        createdAt: Date
    }],
    // Limits and stats
    stats: {
        totalRoomsCreated: {
            type: Number,
            default: 0
        },
        lastRoomCreatedAt: Date,
        activeRoomsCount: {
            type: Number,
            default: 0
        }
    },
    // Rate limiting
    rateLimits: {
        roomCreation: {
            count: {
                type: Number,
                default: 0
            },
            resetAt: {
                type: Date,
                default: () => new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
            }
        }
    },
    // IP tracking for anonymous users
    ipAddress: String,
    deviceFingerprint: String,
    
    isActive: {
        type: Boolean,
        default: true
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes (username index is automatic from unique: true)
userSchema.index({ ipAddress: 1, deviceFingerprint: 1 });
userSchema.index({ 'rateLimits.roomCreation.resetAt': 1 }, { expireAfterSeconds: 0 });

// Methods
userSchema.methods.canCreateRoom = function() {
    const now = new Date();
    
    // Check if rate limit needs to be reset
    if (this.rateLimits.roomCreation.resetAt < now) {
        this.rateLimits.roomCreation.count = 0;
        this.rateLimits.roomCreation.resetAt = new Date(now.getTime() + 60 * 60 * 1000);
    }
    
    // Admin has unlimited room creation
    if (this.role === 'admin') {
        return {
            allowed: true,
            reason: 'Admin privileges'
        };
    }
    
    // Regular users limits
    const MAX_ACTIVE_ROOMS = 3; // Maximum simultaneous active rooms
    const MAX_ROOMS_PER_HOUR = 5; // Maximum rooms created per hour
    
    // Check active rooms limit
    if (this.stats.activeRoomsCount >= MAX_ACTIVE_ROOMS) {
        return {
            allowed: false,
            reason: `Has alcanzado el límite de ${MAX_ACTIVE_ROOMS} salas activas. Cierra una sala antes de crear otra.`,
            currentCount: this.stats.activeRoomsCount,
            maxAllowed: MAX_ACTIVE_ROOMS
        };
    }
    
    // Check hourly rate limit
    if (this.rateLimits.roomCreation.count >= MAX_ROOMS_PER_HOUR) {
        const resetIn = Math.ceil((this.rateLimits.roomCreation.resetAt - now) / 60000);
        return {
            allowed: false,
            reason: `Has alcanzado el límite de ${MAX_ROOMS_PER_HOUR} salas por hora. Podrás crear más en ${resetIn} minutos.`,
            currentCount: this.rateLimits.roomCreation.count,
            maxAllowed: MAX_ROOMS_PER_HOUR,
            resetIn: resetIn
        };
    }
    
    return {
        allowed: true,
        remainingRooms: MAX_ACTIVE_ROOMS - this.stats.activeRoomsCount,
        remainingThisHour: MAX_ROOMS_PER_HOUR - this.rateLimits.roomCreation.count
    };
};

userSchema.methods.incrementRoomCreation = function() {
    this.stats.totalRoomsCreated += 1;
    this.stats.activeRoomsCount += 1;
    this.stats.lastRoomCreatedAt = new Date();
    this.rateLimits.roomCreation.count += 1;
    this.lastActivity = new Date();
};

userSchema.methods.decrementActiveRooms = function() {
    if (this.stats.activeRoomsCount > 0) {
        this.stats.activeRoomsCount -= 1;
    }
};

userSchema.methods.addActiveRoom = function(roomId, pin) {
    this.activeRooms.push({
        roomId,
        pin,
        createdAt: new Date()
    });
};

userSchema.methods.removeActiveRoom = function(roomId) {
    this.activeRooms = this.activeRooms.filter(
        room => room.roomId.toString() !== roomId.toString()
    );
    this.decrementActiveRooms();
};

// Password methods
userSchema.methods.comparePassword = async function(candidatePassword) {
    // Si no hay contraseña guardada, no se puede comparar
    if (!this.password) {
        return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
};

// Hash password before saving
userSchema.pre('save', async function(next) {
    // Solo hashear la contraseña si ha sido modificada (o es nueva)
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Static methods
userSchema.statics.findOrCreateByUsername = async function(username, ipAddress, deviceFingerprint) {
    let user = await this.findOne({ username });
    
    if (!user) {
        user = new this({
            username,
            ipAddress,
            deviceFingerprint,
            role: 'user'
        });
        await user.save();
    } else {
        // Update last activity
        user.lastActivity = new Date();
        user.ipAddress = ipAddress;
        user.deviceFingerprint = deviceFingerprint;
        await user.save();
    }
    
    return user;
};

userSchema.statics.cleanupInactiveUsers = async function() {
    const thresholdDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    
    const result = await this.updateMany(
        { 
            lastActivity: { $lt: thresholdDate },
            'stats.activeRoomsCount': 0,
            role: 'user'
        },
        { 
            $set: { isActive: false } 
        }
    );
    
    return result;
};

module.exports = mongoose.model('User', userSchema);
