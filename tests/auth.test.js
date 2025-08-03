const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

describe('Authentication APIs', () => {
  describe('POST /api/auth/signup', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        phoneNumber: '1234567890',
        name: 'Test User',
        authMethod: 'local'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('userId');
      expect(response.body.message).toContain('registered successfully');
    });

    it('should return error for duplicate email', async () => {
      // First user
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        phoneNumber: '1234567890',
        name: 'Test User',
        authMethod: 'local'
      };

      await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      // Second user with same email
      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('already exists');
    });

    it('should return error for invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        phoneNumber: '1234567890',
        name: 'Test User',
        authMethod: 'local'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should return error for short password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        phoneNumber: '1234567890',
        name: 'Test User',
        authMethod: 'local'
      };

      const response = await request(app)
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a verified user for login tests
      const user = new User({
        email: 'login@example.com',
        password: 'password123',
        phoneNumber: '1234567890',
        name: 'Login User',
        authMethod: 'local',
        isVerified: true
      });
      await user.save();
    });

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        phoneNumber: '1234567890',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('phoneNumber', loginData.phoneNumber);
    });

    it('should return error for invalid phone number', async () => {
      const loginData = {
        phoneNumber: '9999999999',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return error for wrong password', async () => {
      const loginData = {
        phoneNumber: '1234567890',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/auth/me', () => {
    let testUser, token;

    beforeEach(async () => {
      testUser = new User({
        email: 'me@example.com',
        password: 'password123',
        phoneNumber: '1234567890',
        name: 'Me User',
        authMethod: 'local',
        isVerified: true
      });
      await testUser.save();
      
      token = testUtils.generateToken(testUser._id);
    });

    it('should get current user successfully', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('phoneNumber', testUser.phoneNumber);
    });

    it('should return error without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/auth/all', () => {
    let testUser, token;

    beforeEach(async () => {
      testUser = new User({
        email: 'admin@example.com',
        password: 'password123',
        phoneNumber: '1234567890',
        name: 'Admin User',
        authMethod: 'local',
        isVerified: true,
        role: 'admin'
      });
      await testUser.save();
      
      token = testUtils.generateToken(testUser._id);
    });

    it('should get all users successfully', async () => {
      const response = await request(app)
        .get('/api/auth/all')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
}); 