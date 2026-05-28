import { JWT_SECRET } from '@/config';
import jwt from 'jsonwebtoken';

export class JwtService {
  private secret: string;

  constructor() {
    this.secret = JWT_SECRET;
  }

  createAccessToken(userId: number) {
    const token = jwt.sign({ userId }, this.secret, {
      expiresIn: '1h',
    });
    return token;
  }

  createRefreshToken(userId: number) {
    const token = jwt.sign({ userId }, this.secret, {
      expiresIn: '1y',
    });
    return token;
  }

  exchangeRefreshTokenForAccess(refreshToken: string) {
    const decoded = jwt.verify(refreshToken, this.secret) as {
      userId: number;
    };
    return this.createAccessToken(decoded.userId);
  }

  decodeToken(token: string) {
    const decoded = jwt.verify(token, this.secret) as {
      userId: number;
    };
    return decoded;
  }
}
