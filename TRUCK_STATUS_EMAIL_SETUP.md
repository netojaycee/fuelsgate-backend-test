# Truck Status Update Email Configuration

## Environment Variables Required

Add the following environment variables to your `.env` file:

```env
# Admin notification email for truck status requests
ADMIN_NOTIFICATION_EMAIL=info@fuelsgate.com

# Frontend URL for email links (if not already present)
FRONTEND_URL=https://your-frontend-domain.com
```

## Features Added

### 1. Admin Notification Email

- **Trigger**: When a truck owner updates their truck status to "pending"
- **Recipient**: `ADMIN_NOTIFICATION_EMAIL` (defaults to info@fuelsgate.com)
- **Template**: `truck-status-admin-notification.ejs`
- **Purpose**: Notify admin that a truck owner wants to make their truck available

### 2. Owner Status Update Email

- **Trigger**: When an admin updates truck status to "available" or "locked"
- **Recipient**: Truck owner's email
- **Template**: `truck-status-owner-notification.ejs`
- **Purpose**: Inform truck owner about status changes made by admin

### 3. New API Endpoint

- **Endpoint**: `PUT /truck/:truckId/status`
- **Body**: `{ "status": "pending" | "available" | "locked" }`
- **Validation**: Uses Yup schema validation
- **Authentication**: Requires JWT token
- **Audit**: Logs the action for audit purposes

## Email Templates Created

1. **truck-status-admin-notification.ejs**

   - Professional admin notification email
   - Includes truck details, owner information, and admin dashboard link
   - Responsive design matching existing email templates

2. **truck-status-owner-notification.ejs**
   - User-friendly notification for truck owners
   - Shows previous and new status with appropriate styling
   - Includes dashboard link and contextual messages

## Dependencies Added

The following repositories and services were added to the TruckModule:

- `UserRepository` - To fetch truck owner user details
- `MailerService` - To send emails
- `User` schema - For Mongoose model access

## Usage Examples

### Update truck status to pending (truck owner)

```javascript
PUT /truck/123/status
{
  "status": "pending"
}
```

### Update truck status to available (admin)

```javascript
PUT /truck/123/status
{
  "status": "available"
}
```

### Update truck status to locked (admin)

```javascript
PUT /truck/123/status
{
  "status": "locked"
}
```

## Flow Logic

1. **Truck Owner → Pending**: Sends email to admin requesting approval
2. **Admin → Available**: Sends congratulatory email to truck owner
3. **Admin → Locked**: Sends notification to truck owner about restriction

The system automatically determines whether the user is the truck owner or admin and sends appropriate emails accordingly.
