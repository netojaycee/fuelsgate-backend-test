export class OrderDto {
    buyerId: string;
    profileId: string;
    profileType: 'seller' | 'transporter';
    type: 'product' | 'truck';
    productUploadId?: string;
    truckId?: string;
    price?: number;
    volume?: number;
    destination?: string;
    state?: string;
    city?: string;
    loadingDepot?: string;
    loadingDate?: Date;
    arrivalTime?: Date;
    status?: 'pending' | 'in-progress' | 'completed' | 'cancelled';
    rfqStatus?: 'pending' | 'sent' | 'accepted' | 'rejected';
    specialHandling: string[];
    notes: string;
    cargoType: string;
    cargoCategory: string;
    cargoWeight: string;
    
}

export class OrderQueryDto {
    buyerId?: string;
    profileId?: string;
    type?: 'product' | 'truck';
    status?: 'pending' | 'in-progress' | 'completed' | 'cancelled';
}





export interface OrderUpdateDto {
    type: 'product' | 'truck';
    description: 'sending_rfq' | 'accepting_order' | 'rejecting_order' | 'order_to_in_progress' | 'order_to_completed';
    price?: number | null;
    offerPrice?: number | null;
    arrivalTime?: Date | null;
    status?: 'pending' | 'in-progress' | 'completed' | 'cancelled' | null;
    rfqStatus?: 'pending' | 'sent' | 'accepted' | 'rejected' | null;
}