const FilterPreset = require('../models/FilterPreset');
const Project = require('../models/Project');
const { ensureMembership } = require('../domains/shared/access');

const normalizeFilters = (filters = {}) => ({
    statuses: filters.statuses || [],
    priorities: filters.priorities || [],
    assignees: filters.assignees || [],
    tags: filters.tags || [],
    customFields: filters.customFields || {},
    dateFrom: filters.dateFrom || null,
    dateTo: filters.dateTo || null,
    query: filters.query || '',
    blockedOnly: Boolean(filters.blockedOnly),
    view: filters.view || undefined,
    projectFilter: filters.projectFilter || 'all',
    priority: filters.priority || 'all'
});

const buildListQuery = ({ userId, scope, projectId, orgId }) => ({
    scope,
    ...(scope === 'project' ? { project: projectId } : { organization: orgId }),
    $or: [
        { user: userId },
        { visibility: 'team' }
    ]
});

const assertProjectAccess = async (userId, projectId) => {
    const project = await Project.findById(projectId);
    if (!project) {
        const error = new Error('Project not found');
        error.statusCode = 404;
        throw error;
    }
    await ensureMembership(userId, project.organization);
    return project;
};

// @desc    Get all saved views for a project
// @route   GET /api/filter-presets/project/:projectId
// @access  Private
const getPresets = async (req, res) => {
    try {
        await assertProjectAccess(req.user._id, req.params.projectId);
        const presets = await FilterPreset.find(buildListQuery({
            userId: req.user._id,
            scope: 'project',
            projectId: req.params.projectId
        })).sort({ visibility: 1, updatedAt: -1 });

        res.json(presets);
    } catch (error) {
        console.error('Error fetching filter presets:', error);
        res.status(error.statusCode || 500).json({ message: error.message || 'Failed to fetch filter presets' });
    }
};

// @desc    Get all saved views for My Tasks
// @route   GET /api/filter-presets/my-tasks
// @access  Private
const getMyTaskPresets = async (req, res) => {
    try {
        const orgId = req.query.orgId || req.headers['x-active-org'];
        if (!orgId) return res.status(400).json({ message: 'Organization ID required' });

        await ensureMembership(req.user._id, orgId);
        const presets = await FilterPreset.find(buildListQuery({
            userId: req.user._id,
            scope: 'my_tasks',
            orgId
        })).sort({ visibility: 1, updatedAt: -1 });

        res.json(presets);
    } catch (error) {
        console.error('Error fetching my task saved views:', error);
        res.status(error.statusCode || 500).json({ message: error.message || 'Failed to fetch saved views' });
    }
};

// @desc    Create a new saved view
// @route   POST /api/filter-presets
// @access  Private
const createPreset = async (req, res) => {
    try {
        const {
            name,
            projectId,
            orgId,
            scope = projectId ? 'project' : 'my_tasks',
            visibility = 'private',
            filters,
            layout,
            sort
        } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ message: 'Name is required' });
        }

        if (!['project', 'my_tasks'].includes(scope)) {
            return res.status(400).json({ message: 'Invalid saved view scope' });
        }

        if (!['private', 'team'].includes(visibility)) {
            return res.status(400).json({ message: 'Invalid saved view visibility' });
        }

        let project = null;
        let organizationId = orgId;

        if (scope === 'project') {
            if (!projectId) return res.status(400).json({ message: 'projectId is required for project views' });
            project = await assertProjectAccess(req.user._id, projectId);
            organizationId = project.organization;
        } else {
            if (!organizationId) return res.status(400).json({ message: 'orgId is required for My Tasks views' });
            await ensureMembership(req.user._id, organizationId);
        }

        const duplicateQuery = {
            name: name.trim(),
            scope,
            ...(scope === 'project' ? { project: projectId } : { organization: organizationId }),
            ...(visibility === 'team' ? { visibility: 'team' } : { user: req.user._id })
        };

        const existing = await FilterPreset.findOne(duplicateQuery);

        if (existing) {
            return res.status(400).json({ message: 'A saved view with this name already exists' });
        }

        const preset = await FilterPreset.create({
            name: name.trim(),
            user: req.user._id,
            organization: organizationId,
            project: scope === 'project' ? projectId : null,
            scope,
            visibility,
            layout: layout || (scope === 'project' ? 'board' : 'my_tasks'),
            sort: {
                field: sort?.field || 'updatedAt',
                direction: sort?.direction || 'desc'
            },
            filters: normalizeFilters(filters)
        });

        res.status(201).json(preset);
    } catch (error) {
        console.error('Error creating filter preset:', error);
        res.status(error.statusCode || 500).json({ message: error.message || 'Failed to create saved view' });
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
    getMyTaskPresets,
    createPreset,
    deletePreset
};
