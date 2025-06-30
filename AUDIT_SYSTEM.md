# Audit Log System

This comprehensive audit logging system automatically tracks user actions and system events in your NestJS application.

## Features

- **Automatic Logging**: Automatically logs all non-GET requests
- **IP Geolocation**: Tracks user location based on IP address
- **User Agent Parsing**: Extracts browser, OS, and device information
- **Sensitive Data Filtering**: Automatically removes passwords, tokens, and other sensitive data
- **Circular Reference Handling**: Safely handles complex objects with circular references
- **Performance Tracking**: Records execution time for each request
- **Flexible Querying**: Advanced filtering and search capabilities

## Endpoints

### Get All Audit Logs

```
GET /audit-logs?page=1&limit=20&search=login&module=USER&status=SUCCESS
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search in userEmail, userName, action, endpoint
- `module` (optional): Filter by module (USER, AUTHENTICATION, PRODUCT, etc.)
- `action` (optional): Filter by action (LOGIN, CREATE_USER, UPDATE_STATUS, etc.)
- `status` (optional): Filter by status (SUCCESS, FAILED, ERROR)
- `userId` (optional): Filter by specific user ID
- `startDate` (optional): Filter from date (ISO format)
- `endDate` (optional): Filter to date (ISO format)

### Get Single Audit Log

```
GET /audit-logs/:id
```

### Get User's Audit Logs

```
GET /audit-logs/user/:userId?page=1&limit=10
```

### Get Audit Statistics

```
GET /audit-logs/statistics
```

### Delete Old Logs

```
DELETE /audit-logs/cleanup/90
```

Deletes logs older than 90 days.

## Automatic Logging

The system automatically logs:

### Authentication Events

- ✅ Login attempts (success/failure)
- ✅ User registration
- ✅ Password resets
- ✅ OTP verification
- ✅ Forgot password requests

### User Management

- ✅ User creation
- ✅ User updates
- ✅ User deletion
- ✅ Status changes
- ✅ Password changes

### All Other Modules

- ✅ Product operations
- ✅ Order management
- ✅ Buyer/Seller operations
- ✅ Transportation management
- ✅ Any custom endpoints

## Manual Logging

For special cases, you can manually log events:

```typescript
import { AuditLog } from 'src/shared/decorators/audit-log.decorator';

@Controller('example')
export class ExampleController {
  @Post('custom-action')
  @AuditLog({
    action: 'CUSTOM_ACTION',
    module: 'EXAMPLE',
    description: 'User performed a custom action',
  })
  customAction(@Body() data: any) {
    // Your logic here
  }
}
```

## Using the Audit Helper

For complex scenarios, use the AuditLogHelper:

```typescript
import { AuditLogHelper } from 'src/shared/helpers/audit-log.helper';

@Injectable()
export class SomeService {
  constructor(private readonly auditHelper: AuditLogHelper) {}

  async someMethod(req: any, targetId: string, oldValue: any, newValue: any) {
    try {
      // Your business logic

      // Log the action
      await this.auditHelper.logUserAction(
        req,
        'COMPLEX_UPDATE',
        'SOME_MODULE',
        targetId,
        oldValue,
        newValue,
        { additionalInfo: 'Some extra context' },
      );
    } catch (error) {
      // Log the error
      await this.auditHelper.logError(
        req,
        'COMPLEX_UPDATE',
        'SOME_MODULE',
        error,
        targetId,
      );
      throw error;
    }
  }
}
```

## Data Logged

Each audit log entry contains:

### User Information

- User ID
- Email
- Full name
- IP address
- Location (country, region, city, timezone)
- Browser and OS information
- Device type

### Request Information

- HTTP method
- Endpoint
- Request data (sanitized)
- Response data (sanitized)
- Execution time

### Action Information

- Action type (LOGIN, CREATE_USER, etc.)
- Module (USER, AUTHENTICATION, etc.)
- Status (SUCCESS, FAILED, ERROR)
- Error message (if applicable)

### Metadata

- Target ID (what was affected)
- Target type
- Old value (before change)
- New value (after change)
- Additional context

## Security Features

### Sensitive Data Protection

Automatically removes/redacts:

- Passwords
- Tokens
- API keys
- Secrets
- Auth headers

### Circular Reference Handling

- Safely handles complex nested objects
- Prevents infinite recursion
- Truncates large objects
- Preserves essential information

### Size Limits

- Limits request/response data size
- Truncates large objects
- Maintains performance

## Performance Considerations

- Logs are saved asynchronously
- Failed logging doesn't break main requests
- Indexes on common query fields
- Automatic cleanup of old logs

## Configuration

The system works out of the box, but you can customize:

1. **Sensitive Fields**: Modify the `sensitiveFields` array in `AuditLogService`
2. **Size Limits**: Adjust truncation limits in sanitization methods
3. **Cleanup Schedule**: Set up automated cleanup jobs
4. **Exclusions**: Use `@AuditLog({ skipLogging: true })` to skip specific endpoints

## Example Log Entry

```json
{
  "_id": "60d5ec49f8d2b12a3c4e5f67",
  "userId": "60d5ec49f8d2b12a3c4e5f68",
  "userEmail": "john@example.com",
  "userName": "John Doe",
  "action": "LOGIN",
  "module": "AUTHENTICATION",
  "method": "POST",
  "endpoint": "/login",
  "requestData": {
    "body": {
      "email": "john@example.com",
      "password": "[REDACTED]"
    }
  },
  "responseData": {
    "message": "User login successfully",
    "statusCode": 200
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "browser": "Chrome 91.0.4472.124",
  "os": "Windows 10",
  "device": "desktop",
  "location": {
    "country": "US",
    "region": "CA",
    "city": "San Francisco",
    "timezone": "America/Los_Angeles"
  },
  "status": "SUCCESS",
  "executionTime": 150,
  "createdAt": "2021-06-25T10:30:00.000Z",
  "updatedAt": "2021-06-25T10:30:00.000Z"
}
```

## Monitoring & Analytics

Use the statistics endpoint to monitor:

- Total number of logs
- Success/failure rates
- Most active modules
- Most common actions
- Recent activity trends

This helps identify:

- Security incidents
- System performance issues
- User behavior patterns
- Error trends
