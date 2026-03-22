const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'missing');

// --- Fallback data when AI is unavailable ---
const FALLBACK_TASKS = [
  { title: 'Define project scope and objectives', priority: 'high', description: 'Outline the goals, deliverables, and success criteria for the project.' },
  { title: 'Identify stakeholders and assign roles', priority: 'high', description: 'Determine who is involved and clarify responsibilities.' },
  { title: 'Create project timeline and milestones', priority: 'medium', description: 'Break the project into phases with deadlines.' },
  { title: 'Set up project workspace and tools', priority: 'medium', description: 'Configure the board, views, and any integrations needed.' },
  { title: 'Draft initial task breakdown', priority: 'medium', description: 'List the first batch of actionable tasks for the team.' },
  { title: 'Schedule kickoff meeting', priority: 'low', description: 'Bring the team together to align on goals and next steps.' },
];

function getFallbackDescription(taskTitle) {
  return {
    description: `This task involves completing "${taskTitle}". Review the requirements, coordinate with the team on any dependencies, and ensure all acceptance criteria are met before marking as done.`,
    acceptanceCriteria: [
      'Requirements are clearly understood and documented',
      'Implementation is complete and tested',
      'Reviewed by at least one team member',
      'No blocking issues remain',
    ],
  };
}

/**
 * Generate a task breakdown from a project name and description.
 * Falls back to starter tasks if the AI API is unavailable.
 */
async function generateTaskBreakdown(projectName, projectDescription = '') {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a project management assistant. Given a project, generate a practical list of 5-8 tasks to kick it off.

Project Name: ${projectName}
${projectDescription ? `Description: ${projectDescription}` : ''}

Return ONLY a JSON array. Each item must have:
- "title": a concise, actionable task title (imperative form, e.g. "Design wireframes")
- "priority": one of "urgent", "high", "medium", "low"
- "description": one sentence describing the task

Order tasks by logical dependency (what should be done first). Do NOT include any markdown, code fences, or extra text — just the raw JSON array.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.warn('AI breakdown unavailable, using fallback:', error.message);
    return FALLBACK_TASKS;
  }
}

/**
 * Generate a detailed task description from the task title and optional project context.
 * Falls back to a template description if the AI API is unavailable.
 */
async function generateTaskDescription(taskTitle, projectName = '') {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a project management assistant. Write a detailed task description for a team member.

Task: ${taskTitle}
${projectName ? `Project: ${projectName}` : ''}

Return ONLY a JSON object with:
- "description": 2-3 sentences explaining what needs to be done, why, and any key considerations
- "acceptanceCriteria": an array of 3-5 short bullet-point strings defining "done"

Do NOT include any markdown, code fences, or extra text — just the raw JSON object.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.warn('AI describe unavailable, using fallback:', error.message);
    return getFallbackDescription(taskTitle);
  }
}
/**
 * Generate a personalized daily digest for the user.
 */
async function generateDailyDigest(userName, tasksJson) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a friendly, highly competent AI assistant for a project management app.
Write a brief "Daily Digest" for ${userName}.

Here is the data for their tasks (recent completions, due today, overdue):
${tasksJson}

Create a personalized, motivational markdown summary. Include:
1. A brief greeting and high-level summary.
2. What they accomplished recently (if any).
3. What is due today.
4. What is overdue or "at risk".
Keep it friendly, use appropriate emojis, and do NOT make up any tasks that aren't in the data. Do NOT use markdown code blocks for the whole response, just return formatted markdown text.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.warn('AI digest unavailable, using fallback:', error.message);
    return `### 🌅 Good Morning, ${userName}!\n\n_We couldn't generate your AI digest right now, but you can always check your Dashboard for today's tasks._`;
  }
}

/**
 * Analyze project tasks to identify at-risk items.
 */
async function analyzeProjectRisks(projectName, tasksJson) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a project manager analyzing risk.
Project: ${projectName}
Tasks:
${tasksJson}

Identify which tasks are "at risk" of missing deadlines or causing bottlenecks. Consider:
- High/Urgent priority but status is "todo"
- Missing/blank descriptions on complex tasks
- Overdue tasks
- Tasks blocked by delayed dependencies

Return ONLY a JSON array of objects. Each object MUST have:
- "taskId": the exact _id of the task
- "title": the task title
- "riskLevel": "High" or "Medium"
- "reason": a 1-2 sentence explanation of why this task was flagged

Return ONLY the raw JSON array. DO NOT wrap in markdown code fences.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.warn('AI risk analysis unavailable, using fallback:', error.message);
    return [];
  }
}

module.exports = { 
  generateTaskBreakdown, 
  generateTaskDescription,
  generateDailyDigest,
  analyzeProjectRisks
};
