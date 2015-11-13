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
            SUSPENDED: 'Suspended',
            CONFIRMED: 'Confirmed',
            BEGINS: 'Begins',
            SUCCEEDED: 'Succeeded',
            CANCEL_BY_CLIENT: 'Cancel by client',
            CANCEL_BY_STYLIST: 'Cancel by stylist',
            //for admin
            PENDING: 'Pending',
            BOOKED: 'Booked'
        }
    },
    LIMIT: {
        REQUESTED_SERVICES: 20,
        REQUESTED_STYLISTS: 20,
        REQUESTED_APPOINTMENTS: 20,
        REQUESTED_PACKAGES : 20,
        //for getClientById in CMS
        REQUESTED_BOOKED_APPOINTMENTS: 5,
        REQUESTED_PURCHASED_PACKAGES: 4,
        //for getStylistById in CMS
        REQUESTED_CLIENTS: 4,
        REQUESTED_PHOTOS: 10
    },
    SEARCH_DISTANCE: {
        START: 1609.344, // start search stylists from 1 mile
        MAX: 50 * 1609.344 //max 50 miles
    }
};

