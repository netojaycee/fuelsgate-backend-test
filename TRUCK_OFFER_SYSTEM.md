# Truck Offer Negotiation System

## Overview

The Truck Offer system is a comprehensive negotiation platform that allows buyers and truck owners (sellers/transporters) to negotiate truck purchase prices after an initial RFQ (Request for Quote) is rejected. This system enables real-time negotiation through WebSocket connections and email notifications.

## System Flow

### 1. Initial RFQ Process

```
Buyer creates truck order → POST /truck-order
Truck owner receives email notification
Truck owner sends quote → PATCH /truck-order/price/:id (updates price, delivery time, sets rfqStatus to 'sent')
```

### 2. Negotiation Trigger

```
Buyer rejects quote → POST /truck-order/reject/:id
- Updates rfqStatus to 'rejected'
- Sends rejection email to truck owner
- Creates TruckOffer entity
- Returns truck offer ID for negotiation
```

### 3. Negotiation Process

```
Buyer sends counter-offer → POST /truck-messages
- Creates TruckMessage with price and delivery time
- Sends email notification to truck owner
- Broadcasts via WebSocket

Truck owner can:
- Accept → PUT /truck-messages/:id/accept
  - Updates truck order with accepted price
  - Sets rfqStatus to 'accepted'
  - Marks offer as 'completed'
  - Sends acceptance email

- Reject → PUT /truck-messages/:id/reject
  - Sends rejection email
  - Allows for counter-offer

- Send counter-offer → POST /truck-messages
  - Creates new message with different price
  - Sends email notification
```

### 4. Order Completion

```
When offer is accepted:
- TruckOrder price is updated with accepted amount
- TruckOrder rfqStatus becomes 'accepted'
- TruckOffer status becomes 'completed'
- Both parties receive email confirmation
```

## Database Entities

### TruckOffer

```typescript
{
  senderId: ObjectId,      // User who initiates the offer (buyer)
  receiverId: ObjectId,    // User who receives the offer (truck owner)
  truckOrderId: ObjectId,  // Reference to original truck order
  truckId: ObjectId,       // Reference to the truck
  status: 'ongoing' | 'completed' | 'cancelled',
  isDeleted: boolean
}
```

### TruckMessage

```typescript
{
  userId: ObjectId,        // User who sent the message
  truckOfferId: ObjectId,  // Reference to truck offer conversation
  actionBy: ObjectId,      // User who accepted/rejected this message
  price: number,           // Price offer amount
  deliveryTime: Date,      // Proposed delivery time
  message: string,         // Optional message text
  status: 'pending' | 'accepted' | 'rejected' | 'counter',
  isDeleted: boolean
}
```

## API Endpoints

### Truck Offers

- `POST /truck-offers` - Create new truck offer (buyers only)
- `GET /truck-offers` - Get all truck offers for current user
- `GET /truck-offers/:id` - Get specific truck offer
- `PUT /truck-offers/:id/status` - Update offer status
- `PUT /truck-offers/:id/cancel` - Cancel offer (sets order status to cancelled)
- `DELETE /truck-offers/:id` - Soft delete offer

### Truck Messages

- `POST /truck-messages` - Send new message/offer
- `GET /truck-messages/offer/:truckOfferId` - Get all messages for an offer
- `PUT /truck-messages/:id/accept` - Accept a message/offer
- `PUT /truck-messages/:id/reject` - Reject a message/offer
- `DELETE /truck-messages/:id` - Delete message

### Truck Orders (Enhanced)

- `POST /truck-order/reject/:id` - Reject RFQ and create truck offer

## WebSocket Events

### Events Sent to Clients

- `receiveTruckMessage` - New message received
- `receiveTruckOffer` - New offer created
- `truckOfferUpdate` - Offer status updated (accepted/rejected/cancelled)

### Events Received from Clients

- `sendTruckMessage` - Send new message
- `sendTruckOffer` - Create new offer

## Email Notifications

### Templates Created

1. **new-truck-offer.ejs** - Sent when new offer/message is created
2. **offer-accepted.ejs** - Sent when offer is accepted
3. **offer-rejected.ejs** - Sent when offer is rejected

### Email Triggers

- New truck offer created → Email to truck owner
- New message/counter-offer sent → Email to other party
- Offer accepted → Email to original sender
- Offer rejected → Email to original sender

## Key Features

### 1. Real-time Communication

- WebSocket integration for instant updates
- Automatic broadcasting of offer status changes
- Live negotiation experience

### 2. Email Notifications

- Comprehensive email system for all negotiation events
- Professional email templates with offer details
- Links to view offers in the dashboard

### 3. Access Control

- Only buyers can create truck offers
- Only participants can view/interact with offers
- Users cannot accept/reject their own messages

### 4. Price Updates

- **Critical**: When an offer is accepted, the truck order price is automatically updated
- Original RFQ price is replaced with negotiated price
- Order status and RFQ status are properly maintained

### 5. Soft Deletion

- All deletions are soft deletes (isDeleted flag)
- Maintains data integrity and audit trail

## Integration Points

### With Truck Order Module

- Shares TruckOrderRepository and TruckOrderService
- Updates truck order price when offers are accepted
- Manages RFQ status transitions

### With User Management

- Integrates with buyer, seller, and transporter repositories
- Uses user authentication and authorization
- Maintains user permissions throughout negotiation

### With Email System

- Uses existing MailerService configuration
- Follows same email template patterns
- Maintains consistent branding and formatting

## Error Handling

### Validation

- Validates user permissions at each step
- Ensures only authorized users can participate
- Prevents users from accepting their own offers

### Error Messages

- Clear, user-friendly error messages
- Proper HTTP status codes
- Detailed logging for debugging

## Performance Considerations

### Database Queries

- Efficient aggregation queries in repositories
- Proper indexing on foreign keys
- Pagination support for large datasets

### WebSocket Management

- Efficient broadcasting to specific users
- Connection management for real-time updates
- Fallback to HTTP for critical operations

## Security

### Authentication

- JWT-based authentication required for all endpoints
- User role verification (buyer, seller, transporter)
- Session management through existing auth system

### Authorization

- Fine-grained permission checks
- Users can only access their own negotiations
- Proper validation of offer ownership

## Testing Recommendations

### Unit Tests

- Test all service methods with various scenarios
- Mock external dependencies (email, database)
- Validate error handling and edge cases

### Integration Tests

- Test complete negotiation flow end-to-end
- Verify email sending and WebSocket events
- Test price update accuracy

### Manual Testing Scenarios

1. Complete negotiation flow (create → counter-offer → accept)
2. Rejection and new counter-offer cycle
3. Cancellation during negotiation
4. Email delivery verification
5. WebSocket real-time updates

## Deployment Considerations

### Environment Variables

Ensure the following are configured:

- `FRONTEND_URL` - For email links
- Email service configuration
- Database connection settings
- WebSocket CORS settings

### Module Dependencies

The truck-offer module must be imported after:

- User module
- Truck module
- Truck-order module
- Buyer/Seller/Transporter modules

This comprehensive system provides a robust foundation for truck purchase negotiations with real-time communication, email notifications, and proper price management.
