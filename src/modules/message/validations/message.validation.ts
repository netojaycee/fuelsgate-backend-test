import * as yup from 'yup';

export const messageSchema = yup.object({
    negotiationId: yup.string().required(),
    receiverId: yup.string().required(),
    price: yup.number().required('Price is required for counter-offers'),
    content: yup.string().matches(/^Counter-offer: \d+$/, 'Invalid message format').required(),
});
