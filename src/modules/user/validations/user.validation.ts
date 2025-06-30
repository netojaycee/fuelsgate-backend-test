import * as yup from 'yup';

export const updatePasswordSchema = yup.object({
  currentPassword: yup
    .string()
    .required('Current password is required'),
  password: yup.string().required('New password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
});