const mongoose = require('mongoose')
const PrivateMsgSchema = new mongoose.Schema({
    from_user: {
        type: String,
        maxLength: 100,
        required: true,
        trim: true
    },
    to_user: {
        type: String,
        maxLength: 100,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    date_sent: {
        type: Date,
        default: Date.now,
        required: true
    }
})

module.exports = mongoose.model("privateMsg", PrivateMsgSchema)