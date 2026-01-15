const Automation = require('../models/Automation');
const Task = require('../models/Task');
const Project = require('../models/Project');

const runAutomations = async (projectId, triggerType, triggerValue, originalTask) => {
  try {
    console.log(`Checking Automations for Project: ${projectId} | Trigger: ${triggerType} = ${triggerValue}`);

    // Find matching rules
    const rules = await Automation.find({
      project: projectId,
      triggerType,
      triggerValue,
      isActive: true
    });

    if (rules.length === 0) {
        console.log("No matching rules found.");
        return;
    }

    // Re-fetch task to ensure we have a clean Mongoose document to edit
    const taskToUpdate = await Task.findById(originalTask._id);
    if (!taskToUpdate) return;

    let hasChanges = false;

    // Execute Actions
    for (const rule of rules) {
      console.log(`⚡ Executing Action: ${rule.actionType}`);

      if (rule.actionType === 'archive_task') {
        taskToUpdate.archived = true;
        hasChanges = true;
      }

      if (rule.actionType === 'assign_user') {
        if (rule.actionValue === 'project_lead') {
           const project = await Project.findById(projectId);
           if (project && project.lead) {
               taskToUpdate.assignee = project.lead;
               hasChanges = true;
           }
        } else {
           taskToUpdate.assignee = rule.actionValue;
           hasChanges = true;
        }
      }
    }

    // Save Changes
    if (hasChanges) {
        await taskToUpdate.save();
        console.log(`✅ Automation Success: Task ${taskToUpdate._id} updated.`);
    }

  } catch (error) {
    console.error("❌ Automation Failed:", error);
  }
};

module.exports = runAutomations;