var mongoose = require("mongoose")
var passportLocalMongoose = require("passport-local-mongoose")
var userSchema = new mongoose.Schema({
    username: String,
    password: String, 
    avatar: String,
    firstname: String,
    lastname: String,
    sex: String,
    email: String,
    blogs:[
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Blog"
        }
    ]
})
userSchema.plugin(passportLocalMongoose)
module.exports = mongoose.model("User", userSchema)
