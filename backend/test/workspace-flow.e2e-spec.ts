import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

describe('Workspace & Diagram API Integration Flow', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const testUser = {
    id: '12345678-1234-1234-1234-1234567890ab',
    email: 'test@example.com'
  };

  const otherUser = {
    id: '87654321-4321-4321-4321-ba0987654321',
    email: 'other@example.com'
  };

  beforeAll(async () => {
    // Override the DB URL for this e2e test to ensure we don't hit production
    process.env.DATABASE_URL =
      process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/flo_vis_test';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
      })
    );
    await app.init();

    dataSource = app.get(DataSource);
    
    // Ensure we have pgcrypto for UUIDs, then synchronize schema (drops and recreates)
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  afterEach(async () => {
    // We optionally can clean up specific records or rely on fresh DB
    // But dropping data between tests ensures isolation if we need it
  });

  let createdWorkspaceId: string;
  let createdProjectId: string;
  let createdDiagramId: string;

  it('1. Create Workspace', async () => {
    const server = app.getHttpServer() as Server;
    const res = await request(server)
      .post('/api/v1/workspaces')
      .set('x-user-id', testUser.id)
      .set('x-user-email', testUser.email)
      .send({
        name: 'Integration Workspace'
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Integration Workspace');
    expect(res.body.slug).toBeDefined();
    
    createdWorkspaceId = res.body.id;
  });

  it('2. List Workspaces', async () => {
    const server = app.getHttpServer() as Server;
    const res = await request(server)
      .get('/api/v1/workspaces')
      .set('x-user-id', testUser.id)
      .set('x-user-email', testUser.email)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((w: any) => w.id === createdWorkspaceId)).toBe(true);
  });

  it('3. Create Project', async () => {
    const server = app.getHttpServer() as Server;
    const res = await request(server)
      .post(`/api/v1/workspaces/${createdWorkspaceId}/projects`)
      .set('x-user-id', testUser.id)
      .set('x-user-email', testUser.email)
      .send({
        name: 'Integration Project',
        description: 'Testing the project flow'
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.workspaceId).toBe(createdWorkspaceId);
    expect(res.body.name).toBe('Integration Project');
    
    createdProjectId = res.body.id;
  });

  it('4. List Projects in Workspace', async () => {
    const server = app.getHttpServer() as Server;
    const res = await request(server)
      .get(`/api/v1/workspaces/${createdWorkspaceId}/projects`)
      .set('x-user-id', testUser.id)
      .set('x-user-email', testUser.email)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((p: any) => p.id === createdProjectId)).toBe(true);
  });

  it('5. Create Diagram', async () => {
    const server = app.getHttpServer() as Server;
    const res = await request(server)
      .post('/api/v1/diagrams')
      .set('x-user-id', testUser.id)
      .set('x-user-email', testUser.email)
      .send({
        workspaceId: createdWorkspaceId,
        projectId: createdProjectId,
        title: 'Integration Diagram',
        diagramType: 'sequence'
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.workspaceId).toBe(createdWorkspaceId);
    expect(res.body.projectId).toBe(createdProjectId);
    expect(res.body.title).toBe('Integration Diagram');
    
    createdDiagramId = res.body.id;
  });

  it('6. List Diagrams in Project', async () => {
    const server = app.getHttpServer() as Server;
    const res = await request(server)
      .get(`/api/v1/projects/${createdProjectId}/diagrams`)
      .set('x-user-id', testUser.id)
      .set('x-user-email', testUser.email)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((d: any) => d.id === createdDiagramId)).toBe(true);
  });

  it('7. Negative: Other user cannot list these workspaces', async () => {
    const server = app.getHttpServer() as Server;
    const res = await request(server)
      .get('/api/v1/workspaces')
      .set('x-user-id', otherUser.id)
      .set('x-user-email', otherUser.email)
      .expect(200);

    expect(res.body.some((w: any) => w.id === createdWorkspaceId)).toBe(false);
  });

  it('8. Negative: Cannot create diagram with mismatching workspace/project', async () => {
    const server = app.getHttpServer() as Server;
    // We create another workspace and try to use it with the old project
    const wRes = await request(server)
      .post('/api/v1/workspaces')
      .set('x-user-id', testUser.id)
      .set('x-user-email', testUser.email)
      .send({ name: 'Another Workspace' })
      .expect(201);
      
    await request(server)
      .post('/api/v1/diagrams')
      .set('x-user-id', testUser.id)
      .set('x-user-email', testUser.email)
      .send({
        workspaceId: wRes.body.id, // Mismatch
        projectId: createdProjectId,
        title: 'Bad Diagram',
        diagramType: 'sequence'
      })
      .expect(403);
  });
});
