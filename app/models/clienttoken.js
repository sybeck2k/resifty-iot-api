/**
 * Module dependencies.
 */
var mongoose    = require('mongoose');
var Schema      = mongoose.Schema;
var ObjectId    = Schema.ObjectId;
var restify     = require('restify');

/*
 * Client Key Schema
 */
var TokenSchema = new Schema({
  id:         ObjectId,
  clientId:   { type: ObjectId, required: true, ref: 'ClientKey' },
  token:      { type: String, trim: true, required: true },
  scope:      { type: []}
});

TokenSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    var retJson = {
      id:          ret._id,
      clientId:    ret.clientId,
      token:       ret.token,
      scope:       ret.scope
    };
    return retJson;
  }
});


/**
 * Pre-save hook
 */
TokenSchema.pre('save', function(next) {
  next();
});

/**
 * Methods
 */
TokenSchema.methods = {
};

mongoose.model('ClientToken', TokenSchema);