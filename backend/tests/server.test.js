const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Todo API', () => {
  it('GET /todos should return empty array initially', async () => {
    const res = await request(app).get('/todos');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual([]);
  });

  it('POST /todos should create a new todo', async () => {
    const res = await request(app)
      .post('/todos')
      .send({ text: 'Test todo' });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.text).toEqual('Test todo');
    expect(res.body.completed).toBe(false);
  });
});