const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Category = require('../models/Category');
const Question = require('../models/Question');
const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');

describe('Exam Attempts APIs', () => {
  let user, category, question, exam, token;

  beforeEach(async () => {
    user = await testUtils.createTestUser(User);
    category = await testUtils.createTestCategory(Category);
    question = await testUtils.createTestQuestion(Question, {
      category: category._id,
      createdBy: user._id
    });
    exam = await testUtils.createTestExam(Exam, {
      category: category._id,
      createdBy: user._id,
      questions: [question._id],
      status: 'Published'
    });
    token = testUtils.generateToken(user._id);
  });

  describe('POST /api/exam-attempts/start', () => {
    it('should start exam attempt successfully', async () => {
      const response = await request(app)
        .post('/api/exam-attempts/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ examId: exam._id })
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('exam');
      expect(response.body).toHaveProperty('user');
    });

    it('should return error for non-existent exam', async () => {
      const fakeExamId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .post('/api/exam-attempts/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ examId: fakeExamId })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return error for draft exam', async () => {
      const draftExam = await testUtils.createTestExam(Exam, {
        category: category._id,
        createdBy: user._id,
        questions: [question._id],
        status: 'Draft'
      });

      const response = await request(app)
        .post('/api/exam-attempts/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ examId: draftExam._id })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/exam-attempts/submit-answer', () => {
    let attempt;

    beforeEach(async () => {
      // Create an exam attempt
      attempt = new ExamAttempt({
        exam: exam._id,
        user: user._id,
        status: 'in-progress',
        startTime: new Date(),
        answers: []
      });
      await attempt.save();
    });

    it('should submit answer successfully', async () => {
      const answerData = {
        attemptId: attempt._id,
        questionId: question._id,
        selectedOption: 0
      };

      const response = await request(app)
        .post('/api/exam-attempts/submit-answer')
        .set('Authorization', `Bearer ${token}`)
        .send(answerData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should return error for invalid attempt', async () => {
      const fakeAttemptId = '507f1f77bcf86cd799439011';

      const answerData = {
        attemptId: fakeAttemptId,
        questionId: question._id,
        selectedOption: 0
      };

      const response = await request(app)
        .post('/api/exam-attempts/submit-answer')
        .set('Authorization', `Bearer ${token}`)
        .send(answerData)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return error for invalid question', async () => {
      const fakeQuestionId = '507f1f77bcf86cd799439011';

      const answerData = {
        attemptId: attempt._id,
        questionId: fakeQuestionId,
        selectedOption: 0
      };

      const response = await request(app)
        .post('/api/exam-attempts/submit-answer')
        .set('Authorization', `Bearer ${token}`)
        .send(answerData)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return error for invalid option', async () => {
      const answerData = {
        attemptId: attempt._id,
        questionId: question._id,
        selectedOption: 10 // Invalid option
      };

      const response = await request(app)
        .post('/api/exam-attempts/submit-answer')
        .set('Authorization', `Bearer ${token}`)
        .send(answerData)
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('PUT /api/exam-attempts/:attemptId/complete', () => {
    let attempt;

    beforeEach(async () => {
      // Create an exam attempt
      attempt = new ExamAttempt({
        exam: exam._id,
        user: user._id,
        status: 'in-progress',
        startTime: new Date(),
        answers: []
      });
      await attempt.save();
    });

    it('should complete exam attempt successfully', async () => {
      const response = await request(app)
        .put(`/api/exam-attempts/${attempt._id}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should return error for non-existent attempt', async () => {
      const fakeAttemptId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .put(`/api/exam-attempts/${fakeAttemptId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });


  });

  describe('GET /api/exam-attempts', () => {
    it('should get user exam attempts successfully', async () => {
      // Create an exam attempt
      const attempt = new ExamAttempt({
        exam: exam._id,
        user: user._id,
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        answers: []
      });
      await attempt.save();

      const response = await request(app)
        .get('/api/exam-attempts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return empty array for user with no attempts', async () => {
      const response = await request(app)
        .get('/api/exam-attempts')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/exam-attempts/completed', () => {
    it('should get user completed exams successfully', async () => {
      // Create a completed exam attempt
      const attempt = new ExamAttempt({
        exam: exam._id,
        user: user._id,
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        answers: []
      });
      await attempt.save();

      const response = await request(app)
        .get('/api/exam-attempts/completed')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return empty array for user with no completed attempts', async () => {
      const response = await request(app)
        .get('/api/exam-attempts/completed')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/exam-attempts/passed', () => {


    it('should return empty array for user with no passed attempts', async () => {
      const response = await request(app)
        .get('/api/exam-attempts/passed')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/exam-attempts/:id', () => {
    it('should get exam attempt successfully', async () => {
      const attempt = new ExamAttempt({
        exam: exam._id,
        user: user._id,
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        answers: []
      });
      await attempt.save();

      const response = await request(app)
        .get(`/api/exam-attempts/${attempt._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id', attempt._id);
    });

    it('should return 404 for non-existent attempt', async () => {
      const fakeAttemptId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/exam-attempts/${fakeAttemptId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return error for attempt by another user', async () => {
      const otherUser = await testUtils.createTestUser(User);
      
      const attempt = new ExamAttempt({
        exam: exam._id,
        user: otherUser._id,
        status: 'completed',
        startTime: new Date(),
        endTime: new Date(),
        answers: []
      });
      await attempt.save();

      const response = await request(app)
        .get(`/api/exam-attempts/${attempt._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });
}); 