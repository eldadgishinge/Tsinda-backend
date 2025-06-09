# Tsinda  Backend

## Description
Tsinda  Backend is the server-side component of the driving theory learning platform. It provides a robust API for managing users, courses, exams, and content delivery in both English and Kinyarwanda.

## Figma mockups Designs 
[Figma mockups Designs ](https://www.figma.com/design/kWFcPt7KHLj4x8RpGrmE1B/Tsindacyane-design?node-id=137-1540&t=xxx4bHJQMv6MQDoL-1)

## GitHub Repository || The Reason why I created two separate repository is to facilitate in the deploymentof the web application
[Link to Frontend Repository](https://github.com/eldadgishinge/tsinda_front_end)
[Link to Backend Repository](https://github.com/eldadgishinge/Tsinda-backend)

## Architecture Overview
The backend follows the MVC (Model-View-Controller) architecture pattern:
- Models: Mongoose schemas that define the data structure
- Controllers: Handle business logic and API responses
- Routes: Define API endpoints and connect them to controllers
- Middleware: Handle cross-cutting concerns like authentication and validation
- Services: Contain reusable business logic

## Tech Stack
### Core Technologies
- Node.js
- Express.js
- MongoDB
- Mongoose

### Authentication & Security
- JWT
- Passport.js
- bcryptjs
- express-validator
- cors

### File Handling
- Multer
- archiver
- uuid

### Development Tools
- nodemon
- dotenv
- express-session

### Testing
- Jest
- Supertest

### Deployment & DevOps
- Docker
- PM2
- Nginx

### Monitoring & Logging
- Winston
- Morgan

## Database Schema
### Entity Relationships
```
User 1:N CourseEnrollment N:1 Course
Course N:1 Category
Course 1:N Exam
Question N:1 Category
Exam N:N Question
User 1:N ExamAttempt N:1 Exam
```

### Schema Details
- User Schema: Includes auth and profile info, JWT, password hashing
- Course Schema: Educational course data structure
- Question Schema: Exam questions with options and validation
- Exam Schema: Assessment structure with categories and questions

## API Specifications

### Authentication Endpoints
- POST /api/auth/signup: Register user
- POST /api/auth/verify: Verify account
- POST /api/auth/login: Login

### Course Endpoints
- POST /api/courses: Create Course (auth required)
- GET /api/courses: List all courses
- GET /api/courses/:id: Get course details
- PUT /api/courses/:id: Update course
- DELETE /api/courses/:id: Delete course

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/your-username/tsinda-backend.git
cd tsinda-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

4. Start the development server:
```bash
npm run dev
```

## Deployment
The backend is planned to be hosted on DigitalOcean. To deploy:

1. Set up a DigitalOcean droplet
2. Configure Nginx as a reverse proxy
3. Set up PM2 for process management
4. Configure environment variables
5. Deploy using Git:
```bash
git push origin main
```

## Security Implementations
- Input validation using express-validator
- Password hashing with bcrypt
- JWT-based authentication
- CORS configuration
- Rate limiting
- XSS protection
- SQL injection prevention

## Error Handling
- Centralized error handling middleware
- Custom error classes
- Detailed error logging
- User-friendly error messages

## File Upload System
- Multer for handling file uploads
- File type validation
- Size limits
- Secure storage
- UUID-based file naming

## Performance Considerations
- Database indexing
- Query optimization
- Response caching
- Connection pooling
- Load balancing

## Development Guidelines
- Follow ES6+ standards
- Use async/await for asynchronous operations
- Implement proper error handling
- Write unit tests for new features
- Document API endpoints
- Follow Git workflow:
  - Create feature branches
  - Submit PRs for review
  - Keep commits atomic and well-documented

## Testing
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration
```

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request



## Contact
e.gishinge@alustudent.com