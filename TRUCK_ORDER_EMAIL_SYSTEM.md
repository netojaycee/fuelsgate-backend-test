# Truck Order Email Notification System

## Overview

The truck order module includes a comprehensive email notification system that automatically sends emails when order or RFQ statuses are updated through the `updateStatusOrder` method.

## Email Templates Available

### Order Status Updates

1. **order-in-progress.ejs** - Sent to buyer when order status changes to "in-progress"
2. **order-completed.ejs** - Sent to buyer when order is completed

### RFQ Status Updates

1. **rfq-sent.ejs** - Sent to buyer when a quote is sent
2. **rfq-accepted.ejs** - Sent to truck owner when their quote is accepted
3. **rfq-rejected.ejs** - Sent to truck owner when their quote is rejected

## Email Logic

### Recipients

- **Buyers**: Receive notifications for order status updates and new quotes
- **Truck Owners/Transporters**: Receive notifications for RFQ acceptance/rejection

### Email Content Variables

All email templates have access to the following context variables:

- `Recipient` - Full name of the email recipient
- `Sender` - Full name of the person who triggered the status change
- `TruckId` - Truck number
- `LoadingDepot` - Pickup location
- `Destination` - Delivery destination
- `State` - Destination state
- `City` - Destination city
- `TruckArrivalTime` - Expected arrival time
- `OrderTime` - Timestamp of the status update
- `QuotePrice` - Price quote (formatted)
- `OrderUrl` - Deep link to the order in the frontend
- `BuyerName` - Full name of the buyer (for truck owner emails)

## Integration Points

### Controllers

The email system is integrated into these controller endpoints:

1. `PATCH /truck-order/status/:truckOrderId` - Updates order status (triggers order emails)
2. `PATCH /truck-order/status/rfq/:truckOrderId` - Updates RFQ status (triggers RFQ emails)

### Service Methods

- `updateStatusOrder()` - Main method that updates status and triggers emails
- `sendStatusUpdateEmail()` - Orchestrates email sending based on type
- `handleOrderStatusEmail()` - Handles order status change emails
- `handleRfqStatusEmail()` - Handles RFQ status change emails

## Status Triggers

### Order Status

- **"in-progress"** or **"in progress"** → Sends order-in-progress email to buyer
- **"completed"** → Sends order-completed email to buyer

### RFQ Status

- **"sent"** → Sends rfq-sent email to buyer
- **"accepted"** → Sends rfq-accepted email to truck owner
- **"rejected"** → Sends rfq-rejected email to truck owner

## Error Handling

- Email failures are logged but don't break the main order update flow
- Missing user data is handled gracefully with error logging
- Robust fallback logic ensures system stability

## Configuration

- Email templates are located in `src/modules/truck-order/mails/`
- Frontend URL for deep links is configured via `FRONTEND_URL` environment variable
- Uses NestJS MailerService for email delivery

## Usage Example

```typescript
// In controller - automatically triggers appropriate emails
await this.truckOrderService.updateStatusOrder(
  truckOrderId,
  { status: 'in-progress' },
  'order',
);
await this.truckOrderService.updateStatusOrder(
  truckOrderId,
  { rfqStatus: 'accepted' },
  'rfq',
);
```

The system is fully automated and requires no additional configuration beyond ensuring the MailerService is properly set up in the application.
