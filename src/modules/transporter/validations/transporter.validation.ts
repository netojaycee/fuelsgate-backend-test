import * as yup from 'yup';

export const transporterSchema = yup.object({
  companyName: yup
    .string()
    .required('Company name is required.')
    .min(2, 'Company name must be at least 2 characters long.')
    .max(100, 'Company name must be at most 100 characters long.'),

  companyAddress: yup.string().required('Company address is required.'),

  companyEmail: yup.string().email('Invalid email address.'),

  phoneNumber: yup
    .string()
    .required('Phone number is required.')
    .matches(
      /^[8972][0-9]{9}$/,
      'Phone number must be a valid nigerian phone number.',
    ),

  state: yup.string().required('State is required.'),
});
