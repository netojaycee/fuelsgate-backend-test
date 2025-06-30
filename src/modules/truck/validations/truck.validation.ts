import * as yup from 'yup';

export const truckSchema = yup.object({
  truckNumber: yup
    .string()
    .required('Truck number is required'),
  capacity: yup
    .number()
    .required('Truck capacity is required'),
  depotHubId: yup
    .string()
    .required('Depot Hub is required'),
  productId: yup
    .string()
    .required('Product is required'),
  depot: yup
    .string()
    .required('Depot is required'),
  currentState: yup
    .string()
    .required('Select truck current state location is required'),
  currentCity: yup
    .string()
    .required('Select truck current city location is required'),
});
