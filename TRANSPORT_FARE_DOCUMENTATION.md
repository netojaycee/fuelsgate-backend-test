# Transport Fare Calculation System

## Overview
This module provides comprehensive transport fare calculation specifically for tanker trucks, with the ability to expand to other truck types. It calculates freight rates based on distance, fuel consumption, maintenance costs, and configurable parameters.

### Transport Flow Logic:
- **Load Point**: Source depot where fuel is loaded (e.g., "Ibeju_Dangote")  
- **Delivery Location**: Customer destination (State + LGA where fuel is delivered)
- **Distance**: Calculated from Load Point → Delivery Location
- **Fare**: Based on round-trip cost (delivery + return journey)

## Features
- **Fare Calculation**: Calculate fare ranges for tanker trucks
- **Admin Configuration**: Manage calculation parameters (diesel price, fuel consumption rates, etc.)
- **Distance Management**: Bulk upload and manage location-to-loadpoint distances
- **Load Point Management**: Manage pickup/delivery points
- **Maps API Ready**: Easy migration to maps-based distance calculation

## API Endpoints

### Public Endpoints

#### Calculate Fare
```
POST /transport-fare/calculate
```
**Body:**
```json
{
  "truckCapacity": 45000,
  "truckType": "tanker",
  "deliveryState": "Abuja",
  "deliveryLGA": "Kwali",
  "loadPoint": "Ibeju_Dangote"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Fare calculated successfully",
  "data": {
    "minFarePerLitre": 28.50,
    "maxFarePerLitre": 42.75,
    "totalMin": 1282500,
    "totalMax": 1923750,
    "breakdowns": {
      "freightRateMin": 1067700,
      "freightRateMax": 1523250,
      "dieselDeliveryCostMin": 214800,
      "dieselDeliveryCostMax": 400500,
      "dieselQuantityMin": 195,
      "dieselQuantityMax": 364,
      "variableCostPerKmMin": 442,
      "variableCostPerKmMax": 860,
      "fixedCostPerKm": 217,
      "distance": 621,
      "truckCapacity": 45000
    }
  }
}
```

#### Get Load Points
```
GET /transport-fare/load-points
```

### Admin Endpoints (Requires Admin Role)

#### Configuration Management
```
GET /transport-fare/admin/config
POST /transport-fare/admin/config
PUT /transport-fare/admin/config/:key
DELETE /transport-fare/admin/config/:key
```

#### Distance Management
```
GET /transport-fare/admin/distances
POST /transport-fare/admin/distances/bulk-upload
DELETE /transport-fare/admin/distances/:id
```

#### Load Point Management
```
POST /transport-fare/admin/load-points
DELETE /transport-fare/admin/load-points/:id
```

#### Seeding Data
```
POST /transport-fare/admin/seed/configs
POST /transport-fare/admin/seed/load-point
```

## Excel Structure for Bulk Upload

For bulk uploading distance data, structure your Excel file with these columns:

| State | LGA | LoadPoint | DistanceKM |
|-------|-----|-----------|------------|
| Abuja | Kwali | Ibeju_Dangote | 621 |
| Abuja | Kuje | Ibeju_Dangote | 645 |
| Abia | Aba North | Ibeju_Dangote | 573 |
| Lagos | Ikeja | Ibeju_Dangote |  |
| Kano | Kano Municipal | Ibeju_Dangote | 0 |

### Smart Upload Features:
- ✅ **Handles 774 LGAs**: Upload all Nigerian states and LGAs at once
- ✅ **Skips Missing Data**: Empty or zero distance cells are ignored (not treated as errors)
- ✅ **Updates Existing**: Subsequent uploads update distances for existing State+LGA+LoadPoint combinations
- ✅ **Data Validation**: Automatically validates and cleans input data
- ✅ **Detailed Reporting**: Shows inserted, updated, skipped, and error counts

### Upload Response:
```json
{
  "message": "Distances uploaded successfully",
  "data": {
    "inserted": 245,
    "updated": 89,
    "skipped": 440,
    "errors": [],
    "summary": "Processed 774 rows: 245 new records inserted, 89 existing records updated, 440 rows skipped (missing/invalid data), 0 errors"
  }
}
```

**Bulk Upload API:**
```
POST /transport-fare/admin/distances/bulk-upload
```
**Body:**
```json
[
  {
    "state": "Abuja",
    "lga": "Kwali",
    "loadPoint": "Ibeju_Dangote",
    "distanceKM": 621
  }
]
```

## Configuration Parameters

The system uses these configurable parameters:

| Key | Default | Description | Category |
|-----|---------|-------------|----------|
| diesel_price | 1100 | Current diesel price per litre (₦) | fuel |
| fuel_consumption_min | 0.22 | Minimum fuel consumption (litres/km) | fuel |
| fuel_consumption_max | 0.6 | Maximum fuel consumption (litres/km) | fuel |
| maintenance_cost | 200 | Maintenance cost per km (₦) | maintenance |
| profit_margin | 0.4 | Profit margin (40%) | profit |
| fixed_cost_multiplier | 1 | Fixed cost multiplier for DTA/SC/IC | fixed_costs |

## Calculation Formula

The fare calculation follows these steps:

1. **Fixed Costs per Trip:**
   - Driver Trip Allowance (DTA) = Truck Capacity × Fixed Cost Multiplier
   - Sundry Charges (SC) = Truck Capacity × Fixed Cost Multiplier
   - Insurance Cost (IC) = Truck Capacity × Fixed Cost Multiplier
   - Fixed Cost per KM = (DTA + SC + IC) / Distance

2. **Variable Costs per KM:**
   - Diesel Cost per KM = Diesel Price × Fuel Consumption Rate
   - Variable Cost per KM = Diesel Cost per KM + Maintenance Cost

3. **Total Cost per KM:**
   - Total Cost per KM = Variable Cost per KM + Fixed Cost per KM

4. **Rate with Profit Margin:**
   - Rate (₦/litre/km) = (Total Cost per KM / Truck Capacity) × (1 + Profit Margin)

5. **Freight Rate:**
   - Freight Rate = Truck Capacity × Distance × Rate

6. **Delivery Diesel (Round Trip):**
   - Diesel Quantity = 2 × Distance × Fuel Consumption Rate
   - Diesel Cost = Diesel Quantity × Diesel Price

7. **Total Fare:**
   - Total Freight Rate = Freight Rate + Delivery Diesel Cost
   - Fare per Litre = Total Freight Rate / Truck Capacity

## Setup Instructions

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Seed Initial Data:**
   ```bash
   node seed-transport-fare.js
   ```

3. **Start Server:**
   ```bash
   npm run start:dev
   ```

4. **Test Endpoints:**
   Use the seeding endpoints to populate initial configurations and load points, then test fare calculation.

## Frontend Integration

### Basic Fare Calculation
```javascript
const calculateFare = async (fareData) => {
  const response = await fetch('/api/transport-fare/calculate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fareData)
  });
  return response.json();
};

// Usage
const fareResult = await calculateFare({
  truckCapacity: 45000,
  truckType: "tanker",
  deliveryState: "Abuja",
  deliveryLGA: "Kwali",
  loadPoint: "Ibeju_Dangote"
});
```

### Admin Configuration Management
```javascript
const updateConfig = async (key, value, token) => {
  const response = await fetch(`/api/transport-fare/admin/config/${key}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ value })
  });
  return response.json();
};
```

## Future Enhancements

1. **Maps API Integration**: Replace database distance lookup with real-time maps API
2. **Flatbed Calculations**: Add calculation logic for flatbed trucks
3. **Dynamic Pricing**: Real-time fuel price integration
4. **Route Optimization**: Multi-stop route calculations
5. **Historical Analytics**: Fare trend analysis and reporting

## Error Handling

The API returns standardized error responses:

```json
{
  "success": false,
  "message": "Distance not found for route: Abuja, InvalidLGA to Ibeju_Dangote",
  "statusCode": 404
}
```

Common error scenarios:
- Distance not found for specified route
- Invalid truck type (currently only supports tanker)
- Missing configuration parameters
- Invalid load point

## Business Logic Explanation

### Transport Journey Flow:
1. **Load Point (Origin)**: Fuel depot where tanker loads fuel (e.g., Dangote Refinery at Ibeju)
2. **Delivery Location (Destination)**: Customer location specified by State + LGA
3. **Route**: Load Point → Customer Location → Load Point (round trip)
4. **Fare Calculation**: Based on distance from depot to customer delivery point

### Why Delivery State/LGA?
- Load points are fixed depots (limited locations)
- Customers are spread across different states and LGAs
- Distance calculation: From depot to customer location
- Pricing includes return journey cost for the truck

### Example Scenario:
- **Load Point**: "Ibeju_Dangote" (Dangote Refinery, Lagos)
- **Customer**: Fuel station in Kwali, Abuja
- **Route**: Ibeju → Kwali → Ibeju (621km each way)
- **Fare**: Covers fuel, maintenance, profit for complete round trip

## Database Schema

### TransportConfig
- `key`: Unique configuration key
- `value`: Numeric value
- `description`: Human-readable description
- `category`: Configuration category

### LocationDistance
- `state`: State name
- `lga`: Local Government Area
- `loadPoint`: Load point identifier
- `distanceKM`: Distance in kilometers
- `source`: Data source (excel_upload, maps_api, manual)

### LoadPoint
- `name`: Unique identifier
- `displayName`: Human-readable name
- `state`: State location
- `lga`: LGA location
- `isActive`: Active status
