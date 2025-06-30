# Rating and Review System Documentation

## Overview

The rating and review system allows users to rate each other based on completed orders or truck orders. This creates accountability and trust within the platform by tracking user performance and experiences.

## Features

- ⭐ **Star Ratings**: 1-5 star rating system
- 📝 **Optional Reviews**: Text-based feedback (max 500 characters)
- 🔒 **Order Validation**: Only participants in completed orders can rate each other
- 📊 **Average Rating Tracking**: Automatic calculation and storage in user profile
- 🚫 **Duplicate Prevention**: Users can only rate once per order
- 📈 **Rating Statistics**: Detailed breakdown of ratings and reviews

## Database Schema

### Rating Entity

```typescript
{
  raterId: ObjectId,           // User who gives the rating
  ratedUserId: ObjectId,       // User being rated
  rating: Number (1-5),        // Star rating
  review: String (optional),   // Review text
  truckOrderId: ObjectId,      // Reference to truck order (if applicable)
  orderId: ObjectId,           // Reference to order (if applicable)
  orderType: String,           // 'truck-order' or 'order'
  isDeleted: Boolean,          // Soft delete flag
  createdAt: Date,
  updatedAt: Date
}
```

### User Entity Addition

```typescript
{
  // ...existing fields...
  averageRating: Number(0 - 5); // Automatically calculated average
}
```

## API Endpoints

### 1. Create Rating

**POST** `/ratings`

Creates a new rating for a user based on a completed order.

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "rating": 5, // Required: 1-5 stars
  "review": "Excellent service!", // Optional: review text
  "ratedUserId": "user_id", // Required: ID of user being rated
  "truckOrderId": "order_id" // Either truckOrderId OR orderId required
}
```

**Response:**

```json
{
  "message": "Rating created successfully",
  "data": {
    "_id": "rating_id",
    "raterId": "rater_id",
    "ratedUserId": "rated_user_id",
    "rating": 5,
    "review": "Excellent service!",
    "orderType": "truck-order",
    "truckOrderId": "order_id",
    "createdAt": "2025-06-25T..."
  },
  "statusCode": 201
}
```

**Validation Rules:**

- User must be authenticated
- Either `truckOrderId` OR `orderId` must be provided (not both)
- Rating must be between 1-5
- User cannot rate themselves
- User cannot rate the same order twice
- Only participants in the order can rate each other
- Order must be completed

### 2. Get User Ratings

**GET** `/ratings/user/{userId}`

Fetches all ratings and reviews for a specific user with pagination.

**Query Parameters:**

```
?page=1&limit=10&orderType=truck-order
```

**Response:**

```json
{
  "message": "User ratings fetched successfully",
  "data": {
    "ratings": [
      {
        "_id": "rating_id",
        "raterId": {
          "_id": "rater_id",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "rating": 5,
        "review": "Great experience!",
        "orderType": "truck-order",
        "createdAt": "2025-06-25T..."
      }
    ],
    "total": 25,
    "currentPage": 1,
    "totalPages": 3,
    "stats": {
      "userId": "user_id",
      "averageRating": 4.2,
      "totalRatings": 25,
      "ratingBreakdown": {
        "1": 1,
        "2": 2,
        "3": 5,
        "4": 7,
        "5": 10
      },
      "recentReviews": [...]
    }
  },
  "statusCode": 200
}
```

### 3. Get User Rating Statistics

**GET** `/ratings/user/{userId}/stats`

Fetches detailed rating statistics for a user.

**Response:**

```json
{
  "message": "User rating statistics fetched successfully",
  "data": {
    "userId": "user_id",
    "averageRating": 4.2,
    "totalRatings": 25,
    "ratingBreakdown": {
      "1": 1, // 1-star ratings count
      "2": 2, // 2-star ratings count
      "3": 5, // 3-star ratings count
      "4": 7, // 4-star ratings count
      "5": 10 // 5-star ratings count
    },
    "recentReviews": [
      // 5 most recent reviews with full details
    ]
  },
  "statusCode": 200
}
```

### 4. Get My Ratings Given

**GET** `/ratings/my-ratings`

Fetches all ratings the authenticated user has given to others.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

```
?page=1&limit=10&orderType=order
```

**Response:**

```json
{
  "message": "Your ratings fetched successfully",
  "data": {
    "ratings": [...],
    "total": 15,
    "currentPage": 1,
    "totalPages": 2
  },
  "statusCode": 200
}
```

### 5. Delete Rating

**DELETE** `/ratings/{ratingId}`

Allows users to delete their own ratings.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "message": "Rating deleted successfully",
  "data": {
    "message": "Rating deleted successfully"
  },
  "statusCode": 200
}
```

## Business Logic

### Order Validation

The system validates that users can only rate each other if:

1. **Truck Orders**:

   - Buyer can rate the truck owner (seller/transporter)
   - Truck owner can rate the buyer
   - Order status must be "completed"

2. **Regular Orders**:
   - Buyer can rate the seller
   - Seller can rate the buyer
   - Order status must be "completed"

### Rating Calculation

- Average ratings are calculated automatically when ratings are added/removed
- Ratings are rounded to 2 decimal places
- User's `averageRating` field is updated in real-time

### Duplicate Prevention

- Compound indexes prevent multiple ratings for the same order
- Each user can only rate once per order/truck order

## Usage Examples

### Frontend Integration

#### Rate a User After Order Completion

```javascript
// After a truck order is completed
const rateUser = async (ratedUserId, rating, review, truckOrderId) => {
  const response = await fetch('/api/ratings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ratedUserId,
      rating,
      review,
      truckOrderId,
    }),
  });

  return response.json();
};
```

#### Display User Rating Profile

```javascript
// Get user's rating statistics for profile display
const getUserRatingProfile = async (userId) => {
  const response = await fetch(`/api/ratings/user/${userId}/stats`);
  const data = await response.json();

  console.log(`Average Rating: ${data.data.averageRating}/5`);
  console.log(`Total Ratings: ${data.data.totalRatings}`);
  console.log(`Rating Breakdown:`, data.data.ratingBreakdown);
};
```

#### Show User Reviews with Pagination

```javascript
// Get paginated reviews for a user
const getUserReviews = async (userId, page = 1) => {
  const response = await fetch(
    `/api/ratings/user/${userId}?page=${page}&limit=5`,
  );
  const data = await response.json();

  return {
    reviews: data.data.ratings,
    pagination: {
      currentPage: data.data.currentPage,
      totalPages: data.data.totalPages,
      total: data.data.total,
    },
  };
};
```

## Security Features

- **Authentication Required**: All endpoints require valid JWT tokens
- **Authorization Checks**: Users can only rate others they've interacted with
- **Input Validation**: Comprehensive validation using Yup schemas
- **Audit Logging**: All rating actions are logged for monitoring
- **Soft Deletes**: Ratings are marked as deleted, not permanently removed

## Error Handling

The system handles various error scenarios:

- **400**: Invalid input data, duplicate ratings, self-rating attempts
- **401**: Unauthorized access (missing/invalid token)
- **403**: Forbidden actions (rating users not in same order)
- **404**: Order not found, user not found
- **500**: Internal server errors

## Performance Considerations

- **Indexes**: Compound indexes on raterId + orderId for duplicate prevention
- **Aggregation**: Efficient rating calculations using MongoDB aggregation
- **Pagination**: All listing endpoints support pagination
- **Caching**: Average ratings are stored in user documents for fast access

## Future Enhancements

- 📧 **Email Notifications**: Notify users when they receive new ratings
- 🏆 **Rating Badges**: Special badges for highly-rated users
- 📊 **Analytics Dashboard**: Admin dashboard for rating analytics
- 🔍 **Search/Filter**: Filter reviews by rating level or keywords
- 📱 **Mobile Optimization**: Mobile-specific rating interfaces
