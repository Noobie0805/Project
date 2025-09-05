import { Router } from "express";
import {
    registerUser,
    userlogin,
    userlogout,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 }
    ]), registerUser)

router.route("/login").post(userlogin);
router.route("/logout").post(verifyJWT, userlogout);  // verifyJWT before logout
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);  //.get is used as we are fetching data only and not changing anything
router.route("/update-account").patch(verifyJWT, updateAccountDetails);  //.patch is used as we are updating few fields of the user and not the entire user
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/history").get(verifyJWT, getWatchHistory);

export default router;

/* 
TO UNDERSTAND :
Line :7 >> router.route("/route").httpMethod( middlewares , controller )
*/