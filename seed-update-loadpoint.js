
import mongoose from 'mongoose';

const DB_URL = 'mongodb+srv://netojaycee:netojaycee@task.f2wffff.mongodb.net/test-fuelsgate?retryWrites=true';

const LocationDistanceSchema = new mongoose.Schema({
  state: { type: String, required: true },
  lga: { type: String, required: true },
  loadPoint: { type: String, required: true },
  distanceKM: { type: Number, required: true },
  source: { type: String, default: 'excel_upload' },
}, { timestamps: true });

async function updateLoadPoints() {
  try {
    await mongoose.connect(DB_URL);
    const LocationDistance = mongoose.model('LocationDistance', LocationDistanceSchema);
    const result = await LocationDistance.updateMany(
      { loadPoint: { $regex: /^Dangote Oil Refinery$/i } },
      { $set: { loadPoint: 'dangote' } }
    );
    console.log(`Updated ${result.modifiedCount} records.`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating loadPoint:', error);
    process.exit(1);
  }
}

updateLoadPoints();


//   "type": "module",
// node seed-update-loadpoint.js
