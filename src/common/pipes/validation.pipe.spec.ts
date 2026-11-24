import 'reflect-metadata';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { createValidationPipe } from './validation.pipe';

class QuotedDeviceDto {
  @IsString()
  deviceName!: string;

  @IsOptional()
  @IsInt()
  termMonths?: number;
}

class QuotedDeviceWithTypedTermDto {
  @IsString()
  deviceName!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  termMonths?: number;
}

describe('createValidationPipe', () => {
  const pipe = createValidationPipe();
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: QuotedDeviceDto,
    data: '',
  };

  it('rejects unknown properties', async () => {
    await expect(
      pipe.transform({ deviceName: 'Phone', unexpectedField: true }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a missing required field', async () => {
    await expect(pipe.transform({}, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a number sent where a string is required', async () => {
    await expect(
      pipe.transform({ deviceName: 12 }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a string sent where an integer is required', async () => {
    await expect(
      pipe.transform({ deviceName: 'Phone', termMonths: '24' }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a payload with matching types', async () => {
    const quotedDevice: unknown = await pipe.transform(
      { deviceName: 'Phone', termMonths: 24 },
      metadata,
    );

    expect(quotedDevice).toEqual({ deviceName: 'Phone', termMonths: 24 });
  });

  it('converts a value only when the DTO opts in with @Type', async () => {
    const typedMetadata: ArgumentMetadata = {
      type: 'body',
      metatype: QuotedDeviceWithTypedTermDto,
      data: '',
    };

    const quotedDevice: unknown = await pipe.transform(
      { deviceName: 'Phone', termMonths: '24' },
      typedMetadata,
    );

    expect(quotedDevice).toEqual({ deviceName: 'Phone', termMonths: 24 });
  });
});
