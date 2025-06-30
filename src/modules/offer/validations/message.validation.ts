import * as yup from 'yup';

export const messageSchema = yup.object({
  offer: yup
    .number()
    .min(1)
    .required('Please enter an offer'),
  offerId: yup
    .string()
    .required('Please enter an offer ID')
});

export const messageStatusSchema = yup.object({
  status: yup
    .string()
    .oneOf(
      ['pending', 'accepted', 'rejected'],
      'Order status must be either pending, accepted or rejected',
    )
    .required('Status is required'),
});
