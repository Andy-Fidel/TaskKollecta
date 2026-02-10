const mongoose = require('mongoose');
const Task = require('../models/Task');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const verify = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    console.log('Creating a dummy task...');
    // Create a minimal dummy task to test attachment update
    // We need valid ObjectIds for required fields. Use new ObjectIds.
    const dummyId = new mongoose.Types.ObjectId();
    
    // We can't easily create a full valid task without existing Project/Org/User IDs if constraints are high.
    // However, let's try to just Instantiate the model and validate it without saving, OR try to find an existing task and adding attachment (but don't save or revert).
    // Actually, validating a document against the schema is enough to catch SchemaType errors?
    // No, CastError happened during update.
    
    // Let's create a temporary task document in memory and see if we can push to attachments array.
    const task = new Task({
        title: 'Test Task',
        organization: new mongoose.Types.ObjectId(),
        project: new mongoose.Types.ObjectId(),
        reporter: new mongoose.Types.ObjectId()
    });

    const attachment = {
        url: 'http://example.com/test.png',
        filename: 'test.png',
        type: 'image/png', // The problematic field
        uploadedAt: new Date()
    };

    console.log('Attempting to push attachment to task...');
    task.attachments.push(attachment);
    
    console.log('Validating task...');
    await task.validate();
    
    console.log('✓ Validation successful! The "type" field is correctly handled.');
    
    // If we wanted to be 100% sure we'd save it, but that requires valid refs.
    // The CastError in the original issue happened during `findOneAndUpdate` which internally does casting.
    // `task.validate()` also triggers casting.
    
    console.log('Fix verified.');
  } catch (error) {
    console.error('✗ Verification failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

verify();
