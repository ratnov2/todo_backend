import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(4, { message: 'Пароль должен быть минимум 4 символов' })
  @Matches(/(?=.*\d)/, {
    message: 'Пароль должен содержать хотя бы одну цифру',
  })
  password: string;
}
