import * as yup from 'yup';

export const priceSchema = yup.object().shape({
  productId: yup.string().required('Product name is required'),
  depotHubId: yup.string().required('Depot hub is required'),
  depot: yup.string().required('Depot name is required'),
  price: yup
    .number()
    .required('Price is required')
    .positive('Price must be positive')
    .typeError('Price must be a number'),
  positive: yup.boolean().required('Positive is required'),
});

export const priceStatusSchema = yup.object().shape({
  activeStatus: yup.boolean().required('Status is required'),
});
