import { User } from '@/domain/models';
import { JwtService } from './JwtService';
export class AuthService {
  constructor(private jwtService: JwtService) {}
  async signup(userData: { email: string; password: string }) {
    const userExists = await User.findOne({ email: userData.email });
    // console.log(userExists);
    if (userExists) throw new Error('400::User already exists');
    const newUser = await User.create(userData);
    return newUser;
  }
  async login(loginCredentials: { email: string; password: string }) {
    const { email, password } = loginCredentials;
    const user = await User.findOne({ email });
    if (!user) throw new Error('404::User not found');

    // const accessToken = this.jwtService.createAccessToken(user._id)
    return user;
  }
}
