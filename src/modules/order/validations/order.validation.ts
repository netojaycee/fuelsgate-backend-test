

import * as yup from 'yup';

export const OrderDtoSchema = yup.object({
    type: yup.string().oneOf(['product', 'truck'], 'Type must be either product or truck').required('Type is required'),
    // buyerId: yup.string().required('Buyer ID is required'),
    sellerId: yup
        .string()
        .nullable()
        .when('type', {
            is: (type: string) => type === 'product',
            then: (schema) => schema.required('Seller ID is required for product orders'),
            otherwise: (schema) => schema.nullable(),
        }),
    productUploadId: yup
        .string()
        .nullable()
        .when('type', {
            is: (type: string) => type === 'product',
            then: (schema) => schema.required('Product Upload ID is required for product orders'),
            otherwise: (schema) => schema.nullable(),
        }),
    truckId: yup
        .string()
        .nullable()
        .when('type', {
            is: (type: string) => type === 'truck',
            then: (schema) => schema.required('Truck ID is required for truck orders'),
            otherwise: (schema) => schema.nullable(),
        }),
    volume: yup
        .number()
        .nullable()
        .when('type', {
            is: (type: string) => type === 'product',
            then: (schema) => schema.required('Volume is required for product orders'),
            otherwise: (schema) => schema.nullable(),
        }),
    loadingDepot: yup
        .string()
        .nullable()
        .when('type', {
            is: (type: string) => type === 'truck',
            then: (schema) => schema.required('Loading depot is required for truck orders'),
            otherwise: (schema) => schema.nullable(),
        }),
    destination: yup
        .string()
        .nullable()
        .when('type', {
            is: (type: string) => type === 'truck',
            then: (schema) => schema.required('Destination is required for truck orders'),
            otherwise: (schema) => schema.nullable(),
        }),
    state: yup
        .string()
        .nullable()
        .when('type', {
            is: (type: string) => type === 'truck',
            then: (schema) => schema.required('State is required for truck orders'),
            otherwise: (schema) => schema.nullable(),
        }),
    city: yup
        .string()
        .nullable()
        .when('type', {
            is: (type: string) => type === 'truck',
            then: (schema) => schema.required('City is required for truck orders'),
            otherwise: (schema) => schema.nullable(),
        }),
    specialHandling: yup.array().of(yup.string()).optional(),
    notes: yup.string().optional(),
    cargoType: yup.string().optional(),
    cargoCategory: yup.string().optional(),
    cargoWeight: yup.string().optional(),
});


export interface OrderDto {
    type: 'product' | 'truck';
    buyerId?: string | null;
    sellerId?: string | null;
    productUploadId?: string | null;
    truckId?: string | null;
    truckOrderId?: string | null;
    price?: number | null;
    volume?: number | null;
    loadingDepot?: string | null;
    destination?: string | null;
    state?: string | null;
    city?: string | null;
}

export const updatePriceSchema = yup.object({
    price: yup.number().required(),
    loadingDate: yup.date().nullable(),
    arrivalTime: yup.date().nullable(),
});

export const updateStatusSchema = yup.object({
    status: yup.string().oneOf(['pending', 'in-progress', 'completed', 'cancelled']).required(),
});

export const OrderUpdateDtoSchema = yup.object({
    type: yup.string().oneOf(['product', 'truck'], 'Type must be either product or truck').required('Type is required'),
    description: yup
        .string()
        .oneOf(
            ['sending_rfq', 'accepting_order', 'rejecting_order', 'order_to_in_progress', 'order_to_completed'],
            'Invalid description',
        )
        .required('Description is required'),
    price: yup
        .number()
        .nullable()
        .when('description', {
            is: (desc: string) => ['sending_rfq'].includes(desc),
            then: (schema) => schema.required('Price is required').min(0, 'Price must be non-negative'),
            otherwise: (schema) => schema.nullable(),
        }),

    offerPrice: yup
        .number()
        .nullable()
        .when('description', {
            is: (desc: string) => ['rejecting_order'].includes(desc),
            then: (schema) => schema.required('Offer Price is required').min(0, 'Offer Price must be non-negative'),
            otherwise: (schema) => schema.nullable(),
        }),
    arrivalTime: yup
        .string()
        .nullable()
        .when('description', {
            is: 'sending_rfq',
            then: (schema) => schema.required('Arrival time is required for sending RFQ'),
            otherwise: (schema) => schema.nullable(),
        }),
    status: yup
        .string()
        .oneOf(['pending', 'in-progress', 'completed', 'cancelled'], 'Invalid status')
        .nullable()
        .when('description', {
            is: (desc: string) => ['accepting_order', 'order_to_in_progress', 'order_to_completed'].includes(desc),
            then: (schema) => schema.required('Status is required'),
            otherwise: (schema) => schema.nullable(),
        }),
    rfqStatus: yup
        .string()
        .oneOf(['pending', 'sent', 'accepted', 'rejected'], 'Invalid RFQ status')
        .nullable()
        .when('description', {
            is: (desc: string) => ['sending_rfq', 'accepting_order', 'rejecting_order'].includes(desc),
            then: (schema) => schema.required('RFQ status is required'),
            otherwise: (schema) => schema.nullable(),
        }),
});