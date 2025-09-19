/**
 * Script to drop the old unique index on 'name' in the depothubs collection.
 * Usage: node drop-depot-hub-name-index.js
 */

import mongoose from 'mongoose';

const DB_URL = 'mongodb+srv://netojaycee:netojaycee@task.f2wffff.mongodb.net/test-fuelsgate?retryWrites=true';

async function dropDepotHubNameIndex() {
  try {
    await mongoose.connect(DB_URL);
    console.log('Connected to MongoDB.');

    const collection = mongoose.connection.collection('depothubs');
    // Drop the unique index on 'name'
    await collection.dropIndex('name_1');
    console.log("Dropped index 'name_1' from depothubs collection.");

    process.exit(0);
  } catch (err) {
    if (err.codeName === 'IndexNotFound') {
      console.log("Index 'name_1' does not exist or was already dropped.");
      process.exit(0);
    }
    console.error('Error dropping index:', err);
    process.exit(1);
  }
}

dropDepotHubNameIndex();