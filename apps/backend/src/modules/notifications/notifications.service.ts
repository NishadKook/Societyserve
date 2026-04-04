import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseInitialized = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    if (this.firebaseInitialized || admin.apps.length > 0) {
      this.firebaseInitialized = true;
      return;
    }

    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase credentials not configured — push notifications disabled',
      );
      return;
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
      this.firebaseInitialized = true;
      this.logger.log('Firebase Admin SDK initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error);
    }
  }

  async registerDevice(
    userId: string,
    token: string,
    platform: string,
  ): Promise<void> {
    await (this.prisma as any).deviceToken.upsert({
      where: { userId_token: { userId, token } },
      update: { platform, updatedAt: new Date() },
      create: { userId, token, platform },
    });
  }

  async removeDevice(userId: string, token: string): Promise<void> {
    await (this.prisma as any).deviceToken
      .delete({
        where: { userId_token: { userId, token } },
      })
      .catch(() => {
        // Token may already be deleted — ignore
      });
  }

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.firebaseInitialized) {
      this.logger.warn('Firebase not initialized — skipping push notification');
      return;
    }

    const deviceTokens: { token: string }[] = await (
      this.prisma as any
    ).deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (deviceTokens.length === 0) {
      return;
    }

    const tokens = deviceTokens.map((dt) => dt.token);
    await this.sendToTokens(tokens, title, body, data);
  }

  async sendToMultiple(
    userIds: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.firebaseInitialized) {
      this.logger.warn('Firebase not initialized — skipping push notification');
      return;
    }

    const deviceTokens: { token: string; userId: string }[] = await (
      this.prisma as any
    ).deviceToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true, userId: true },
    });

    if (deviceTokens.length === 0) {
      return;
    }

    const tokens = deviceTokens.map((dt) => dt.token);
    await this.sendToTokens(tokens, title, body, data);
  }

  private async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: { title, body },
      ...(data && { data }),
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);

      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];

        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            // Remove tokens that are no longer valid
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(tokens[idx]);
            } else {
              this.logger.warn(
                `FCM send failed for token index ${idx}: ${errorCode}`,
              );
            }
          }
        });

        if (invalidTokens.length > 0) {
          await this.pruneInvalidTokens(invalidTokens);
        }
      }

      this.logger.log(
        `Push sent: ${response.successCount} success, ${response.failureCount} failures`,
      );
    } catch (error) {
      this.logger.error('FCM multicast send failed', error);
    }
  }

  private async pruneInvalidTokens(tokens: string[]): Promise<void> {
    try {
      await (this.prisma as any).deviceToken.deleteMany({
        where: { token: { in: tokens } },
      });
      this.logger.log(`Pruned ${tokens.length} invalid device token(s)`);
    } catch (error) {
      this.logger.error('Failed to prune invalid tokens', error);
    }
  }
}
