import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { PrismaService } from './prisma/prisma.service.js';

describe('AppController', () => {
  let appController: AppController;
  // A stand-in for the database, so this unit test needs no running Postgres.
  const prisma = { $queryRaw: vi.fn() };

  beforeEach(async () => {
    prisma.$queryRaw.mockReset();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('reports ok when the database answers', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await appController.health();

      expect(result.status).toBe('ok');
      expect(result.database).toBe('connected');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('throws 503 when the database is unreachable', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('connection refused'));

      await expect(appController.health()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
