module.exports = {
    USER_STATUS: {
        BUSINESS: 'Business',
        CLIENT: 'Client'
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
            SUCCEEDED: 'Succeeded',
            CANCEL_BY_CLIENT: 'Cancel by client',
            CANCEL_BY_STYLIST: 'Cancel by stylist'
        }
    }
};

