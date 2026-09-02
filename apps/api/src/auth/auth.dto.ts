import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  username!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  deviceId?: string;

  @IsOptional()
  @IsIn(['browser', 'native'])
  platform?: 'browser' | 'native';
}

export class RefreshDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  refreshToken?: string;
}
