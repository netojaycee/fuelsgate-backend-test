import * as yup from 'yup';

export const truckSchema = yup.object({
  truckType: yup
    .string()
    .oneOf(['flatbed', 'tanker'], 'Truck type must be one of: flatbed, tanker')
    .required('Truck type is required'),
  truckNumber: yup
    .string()
    .required('Truck number is required'),
  capacity: yup
    .number()
    .when('truckType', {
      is: 'tanker',
      then: schema => schema.required('Truck capacity is required'),
      otherwise: schema => schema.optional(),
    }),
  depotHubId: yup
    .string()
    .when('truckType', {
      is: 'tanker',
      then: schema => schema.required('Depot Hub is required'),
      otherwise: schema => schema.optional(),
    }),
  productId: yup
    .string()
    .when('truckType', {
      is: 'tanker',
      then: schema => schema.required('Product is required'),
      otherwise: schema => schema.optional(),
    }),
  depot: yup
    .string()
    .when('truckType', {
      is: 'tanker',
      then: schema => schema.required('Depot is required'),
      otherwise: schema => schema.optional(),
    }),
  ownerId: yup.string().optional(),
  truckOwner: yup.string().optional(),
  ownerLogo: yup.string().optional(),
  currentState: yup
    .string()
    .when('truckType', {
      is: 'flatbed',
      then: schema => schema.required('Select truck current state location is required'),
      otherwise: schema => schema.optional(),
    }),
  currentCity: yup
    .string()
    .when('truckType', {
      is: 'flatbed',
      then: schema => schema.required('Select truck current city location is required'),
      otherwise: schema => schema.optional(),
    }),
});

export const truckStatusSchema = yup.object({
  status: yup
    .string()
    .oneOf(['pending', 'available', 'locked'], 'Status must be one of: pending, available, locked')
    .required('Status is required'),
});
