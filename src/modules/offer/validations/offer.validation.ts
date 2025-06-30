import * as yup from 'yup';

export const offerSchema = yup.object({
  receiverId: yup
    .string()
    .required('Receiver ID is required'),
  productUploadId: yup
    .string()
    .required('Product Upload ID is required'),
  volume: yup
    .number()
    .required('Volume is required')
});

export const offerStatusSchema = yup.object({
  status: yup
    .string()
    .oneOf(
      ['ongoing', 'completed', 'cancelled'],
      'Order status must be either ongoing, completed or cancelled',
    )
    .required('Status is required'),
  orderId: yup
    .string()
});

