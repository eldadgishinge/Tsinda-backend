const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Category = require('../models/Category');
const Course = require('../models/Course');
const CourseEnrollment = require('../models/CourseEnrollment');

describe('Enrollments APIs', () => {
  let user, category, course, enrollment, token;

  beforeEach(async () => {
    user = await testUtils.createTestUser(User);
    category = await testUtils.createTestCategory(Category);
    course = await testUtils.createTestCourse(Course, {
      category: category._id,
      instructor: user._id
    });
    token = testUtils.generateToken(user._id);
  });

  describe('GET /api/enrollments/user', () => {
    it('should get user enrollments successfully', async () => {
      // Create an enrollment for the user
      enrollment = new CourseEnrollment({
        user: user._id,
        course: course._id,
        progress: 0,
        status: 'active'
      });
      await enrollment.save();

      const response = await request(app)
        .get('/api/enrollments/user')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return empty array for user with no enrollments', async () => {
      const response = await request(app)
        .get('/api/enrollments/user')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/enrollments/completed', () => {
    it('should get user completed courses successfully', async () => {
      // Create a completed enrollment
      enrollment = new CourseEnrollment({
        user: user._id,
        course: course._id,
        progress: 100,
        status: 'active',
        completedAt: new Date()
      });
      await enrollment.save();

      const response = await request(app)
        .get('/api/enrollments/completed')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should return empty array for user with no completed courses', async () => {
      const response = await request(app)
        .get('/api/enrollments/completed')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('POST /api/enrollments', () => {
    it('should enroll user in course successfully', async () => {
      const response = await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: course._id })
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('course', course._id);
      expect(response.body).toHaveProperty('user', user._id);
    });

    it('should return error for non-existent course', async () => {
      const fakeCourseId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: fakeCourseId })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });



    it('should return error for already enrolled course', async () => {
      // First enrollment
      await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: course._id })
        .expect(201);

      // Second enrollment attempt
      const response = await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: course._id })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/enrollments/:id', () => {


    it('should return 404 for non-existent enrollment', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/enrollments/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return error for enrollment by another user', async () => {
      const otherUser = await testUtils.createTestUser(User);
      
      enrollment = new CourseEnrollment({
        user: otherUser._id,
        course: course._id,
        progress: 0,
        status: 'active'
      });
      await enrollment.save();

      const response = await request(app)
        .get(`/api/enrollments/${enrollment._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PUT /api/enrollments/:id/progress', () => {
    it('should update enrollment progress successfully', async () => {
      enrollment = new CourseEnrollment({
        user: user._id,
        course: course._id,
        progress: 0,
        status: 'active'
      });
      await enrollment.save();

      const response = await request(app)
        .put(`/api/enrollments/${enrollment._id}/progress`)
        .set('Authorization', `Bearer ${token}`)
        .send({ progress: 50 })
        .expect(200);

      expect(response.body).toHaveProperty('progress', 50);
    });

    it('should return error when updating enrollment by another user', async () => {
      const otherUser = await testUtils.createTestUser(User);
      
      enrollment = new CourseEnrollment({
        user: otherUser._id,
        course: course._id,
        progress: 0,
        status: 'active'
      });
      await enrollment.save();

      const response = await request(app)
        .put(`/api/enrollments/${enrollment._id}/progress`)
        .set('Authorization', `Bearer ${token}`)
        .send({ progress: 50 })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent enrollment', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .put(`/api/enrollments/${fakeId}/progress`)
        .set('Authorization', `Bearer ${token}`)
        .send({ progress: 50 })
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });

    it('should return error for invalid progress value', async () => {
      enrollment = new CourseEnrollment({
        user: user._id,
        course: course._id,
        progress: 0,
        status: 'active'
      });
      await enrollment.save();

      const response = await request(app)
        .put(`/api/enrollments/${enrollment._id}/progress`)
        .set('Authorization', `Bearer ${token}`)
        .send({ progress: 150 })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/enrollments/check/:courseId', () => {
    it('should return false for not enrolled course', async () => {
      const response = await request(app)
        .get(`/api/enrollments/check/${course._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('isEnrolled', false);
    });

    it('should return true for enrolled course', async () => {
      // First enroll in the course
      await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${token}`)
        .send({ courseId: course._id })
        .expect(201);

      const response = await request(app)
        .get(`/api/enrollments/check/${course._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('isEnrolled', true);
    });


  });
}); 