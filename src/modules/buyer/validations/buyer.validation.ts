import * as yup from 'yup';

export const buyerSchema = yup.object({
  category: yup
    .string()
    .oneOf(
      ['reseller', 'basic-customer'],
      'Category must be either reseller or basic customer',
    )
    .required('Category is required'),
});
