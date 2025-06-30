import * as yup from 'yup';

export const profilePictureSchema = yup.object({
  profilePicture: yup.string().required('Profile picture is required'),
});

export const sellerSchema = yup.object({
  category: yup
    .string()
    .oneOf(
      ['trader', 'depot-owner'],
      'Category must be either traders or depot owner',
    )
    .required('Category is required'),
  depotName: yup.string().when('category', ([category], schema) => {
    return category === 'depot-owner'
      ? schema.required('Please enter your depot name')
      : schema.notRequired();
  }),
  businessName: yup.string().required('Business name is required'),
  products: yup
    .array()
    .of(yup.string().required('Product is required'))
    .required('Please select your products')
    .min(1, 'At least one product is required'),
  phoneNumber: yup.string().required('Phone number is required'),
  officeAddress: yup.string(),
  depotAddress: yup.string().when('category', ([category], schema) => {
    return category === 'depot-owner'
      ? schema.required('Please enter your depot address')
      : schema.notRequired();
  }),
  depotHub: yup.string().required('Please select a Depot Hub'),
});
