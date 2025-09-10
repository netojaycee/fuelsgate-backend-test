import * as yup from 'yup';

export const truckSchema = yup.object({
  truckType: yup
    .string()
    .oneOf(['flatbed', 'tanker', 'stepdeck', 'dropdeck'], 'Truck type must be one of: flatbed, tanker, stepdeck, dropdeck')
    .required('Truck type is required'),
  truckFuelType: yup
    .string()
    .oneOf(['diesel', 'cng'], 'Truck fuel type must be one of: diesel, cng')
    .required('Truck fuel type is required'),
  truckCategory: yup
    .string()
    .oneOf(['A++', 'A', 'B', 'C'], 'Truck category must be one of: A++, A, B, C')
    .required('Truck category is required'),
  truckNumber: yup
    .string()
    .required('Truck number is required'),
  capacity: yup
    .number()
    .when('truckType', {
      is: (val: string) => val === 'tanker',
      then: schema => schema.required('Truck capacity is required'),
      otherwise: schema => schema.optional(),
    }),
  depotHubId: yup
    .string()
    .when('truckType', {
      is: (val: string) => val === 'tanker',
      then: schema => schema.required('Depot Hub is required'),
      otherwise: schema => schema.optional(),
    }),
  productId: yup
    .string()
    .when('truckType', {
      is: (val: string) => val === 'tanker',
      then: schema => schema.required('Product is required'),
      otherwise: schema => schema.optional(),
    }),
  depot: yup
    .string()
    .when('truckType', {
      is: (val: string) => val === 'tanker',
      then: schema => schema.required('Depot is required'),
      otherwise: schema => schema.optional(),
    }),
  ownerId: yup.string().optional(),
  truckOwner: yup.string().optional(),
  ownerLogo: yup.string().optional(),
  currentState: yup
    .string()
    .when('truckType', {
      is: (val: string) => val !== 'tanker',
      then: schema => schema.required('Select truck current state location is required'),
      otherwise: schema => schema.optional(),
    }),
  currentCity: yup
    .string()
    .when('truckType', {
      is: (val: string) => val !== 'tanker',
      then: schema => schema.required('Select truck current city location is required'),
      otherwise: schema => schema.optional(),
    }),
  // Flatbed / metadata optional fields
  deckLengthFt: yup.string().optional(),
  deckWidthFt: yup.string().optional(),
  maxPayloadKg: yup.string().optional(),
  notes: yup.string().optional(),
  country: yup.string().optional(),
  address: yup.string().optional(),
  flatbedSubtype: yup.string().optional(),
  equipment: yup.array().of(yup.string()).optional(),
  preferredCargoTypes: yup.array().of(yup.string()).optional(),
});

export const truckStatusSchema = yup.object({
  status: yup
    .string()
    .oneOf(['pending', 'available', 'locked'], 'Status must be one of: pending, available, locked')
    .required('Status is required'),
});
