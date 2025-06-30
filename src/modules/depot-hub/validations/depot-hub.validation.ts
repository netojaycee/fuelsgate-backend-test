import * as yup from 'yup';

export const depotHubSchema = yup.object({
  name: yup
    .string()
    .required('Depot Hub name is required'),
  depots: yup
    .array()
    .required('Depot is required')
});
