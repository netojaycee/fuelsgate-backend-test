# Platform Configuration Module

This module manages platform-wide configuration settings, particularly service fees charged to platform users.

## Features

- **Service Fee Management**: Set and manage service fees for transporters and traders
- **CRUD Operations**: Create, read, update, and delete configuration settings
- **Default Values**: Pre-configured default fee percentages
- **API Endpoints**: RESTful APIs to manage and retrieve configuration values
- **Role-based Access**: Only administrators can modify configuration values

## Default Service Fees

- **Transporter Service Fee**: 5% (default)
- **Trader Service Fee**: 3% (default)

## API Endpoints

### Public Endpoints

- **GET /platform-config/service/fees** - Get current service fee percentages
  - No authentication required
  - Returns transporter and trader service fee percentages

### Admin-Only Endpoints

- **PUT /platform-config/service/fees** - Update service fees

  - Requires admin authentication
  - Body: `{ "transporterServiceFee": number, "traderServiceFee": number }`
  - Fees must be between 0 and 100 (percent)

- **GET /platform-config** - List all configuration entries

  - Requires admin authentication
  - Query parameters:
    - `page`: Page number (default: 1)
    - `limit`: Items per page (default: 10)
    - `key`: Filter by key name

- **GET /platform-config/:key** - Get a specific configuration by key

  - Requires admin authentication

- **POST /platform-config** - Create a new configuration entry

  - Requires admin authentication
  - Body: `{ "key": string, "value": number, "description": string }`

- **PUT /platform-config/:key** - Update an existing configuration

  - Requires admin authentication
  - Body: `{ "value": number, "description": string }`

- **DELETE /platform-config/:key** - Delete a configuration
  - Requires admin authentication

## Integration with Other Modules

Service fees can be retrieved by other modules for:

1. Calculating platform commissions on orders
2. Generating invoices and receipts
3. Displaying fee information to users

## Usage Example

```typescript
// In another service (e.g., OrderService)
import { PlatformConfigService } from '../platform-config/services/platform-config.service';

@Injectable()
export class OrderService {
  constructor(
    private platformConfigService: PlatformConfigService,
    // other dependencies
  ) {}

  async calculateOrderFees(
    orderAmount: number,
    userType: 'transporter' | 'trader',
  ): Promise<number> {
    const fees = await this.platformConfigService.getServiceFees();

    if (userType === 'transporter') {
      return (orderAmount * fees.transporterServiceFee) / 100;
    } else {
      return (orderAmount * fees.traderServiceFee) / 100;
    }
  }
}
```
