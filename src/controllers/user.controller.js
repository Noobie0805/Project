import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/apiResponse.js';
import jwt from 'jsonwebtoken'; ``

//helper functions
const generateAccessTokenRefreshToken = async (userId) => {
    try {
        //find user from userId
        const user = await User.findById(userId);
        //generate access token and refresh token
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        //save refresh token on database
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false }); // here password is required parameter in  model but we are only updating refresh token so used {validateBeforeSave:false}
        //return them
        return { accessToken, refreshToken };
    }
    catch (error) {
        throw new ApiError(500, "Token generation failed");
    }
}

// actual controllers

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

const userlogin = asyncHandler(async (req, res) => {
    //take data from req.body
    const { email, username, password } = req.body;

    //check if atleast username or email is present
    if (!email && !username) {
        throw new ApiError(400, "Username or email is required");
    }

    //find if the user exists in the database
    const findUser = await User.findOne({ $or: [{ email }, { username }] });
    if (!findUser) {
        throw new ApiError(404, "User not found, please signup first");
    }

    // match password from findUser and req.body.password
    const passwordMatch = await findUser.passwordAuth(password);
    if (!passwordMatch) {
        throw new ApiError(401, "Invalid credentials");
    }

    //get the access token and refresh token from the method generateAccessTokenRefreshToken()
    const { accessToken, refreshToken } = await generateAccessTokenRefreshToken(findUser._id);

    // now the findUser still don't have the tokens as we have just updated the db but not this instance , here we would either update this instance or create a new one
    const loggedInUser = await User.findById(findUser._id).select("-password -refreshToken");

    //return response

    const options = {
        httpOnly: true,
        secure: true
    }// the cookies are modifiable from frontend so we do this to make them less accessible and only modifiable from serverside

    return res.status(200)
        .cookie("refreshToken", refreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully !")
        )
});

const userlogout = asyncHandler(async (req, res) => {
    // Remove refreshToken from DB
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined }
        },
        { new: true }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    // Get refresh token from cookies OR request body
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request!")
    }

    try {
        // Verify refresh token's signature & expiry ,this will return an object with user id  as it was the only thing encoded in refreshToken
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        // Find user from the id from decoded token
        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        // Check if the token from client matches the one stored in DB
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const options = {
            httpOnly: true,
            secure: true
        }
        // Generate new tokens (your helper should also save new refresh token in DB)

        const { accessToken, newRefreshToken } = await generateAccessTokenRefreshToken(user._id);

        // Send both tokens back (set in cookies + response body for frontend if needed)

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(200, { accessToken, newRefreshToken }, "Access token refreshed successfully"));

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    // const { oldPassword, newPassword, confirmPassword } = req.body;

    // if (newPassword !== confirmPassword) { //easy hai ye to...
    //     throw new ApiError(400, "New password and confirm password do not match !");
    // }

    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await user.passwordAuth(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password !");
    }

    //reset password and save in DB
    user.password = newPassword;
    await user.save({ validateBeforeSave: false }); //u know why?

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));

});

const getCurrentUser = asyncHandler(async (req, res) => {
    const currentUser = req.user;
    if (!currentUser) {
        throw new ApiError(404, "No Current user");
    }
    return res.status(200)
        .json(new ApiResponse(200, currentUser, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body;
    if (!fullname || !email) {
        throw new ApiError(400, "Please provide all fields");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email
            }
        },
        { new: true }
    ).select("-password");
    return res.status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalpath = req.file?.path;
    if (!avatarLocalpath) {
        throw new ApiError(400, "Avatar file is missing");
    }
    const newAvatar = await uploadOnCloudinary(avatarLocalpath);
    if (!newAvatar?.url) {
        throw new ApiError(400, "New Avatar Upload Failed");
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: newAvatar.url
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    // take cover image from user request
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing");
    }
    //upload on cloudinary and get url
    const newCoverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!newCoverImage?.url) {
        throw new ApiError(400, "New Cover Image upload failed");
    }

    //get user as he is already logged in => auth.middleware.js has run => req.user is updated by current user
    const user = req.user;
    const updateCoverImage = await User.findByIdAndUpdate(
        user._id,
        {
            $set: {
                coverImage: newCoverImage.url
            }
        }, { new: true }
    ).select("-password");

    if (!updateCoverImage) {
        throw new ApiError(500, "Cover Image update failed");
    }

    return res.status(200).json(new ApiResponse(200, updateCoverImage, "Cover Image updated successfully"));


});



export {
    registerUser,
    userlogin,
    userlogout,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
};

