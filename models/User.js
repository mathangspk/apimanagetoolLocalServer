const mongoose = require('mongoose');

const UserSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        min:6,
        max:255
    },
    email: {
        type: String,
        required: true,
        max: 255,
        min:6
    },
    password: {
        type: String,
        required: true,
        max:1024,
        min:6
    },
    phone:{
        type: Number,
        required: true,
    },
    group: {
        type: String,
        required:true,
    },
    department:{
        type: String,
        required: true,
    },
    admin:{
        type: Boolean,
        required:true,
    },
    pkt:{
        type: Boolean
    },
    date: {
        type:Date,
        default: Date.now
    }
})

module.exports = mongoose.model('User', UserSchema);