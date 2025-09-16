import * as yup from 'yup';

export const truckSchema = yup.object({
  truckType: yup
    .string()
    .oneOf(['flatbed', 'tanker', 'sidewall', 'lowbed'], 'Truck type must be one of: flatbed, tanker, sidewall, lowbed')
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
    .required('Truck capacity is required'),
  depotHubId: yup
    .string()
    .required('Depot Hub ID is required'),

  productId: yup
    .string()
    .when('truckType', {
      is: (val: string) => val === 'tanker',
      then: schema => schema.required('Product is required'),
      otherwise: schema => schema.optional(),
    }),
  depot: yup
    .string()
    .required('Depot is required'),
  ownerId: yup.string().optional(),
  truckOwner: yup.string().optional(),
  ownerLogo: yup.string().optional(),

});

export const truckStatusSchema = yup.object({
  status: yup
    .string()
    .oneOf(['pending', 'available', 'locked'], 'Status must be one of: pending, available, locked')
    .required('Status is required'),
});
