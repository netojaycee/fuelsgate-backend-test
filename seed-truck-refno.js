import mongoose from 'mongoose';

const DB_URL = 'mongodb+srv://netojaycee:netojaycee@task.f2wffff.mongodb.net/test-fuelsgate?retryWrites=true';

const TruckSchema = new mongoose.Schema({
  truckNumber: { type: String, required: false, unique: true },
  capacity: String,
  depotHubId: { type: mongoose.Schema.Types.ObjectId, ref: 'DepotHub' },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  profileId: { type: mongoose.Schema.Types.ObjectId, required: true },
  profileType: { type: String, enum: ['transporter', 'seller'], required: true },
  truckOwner: String,
  ownerId: String,
  ownerLogo: String,
  depot: String,
  loadStatus: { type: String, enum: ['loaded', 'unloaded'], default: 'unloaded' },
  status: { type: String, enum: ['pending', 'available', 'locked'], default: 'pending' },
  truckType: { type: String, enum: ['tanker', 'flatbed', 'sidewall', 'lowbed'], default: 'tanker' },
  truckCategory: { type: String, enum: ['A++', 'A', 'B', 'C'], default: 'A' },
  truckFuelType: { type: String, enum: ['diesel', 'cng'], default: 'diesel' },
  refNo: { type: String, required: true, unique: true }
}, { timestamps: true });

/**
 * Generate a unique alphanumeric reference number for trucks
 * Format: 6 characters (3 letters + 3 numbers) e.g. ABC123
 */
async function generateTruckRefNo(TruckModel) {
  const maxAttempts = 10;
  let attempts = 0;

  while (attempts < maxAttempts) {
    // Generate 3 random uppercase letters
    const letters = Array.from({ length: 3 }, () => 
      String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('');

    // Generate 3 random numbers
    const numbers = Array.from({ length: 3 }, () => 
      Math.floor(Math.random() * 10)
    ).join('');

    const refNo = letters + numbers;

    // Check if this reference number already exists
    const existingTruck = await TruckModel.findOne({ refNo });
    if (!existingTruck) {
      return refNo;
    }

    attempts++;
  }

  // Fallback to timestamp-based generation if all attempts fail
  const timestamp = Date.now().toString().slice(-6);
  return 'TR' + timestamp;
}

async function addRefNoToAllTrucks() {
  try {
    await mongoose.connect(DB_URL);
    console.log('Connected to database');

    const Truck = mongoose.model('Truck', TruckSchema, 'trucks');
    
    // Find all trucks that don't have refNo or have null/empty refNo
    const trucksWithoutRefNo = await Truck.find({
      $or: [
        { refNo: { $exists: false } },
        { refNo: null },
        { refNo: '' }
      ]
    });

    console.log(`Found ${trucksWithoutRefNo.length} trucks without reference numbers`);

    if (trucksWithoutRefNo.length === 0) {
      console.log('All trucks already have reference numbers!');
      process.exit(0);
    }

    let updatedCount = 0;
    let errorCount = 0;

    for (const truck of trucksWithoutRefNo) {
      try {
        const refNo = await generateTruckRefNo(Truck);
        
        await Truck.updateOne(
          { _id: truck._id },
          { $set: { refNo } }
        );

        console.log(`✅ Updated truck ${truck.truckNumber} with refNo: ${refNo}`);
        updatedCount++;
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`❌ Error updating truck ${truck.truckNumber}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully updated: ${updatedCount} trucks`);
    console.log(`❌ Errors: ${errorCount} trucks`);
    console.log(`📋 Total processed: ${trucksWithoutRefNo.length} trucks`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating trucks with refNo:', error);
    process.exit(1);
  }
}

addRefNoToAllTrucks();

// Usage: node seed-truck-refno.js