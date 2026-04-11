export function getIncompleteDependencies(task) {
  if (!Array.isArray(task?.dependencies)) return [];
  return task.dependencies.filter((dependency) => dependency?.status !== 'done');
}

export function isTaskBlocked(task) {
  if (!task || task.status === 'done') return false;
  return getIncompleteDependencies(task).length > 0;
}
