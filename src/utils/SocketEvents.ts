export const SOCKET_EVENTS = {
    // Room management
    JOIN_ROOM: 'joinRoom',
    LEAVE_ROOM: 'leaveRoom',

    // Message events
    SEND_MESSAGE: 'sendMessage',
    RECEIVE_MESSAGE: 'receiveMessage',
    MESSAGE_SENT: 'message_sent',
    MESSAGE_STATUS_UPDATED: 'message_status_updated',
    SYSTEM_MESSAGE: 'system_message',
    MESSAGE_READ: 'markMessageRead',

    // Negotiation events
    SEND_NEGOTIATION: 'sendNegotiation',
    RECEIVE_NEGOTIATION: 'receiveNegotiation',
    ACCEPT_NEGOTIATION: 'acceptNegotiation',
    REJECT_NEGOTIATION: 'rejectNegotiation',
    CANCEL_NEGOTIATION: 'cancelNegotiation',
    NEGOTIATION_ACCEPTED: 'negotiation_accepted',
    NEGOTIATION_REJECTED: 'negotiation_rejected',
    NEGOTIATION_CANCELLED: 'negotiation_cancelled',

    // Order events
    SEND_ORDER: 'sendOrder',
    RECEIVE_ORDER: 'receiveOrder',
    UPDATE_ORDER: 'updateOrder',
    ORDER_STATUS_UPDATED: 'order_status_updated',

    // Notification events
    NOTIFICATION: 'notification',
    BADGE_UPDATED: 'badge_updated',

    // Connection events
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    JOINED_ROOM: 'joinedRoom',
    ERROR: 'error',
};