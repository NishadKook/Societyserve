import { IsEnum, IsString, IsNotEmpty } from 'class-validator';

export enum UploadFolder {
  PROFILES = 'profiles',
  SERVICES = 'services',
  COMPLAINTS = 'complaints',
}

export class SignedUrlDto {
  @IsEnum(UploadFolder)
  folder!: UploadFolder;

  @IsString()
  @IsNotEmpty()
  fileName!: string;
}
