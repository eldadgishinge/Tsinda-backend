const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Category = require('../models/Category');
const Question = require('../models/Question');

describe('Questions APIs', () => {
  let user, category, token;

  beforeEach(async () => {
    // Create unique test data
    user = await testUtils.createTestUser(User);
    category = await testUtils.createTestCategory(Category);
    token = testUtils.generateToken(user._id);
  });

  describe('GET /api/questions', () => {
    it('should get all questions successfully', async () => {
      // Create a test question
      await testUtils.createTestQuestion(Question, {
        category: category._id,
        createdBy: user._id
      });

      const response = await request(app)
        .get('/api/questions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return empty array when no questions exist', async () => {
      const response = await request(app)
        .get('/api/questions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/questions/:id', () => {
    it('should get question by ID successfully', async () => {
      const question = await testUtils.createTestQuestion(Question, {
        category: category._id,
        createdBy: user._id
      });

      const response = await request(app)
        .get(`/api/questions/${question._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id', question._id);
      expect(response.body).toHaveProperty('text');
    });

    it('should return 404 for non-existent question', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/questions/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/questions/category/:categoryId', () => {
    it('should get questions by category successfully', async () => {
      // Create questions in the category
      await testUtils.createTestQuestion(Question, {
        category: category._id,
        createdBy: user._id
      });

      const response = await request(app)
        .get(`/api/questions/category/${category._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return empty array for category with no questions', async () => {
      const response = await request(app)
        .get(`/api/questions/category/${category._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/questions/creator/me', () => {
    it('should get questions by current creator successfully', async () => {
      // Create a question by the current user
      await testUtils.createTestQuestion(Question, {
        category: category._id,
        createdBy: user._id
      });

      const response = await request(app)
        .get('/api/questions/creator/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return empty array for creator with no questions', async () => {
      const response = await request(app)
        .get('/api/questions/creator/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('POST /api/questions', () => {
    it('should create a new question successfully', async () => {
      const questionData = {
        text: 'What is the capital of Rwanda?',
        answerOptions: [
          { text: 'Kigali', isCorrect: true },
          { text: 'Nairobi', isCorrect: false },
          { text: 'Kampala', isCorrect: false },
          { text: 'Dar es Salaam', isCorrect: false }
        ],
        difficulty: 'Easy',
        status: 'Active',
        category: category._id,
        rightAnswerDescription: 'Kigali is the capital of Rwanda.'
      };

      const response = await request(app)
        .post('/api/questions')
        .set('Authorization', `Bearer ${token}`)
        .send(questionData)
        .expect(201);

      expect(response.body).toHaveProperty('text', questionData.text);
      expect(response.body).toHaveProperty('difficulty', questionData.difficulty);
    });

    it('should return error for question with wrong number of options', async () => {
      const questionData = {
        text: 'What is the capital of Rwanda?',
        answerOptions: [
          { text: 'Kigali', isCorrect: true },
          { text: 'Nairobi', isCorrect: false },
          { text: 'Kampala', isCorrect: false }
        ],
        difficulty: 'Easy',
        status: 'Active',
        category: category._id
      };

      const response = await request(app)
        .post('/api/questions')
        .set('Authorization', `Bearer ${token}`)
        .send(questionData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    it('should return error for question with multiple correct answers', async () => {
      const questionData = {
        text: 'What is the capital of Rwanda?',
        answerOptions: [
          { text: 'Kigali', isCorrect: true },
          { text: 'Nairobi', isCorrect: true },
          { text: 'Kampala', isCorrect: false },
          { text: 'Dar es Salaam', isCorrect: false }
        ],
        difficulty: 'Easy',
        status: 'Active',
        category: category._id
      };

      const response = await request(app)
        .post('/api/questions')
        .set('Authorization', `Bearer ${token}`)
        .send(questionData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PUT /api/questions/:id', () => {
    it('should update question successfully', async () => {
      const question = await testUtils.createTestQuestion(Question, {
        category: category._id,
        createdBy: user._id
      });

      const updateData = {
        text: 'Updated question text',
        difficulty: 'Medium',
        rightAnswerDescription: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/questions/${question._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('text', updateData.text);
      expect(response.body).toHaveProperty('difficulty', updateData.difficulty);
      expect(response.body).toHaveProperty('rightAnswerDescription', updateData.rightAnswerDescription);
    });

    it('should return error when updating question created by another user', async () => {
      const otherUser = await testUtils.createTestUser(User);
      
      const question = await testUtils.createTestQuestion(Question, {
        category: category._id,
        createdBy: otherUser._id
      });

      const updateData = {
        text: 'Updated question text'
      };

      const response = await request(app)
        .put(`/api/questions/${question._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent question', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .put(`/api/questions/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Updated text' })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/questions/:id', () => {
    it('should delete question successfully', async () => {
      const question = await testUtils.createTestQuestion(Question, {
        category: category._id,
        createdBy: user._id
      });

      const response = await request(app)
        .delete(`/api/questions/${question._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should return error when deleting question created by another user', async () => {
      const otherUser = await testUtils.createTestUser(User);
      
      const question = await testUtils.createTestQuestion(Question, {
        category: category._id,
        createdBy: otherUser._id
      });

      const response = await request(app)
        .delete(`/api/questions/${question._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent question', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .delete(`/api/questions/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });
}); 