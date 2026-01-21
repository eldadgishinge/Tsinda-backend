const mongoose = require('mongoose');

beforeAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    if (mongoose.connection.readyState === 0) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tsinda-test';
      await mongoose.connect(mongoUri);
    }
  }
});

afterAll(async () => {
  if (process.env.NODE_ENV === 'test') {
    await mongoose.disconnect();
  }
});
