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
var ClientSchema = new Schema({
  id:             ObjectId,
  client:         { type: String, trim: true, required: true },
  description:    { type: String, trim: true, required: true },
  secret:         { type: String, trim: true, required: true }
});

ClientSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    var retJson = {
      id:          ret._id,
      clientId:    ret.clientId,
      description: ret.description
    };
    return retJson;
  }
});

/**
 * Pre-save hook
 */
ClientSchema.pre('save', function(next) {
  next();
});

/**
 * Methods
 */

ClientSchema.methods = {
  /**
  * Authenticate - check if the passwords are the same
  *
  * @param {String} plainText
  * @return {Boolean}
  * @api public
  */
  authenticate: function(plainText) {
    return plainText === this.secret;
  }
};

mongoose.model('ClientKey', ClientSchema);