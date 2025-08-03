const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Category = require('../models/Category');
const Question = require('../models/Question');
const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');

describe('Exams APIs', () => {
  let user, category, question, exam, token;

  beforeEach(async () => {
    user = await testUtils.createTestUser(User);
    category = await testUtils.createTestCategory(Category);
    question = await testUtils.createTestQuestion(Question, {
      category: category._id,
      createdBy: user._id
    });
    token = testUtils.generateToken(user._id);
  });

  describe('GET /api/exams', () => {
    it('should get all exams successfully', async () => {
      const response = await request(app)
        .get('/api/exams')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return error without token', async () => {
      const response = await request(app)
        .get('/api/exams')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/exams/:id', () => {
    it('should get exam by ID successfully', async () => {
      exam = await testUtils.createTestExam(Exam, {
        category: category._id,
        createdBy: user._id,
        questions: [question._id]
      });

      const response = await request(app)
        .get(`/api/exams/${exam._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id', exam._id);
      expect(response.body).toHaveProperty('title');
    });

    it('should return 404 for non-existent exam', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/exams/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/exams/category/:categoryId', () => {
    beforeEach(async () => {
      // Create exams for the category
      for (let i = 0; i < 3; i++) {
        await testUtils.createTestExam(Exam, {
          title: `Exam ${i + 1}`,
          description: `Exam ${i + 1} description`,
          category: category._id,
          createdBy: user._id,
          questions: [question._id]
        });
      }
    });

    it('should get exams by category successfully', async () => {
      const response = await request(app)
        .get(`/api/exams/category/${category._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return empty array for category with no exams', async () => {
      const newCategory = await testUtils.createTestCategory(Category, {
        categoryName: 'Empty Category'
      });

      const response = await request(app)
        .get(`/api/exams/category/${newCategory._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/exams/creator/me', () => {
    beforeEach(async () => {
      // Create exams by the current user
      for (let i = 0; i < 3; i++) {
        await testUtils.createTestExam(Exam, {
          title: `My Exam ${i + 1}`,
          description: `My exam ${i + 1} description`,
          category: category._id,
          createdBy: user._id,
          questions: [question._id]
        });
      }
    });

    it('should get exams by creator successfully', async () => {
      const response = await request(app)
        .get('/api/exams/creator/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return empty array for creator with no exams', async () => {
      const newUser = await testUtils.createTestUser(User);
      const newToken = testUtils.generateToken(newUser._id);

      const response = await request(app)
        .get('/api/exams/creator/me')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('POST /api/exams', () => {
    it('should create a new exam successfully', async () => {
      const examData = {
        title: 'Test Exam',
        description: 'Test exam description',
        duration: 30,
        passingScore: 70,
        language: 'English',
        category: category._id,
        questions: [question._id]
      };

      const response = await request(app)
        .post('/api/exams')
        .set('Authorization', `Bearer ${token}`)
        .send(examData)
        .expect(201);

      expect(response.body).toHaveProperty('title', examData.title);
      expect(response.body).toHaveProperty('description', examData.description);
    });

    it('should return error for invalid exam data', async () => {
      const invalidExamData = {
        title: 'Test Exam',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/exams')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidExamData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('PUT /api/exams/:id', () => {
    it('should update exam successfully', async () => {
      exam = await testUtils.createTestExam(Exam, {
        category: category._id,
        createdBy: user._id,
        questions: [question._id]
      });

      const updateData = {
        title: 'Updated Exam Title',
        description: 'Updated exam description'
      };

      const response = await request(app)
        .put(`/api/exams/${exam._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('title', updateData.title);
      expect(response.body).toHaveProperty('description', updateData.description);
    });

    it('should return error when updating exam created by another user', async () => {
      const otherUser = await testUtils.createTestUser(User);
      
      exam = await testUtils.createTestExam(Exam, {
        category: category._id,
        createdBy: otherUser._id,
        questions: [question._id]
      });

      const updateData = {
        title: 'Updated Exam Title'
      };

      const response = await request(app)
        .put(`/api/exams/${exam._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent exam', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .put(`/api/exams/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Title' })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PUT /api/exams/:id/publish', () => {
    it('should publish exam successfully', async () => {
      exam = await testUtils.createTestExam(Exam, {
        category: category._id,
        createdBy: user._id,
        questions: [question._id],
        status: 'Draft'
      });

      const response = await request(app)
        .put(`/api/exams/${exam._id}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'Published');
    });

    it('should return error for non-existent exam', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .put(`/api/exams/${fakeId}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PUT /api/exams/:id/regenerate', () => {
    it('should regenerate exam questions successfully', async () => {
      exam = await testUtils.createTestExam(Exam, {
        category: category._id,
        createdBy: user._id,
        questions: [question._id]
      });

      const response = await request(app)
        .put(`/api/exams/${exam._id}/regenerate`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('exam');
    });

    it('should return error for non-existent exam', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .put(`/api/exams/${fakeId}/regenerate`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/exams/:id', () => {
    it('should delete exam successfully', async () => {
      exam = await testUtils.createTestExam(Exam, {
        category: category._id,
        createdBy: user._id,
        questions: [question._id]
      });

      const response = await request(app)
        .delete(`/api/exams/${exam._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should return error when deleting exam created by another user', async () => {
      const otherUser = await testUtils.createTestUser(User);
      
      exam = await testUtils.createTestExam(Exam, {
        category: category._id,
        createdBy: otherUser._id,
        questions: [question._id]
      });

      const response = await request(app)
        .delete(`/api/exams/${exam._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent exam', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .delete(`/api/exams/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/exams/:id/questions', () => {
    it('should add question to exam successfully', async () => {
      exam = await testUtils.createTestExam(Exam, {
        category: category._id,
        createdBy: user._id,
        questions: []
      });

      const newQuestion = await testUtils.createTestQuestion(Question, {
        category: category._id,
        createdBy: user._id
      });

      const response = await request(app)
        .post(`/api/exams/${exam._id}/questions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId: newQuestion._id })
        .expect(200);

      expect(response.body).toHaveProperty('questions');
    });

    it('should return error for non-existent exam', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const newQuestion = await testUtils.createTestQuestion(Question, {
        category: category._id,
        createdBy: user._id
      });

      const response = await request(app)
        .post(`/api/exams/${fakeId}/questions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId: newQuestion._id })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/exams/:id/questions', () => {
    it('should remove question from exam successfully', async () => {
      exam = await testUtils.createTestExam(Exam, {
        category: category._id,
        createdBy: user._id,
        questions: [question._id]
      });

      const response = await request(app)
        .delete(`/api/exams/${exam._id}/questions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId: question._id })
        .expect(200);

      expect(response.body).toHaveProperty('questions');
    });

    it('should return error for non-existent exam', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .delete(`/api/exams/${fakeId}/questions`)
        .set('Authorization', `Bearer ${token}`)
        .send({ questionId: question._id })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });
}); 