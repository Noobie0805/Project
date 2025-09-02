import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId,  // one who is  buying subscription
        ref: "User"
    },
    channel: {
        type: Schema.Types.ObjectId,  // one who is selling subscription
        ref: "User"
    }
}, {
    timestamps: true
});

export const Subscription = mongoose.model("Subscription", subscriptionSchema);