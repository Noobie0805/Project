import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';
import dotenv from "dotenv"

dotenv.config();

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "").trim();

        if (!token || typeof token !== "string") {
            throw new ApiError(401, "Unauthorized request!");
        }

        // console.log("Extracted token:", token, typeof token);


        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "Invalid Access Token!");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
})