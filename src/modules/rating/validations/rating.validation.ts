import * as yup from 'yup';

export const createRatingSchema = yup.object({
    rating: yup
        .number()
        .required('Rating is required')
        .min(1, 'Rating must be at least 1')
        .max(5, 'Rating must be at most 5')
        .integer('Rating must be a whole number'),

    review: yup
        .string()
        .optional()
        .max(500, 'Review must be at most 500 characters'),

    truckOrderId: yup
        .string()
        .optional()
        .matches(/^[0-9a-fA-F]{24}$/, 'Invalid truck order ID format'),

    orderId: yup
        .string()
        .optional()
        .matches(/^[0-9a-fA-F]{24}$/, 'Invalid order ID format'),
}).test(
    'order-id-validation',
    'Please provide either truckOrderId or orderId, but not both',
    function (value) {
        const { truckOrderId, orderId } = value;
        const isValid = (truckOrderId && !orderId) || (!truckOrderId && orderId);
        if (!isValid) {
            return this.createError({
                message: 'Please provide either truckOrderId or orderId, but not both'
            });
        }
        return true;
    },
);
