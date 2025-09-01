import * as yup from 'yup';

export const negotiationSchema = yup.object({
    receiverId: yup.string().required('Receiver ID is required'),
    type: yup.string().oneOf(['product', 'truck'], 'Type must be either product or truck').required('Type is required'),
    productUploadId: yup
        .string()
        .nullable()
        .when('type', {
            is: (type: string) => type === 'product',
            then: (schema) => schema.required('Product Upload ID is required for product type'),
            otherwise: (schema) => schema.nullable(),
        }),
    truckId: yup
        .string()
        .nullable()
        .when('type', {
            is: (type: string) => type === 'truck',
            then: (schema) => schema.required('Truck ID is required for truck type'),
            otherwise: (schema) => schema.nullable(),
        }),
    truckOrderId: yup
        .string()
        .nullable()
        .when('type', {
            is: (type: string) => type === 'truck',
            then: (schema) => schema.required('Truck Order ID is required for truck type'),
            otherwise: (schema) => schema.nullable(),
        }),
    volume: yup.number().nullable(),
    price: yup.number().nullable(),
});

export const negotiationStatusSchema = yup.object({
    status: yup
        .string()
        .oneOf(['ongoing', 'completed', 'cancelled'], 'Status must be ongoing, completed, or cancelled')
        .required('Status is required'),
});