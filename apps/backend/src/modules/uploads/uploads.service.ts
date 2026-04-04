import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UploadFolder } from './dto/signed-url.dto';

const BUCKET = 'uploads';

@Injectable()
export class UploadsService implements OnModuleInit {
  private supabase!: SupabaseClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.supabase = createClient(
      this.config.get<string>('SUPABASE_URL')!,
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }

  async generateUploadUrl(
    userId: string,
    folder: UploadFolder,
    fileName: string,
  ): Promise<{ signedUrl: string; publicUrl: string; filePath: string }> {
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${folder}/${userId}/${timestamp}-${sanitizedName}`;

    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      throw new Error(`Failed to generate upload URL: ${error?.message}`);
    }

    const publicUrl = this.getPublicUrl(filePath);

    return {
      signedUrl: data.signedUrl,
      publicUrl,
      filePath,
    };
  }

  getPublicUrl(filePath: string): string {
    const { data } = this.supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async deleteFile(filePath: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(BUCKET)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
}
