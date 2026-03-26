import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

const OTP_BYPASS_PREFIX = '9999';
const OTP_BYPASS_CODE = '123456';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private readonly config: ConfigService) {}

  private isDevBypass(phone: string): boolean {
    const environment = this.config.get<string>('ENVIRONMENT');
    return environment === 'development' && phone.replace('+91', '').startsWith(OTP_BYPASS_PREFIX);
  }

  async sendOtp(phone: string): Promise<void> {
    if (this.isDevBypass(phone)) {
      this.logger.debug(`[DEV BYPASS] OTP for ${phone} is ${OTP_BYPASS_CODE} — no SMS sent`);
      return;
    }

    const apiKey = this.config.get<string>('MSG91_API_KEY');
    const templateId = this.config.get<string>('MSG91_OTP_TEMPLATE_ID');

    await axios.post('https://control.msg91.com/api/v5/otp', {
      template_id: templateId,
      mobile: phone,
      authkey: apiKey,
    });

    this.logger.log(`OTP sent to ${phone}`);
  }

  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    if (this.isDevBypass(phone)) {
      this.logger.debug(`[DEV BYPASS] Verifying OTP for ${phone}`);
      return otp === OTP_BYPASS_CODE;
    }

    const apiKey = this.config.get<string>('MSG91_API_KEY');

    const response = await axios.get('https://control.msg91.com/api/v5/otp/verify', {
      params: {
        authkey: apiKey,
        mobile: phone,
        otp,
      },
    });

    return response.data?.type === 'success';
  }
}
