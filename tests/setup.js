const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

let mongoServer;

beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Disconnect any existing connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Close all mongoose connections
  await mongoose.disconnect();
  
  // Stop the MongoDB memory server
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  // Close email transporter
  try {
    const { closeTransporter } = require('../config/email-sender');
    closeTransporter();
  } catch (error) {
    // Ignore errors if email sender is not available
  }
  
  // Force cleanup of any remaining handles
  if (global.gc) {
    global.gc();
  }
  
  // Wait a bit to ensure all async operations complete
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Force exit any remaining timers
  process.removeAllListeners();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
});

// Global test utilities
global.testUtils = {
  // Helper to create a test user with unique data
  createTestUser: async (User, userData = {}) => {
    const uniqueId = uuidv4().substring(0, 8);
    const defaultUser = {
      email: `test${uniqueId}@example.com`,
      password: 'password123',
      phoneNumber: `1234567${uniqueId.substring(0, 3)}`,
      name: 'Test User',
      authMethod: 'local',
      isVerified: true,
      role: 'user',
      ...userData
    };
    
    const user = new User(defaultUser);
    await user.save();
    return user;
  },

  // Helper to create a test category
  createTestCategory: async (Category, categoryData = {}) => {
    const defaultCategory = {
      categoryName: 'Test Category',
      description: 'Test category description',
      language: 'ENG',
      ...categoryData
    };
    
    const category = new Category(defaultCategory);
    await category.save();
    return category;
  },

  // Helper to create a test question
  createTestQuestion: async (Question, questionData = {}) => {
    const defaultQuestion = {
      text: 'What is the capital of Rwanda?',
      answerOptions: [
        { text: 'Kigali', isCorrect: true },
        { text: 'Nairobi', isCorrect: false },
        { text: 'Kampala', isCorrect: false },
        { text: 'Dar es Salaam', isCorrect: false }
      ],
      difficulty: 'Easy',
      status: 'Active',
      category: questionData.category || 'test-category-id',
      createdBy: questionData.createdBy || 'test-user-id',
      rightAnswerDescription: 'Kigali is the capital of Rwanda.',
      ...questionData
    };
    
    const question = new Question(defaultQuestion);
    await question.save();
    return question;
  },

  // Helper to create a test course
  createTestCourse: async (Course, courseData = {}) => {
    const defaultCourse = {
      title: 'Test Course',
      description: 'Test course description',
      language: 'English',
      category: courseData.category || '507f1f77bcf86cd799439011',
      instructor: courseData.instructor || '507f1f77bcf86cd799439012',
      thumbnailUrl: 'https://example.com/thumbnail.jpg',
      isPublished: true,
      ...courseData
    };
    
    const course = new Course(defaultCourse);
    await course.save();
    return course;
  },

  // Helper to create a test exam
  createTestExam: async (Exam, examData = {}) => {
    const defaultExam = {
      title: 'Test Exam',
      description: 'Test exam description',
      duration: 30,
      passingScore: 70,
      language: 'English',
      category: examData.category || 'test-category-id',
      createdBy: examData.createdBy || 'test-user-id',
      questions: examData.questions || [],
      status: 'Published',
      ...examData
    };
    
    const exam = new Exam(defaultExam);
    await exam.save();
    return exam;
  },

  // Helper to generate JWT token
  generateToken: (userId) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
  }
}; 