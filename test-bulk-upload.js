// Test script for bulk upload functionality
// This demonstrates the enhanced bulk upload that handles 774 LGAs intelligently

const testBulkUpload = async () => {
  const baseUrl = 'http://localhost:4000/api/v1';
  
  // Sample data representing a partial Excel upload with mixed data quality
  const sampleData = [
    // Valid data - should be inserted/updated
    { state: "Abuja", lga: "Kwali", loadPoint: "Ibeju_Dangote", distanceKM: 621 },
    { state: "Abuja", lga: "Kuje", loadPoint: "Ibeju_Dangote", distanceKM: 645 },
    { state: "Lagos", lga: "Ikeja", loadPoint: "Ibeju_Dangote", distanceKM: 45 },
    
    // Update existing data (if Kwali was uploaded before)
    { state: "Abuja", lga: "Kwali", loadPoint: "Ibeju_Dangote", distanceKM: 625 }, // Updated distance
    
    // Missing distance - should be skipped
    { state: "Lagos", lga: "Victoria Island", loadPoint: "Ibeju_Dangote", distanceKM: null },
    { state: "Lagos", lga: "Lekki", loadPoint: "Ibeju_Dangote", distanceKM: "" },
    { state: "Kano", lga: "Kano Municipal", loadPoint: "Ibeju_Dangote", distanceKM: 0 },
    
    // Invalid data - should be skipped
    { state: "", lga: "Some LGA", loadPoint: "Ibeju_Dangote", distanceKM: 100 },
    { state: "Ogun", lga: "", loadPoint: "Ibeju_Dangote", distanceKM: 150 },
    
    // New load point
    { state: "Rivers", lga: "Port Harcourt", loadPoint: "Port_Harcourt_Depot", distanceKM: 300 },
  ];

  try {
    console.log('🚀 Testing Enhanced Bulk Upload Functionality');
    console.log('=' .repeat(50));
    
    // Test bulk upload
    const response = await fetch(`${baseUrl}/transport-fare/admin/distances/bulk-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleData)
    });

    const result = await response.json();
    
    console.log('📊 Upload Results:');
    console.log(`Status: ${response.status}`);
    console.log(`Message: ${result.message}`);
    console.log();
    
    if (result.data) {
      console.log('📈 Detailed Statistics:');
      console.log(`✅ New Records Inserted: ${result.data.inserted}`);
      console.log(`🔄 Existing Records Updated: ${result.data.updated}`);
      console.log(`⏭️  Rows Skipped (missing data): ${result.data.skipped}`);
      console.log(`❌ Errors: ${result.data.errors.length}`);
      console.log();
      console.log('📋 Summary:');
      console.log(result.data.summary);
      
      if (result.data.errors.length > 0) {
        console.log();
        console.log('🚨 Errors Details:');
        result.data.errors.forEach((error, index) => {
          console.log(`${index + 1}. ${JSON.stringify(error.data)} - ${error.error}`);
        });
      }
    }
    
    console.log();
    console.log('🔍 Testing Fare Calculation with Uploaded Data');
    console.log('-' .repeat(40));
    
    // Test fare calculation with uploaded data
    const fareTest = await fetch(`${baseUrl}/transport-fare/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        truckCapacity: 45000,
        truckType: "tanker",
        deliveryState: "Abuja",
        deliveryLGA: "Kwali",
        loadPoint: "Ibeju_Dangote"
      })
    });

    const fareResult = await fareTest.json();
    
    if (fareTest.ok) {
      console.log('✅ Fare Calculation Successful!');
      console.log(`Distance Used: ${fareResult.data.breakdowns.distance} km`);
      console.log(`Fare Range: ₦${fareResult.data.minFarePerLitre} - ₦${fareResult.data.maxFarePerLitre} per litre`);
      console.log(`Total Cost: ₦${fareResult.data.totalMin.toLocaleString()} - ₦${fareResult.data.totalMax.toLocaleString()}`);
    } else {
      console.log('❌ Fare Calculation Failed:', fareResult.message);
    }

  } catch (error) {
    console.error('❌ Test Failed:', error.message);
  }
};

// Usage instructions
console.log(`
🧪 BULK UPLOAD TEST SCRIPT
========================

This script tests the enhanced bulk upload functionality that:

✅ Handles all 774 Nigerian LGAs
✅ Skips rows with missing/invalid distance data  
✅ Updates existing records when re-uploading
✅ Provides detailed statistics and error reporting
✅ Validates and cleans input data

To run this test:
1. Make sure your server is running on port 4000
2. Run: node test-bulk-upload.js

Expected Behavior:
- Rows with valid data will be inserted/updated
- Rows with missing distances will be skipped (not errors)
- Duplicate uploads will update existing records
- Detailed summary will show what happened

`);

// Run the test if this file is executed directly
if (require.main === module) {
  testBulkUpload();
}

module.exports = { testBulkUpload };
