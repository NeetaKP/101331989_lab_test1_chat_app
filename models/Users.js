const mongoose = require('mongoose')
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true, 
        maxLength: 100,
        required: true,
        trim: true
    },
    firstname: {
        type: String, 
        maxLength: 100,
        required: true,
        trim: true
    },
    lastname: {
        type: String, 
        maxLength: 50,
        required: true,
        trim: true
    },
    password: {
        type: String,
        maxLength: 60,
        required: true,
        trim: true
    },
    createon: {
        type: Date, 
        default: Date.now,
        required: true
    }
})

module.exports = mongoose.model("user", UserSchema)