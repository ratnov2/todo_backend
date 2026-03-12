import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/users/users.service';
import bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private jwtService: JwtService,
    private db: PrismaService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return null;
    return user;
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.issueTokens(user.id, user.email);
    return {
      user: { id: user.id, email: user.email, name: user.name },
      tokens,
    };
  }

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.findByEmail(registerDto.email);
    if (user) throw new ConflictException('Email already in use');
    const hashed = await bcrypt.hash(registerDto.password, 10);

    return this.db.user.create({
      data: {
        email: registerDto.email,
        password: hashed,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async issueTokens(userId: number, email: string) {
    const accessToken = await this.jwtService.signAsync(
      { id: userId },
      {
        expiresIn: process.env.JWT_ACCESS_EXPIRES as undefined,
        secret: process.env.JWT_ACCESS_SECRET,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      { id: userId },
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRES as undefined,
        secret: process.env.JWT_REFRESH_SECRET,
      },
    );

    return { accessToken, refreshToken };
  }

  // refresh flow: verify refresh token signature and issue new pair
  async refresh(userId: number) {
    try {
      const user = await this.db.user.findUnique({ where: { id: userId } });
      if (!user) throw new UnauthorizedException();

      // optionally check user still active, role, etc.
      return this.issueTokens(user.id, user.email);
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout() {
    // stateless: nothing to delete server-side; client must clear cookies
    return;
  }
}
