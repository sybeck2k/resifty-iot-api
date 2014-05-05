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
var DeviceSchema = new Schema({
  id:                 ObjectId,
  name:               { type: String, trim: true, required: true },
  description:        { type: String, trim: true},
  meta:               Schema.Types.Mixed,
  location:           { type: [], index: '2d'},
  parent:             { type: ObjectId, required: false, ref: 'Device' },
  client:             { type: ObjectId, required: true, ref: 'ClientKey' }
});

DeviceSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    var retJson = {
      id:          ret._id,
      name:        ret.name,
      description: ret.description,
      client:      ret.client,
      meta:        ret.meta,
      location:    ret.location,
      parent:      ret.parent
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
DeviceSchema.pre('save', function(next) {
  next();
});

/**
 * Methods
 */

DeviceSchema.methods = {
};

DeviceSchema.statics.paginate = paginate;

mongoose.model('Device', DeviceSchema);
