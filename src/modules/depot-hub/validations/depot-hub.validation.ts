import * as yup from 'yup';

export const depotHubSchema = yup.object({
  name: yup
    .string()
    .required('Depot Hub name is required'),
  type: yup
    .string()
    .oneOf(['tanker', 'others'], 'Depot Hub type must be one of: tanker, others')
    .required('Depot Hub type is required'),
  depots: yup
    .array()
    .required('Depot is required')
});
