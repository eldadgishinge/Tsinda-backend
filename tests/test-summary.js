const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Category = require('../models/Category');
const Question = require('../models/Question');
const Course = require('../models/Course');
const Exam = require('../models/Exam');

// API Endpoints Configuration
const API_ENDPOINTS = {
  'Authentication APIs': {
    basePath: '/api/auth',
    endpoints: [
      { method: 'POST', path: '/signup', description: 'User registration', requiresAuth: false },
      { method: 'POST', path: '/login', description: 'User login', requiresAuth: false },
      { method: 'POST', path: '/verify', description: 'Account verification', requiresAuth: false },
      { method: 'POST', path: '/resend-verification', description: 'Resend verification code', requiresAuth: false },
      { method: 'GET', path: '/google', description: 'Google OAuth initiation', requiresAuth: false },
      { method: 'GET', path: '/google/callback', description: 'Google OAuth callback', requiresAuth: false },
      { method: 'GET', path: '/me', description: 'Get current user', requiresAuth: true },
      { method: 'PUT', path: '/phone', description: 'Update phone number', requiresAuth: true },
      { method: 'PUT', path: '/password', description: 'Update password', requiresAuth: true },
      { method: 'GET', path: '/all', description: 'Get all users (admin)', requiresAuth: true }
    ]
  },
  'Question APIs': {
    basePath: '/api/questions',
    endpoints: [
      { method: 'GET', path: '/', description: 'Get all questions', requiresAuth: true },
      { method: 'GET', path: '/:id', description: 'Get question by ID', requiresAuth: true },
      { method: 'GET', path: '/category/:categoryId', description: 'Get questions by category', requiresAuth: true },
      { method: 'GET', path: '/creator/me', description: 'Get questions by current creator', requiresAuth: true },
      { method: 'GET', path: '/random', description: 'Get random questions', requiresAuth: true },
      { method: 'GET', path: '/random/category/:categoryId', description: 'Get random questions by category', requiresAuth: true },
      { method: 'POST', path: '/', description: 'Create new question', requiresAuth: true },
      { method: 'PUT', path: '/:id', description: 'Update question', requiresAuth: true },
      { method: 'DELETE', path: '/:id', description: 'Delete question', requiresAuth: true }
    ]
  },
  'Category APIs': {
    basePath: '/api/categories',
    endpoints: [
      { method: 'GET', path: '/', description: 'Get all categories', requiresAuth: false },
      { method: 'GET', path: '/:id', description: 'Get category by ID', requiresAuth: false },
      { method: 'POST', path: '/', description: 'Create new category', requiresAuth: true },
      { method: 'PUT', path: '/:id', description: 'Update category', requiresAuth: true },
      { method: 'DELETE', path: '/:id', description: 'Delete category', requiresAuth: true }
    ]
  },
  'Exam APIs': {
    basePath: '/api/exams',
    endpoints: [
      { method: 'GET', path: '/', description: 'Get all exams', requiresAuth: true },
      { method: 'GET', path: '/:id', description: 'Get exam by ID', requiresAuth: true },
      { method: 'GET', path: '/category/:categoryId', description: 'Get exams by category', requiresAuth: true },
      { method: 'GET', path: '/course/:courseId', description: 'Get exams by course', requiresAuth: true },
      { method: 'GET', path: '/creator/me', description: 'Get exams by current creator', requiresAuth: true },
      { method: 'POST', path: '/', description: 'Create new exam', requiresAuth: true },
      { method: 'POST', path: '/random', description: 'Create random exam', requiresAuth: true },
      { method: 'PUT', path: '/:id', description: 'Update exam', requiresAuth: true },
      { method: 'PUT', path: '/:id/publish', description: 'Publish exam', requiresAuth: true },
      { method: 'PUT', path: '/:id/regenerate', description: 'Regenerate exam questions', requiresAuth: true },
      { method: 'DELETE', path: '/:id', description: 'Delete exam', requiresAuth: true },
      { method: 'POST', path: '/:id/questions', description: 'Add question to exam', requiresAuth: true },
      { method: 'DELETE', path: '/:id/questions', description: 'Remove question from exam', requiresAuth: true },
      { method: 'POST', path: '/:id/start', description: 'Start exam attempt', requiresAuth: true },
      { method: 'POST', path: '/:id/regenerate-questions', description: 'Regenerate questions', requiresAuth: true }
    ]
  },
  'Exam Attempt APIs': {
    basePath: '/api/exam-attempts',
    endpoints: [
      { method: 'POST', path: '/start', description: 'Start exam attempt', requiresAuth: true },
      { method: 'POST', path: '/submit-answer', description: 'Submit answer', requiresAuth: true },
      { method: 'PUT', path: '/:attemptId/complete', description: 'Complete exam attempt', requiresAuth: true },
      { method: 'GET', path: '/', description: 'Get user exam attempts', requiresAuth: true },
      { method: 'GET', path: '/completed', description: 'Get completed exams', requiresAuth: true },
      { method: 'GET', path: '/passed', description: 'Get passed exams', requiresAuth: true },
      { method: 'GET', path: '/:id', description: 'Get exam attempt by ID', requiresAuth: true },
      { method: 'GET', path: '/user/me', description: 'Get user attempts', requiresAuth: true },
      { method: 'GET', path: '/exam/:examId', description: 'Get exam attempts', requiresAuth: true }
    ]
  },
  'Course APIs': {
    basePath: '/api/courses',
    endpoints: [
      { method: 'GET', path: '/', description: 'Get all courses', requiresAuth: false },
      { method: 'GET', path: '/:id', description: 'Get course by ID', requiresAuth: false },
      { method: 'GET', path: '/category/:categoryId', description: 'Get courses by category', requiresAuth: false },
      { method: 'GET', path: '/instructor/me', description: 'Get instructor courses', requiresAuth: true },
      { method: 'POST', path: '/', description: 'Create new course', requiresAuth: true },
      { method: 'PUT', path: '/:id', description: 'Update course', requiresAuth: true },
      { method: 'DELETE', path: '/:id', description: 'Delete course', requiresAuth: true }
    ]
  },
  'Enrollment APIs': {
    basePath: '/api/enrollments',
    endpoints: [
      { method: 'GET', path: '/', description: 'Get all enrollments', requiresAuth: true },
      { method: 'GET', path: '/user', description: 'Get user enrollments', requiresAuth: true },
      { method: 'GET', path: '/completed', description: 'Get completed courses', requiresAuth: true },
      { method: 'GET', path: '/:id', description: 'Get enrollment by ID', requiresAuth: true },
      { method: 'POST', path: '/', description: 'Enroll in course', requiresAuth: true },
      { method: 'PUT', path: '/:id/progress', description: 'Update progress', requiresAuth: true },
      { method: 'PUT', path: '/:enrollmentId/recalculate-progress', description: 'Recalculate progress', requiresAuth: true },
      { method: 'GET', path: '/check/:courseId', description: 'Check enrollment status', requiresAuth: true }
    ]
  },
  'Upload APIs': {
    basePath: '/api/upload',
    endpoints: [
      { method: 'POST', path: '/video', description: 'Upload video', requiresAuth: true },
      { method: 'POST', path: '/document', description: 'Upload document', requiresAuth: true },
      { method: 'POST', path: '/question-image', description: 'Upload question image', requiresAuth: true }
    ]
  },
  'Development APIs': {
    basePath: '',
    endpoints: [
      { method: 'GET', path: '/hello', description: 'Health check', requiresAuth: false },
      { method: 'GET', path: '/api/dev/token', description: 'Generate dev token', requiresAuth: false }
    ]
  }
};

// Test status tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  endpoints: []
};

// Test data
let testUser, testCategory, testQuestion, testCourse, testExam, authToken;

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Helper function to generate JWT token
function generateToken(userId) {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
}

// Setup test data
async function setupTestData() {
  try {
    // Create test user
    testUser = new User({
      email: 'test@example.com',
      password: 'password123',
      phoneNumber: '1234567890',
      name: 'Test User',
      authMethod: 'local',
      isVerified: true
    });
    await testUser.save();
    
    // Create test category
    testCategory = new Category({
      categoryName: 'Test Category',
      description: 'Test category description',
      language: 'ENG'
    });
    await testCategory.save();
    
    // Create test question
    testQuestion = new Question({
      text: 'What is the capital of Rwanda?',
      answerOptions: [
        { text: 'Kigali', isCorrect: true },
        { text: 'Nairobi', isCorrect: false },
        { text: 'Kampala', isCorrect: false },
        { text: 'Dar es Salaam', isCorrect: false }
      ],
      difficulty: 'Easy',
      status: 'Active',
      category: testCategory._id,
      createdBy: testUser._id,
      rightAnswerDescription: 'Kigali is the capital of Rwanda.'
    });
    await testQuestion.save();
    
    // Create test course
    testCourse = new Course({
      title: 'Test Course',
      description: 'Test course description',
      category: testCategory._id,
      createdBy: testUser._id,
      status: 'Published'
    });
    await testCourse.save();
    
    // Create test exam
    testExam = new Exam({
      title: 'Test Exam',
      description: 'Test exam description',
      duration: 30,
      passingScore: 70,
      category: testCategory._id,
      questions: [testQuestion._id],
      createdBy: testUser._id,
      status: 'Published'
    });
    await testExam.save();
    
    // Generate auth token
    authToken = generateToken(testUser._id);
    
    console.log(`${colors.green}✅ Test data setup completed${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}❌ Test data setup failed: ${error.message}${colors.reset}`);
  }
}

// Helper function to test endpoint availability
async function testEndpoint(method, path, description, requiresAuth = false) {
  try {
    let requestBuilder = request(app)[method.toLowerCase()](path);
    
    if (requiresAuth && authToken) {
      requestBuilder = requestBuilder.set('Authorization', `Bearer ${authToken}`);
    }
    
    const response = await requestBuilder;
    const status = response.status;
    
    // Consider 200-299 and 302 (redirects) as success
    const isSuccess = (status >= 200 && status < 300) || status === 302;
    
    testResults.total++;
    if (isSuccess) {
      testResults.passed++;
    } else {
      testResults.failed++;
    }
    
    testResults.endpoints.push({
      method,
      path,
      description,
      status,
      success: isSuccess,
      requiresAuth
    });
    
    return isSuccess;
  } catch (error) {
    testResults.total++;
    testResults.failed++;
    testResults.endpoints.push({
      method,
      path,
      description,
      status: 'ERROR',
      success: false,
      requiresAuth
    });
    return false;
  }
}

// Function to print table header
function printTableHeader() {
  console.log('\n' + '='.repeat(120));
  console.log(`${colors.bright}${colors.cyan}🎯 TSINDA BACKEND API TEST SUMMARY${colors.reset}`);
  console.log('='.repeat(120));
  console.log(`${colors.bright}${colors.yellow}📊 Comprehensive API Endpoint Testing Report${colors.reset}`);
  console.log('='.repeat(120));
}

// Function to print API group header
function printGroupHeader(groupName, endpointCount) {
  console.log(`\n${colors.bright}${colors.magenta}📁 ${groupName} (${endpointCount} endpoints)${colors.reset}`);
  console.log('-'.repeat(100));
  console.log(`${colors.bright}Method${colors.reset}  ${colors.bright}Path${colors.reset}${' '.repeat(50)}${colors.bright}Status${colors.reset}  ${colors.bright}Auth${colors.reset}  ${colors.bright}Description${colors.reset}`);
  console.log('-'.repeat(100));
}

// Function to print endpoint result
function printEndpointResult(endpoint) {
  const method = endpoint.method.padEnd(6);
  const path = endpoint.path.padEnd(50);
  const status = endpoint.success ? 
    `${colors.green}✅ PASS${colors.reset}` : 
    `${colors.red}❌ FAIL${colors.reset}`;
  const statusCode = endpoint.status !== 'ERROR' ? `(${endpoint.status})` : '(ERROR)';
  const auth = endpoint.requiresAuth ? `${colors.yellow}🔒${colors.reset}` : `${colors.green}🔓${colors.reset}`;
  const description = endpoint.description;
  
  console.log(`${method} ${path} ${status} ${statusCode}  ${auth}  ${description}`);
}

// Function to print summary
function printSummary() {
  console.log('\n' + '='.repeat(120));
  console.log(`${colors.bright}${colors.cyan}📈 TEST SUMMARY${colors.reset}`);
  console.log('='.repeat(120));
  
  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  const statusColor = passRate >= 90 ? colors.green : passRate >= 70 ? colors.yellow : colors.red;
  
  console.log(`${colors.bright}Total Endpoints Tested:${colors.reset} ${testResults.total}`);
  console.log(`${colors.bright}Passed:${colors.reset} ${colors.green}${testResults.passed}${colors.reset}`);
  console.log(`${colors.bright}Failed:${colors.reset} ${colors.red}${testResults.failed}${colors.reset}`);
  console.log(`${colors.bright}Success Rate:${colors.reset} ${statusColor}${passRate}%${colors.reset}`);
  
  const authEndpoints = testResults.endpoints.filter(e => e.requiresAuth);
  const publicEndpoints = testResults.endpoints.filter(e => !e.requiresAuth);
  
  console.log(`\n${colors.bright}Authentication Breakdown:${colors.reset}`);
  console.log(`  ${colors.yellow}🔒 Protected Endpoints:${colors.reset} ${authEndpoints.length}`);
  console.log(`  ${colors.green}🔓 Public Endpoints:${colors.reset} ${publicEndpoints.length}`);
  
  if (testResults.failed > 0) {
    console.log(`\n${colors.bright}${colors.red}❌ FAILED ENDPOINTS:${colors.reset}`);
    testResults.endpoints
      .filter(e => !e.success)
      .forEach(endpoint => {
        const authStatus = endpoint.requiresAuth ? '🔒' : '🔓';
        console.log(`  ${endpoint.method} ${endpoint.path} ${authStatus} - ${endpoint.description}`);
      });
  }
  
  console.log('\n' + '='.repeat(120));
  console.log(`${colors.bright}${colors.green}🎉 All API endpoints have been tested!${colors.reset}`);
  console.log('='.repeat(120) + '\n');
}

// Main test runner
async function runApiTests() {
  printTableHeader();
  
  // Setup test data
  await setupTestData();
  
  for (const [groupName, group] of Object.entries(API_ENDPOINTS)) {
    printGroupHeader(groupName, group.endpoints.length);
    
    for (const endpoint of group.endpoints) {
      const fullPath = group.basePath + endpoint.path;
      await testEndpoint(endpoint.method, fullPath, endpoint.description, endpoint.requiresAuth);
      printEndpointResult(testResults.endpoints[testResults.endpoints.length - 1]);
    }
  }
  
  printSummary();
}

// Run the tests
if (require.main === module) {
  runApiTests().catch(console.error);
}

module.exports = { runApiTests, API_ENDPOINTS, testResults }; 