
/**
 * Module dependencies.
 */
var mongoose    = require('mongoose');
var validate    = require('mongoose-validator').validate;
var Schema      = mongoose.Schema;
var ObjectId    = Schema.ObjectId;
var paginate    = require('../lib/mongoose-paginate');

/**
 * Device Schema
 */
var SensorSchema = new Schema({
  id:                 ObjectId,
  name:               { type: String, trim: true, required: true },
  persistant:         { type: Boolean, default: true },
  description:        { type: String, trim: true},
  meta:               Schema.Types.Mixed,
  type:               { type: String, enum: ['geo', 'scalar', 'state'], default: 'scalar' }, //what is the reading (geospatial point, value, boolean state)?
  location:           { type: [], index: '2d'},
  time_precision:     { type: String, enum: ['s', 'm', 'u'], default: 's' }, //what is the time precision of the readings (seconds, millis, micros)?
  device:             { type: ObjectId, required: true, ref: 'Device' },
  client:             { type: ObjectId, required: false, ref: 'ClientKey' }
});

SensorSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    var retJson = {
      id:             ret._id,
      name:           ret.name,
      description:    ret.description,
      meta:           ret.meta,
      location:       ret.location,
      device:         ret.device,
      time_precision: ret.time_precision,
      type:           ret.type,
      persistant:     ret.persistant
    };
    return retJson;
  }
});

/**
 * Validations
 */

/**
 * Pre-save hook
 */
SensorSchema.pre('save', function(next) {
  //throw new Error("@todo consistency with device!");
  next();
});

/**
 * Methods
 */

SensorSchema.methods = {
};

SensorSchema.statics.paginate = paginate;

mongoose.model('Sensor', SensorSchema);
