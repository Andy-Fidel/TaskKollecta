const Automation = require('../models/Automation');

// @desc Get project automations
const getAutomations = async (req, res) => {
  try {
    const automations = await Automation.find({ project: req.params.projectId });
    res.json(automations);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc Create automation
const createAutomation = async (req, res) => {
  try {
    const automation = await Automation.create({
      project: req.body.projectId,
      triggerType: req.body.triggerType,
      triggerValue: req.body.triggerValue,
      actionType: req.body.actionType,
      actionValue: req.body.actionValue
    });
    res.status(201).json(automation);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// @desc Delete automation
const deleteAutomation = async (req, res) => {
    try {
        await Automation.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { getAutomations, createAutomation, deleteAutomation };