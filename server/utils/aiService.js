const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate a task breakdown from a project name and description.
 * Returns an array of suggested tasks with title, priority, and short description.
 */
async function generateTaskBreakdown(projectName, projectDescription = '') {
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

  // Strip markdown code fences if the model wraps them
  const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Generate a detailed task description from the task title and optional project context.
 * Returns an object with description and acceptance criteria.
 */
async function generateTaskDescription(taskTitle, projectName = '') {
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
}

module.exports = { generateTaskBreakdown, generateTaskDescription };
