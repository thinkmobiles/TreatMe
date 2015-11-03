module.exports = function(db){
    "use strict";

    var mongoose = require('mongoose');
    var ObjectId = mongoose.Types.ObjectId;

    Array.prototype.toObjectId = function () {
        var _arrayOfID = [];

        for (var i = 0; i < this.length; i++) {
            if (this[i] && typeof this[i] == 'object' && this[i].hasOwnProperty('_id')) {
                _arrayOfID.push(this[i]._id);
            } else {
                if (typeof this[i] == 'string' && this[i].length === 24) {
                    _arrayOfID.push(ObjectId(this[i]));
                }
                if (this[i] === null) {
                    _arrayOfID.push(null);
                }

            }
        }
        return _arrayOfID;
    };

    Array.prototype.toStringObjectIds = function () {
        var arr = this.map(function (_objectId) {
            if (_objectId instanceof ObjectId) {
                return _objectId.toString();
            } else if(typeof _objectId === 'string'){
                return _objectId;
            } else {
                throw new Error({ message: 'Incorrect value for ObjectId' });
            }
        });
        return arr;
    };



    require('./users')(db);
    //require('./business')(db);
    //require('./client')(db);
    require('./service')(db);
    require('./serviceType')(db);
    require('./subscription')(db);
    require('./subscriptionType')(db);
    require('./appointment')(db);
    require('./gallery')(db);


};