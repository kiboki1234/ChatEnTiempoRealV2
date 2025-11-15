const User = require('../models/User');
const Room = require('../models/Room');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

class UserService {
    /**
     * Get or create user by username
     */
    static async getOrCreateUser(username, ipAddress, deviceFingerprint) {
        try {
            return await User.findOrCreateByUsername(username, ipAddress, deviceFingerprint);
        } catch (error) {
            logger.error('Error in getOrCreateUser', { username, error: error.message });
            throw error;
        }
    }

    /**
     * Check if user can create a room
     */
    static async canUserCreateRoom(username) {
        try {
            const user = await User.findOne({ username });
            
            if (!user) {
                return {
                    allowed: false,
                    reason: 'Usuario no encontrado'
                };
            }

            return user.canCreateRoom();
        } catch (error) {
            logger.error('Error checking room creation permission', { username, error: error.message });
            throw error;
        }
    }

    /**
     * Register a new room created by user
     */
    static async registerRoomCreation(username, roomId, pin) {
        try {
            const user = await User.findOne({ username });
            
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            user.incrementRoomCreation();
            user.addActiveRoom(roomId, pin);
            await user.save();

            return user;
        } catch (error) {
            logger.error('Error registering room creation', { username, roomId, error: error.message });
            throw error;
        }
    }

    /**
     * Remove room from user's active rooms
     */
    static async removeUserRoom(username, roomId) {
        try {
            const user = await User.findOne({ username });
            
            if (!user) {
                return null;
            }

            user.removeActiveRoom(roomId);
            await user.save();

            return user;
        } catch (error) {
            logger.error('Error removing user room', { username, roomId, error: error.message });
            throw error;
        }
    }

    /**
     * Promote user to admin
     */
    static async promoteToAdmin(username, promotedBy) {
        try {
            const user = await User.findOne({ username });
            
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            if (user.role === 'admin') {
                return {
                    success: false,
                    message: 'El usuario ya es admin'
                };
            }

            user.role = 'admin';
            await user.save();

            // Log the promotion
            await AuditLog.create({
                action: 'PROMOTE_TO_ADMIN',
                username: promotedBy,
                details: {
                    promotedUser: username
                }
            });

            return {
                success: true,
                message: `Usuario ${username} promovido a admin`,
                user
            };
        } catch (error) {
            logger.error('Error promoting user to admin', { username, error: error.message });
            throw error;
        }
    }

    /**
     * Demote admin to regular user
     */
    static async demoteToUser(username, demotedBy) {
        try {
            const user = await User.findOne({ username });
            
            if (!user) {
                throw new Error('Usuario no encontrado');
            }

            if (user.role === 'user') {
                return {
                    success: false,
                    message: 'El usuario ya es un usuario regular'
                };
            }

            user.role = 'user';
            await user.save();

            // Log the demotion
            await AuditLog.create({
                action: 'DEMOTE_TO_USER',
                username: demotedBy,
                details: {
                    demotedUser: username
                }
            });

            return {
                success: true,
                message: `Usuario ${username} degradado a usuario regular`,
                user
            };
        } catch (error) {
            logger.error('Error demoting admin to user', { username, error: error.message });
            throw error;
        }
    }

    /**
     * Get user statistics
     */
    static async getUserStats(username) {
        try {
            let user = await User.findOne({ username })
                .populate('activeRooms.roomId', 'name pin type createdAt');
            
            // If user doesn't exist, create it automatically
            if (!user) {
                try {
                    user = new User({
                        username,
                        role: 'user'
                    });
                    await user.save();
                } catch (saveError) {
                    // If duplicate key error, try to find the user again
                    if (saveError.code === 11000) {
                        user = await User.findOne({ username })
                            .populate('activeRooms.roomId', 'name pin type createdAt');
                    } else {
                        throw saveError;
                    }
                }
            }

            const canCreate = user.canCreateRoom();

            return {
                username: user.username,
                role: user.role,
                stats: {
                    totalRoomsCreated: user.stats.totalRoomsCreated,
                    activeRoomsCount: user.stats.activeRoomsCount,
                    lastRoomCreatedAt: user.stats.lastRoomCreatedAt
                },
                activeRooms: user.activeRooms,
                canCreateRoom: canCreate.allowed,
                canCreateRoomDetails: canCreate,
                createdAt: user.createdAt,
                lastActivity: user.lastActivity
            };
        } catch (error) {
            logger.error('Error getting user stats', { username, error: error.message });
            throw error;
        }
    }

    /**
     * Cleanup inactive rooms for all users
     */
    static async cleanupInactiveRooms() {
        try {
            // Find all inactive rooms
            const inactiveRooms = await Room.find({ isActive: false });
            
            for (const room of inactiveRooms) {
                // Remove room from all users who created it
                if (room.createdBy) {
                    await this.removeUserRoom(room.createdByUsername, room._id);
                }
            }

            // Cleanup users with no active rooms after 30 days
            await User.cleanupInactiveUsers();

            return {
                success: true,
                cleanedRooms: inactiveRooms.length
            };
        } catch (error) {
            logger.error('Error cleaning up inactive rooms', { error: error.message });
            throw error;
        }
    }

    /**
     * Get all users (admin only)
     */
    static async getAllUsers(page = 1, limit = 50) {
        try {
            const skip = (page - 1) * limit;
            
            const users = await User.find({ isActive: true })
                .select('-rateLimits -ipAddress -deviceFingerprint')
                .sort({ lastActivity: -1 })
                .skip(skip)
                .limit(limit);
            
            const total = await User.countDocuments({ isActive: true });

            return {
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            logger.error('Error getting all users', { error: error.message });
            throw error;
        }
    }
}

module.exports = UserService;
