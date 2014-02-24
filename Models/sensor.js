
/**
 * Module dependencies.
 */
var mongoose    = require('mongoose');
var validate    = require('mongoose-validator').validate;
var Schema      = mongoose.Schema;
var ObjectId    = Schema.ObjectId;

/**
 * Device Schema
 */
var SensorSchema = new Schema({
    id:                 ObjectId,
    name:               { type: String, trim: true, required: true },
    description:        { type: String, trim: true},
    meta:               Schema.Types.Mixed,
    location:           { type: [], index: '2d'},
    device:             { type: ObjectId, ref: 'Device' }
})

/**
 * Validations
 */

/**
 * Pre-save hook
 */
SensorSchema.pre('save', function(next) {
    next();
})

/**
 * Methods
 */

SensorSchema.methods = {
}

mongoose.model('Sensor', SensorSchema)
