
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
  location:           { type: [], index: '2d'},
  device:             { type: ObjectId, required: true, ref: 'Device' }
});

/**
 * Validations
 */

/**
 * Pre-save hook
 */
SensorSchema.pre('save', function(next) {
  next();
});

/**
 * Methods
 */

SensorSchema.methods = {
};

SensorSchema.statics.paginate = paginate;

mongoose.model('Sensor', SensorSchema);
