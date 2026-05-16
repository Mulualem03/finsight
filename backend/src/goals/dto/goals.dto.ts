import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsISO8601, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateGoalDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ description: 'Target amount in pence (minor units)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetAmount!: number;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() deadline?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() linkedAccountId?: string;
}

export class UpdateGoalDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) targetAmount?: number;
  @IsOptional() @IsISO8601() deadline?: string;
  @IsOptional() @IsString() linkedAccountId?: string;
}

export class CreateContributionDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) amount!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}
