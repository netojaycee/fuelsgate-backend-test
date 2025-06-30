import * as yup from 'yup';

export const productSchema = yup.object({
  name: yup
    .string()
    .required('Product name is required'),
  value: yup
    .string()
    .required('Product value code is required'),
  color: yup
    .string()
    .required('Product bg-color class is required'),
  unit: yup
    .string()
    .required('Product unit is required'),
  status: yup
    .string()
    .oneOf(
      ['active', 'inactive'],
      'Product status must be either active or inactive',
    )
    .required('Product status is required')
});
