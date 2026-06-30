import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import helmet from 'helmet';
import request from 'supertest';

let app: INestApplication;
let prisma: PrismaService;

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  app.use(helmet());
  app.setGlobalPrefix('api', { exclude: ['health'] });
  await app.init();

  prisma = app.get(PrismaService);
  return app;
}

export function getApp() {
  return app;
}

export function getPrisma() {
  return prisma;
}

export async function closeTestApp() {
  if (app) {
    await app.close();
  }
}

/** Helper: login and return the access token */
export async function loginAs(
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  return res.body;
}
