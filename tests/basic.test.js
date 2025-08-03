const request = require('supertest');
const app = require('../app');

describe('Basic API Tests', () => {
  describe('GET /hello', () => {
    it('should return hello message', async () => {
      const response = await request(app)
        .get('/hello')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Tsinda Backend');
    });
  });

  describe('GET /api/dev/token', () => {
    it('should return development token', async () => {
      const response = await request(app)
        .get('/api/dev/token')
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('message');
    });
  });
}); 