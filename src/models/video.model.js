import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile: {
            type: String, // Cloudinary URL for the video file
            required: true,
        },
        thinbnail: {
            type: String, // Cloudinary URL for the thumbnail image
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        duration: {
            type: Number,
            required: true,
        },
        views: {
            type: Number,
            default: 0,
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },


    },
    {
        timestamps: true,   // Automatically manage createdAt and updatedAt
    }
)

videoSchema.plugin(mongooseAggregatePaginate); // allows for pagination of aggregate queries means we could add plugins for more functionality later

export const Video = mongoose.model("Video", videoSchema);