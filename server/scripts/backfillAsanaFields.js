require('dotenv').config();
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');

const DEFAULT_WORKFLOW_STATUSES = [
  { id: 'todo', label: 'To Do', color: '#64748b', order: 0, isDone: false },
  { id: 'in-progress', label: 'In Progress', color: '#3b82f6', order: 1, isDone: false },
  { id: 'review', label: 'Review', color: '#f59e0b', order: 2, isDone: false },
  { id: 'done', label: 'Done', color: '#22c55e', order: 3, isDone: true },
];

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(process.env.MONGO_URI);

  const projectWorkflowResult = await Project.updateMany(
    {
      $or: [
        { workflowStatuses: { $exists: false } },
        { workflowStatuses: { $size: 0 } },
      ],
    },
    { $set: { workflowStatuses: DEFAULT_WORKFLOW_STATUSES } },
  );

  const projectFieldResult = await Project.updateMany(
    { customFields: { $exists: false } },
    { $set: { customFields: [] } },
  );

  const tasks = await Task.find({
    project: { $exists: true },
    $or: [
      { projectMemberships: { $exists: false } },
      { projectMemberships: { $size: 0 } },
    ],
  }).select('_id project');

  let taskCount = 0;
  for (const task of tasks) {
    task.projectMemberships = [{ project: task.project }];
    await task.save();
    taskCount += 1;
  }

  console.log(`Project workflows backfilled: ${projectWorkflowResult.modifiedCount}`);
  console.log(`Project custom field arrays backfilled: ${projectFieldResult.modifiedCount}`);
  console.log(`Tasks backfilled: ${taskCount}`);
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
