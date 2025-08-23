import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import request from 'supertest';

export class TestHelper {
  private app: INestApplication;
  private server: any;

  async setupTestApp(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    await this.app.init();
    this.server = this.app.getHttpServer();
    
    return this.app;
  }

  async teardownTestApp(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }

  async graphqlRequest(query: string, variables?: any): Promise<any> {
    const response = await request(this.server)
      .post('/graphql')
      .send({
        query,
        variables,
      });

    // GraphQL can return 200 even with errors, or 400 for malformed queries
    if (response.status !== 200 && response.status !== 400) {
      throw new Error(`HTTP ${response.status}: ${response.text}`);
    }

    if (response.body.errors) {
      throw new Error(
        `GraphQL errors: ${JSON.stringify(response.body.errors, null, 2)}`
      );
    }

    return response.body.data;
  }

  async graphqlMutation(mutation: string, variables?: any): Promise<any> {
    return this.graphqlRequest(mutation, variables);
  }

  async graphqlQuery(query: string, variables?: any): Promise<any> {
    return this.graphqlRequest(query, variables);
  }

  getServer(): any {
    return this.server;
  }

  getApp(): INestApplication {
    return this.app;
  }
}

export async function waitFor(
  condition: () => Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}