module.exports = function(db){
    "use strict";

    require('./users')(db);
    require('./business')(db);
    require('./client')(db);
    require('./service')(db);
    require('./serviceType')(db);
    require('./subscription')(db);
    require('./subscriptionType')(db);
    require('./appointment')(db);
    require('./gallery')(db);


};