import { Router}  from "express";
import { UserController } from "../controllers";
import { AuthService ,JwtService} from "@/application/services";
import { UseRequestDto, UseResponseDto } from "../middleware/dtos/validation";
import { asyncHandler } from "@/utils/asyncHandler";
import { CreateUserDto, UserResponseDto } from "@/application/dtos/User/user.dto";

const authService = new AuthService(new JwtService());
const userController = new UserController(authService)
const router = Router();

router.post(
  '/',
  UseRequestDto(CreateUserDto),
  UseResponseDto(UserResponseDto),
  asyncHandler(userController.signupUser),
);

export default router