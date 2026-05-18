export function getIncompleteDependencies(task) {
  if (!Array.isArray(task?.dependencies)) return [];
  return task.dependencies.filter((dependency) => dependency?.status !== 'done');
}

export function isTaskBlocked(task) {
  if (!task || task.status === 'done') return false;
  return getIncompleteDependencies(task).length > 0;
}

export function getBlockingDependents(task, allTasks = []) {
  if (!task?._id) return [];
  return allTasks.filter((candidate) => (
    candidate?._id !== task._id &&
    Array.isArray(candidate?.dependencies) &&
    candidate.dependencies.some((dependency) => (dependency?._id || dependency) === task._id) &&
    candidate.status !== 'done' &&
    candidate.status !== 'completed'
  ));
}

export function getDependencyScheduleConflicts(task) {
  if (!task?.startDate || !Array.isArray(task.dependencies)) return [];
  const taskStart = new Date(task.startDate);
  if (Number.isNaN(taskStart.getTime())) return [];

  return task.dependencies.filter((dependency) => {
    if (!dependency?.dueDate || dependency.status === 'done' || dependency.status === 'completed') return false;
    const dependencyDue = new Date(dependency.dueDate);
    return !Number.isNaN(dependencyDue.getTime()) && dependencyDue > taskStart;
  });
}
