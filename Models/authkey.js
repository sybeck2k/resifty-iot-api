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
    username:   { type: String, trim: true, required: true },
    token:      { type: String, trim: true, required: true }
})


/**
 * Pre-save hook
 */
TokenSchema.pre('save', function(next) {
})

/**
 * Methods
 */
TokenSchema.methods = {

}

mongoose.model('AuthToken', TokenSchema)