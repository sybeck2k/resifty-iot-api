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
//validate that the requested parent device is of property of this client
DeviceSchema.path('parent').validate(function (device_id, respond) {
  //this condition will fail validation for the client required validator anyway
  if (!this._doc.client || !device_id) {
    return respond(true);
  }
  var clientId = this._doc.client;
  mongoose.model('Device')
    .findOne({_id: device_id, client: clientId}, function(err, device){
      if (err || !device) {
        return respond(false);
      }
      return respond(true);
    });
}, 'Invalid parent device ID');

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

DeviceSchema.statics = {
  paginate: paginate,
  createSafeFields: [
    'name',
    'description',
    'meta',
    'location',
    'parent'
  ],
  updateSafeFields: [
    'name',
    'description',
    'meta',
    'location',
    'parent'
  ]
};

mongoose.model('Device', DeviceSchema);
