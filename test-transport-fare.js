// Test script for Transport Fare API endpoints
// Run this after starting the server with: npm run start:dev

const BASE_URL = 'http://localhost:3000';

// Test the public fare calculation endpoint
async function testFareCalculation() {
  console.log('\n=== Testing Fare Calculation ===');
  
  try {
    const response = await fetch(`${BASE_URL}/transport-fare/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        truckCapacity: 45000,
        truckType: "tanker",
        pickupState: "Abuja",
        pickupLGA: "Kwali",
        loadPoint: "Ibeju_Dangote"
      })
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.success && result.data) {
      console.log('\n✅ Fare calculation successful!');
      console.log(`Min fare: ₦${result.data.minFarePerLitre}/litre`);
      console.log(`Max fare: ₦${result.data.maxFarePerLitre}/litre`);
      console.log(`Total range: ₦${result.data.totalMin} - ₦${result.data.totalMax}`);
    }
  } catch (error) {
    console.error('❌ Error testing fare calculation:', error.message);
  }
}

// Test the load points endpoint
async function testLoadPoints() {
  console.log('\n=== Testing Load Points ===');
  
  try {
    const response = await fetch(`${BASE_URL}/transport-fare/load-points`);
    const result = await response.json();
    
    console.log('Status:', response.status);
    console.log('Load points count:', result.data?.length || 0);
    
    if (result.data && result.data.length > 0) {
      console.log('✅ Load points retrieved successfully!');
      console.log('Available load points:', result.data.map(lp => lp.displayName));
    }
  } catch (error) {
    console.error('❌ Error testing load points:', error.message);
  }
}

// Test error handling with invalid data
async function testErrorHandling() {
  console.log('\n=== Testing Error Handling ===');
  
  try {
    const response = await fetch(`${BASE_URL}/transport-fare/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        truckCapacity: 45000,
        truckType: "tanker",
        pickupState: "NonExistentState",
        pickupLGA: "NonExistentLGA",
        loadPoint: "Ibeju_Dangote"
      })
    });
    
    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Error response:', JSON.stringify(result, null, 2));
    
    if (response.status === 404 || response.status === 400) {
      console.log('✅ Error handling working correctly!');
    }
  } catch (error) {
    console.error('❌ Error testing error handling:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Transport Fare API Tests...');
  console.log('Make sure the server is running on http://localhost:3000');
  
  await testFareCalculation();
  await testLoadPoints();
  await testErrorHandling();
  
  console.log('\n🏁 Tests completed!');
}

// Run the tests
runTests().catch(console.error);
