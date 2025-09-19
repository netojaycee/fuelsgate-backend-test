import mongoose from 'mongoose';

const DB_URL = 'mongodb+srv://netojaycee:netojaycee@task.f2wffff.mongodb.net/test-fuelsgate?retryWrites=true';

const UserSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  status: { type: String, default: 'active' },
  email: { type: String, required: true, lowercase: true, unique: true },
  password: String,
  lastSeen: { type: Date, default: () => new Date().getTime() },
  provider: String,
  providerId: String,
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  canLoad: { type: Boolean, default: false, required: true },
}, { timestamps: true });

async function addCanLoadToAllUsers() {
  try {
    await mongoose.connect(DB_URL);
    console.log('Connected to database');

    const User = mongoose.model('User', UserSchema, 'users');
    const result = await User.updateMany(
      { canLoad: { $exists: false } },
      { $set: { canLoad: false } }
    );
    console.log(`Updated ${result.modifiedCount} users with canLoad: false`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating users:', error);
    process.exit(1);
  }
}

addCanLoadToAllUsers();

// node seed-user-canLoad.js