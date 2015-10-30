module.exports = {
    USER_ROLE: {
        STYLIST: 'Stylist',
        CLIENT: 'Client',
        ADMIN: 'Admin'
    },
    BUCKET: {
        IMAGES: 'images'
    },
    REG_EXP: {
        OBJECT_ID: new RegExp('(^[0-9a-fA-F]{24}$)')
    },
    STATUSES:{
        APPOINTMENT:{
            CREATED: 'Created',
            SCHEDULED: 'Scheduled',
            CONFIRMED: 'Confirmed',
            BEGINS: 'Begins',
            SUCCEEDED: 'Succeeded',
            CANCEL_BY_CLIENT: 'Cancel by client',
            CANCEL_BY_STYLIST: 'Cancel by stylist'
        }
    },
    LIMIT: {
        REQUESTED_SERVICES: 20,
        REQUESTED_STYLISTS: 20
    }
};

