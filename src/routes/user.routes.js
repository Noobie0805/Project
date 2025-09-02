import { Router } from "express";
import { registerUser, userlogin, userlogout, refreshAccessToken } from "../controllers/user.controller.js";
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
export default router;

/* 
TO UNDERSTAND :
Line :7 >> router.route("/route").httpMethod( middlewares , controller )
*/