const mongoose = require('mongoose');
const Schema = mongoose.Schema;
//create Schema 
const BbdgktSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    BBDGKT: {
        type: String,
        required: true
    },
    WO: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    time: {
        type: Date,
        required: true
    },
    note: {
        type: String,
    },
    date: {
        type: Date,
        default: Date.now
    }
})

module.exports = Bbdgkt = mongoose.model('bbdgkt', BbdgktSchema)