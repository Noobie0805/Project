import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/apiResponse.js';

const registerUser = asyncHandler(async (req, res) => {
    //  >>>>>>> STEPS TO REGISTER USER  >>>>>>>:

    //   STEP-1   >>>>  # Get data from user
    const { fullname, email, username, password } = req.body;
    console.log("email:", email);

    //   STEP-2   >>>>  # Validate the data - not empty
    if ([fullname, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    //   STEP-3   >>>>  # Check if the user is already registered (username , e-mail)
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        throw new ApiError(409, "User already exists with this email or username");
    }

    //   STEP-4   >>>>  # Check for images , check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath = "";
    if (req.body && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }
    // if (!coverImageLocalPath) {
    //     throw new ApiError(400, "Cover image is required");
    // }

    //   STEP-5   >>>>  # Upload them to cloudinary , check avatar again
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    //   STEP-6   >>>>  # Create user object - create entry in DB
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //   STEP-7   >>>>  # Remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    //   STEP-8   >>>>  # Check for user creation
    if (!createdUser) {
        throw new ApiError(500, "User creation failed");
    }

    //   STEP-9   >>>>  # Return response
    return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"));

});

export { registerUser };

