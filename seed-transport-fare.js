import mongoose from 'mongoose';

const DB_URL = 'mongodb+srv://netojaycee:netojaycee@task.f2wffff.mongodb.net/test-fuelsgate?retryWrites=true';

// Define schemas
const TransportConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Number, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
}, { timestamps: true });

const LoadPointSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  state: { type: String, required: true },
  lga: { type: String, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const LocationDistanceSchema = new mongoose.Schema({
  state: { type: String, required: true },
  lga: { type: String, required: true },
  loadPoint: { type: String, required: true },
  distanceKM: { type: Number, required: true },
  source: { type: String, default: 'excel_upload' },
}, { timestamps: true });

// Create indexes
LocationDistanceSchema.index({ state: 1, lga: 1, loadPoint: 1 }, { unique: true });

async function seedTransportFareData() {
  try {
    await mongoose.connect(DB_URL);
    console.log('Connected to database');

    const TransportConfig = mongoose.model('TransportConfig', TransportConfigSchema);
    const LoadPoint = mongoose.model('LoadPoint', LoadPointSchema);
    const LocationDistance = mongoose.model('LocationDistance', LocationDistanceSchema);

    // Seed default configurations
    const defaultConfigs = [
      { key: 'diesel_price', value: 1100, description: 'Current diesel price per litre (₦)', category: 'fuel' },
      { key: 'fuel_consumption_min', value: 0.22, description: 'Minimum fuel consumption (litres/km)', category: 'fuel' },
      { key: 'fuel_consumption_max', value: 0.6, description: 'Maximum fuel consumption (litres/km)', category: 'fuel' },
      { key: 'maintenance_cost', value: 200, description: 'Maintenance cost per km (₦)', category: 'maintenance' },
      { key: 'profit_margin', value: 0.4, description: 'Profit margin (40%)', category: 'profit' },
      { key: 'fixed_cost_multiplier', value: 1, description: 'Fixed cost multiplier for DTA/SC/IC', category: 'fixed_costs' },
    ];

    for (const config of defaultConfigs) {
      await TransportConfig.findOneAndUpdate(
        { key: config.key },
        config,
        { upsert: true, new: true }
      );
    }
    console.log('Default configurations seeded');

    // Seed default load point
    const defaultLoadPoint = {
      name: 'Ibeju_Dangote',
      displayName: 'Ibeju Dangote',
      state: 'Lagos',
      lga: 'Ibeju-Lekki',
    };

    await LoadPoint.findOneAndUpdate(
      { name: defaultLoadPoint.name },
      defaultLoadPoint,
      { upsert: true, new: true }
    );
    console.log('Default load point seeded');

    // Seed sample distance data
    const sampleDistances = [
      { state: 'Abuja', lga: 'Kwali', loadPoint: 'Ibeju_Dangote', distanceKM: 621 },
      { state: 'Abuja', lga: 'Kuje', loadPoint: 'Ibeju_Dangote', distanceKM: 645 },
      { state: 'Abuja', lga: 'Gwagwalada', loadPoint: 'Ibeju_Dangote', distanceKM: 633 },
      { state: 'Abuja', lga: 'Bwari', loadPoint: 'Ibeju_Dangote', distanceKM: 688 },
      { state: 'Abuja', lga: 'Abaji', loadPoint: 'Ibeju_Dangote', distanceKM: 571 },
      { state: 'Abia', lga: 'Aba North', loadPoint: 'Ibeju_Dangote', distanceKM: 573 },
      { state: 'Abia', lga: 'Aba South', loadPoint: 'Ibeju_Dangote', distanceKM: 574 },
      { state: 'Abia', lga: 'Arochukwu', loadPoint: 'Ibeju_Dangote', distanceKM: 628 },
      { state: 'Abia', lga: 'Bende', loadPoint: 'Ibeju_Dangote', distanceKM: 573 },
    ];

    for (const distance of sampleDistances) {
      await LocationDistance.findOneAndUpdate(
        {
          state: distance.state,
          lga: distance.lga,
          loadPoint: distance.loadPoint,
        },
        {
          ...distance,
          source: 'seeded_data',
        },
        { upsert: true, new: true }
      );
    }
    console.log('Sample distance data seeded');

    console.log('Transport fare module seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding transport fare data:', error);
    process.exit(1);
  }
}

seedTransportFareData();
