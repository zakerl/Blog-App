var mongoose = require("mongoose")

var commentSchema = new mongoose.Schema({
    author:{
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    },
    image: String,
    created: {type: Date, default: Date.now},
    text: String
})
module.exports = mongoose.model("Comment", commentSchema)