# Rating Flag Implementation

This document describes the implementation of the `isRated` flag in the order and truck-order models.

## Changes Made

### 1. Entity Updates

#### TruckOrder Entity

- Added `isRated` boolean field with default value `false`

```typescript
@Prop({ default: false })
isRated: boolean;
```

#### Order Entity

- Added `isRated` boolean field with default value `false`

```typescript
@Prop({ default: false })
isRated: boolean;
```

### 2. DTO Updates

#### TruckOrderDto Interface

- Added optional `isRated` property

```typescript
export interface TruckOrderDto {
  // existing properties
  isRated?: boolean;
}
```

#### OrderDto Interface

- Added optional `isRated` property

```typescript
export interface OrderDto {
  // existing properties
  isRated?: boolean;
}
```

### 3. Service Updates

#### RatingService

- Added logic to update the `isRated` flag when a rating is created:

```typescript
// Update the isRated flag on the corresponding order or truck order
if (truckOrderId) {
  await this.truckOrderRepository.update(truckOrderId, { isRated: true });
} else if (orderId) {
  await this.orderRepository.update(orderId, { isRated: true });
}
```

## Usage

The `isRated` flag can be used for:

1. Determining if an order/truck order has already been rated
2. Filtering orders that still need ratings
3. Showing UI elements (like "Rate this order" buttons) only for unrated orders
4. Reporting on rating completion rates

## API Integration

When retrieving order or truck order lists, the `isRated` property will now be included, allowing frontend applications to determine which orders can be rated.

Example frontend usage:

```typescript
// Example of how frontend might use this flag
if (!order.isRated && order.status === 'completed') {
  // Show rate button
  showRateButton = true;
}
```

This implementation ensures each order can only be rated once, and provides clear visibility of which orders have already been rated.
