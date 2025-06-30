import * as yup from 'yup';

export const adminSchema = yup.object({
  category: yup
    .string()
    .oneOf(
      ['executive', 'viewer'],
      'Category must be either executive or viewer',
    )
    .required('Category is required'),
});
