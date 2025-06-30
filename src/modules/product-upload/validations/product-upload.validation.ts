import * as yup from 'yup';

export const productUploadSchema = yup.object({
  productId: yup
    .string()
    .required('Product is required'),
  depotHubId: yup
    .string()
    .required('Depot Hub is required'),
  price: yup
    .number()
    .required('Price is required'),
  volume: yup
    .number()
    .required('Volume is required'),
  productQuality: yup
    .string()
    .nullable()
    .optional(),
  expiresIn: yup
    .date()
    .typeError('Expires In must be a valid date')
    .required('Choose the time you want this offer to expire'),
});
