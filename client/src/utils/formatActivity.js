// client/src/utils/formatActivity.js

export const formatActivityAction = (action, details) => {
  switch (action) {
    case 'created':
      return 'created this task';
    case 'updated_status':
      return `changed status ${details}`; 
    case 'updated_priority':
      return `changed priority ${details}`;
    case 'assigned':
      return `assigned this task`;
    case 'renamed':
      return 'renamed the task';
    case 'deleted':
        return 'deleted a task';
    default:
      return action ? action.replace(/_/g, ' ') : 'updated task';
  }
};