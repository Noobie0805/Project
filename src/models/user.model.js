import mongoose, { Schema } from "mongoose";
import jwt from 'jsonwebtoken'; // padho net pe samajh aajayea inka use idhar
import bcrypt from 'bcrypt';     // padho net pe samajh aajayea inka use idhar

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        fullname: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        avatar: {
            type: String, //Cloudinary URL
            required: true,
        },
        coverimage: {
            type: String, //Cloudinary URL
        },
        watchhistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,   //it shoul not be the password string as it is but a hashed string 
            required: [true, 'Password is required'],
        },
        refreshToken: {
            type: String,
        }
    },
    {
        timestamps: true,   // Automatically manage createdAt and updatedAt 
    }
)
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) { return next() }
    this.password = await bcrypt.hash(this.password, 10) //second argument is the salt rounds ..u know this!!
    next()
})//we need next to pass control to the next middleware in case of multiple middlewares

userSchema.methods.passwordAuth = async function (password) {
    return await bcrypt.compare(password, this.password)
}


userSchema.methods.generateAccessToken = function () {
    jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY } // Access token expires in 15 minutes
    )
}
userSchema.methods.generateRefreshToken = function () {
    jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY } // Access token expires in 15 minutes
    )
}

export const User = mongoose.model("User", userSchema);