/**
 * Module dependencies.
 */
var mongoose    = require('mongoose');
var Schema      = mongoose.Schema;
var ObjectId    = Schema.ObjectId;
var restify     = require('restify');
var bcrypt      = require('bcrypt');

/*
 * Client Key Schema
 */
var ClientSchema = new Schema({
  id:             ObjectId,
  client:         { type: String, trim: true, required: true },
  description:    { type: String, trim: true, required: true },
  secretHash:     { type: String, trim: true, required: true }
});

ClientSchema.virtual('secret')
  .get(function() {
    return this._password;
  })
  .set(function(value) {
    this._password = value;
    var salt = bcrypt.genSaltSync(12);
    this.secretHash = bcrypt.hashSync(value, salt);
  });

ClientSchema.path('secretHash').validate(function(secret) {
  if (this.isNew && !this._password) {
    this.invalidate('secret', 'required');
  }
}, null);

ClientSchema.set('toJSON', {
  transform: function(doc, ret, options) {
    var retJson = {
      id:          ret._id,
      clientId:    ret.clientId,
      description: ret.description,
      secretHash:  ret.secretHash
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
  authenticate: function(plainTextSecret, cb) {
    bcrypt.compare(plainTextSecret, this.secretHash, function(err, isMatch) {
      if (err) return cb(err);
      cb(null, isMatch);
    });
  }
};

mongoose.model('ClientKey', ClientSchema);