export type UserRole = 'user' | 'admin' | 'superadmin';
export type AccountStatus = 'active' | 'suspended' | 'banned';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  role: UserRole;
  status: AccountStatus;
  onboardingCompleted: boolean;
  notificationPreferences?: {
    emailAssignments: boolean;
    emailComments: boolean;
    emailDueDates: boolean;
    emailStatusChanges: boolean;
    emailMentions: boolean;
  };
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ISubtask {
  _id: string;
  title: string;
  isCompleted: boolean;
}

export interface ITask {
  _id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  organization: string | IOrganization;
  project: string | IProject;
  assignee?: string | IUser;
  reporter: string | IUser;
  subtasks: ISubtask[];
  dueDate?: Date;
  startDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProject {
  _id: string;
  name: string;
  description?: string;
  organization: string | IOrganization;
  createdBy: string | IUser;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOrganization {
  _id: string;
  name: string;
  createdBy: string | IUser;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMembership {
  _id: string;
  user: string | IUser;
  organization: string | IOrganization;
  role: 'owner' | 'admin' | 'member' | 'guest';
  joinedAt: Date;
}
