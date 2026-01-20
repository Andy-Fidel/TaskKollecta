const FilterPreset = require('../models/FilterPreset');

// @desc    Get all filter presets for a project (user-specific)
// @route   GET /api/filter-presets/project/:projectId
// @access  Private
const getPresets = async (req, res) => {
    try {
        const presets = await FilterPreset.find({
            user: req.user._id,
            project: req.params.projectId
        }).sort({ createdAt: -1 });

        res.json(presets);
    } catch (error) {
        console.error('Error fetching filter presets:', error);
        res.status(500).json({ message: 'Failed to fetch filter presets' });
    }
};

// @desc    Create a new filter preset
// @route   POST /api/filter-presets
// @access  Private
const createPreset = async (req, res) => {
    try {
        const { name, projectId, filters } = req.body;

        if (!name || !projectId) {
            return res.status(400).json({ message: 'Name and projectId are required' });
        }

        // Check for duplicate name within same project for the user
        const existing = await FilterPreset.findOne({
            user: req.user._id,
            project: projectId,
            name: name.trim()
        });

        if (existing) {
            return res.status(400).json({ message: 'A preset with this name already exists' });
        }

        const preset = await FilterPreset.create({
            name: name.trim(),
            user: req.user._id,
            project: projectId,
            filters: {
                statuses: filters.statuses || [],
                priorities: filters.priorities || [],
                assignees: filters.assignees || [],
                tags: filters.tags || [],
                dateFrom: filters.dateFrom || null,
                dateTo: filters.dateTo || null
            }
        });

        res.status(201).json(preset);
    } catch (error) {
        console.error('Error creating filter preset:', error);
        res.status(500).json({ message: 'Failed to create filter preset' });
    }
};

// @desc    Delete a filter preset
// @route   DELETE /api/filter-presets/:id
// @access  Private
const deletePreset = async (req, res) => {
    try {
        const preset = await FilterPreset.findById(req.params.id);

        if (!preset) {
            return res.status(404).json({ message: 'Preset not found' });
        }

        // Only allow the owner to delete
        if (preset.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this preset' });
        }

        await preset.deleteOne();
        res.json({ message: 'Preset deleted successfully' });
    } catch (error) {
        console.error('Error deleting filter preset:', error);
        res.status(500).json({ message: 'Failed to delete filter preset' });
    }
};

module.exports = {
    getPresets,
    createPreset,
    deletePreset
};
