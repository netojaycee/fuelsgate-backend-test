# Rating System Usage Examples

## Example Scenarios

### Scenario 1: Buyer rates Truck Owner after completed truck order

**Step 1: Create truck order and complete it**

```bash
# (Order creation and completion happens through existing endpoints)
# After truck order status becomes "completed"
```

**Step 2: Buyer rates the truck owner**

```bash
curl -X POST http://localhost:3000/ratings \
  -H "Authorization: Bearer <buyer_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "review": "Excellent service! Truck arrived on time and fuel quality was perfect.",
    "ratedUserId": "user_id_of_truck_owner",
    "truckOrderId": "completed_truck_order_id"
  }'
```

**Response:**

```json
{
  "message": "Rating created successfully",
  "data": {
    "_id": "rating_id_123",
    "raterId": "buyer_user_id",
    "ratedUserId": "truck_owner_user_id",
    "rating": 5,
    "review": "Excellent service! Truck arrived on time and fuel quality was perfect.",
    "orderType": "truck-order",
    "truckOrderId": "completed_truck_order_id",
    "createdAt": "2025-06-25T10:30:00.000Z"
  },
  "statusCode": 201
}
```

### Scenario 2: Truck Owner rates Buyer

```bash
curl -X POST http://localhost:3000/ratings \
  -H "Authorization: Bearer <truck_owner_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 4,
    "review": "Good buyer, payment was prompt but pickup was slightly delayed.",
    "ratedUserId": "buyer_user_id",
    "truckOrderId": "completed_truck_order_id"
  }'
```

### Scenario 3: Get user's rating profile for display

**Get detailed rating statistics:**

```bash
curl -X GET http://localhost:3000/ratings/user/user_id_here/stats
```

**Response:**

```json
{
  "message": "User rating statistics fetched successfully",
  "data": {
    "userId": "user_id_here",
    "averageRating": 4.2,
    "totalRatings": 15,
    "ratingBreakdown": {
      "1": 0,
      "2": 1,
      "3": 3,
      "4": 6,
      "5": 5
    },
    "recentReviews": [
      {
        "_id": "review_id_1",
        "raterId": {
          "_id": "rater_id",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        },
        "rating": 5,
        "review": "Excellent service!",
        "orderType": "truck-order",
        "createdAt": "2025-06-25T10:00:00.000Z"
      }
    ]
  },
  "statusCode": 200
}
```

### Scenario 4: Get paginated reviews for a user

```bash
curl -X GET "http://localhost:3000/ratings/user/user_id_here?page=1&limit=5&orderType=truck-order"
```

### Scenario 5: Get my ratings that I've given to others

```bash
curl -X GET http://localhost:3000/ratings/my-ratings?page=1&limit=10 \
  -H "Authorization: Bearer <jwt_token>"
```

### Scenario 6: Delete a rating (only your own)

```bash
curl -X DELETE http://localhost:3000/ratings/rating_id_to_delete \
  -H "Authorization: Bearer <jwt_token>"
```

## Frontend Integration Examples

### React Component - Rating Display

```jsx
import React, { useEffect, useState } from 'react';

const UserRatingProfile = ({ userId }) => {
  const [ratingStats, setRatingStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRatingStats();
  }, [userId]);

  const fetchUserRatingStats = async () => {
    try {
      const response = await fetch(`/api/ratings/user/${userId}/stats`);
      const data = await response.json();
      setRatingStats(data.data);
    } catch (error) {
      console.error('Error fetching rating stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? 'star filled' : 'star'}>
          ⭐
        </span>,
      );
    }
    return stars;
  };

  if (loading) return <div>Loading rating information...</div>;

  return (
    <div className="user-rating-profile">
      <div className="rating-summary">
        <h3>User Rating</h3>
        <div className="average-rating">
          {renderStars(Math.round(ratingStats.averageRating))}
          <span className="rating-number">
            {ratingStats.averageRating.toFixed(1)}/5
          </span>
          <span className="total-ratings">
            ({ratingStats.totalRatings} reviews)
          </span>
        </div>
      </div>

      <div className="rating-breakdown">
        <h4>Rating Breakdown</h4>
        {[5, 4, 3, 2, 1].map((rating) => (
          <div key={rating} className="rating-bar">
            <span>{rating} stars</span>
            <div className="bar">
              <div
                className="fill"
                style={{
                  width: `${(ratingStats.ratingBreakdown[rating] / ratingStats.totalRatings) * 100}%`,
                }}
              />
            </div>
            <span>({ratingStats.ratingBreakdown[rating]})</span>
          </div>
        ))}
      </div>

      <div className="recent-reviews">
        <h4>Recent Reviews</h4>
        {ratingStats.recentReviews.map((review) => (
          <div key={review._id} className="review-item">
            <div className="review-header">
              <span className="reviewer-name">
                {review.raterId.firstName} {review.raterId.lastName}
              </span>
              <div className="rating">{renderStars(review.rating)}</div>
              <span className="review-date">
                {new Date(review.createdAt).toLocaleDateString()}
              </span>
            </div>
            {review.review && <p className="review-text">{review.review}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserRatingProfile;
```

### React Component - Rating Form

```jsx
import React, { useState } from 'react';

const RatingForm = ({ orderId, orderType, ratedUserId, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const requestBody = {
        rating,
        review: review.trim() || undefined,
        ratedUserId,
        [orderType === 'truck-order' ? 'truckOrderId' : 'orderId']: orderId,
      };

      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Rating submitted successfully!');
        onSuccess && onSuccess(data.data);
      } else {
        alert(data.message || 'Error submitting rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rating-form">
      <h3>Rate This User</h3>

      <div className="rating-input">
        <label>Rating:</label>
        <div className="star-selector">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={star <= rating ? 'star selected' : 'star'}
              onClick={() => setRating(star)}
            >
              ⭐
            </button>
          ))}
        </div>
      </div>

      <div className="review-input">
        <label htmlFor="review">Review (optional):</label>
        <textarea
          id="review"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          maxLength={500}
          placeholder="Share your experience..."
          rows={4}
        />
        <small>{review.length}/500 characters</small>
      </div>

      <button
        type="submit"
        disabled={rating === 0 || submitting}
        className="submit-button"
      >
        {submitting ? 'Submitting...' : 'Submit Rating'}
      </button>
    </form>
  );
};

export default RatingForm;
```

### CSS Styles

```css
.user-rating-profile {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.rating-summary {
  text-align: center;
  margin-bottom: 30px;
}

.average-rating {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 10px 0;
}

.star {
  font-size: 24px;
  color: #ddd;
}

.star.filled {
  color: #ffd700;
}

.rating-breakdown {
  margin-bottom: 30px;
}

.rating-bar {
  display: flex;
  align-items: center;
  margin: 8px 0;
  gap: 10px;
}

.bar {
  flex: 1;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
}

.bar .fill {
  height: 100%;
  background: #ffd700;
}

.review-item {
  border: 1px solid #eee;
  padding: 15px;
  margin: 10px 0;
  border-radius: 8px;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.rating-form {
  max-width: 400px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.star-selector {
  display: flex;
  gap: 5px;
  margin: 10px 0;
}

.star-selector .star {
  background: none;
  border: none;
  font-size: 32px;
  cursor: pointer;
  color: #ddd;
}

.star-selector .star.selected {
  color: #ffd700;
}

.review-input {
  margin: 20px 0;
}

.review-input textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
}

.submit-button {
  width: 100%;
  padding: 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.submit-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
```

## Business Logic Notes

1. **Order Completion**: Ratings can only be submitted after orders are marked as "completed"
2. **Mutual Rating**: Both parties in an order can rate each other
3. **One Rating Per Order**: Each user can only rate once per order
4. **Real-time Updates**: Average ratings are updated immediately when ratings are added/removed
5. **Validation**: Comprehensive validation ensures data integrity and prevents abuse

## Error Handling

The system handles various error scenarios gracefully:

- Invalid order IDs
- Users not part of orders
- Duplicate rating attempts
- Self-rating attempts
- Incomplete orders
- Missing authentication

Always implement proper error handling in your frontend to provide good user experience.
