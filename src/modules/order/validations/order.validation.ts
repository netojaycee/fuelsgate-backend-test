import * as yup from 'yup';

export const orderSchema = yup.object({
  sellerId: yup
    .string()
    .required('Seller ID is required'),
  productUploadId: yup
    .string()
    .required('Uploaded Product ID is required'),
  price: yup
    .number()
    .min(1, { message: "Please enter a valid number" })
    .required('Order price is required'),
  volume: yup
    .number()
    .min(1, { message: "Please enter a valid number" })
    .required('Order volume is required')
});

export const updateStatusSchema = yup.object({
  status: yup
    .string()
    .oneOf(
      ['awaiting-approval', 'in-progress', 'completed', 'cancelled'],
      'Order status must be either awaiting-approval, in-progress, completed or cancelled',
    )
    .required('Order status is required')
});

export const updatePriceSchema = yup.object({
  price: yup
    .number()
    .min(1, { message: "Please enter a valid number" })
    .required('Order price is required')
});
