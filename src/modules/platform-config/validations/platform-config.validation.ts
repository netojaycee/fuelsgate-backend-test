import * as yup from 'yup';

export const createPlatformConfigSchema = yup.object().shape({
    key: yup.string().required('Key is required'),
    value: yup.number()
        .required('Value is required')
        .min(0, 'Value must be at least 0')
        .max(100, 'Value must be at most 100'),
    description: yup.string().optional(),
});

export const updatePlatformConfigSchema = yup.object().shape({
    value: yup.number()
        .required('Value is required')
        .min(0, 'Value must be at least 0')
        .max(100, 'Value must be at most 100'),
    description: yup.string().optional(),
});
