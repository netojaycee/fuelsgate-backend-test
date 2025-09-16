import mongoose from 'mongoose';

const DB_URL = 'mongodb+srv://netojaycee:netojaycee@task.f2wffff.mongodb.net/test-fuelsgate?retryWrites=true';

const DepotHubSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: ['tanker', 'others'], default: 'tanker' },
  depots: { type: [String], required: true }
}, { timestamps: true });

async function updateDepotHubTypes() {
  try {
    await mongoose.connect(DB_URL);
    console.log('Connected to database');

    const DepotHub = mongoose.model('DepotHub', DepotHubSchema);
    const allDepotHubs = await DepotHub.find({});
    for (const hub of allDepotHubs) {
      if (hub.type !== 'tanker') {
        hub.type = 'tanker';
        await hub.save();
      }
    }
    console.log('All depot hubs updated with type: tanker');
    process.exit(0);
  } catch (error) {
    console.error('Error updating depot hub types:', error);
    process.exit(1);
  }
}

updateDepotHubTypes();

// node seed-type-depot.js