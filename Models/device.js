
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
var DeviceSchema = new Schema({
    id:                 ObjectId,
    name:               { type: String, trim: true, required: true },
    description:        { type: String, trim: true},
    meta:               Schema.Types.Mixed,
    location:           { type: [], index: '2d'}
})

/**
 * Validations
 */

/**
 * Pre-save hook
 */
DeviceSchema.pre('save', function(next) {
    next();
})

/**
 * Methods
 */

DeviceSchema.methods = {
}

mongoose.model('Device', DeviceSchema)
