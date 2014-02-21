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
var ClientSchema = new Schema(
{
    id:         ObjectId,
    client:     { type: String, trim: true, required: true },
    secret:     { type: String, trim: true, required: true }
})


/**
 * Pre-save hook
 */
ClientSchema.pre('save', function(next) {
})

/**
 * Methods
 */

ClientSchema.methods = {

}

mongoose.model('ClientKey', ClientSchema)