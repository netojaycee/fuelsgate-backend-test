import * as yup from 'yup';

export const truckOrderSchema = yup.object({
  truckId: yup.string().required('Truck ID is required'),
  destination: yup.string().required('Destination is required'),
  state: yup.string().required('State is required'),
  city: yup.string().required('City is required'),
  loadingDepot: yup.string().required('Loading depot is required'),
  // loadingState: yup.string().required('Loading state is required'),
  // loadingCity: yup.string().required('Loading city is required'),
  // loadingAddress: yup.string().required('Loading address is required'),
});

export const updateStatusSchema = yup.object({
  status: yup
    .string()
    .oneOf(
      ['pending', 'in-progress', 'completed', 'cancelled'],
      'Order status must be either pending, in-progress, completed or cancelled',
    )
    .required('Order status is required'),
});

export const updateRfqStatusSchema = yup.object({
  rfqStatus: yup
    .string()
    .oneOf(
      ['pending', 'sent', 'accepted', 'rejected'],
      'Order status must be either pending, sent, accepted or rejected',
    )
    .required('Rfq status is required'),
});

export const updatePriceSchema = yup.object({
  price: yup
    .number()
    .min(1, { message: 'Please enter a valid number' })
    .required('Order price is required'),
});
