# TaskKollecta User Manual

**Welcome to TaskKollecta** — A modern, powerful task management platform designed for teams and organizations to collaborate, organize, and execute projects efficiently.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Projects & Workspaces](#projects--workspaces)
4. [Task Management](#task-management)
5. [Kanban Board](#kanban-board)
6. [Calendar View](#calendar-view)
7. [My Tasks](#my-tasks)
8. [Team & Collaboration](#team--collaboration)
9. [Advanced Features](#advanced-features)
10. [Settings & Preferences](#settings--preferences)
11. [FAQ](#faq)

---

## Getting Started

### Account Registration & Login

1. **Sign Up**: Visit the TaskKollecta landing page and click "Get Started"
2. **Enter Your Details**: Provide your email address and create a secure password
3. **Verify Email**: Check your email for a verification link
4. **Create Your First Organization**: After login, complete the onboarding wizard to set up your organization

### Resetting Your Password

- Click **"Forgot Password?"** on the login page
- Enter your email address
- Check your email for a password reset link
- Follow the link and create a new password

---

## Dashboard Overview

The **Dashboard** is your command center, providing a bird's-eye view of your organization's activity.

### Key Dashboard Features

#### 📊 Analytics & Charts
- **Project Progress**: See completion status across all projects
- **Team Performance**: View metrics on tasks completed, in progress, and overdue
- **Activity Timeline**: Track recent actions taken by your team
- **Task Distribution**: Visualize workload distribution among team members

#### 📅 Quick Actions
- Create new projects directly from the dashboard
- View upcoming deadlines
- Access your most recent projects
- Monitor critical task statuses

#### 🎯 Performance Metrics
- Total tasks completed this period
- Active projects and team members
- Overdue task count and alerts
- Trend analysis over time (last 30 days by default)

#### 🕐 Date Range Filtering
- Use the date range selector to filter analytics for specific periods
- Default view shows the last 30 days
- Customize to analyze weekly, monthly, or custom ranges

---

## Projects & Workspaces

### Understanding Organizations & Projects

**Organizations** are top-level containers that can have multiple **Projects**. Each organization has its own:
- Members and permissions
- Projects and tasks
- Settings and preferences

### Creating a New Project

1. Navigate to **Dashboard** or **Projects** section
2. Click **"+ New Project"**
3. Fill in the project details:
   - **Project Name**: Give it a meaningful name
   - **Description**: Add context about the project
   - **Organization**: Select the organization (if you have multiple)
4. Click **"Create"**

### Project Views

Once in a project, you can switch between multiple views:

#### **Board View** (Default)
- Kanban-style board with status columns
- Drag-and-drop tasks between columns
- Quick view of task progress

#### **List View**
- Table format showing all tasks
- Easy sorting and filtering
- Best for reviewing multiple tasks at once

#### **Calendar View**
- Visual representation of task due dates
- See your team's schedule at a glance
- Click on events to view task details

#### **Analytics View**
- Project-specific performance metrics
- Task completion trends
- Team productivity insights

#### **Updates View**
- Timeline of project milestones and announcements
- Team activity feed

---

## Task Management

### Creating a Task

#### From Project Board
1. Click **"+ Add Task"** or click in any status column
2. Enter the task title
3. (Optional) Set priority, due date, and assignee immediately
4. Click **"Create Task"** or press Enter

#### From Dashboard
1. Click **"+ New Project"** → Navigate to the project → Add tasks

### Task Properties & Details

Every task has the following customizable properties:

| Property | Description |
|----------|-------------|
| **Title** | Task name (required) |
| **Description** | Detailed task information, supports formatting |
| **Status** | todo, in-progress, review, done |
| **Priority** | urgent, high, medium, low |
| **Assignee** | Team member responsible for the task |
| **Due Date** | Target completion date |
| **Tags** | Custom labels for organization |
| **Recurrence** | Set task to repeat on a schedule |
| **Dependencies** | Link tasks that are blocking other work |
| **Attachments** | Upload files, images, documents |
| **Subtasks** | Break tasks into smaller checklist items |

### Opening Task Details

Click any task card or title to open the **Task Details Modal**:

- **Left Panel**: Full task description, subtasks, and attachments
- **Right Panel**: 
  - Task properties and metadata
  - Assignment and status management
  - Dependency links
  - Activity timeline and comments

### Editing Task Information

#### Description
1. Click on the description area (or the **edit icon**)
2. Click "Edit" to modify
3. Use the text editor to format content
4. Click **"Save"** or press Ctrl+S

#### Status
1. Use the status dropdown in task details
2. Or drag-and-drop the task card to a different column on the board
3. Changes sync instantly across all views

#### Priority
1. Open task details
2. Click the **Priority** dropdown
3. Select urgent, high, medium, or low

#### Assignee
1. Click the **Assignee** field
2. Search and select a team member
3. Confirm the assignment in the dialog
4. Assignee receives an email notification

#### Due Date
1. Click the **Due Date** field
2. Use the calendar picker to select a date
3. Dates that have passed are highlighted in red (if task not completed)

#### Tags
1. Click **Tags** section
2. Add existing tags or create new ones
3. Tags help organize and filter tasks

#### Recurrence
1. Click **Repeat** dropdown
2. Select recurrence pattern (daily, weekly, monthly, custom)
3. Completed recurring tasks automatically create the next instance

### Subtasks

Subtasks are smaller, checklist-style tasks within a main task.

#### Adding Subtasks
1. Scroll to **Subtasks** section in task details
2. Type in the input field and press Enter
3. Progress bar shows completion percentage

#### Managing Subtasks
- Click checkbox to mark complete
- Click trash icon to delete
- Subtasks appear in the activity timeline

### Dependencies & Blocking

Link tasks that depend on each other to prevent work on blocked tasks.

#### Adding Dependencies
1. Scroll to **Blocking** section
2. Click **"+ Add"** button
3. Search for the task that this task is blocking
4. Task is linked and shows status

#### Understanding Dependencies
- A task "blocks" another task if the other task can't start until this one is done
- Red warning icon shows unfinished dependencies
- Completed dependencies show a green checkmark

### Attachments

Upload files, images, and documents to tasks.

#### Adding Attachments
1. Click **"+ Add"** in the Attachments section
2. Select file(s) from your device
3. Supported types: images, PDFs, documents, spreadsheets
4. File appears in the attachments grid

#### Accessing Attachments
- Click any attachment to download or preview
- Attachment date is displayed below filename

### Deleting Tasks

1. Open task details
2. Click **More** (⋯) button in header
3. Select **"Delete Task"**
4. Confirm deletion (cannot be undone)

---

## Kanban Board

The Kanban Board is the primary workspace for managing tasks in real-time.

### Board Layout

The default board has 4 columns representing task lifecycle:
- **To Do**: New tasks, not yet started
- **In Progress**: Currently being worked on
- **Review**: Awaiting approval or QA
- **Done**: Completed tasks

### Moving Tasks

#### Drag & Drop
1. Click and hold a task card
2. Drag to desired status column
3. Release to drop (automatically saves)
4. Activity log updates and team is notified

#### Using Status Dropdown
1. Open task details
2. Click status dropdown
3. Select new status
4. Changes apply immediately

### Filtering & Searching

#### Search Bar
- Type task title, description, or keywords
- Results update in real-time
- Case-insensitive search

#### Advanced Filters
Click the **Filter** icon to open advanced filtering:

- **Status**: Filter by one or more statuses
- **Priority**: Show only urgent, high, medium, or low priority tasks
- **Assignees**: Filter by team member
- **Tags**: Filter by custom tags
- **Date Range**: Filter tasks with due dates in a specific period

#### Filter Presets
- **Save Current Filter**: Click "Save Preset" to save your filter combination
- **Apply Preset**: Quickly access saved filters from the filter menu
- **Manage Presets**: Edit or delete saved filters

### Sorting Options

Sort tasks by:
- Task title (A→Z)
- Due date (nearest first)
- Priority (highest first)
- Created date (newest first)

### View Toggle

Switch between **Board**, **List**, **Calendar**, **Analytics**, and **Updates** views without losing your filters.

---

## Calendar View

The **Calendar View** displays all tasks with due dates in a traditional calendar format.

### Features

- **Month View**: See entire month at a glance
- **Week View**: Focus on current and upcoming week
- **Task Events**: Click any event to see task details
- **Color Coding**: Tasks colored by status (to-do, in-progress, review, done)
- **Multi-Project**: Shows tasks from all projects in one calendar

### Interacting with Calendar Events

1. Click any event (task) to see details
2. Event shows task priority, assignee, and status
3. Hover over events to see full title
4. Drag events to reschedule (changes due date)

### Viewing All-Day Tasks

- Tasks with due dates but no specific time appear as all-day events
- Use task details to set a specific time if needed

---

## My Tasks

The **My Tasks** page shows all tasks assigned to you across all projects and organizations.

### Features

- **Complete List**: All your assigned work in one place
- **Quick Status Toggle**: Click checkbox to mark task as done
- **Project Link**: Jump to project board from task list
- **Priority Indicators**: See task priority at a glance
- **Due Date Tracking**: Overdue tasks highlighted in red

### Workflow

1. Navigate to **My Tasks** from the sidebar
2. View all tasks assigned to you
3. Click checkbox to complete tasks
4. Click project name to go to project board
5. Due dates update in real-time

### Filtering Your Tasks

Your tasks are automatically filtered to show:
- All statuses by default
- Tasks from all your organizations
- Sorted by due date (nearest first)

---

## Team & Collaboration

### Managing Team Members

#### Viewing Members
1. Go to **Team** section
2. Select organization from dropdown
3. View all members and their roles

#### Member Roles
- **Admin**: Full permissions, manage members, settings
- **Member**: Can create and manage tasks, limited admin features
- **Guest**: View-only access (limited visibility)

### Inviting Team Members

#### Send Invite via Email
1. Go to **Team** section
2. Click **"+ Invite"**
3. Enter email address(es) - one per line
4. (Optional) Add a personal message
5. Click **"Send Invites"**
6. Invited users receive email with join link

#### Join Using Invite Link
- Click the link in the email
- Sign up or login if needed
- Automatically added to organization

### Requesting to Join

#### Public Organization Join Request
1. Go to **Team** → **Join Organization**
2. Search for organization name
3. Click **"Request to Join"**
4. Admins receive request notification
5. Admin approves/rejects request

### Managing Permissions

Organization admins can:
- Change member roles
- Remove members from organization
- Manage member access to specific projects
- Set project-level permissions

### Comments & Mentions

#### Adding Comments
1. Open task details
2. Scroll to bottom (Activity section)
3. Type comment in input box
4. Press Enter or click send button

#### Mentioning Team Members
1. Type `@` in comment box
2. Select team member from dropdown
3. They receive email notification
4. Mention appears highlighted in comment

#### Threaded Discussions
- All comments visible in task activity timeline
- See who said what and when
- Comments sorted chronologically

---

## Advanced Features

### 🤖 Automation

Automations allow you to trigger actions based on task events, reducing manual work.

#### Creating Automations
1. Open project
2. Click **Automations** (⚡ icon)
3. Define automation rule:
   - **Trigger**: Task status change, priority change, due date approaching, etc.
   - **Action**: Send notification, change status, assign to member, add tag, etc.
   - **Conditions** (optional): Only apply automation if certain conditions met

#### Common Automation Examples
- "When task moved to 'done', notify project manager"
- "When task is overdue, change priority to 'urgent'"
- "When status changes to 'in-progress', notify assignee"

#### Managing Automations
- View all project automations in Automations panel
- Pause/disable automation without deleting
- Edit automation trigger and action
- Delete automations you no longer need

### 📋 Form Builder & Intake Forms

Create custom intake forms to standardize how tasks/requests are created.

#### Building a Form
1. Go to project settings
2. Click **"Create Form"** or go to Forms section
3. Add fields using the form builder:
   - **Text Field**: Single-line input
   - **Long Text**: Multi-line input (description)
   - **Date Field**: Date picker
   - **Dropdown**: Multiple choice options
   - **Checkbox**: Boolean yes/no

#### Field Properties
- **Label**: Field name and placeholder text
- **Required**: Mark field as mandatory
- **Default Value**: Pre-fill with default answer
- **Validation**: Set text patterns or requirements

#### Publishing Forms
1. Click **"Publish"**
2. Get public form URL
3. Share with external stakeholders
4. Responses automatically create new tasks

#### Form Responses
- Each form submission creates a new task
- Submitted data populates task fields
- Responses appear in project activity log

### 📊 Project Analytics

Get insights into project performance and team productivity.

#### Analytics Dashboard
- **Completion Rate**: % of tasks completed vs. total
- **Velocity**: Tasks completed per time period
- **Burndown Chart**: Shows project progress over time
- **Team Workload**: Tasks per team member
- **Priority Distribution**: Mix of task priorities
- **Overdue Tasks**: Tasks past due date

#### Exporting Reports
- Download analytics as CSV or PDF
- Schedule automatic weekly/monthly reports
- Share reports with stakeholders

### 🔔 Notifications

Stay informed with intelligent notifications.

#### Notification Types
- Task assigned to you
- Comment on task you're involved with
- Mention in comment (@you)
- Task status change
- Due date approaching
- Dependency completed
- Automation triggered

#### Notification Preferences
1. Go to **Settings** → **Notifications**
2. Toggle notification types on/off
3. Choose notification channel (email, in-app)
4. Set frequency (real-time, digest, daily summary)

### ⏱️ Due Date Reminders

Automatic reminders for upcoming deadlines.

#### How It Works
- Tasks with due dates send reminders automatically
- 1 day before due date
- On the due date morning
- If task is overdue (escalating notifications)

#### Managing Reminders
1. Go to Settings
2. Customize reminder timing preferences
3. Enable/disable reminders for certain task types
4. Set quiet hours (no notifications outside these times)

### 🔄 Recurring Tasks

Automatically create follow-up tasks on a schedule.

#### Setting Recurrence
1. Open task details
2. Click **"Repeat"** dropdown
3. Select frequency:
   - Daily
   - Weekly (choose days)
   - Monthly (choose date or relative day)
   - Custom (specific pattern)
4. Set end date or infinite recurrence
5. Save

#### How Recurrence Works
- When recurring task is completed, next instance automatically created
- New task has same properties as original
- Linked to previous task for history tracking
- Can break the chain by editing individual instances

### 🔗 Task Dependencies

Prevent teams from starting work on blocked tasks.

#### Creating Dependencies
1. Open task details
2. Scroll to **Blocking** section
3. Click **"+ Add Dependency"**
4. Search for task that must be completed first
5. Link confirms on save

#### Dependency Visualization
- Orange warning icon if dependency not done
- Green checkmark if dependency completed
- Task won't move forward until dependency resolved

#### Benefits
- Clear work sequence and prerequisites
- Prevents scope creep and rework
- Visibility into project blockers

### 🏷️ Tags & Labels

Organize tasks with custom tags for better filtering and categorization.

#### Creating Tags
1. Open task details
2. Go to **Tags** section
3. Start typing to create new tag
4. Select color for visual identification
5. Save

#### Using Tags
- Filter board by tags
- Group tasks by tag
- Use for categories: Bug, Feature, Documentation, etc.
- Use for workflow: Urgent, Blocked, Ready for Review, etc.

#### Tag Management
- Edit tag name or color
- Delete unused tags
- Bulk apply tags to multiple tasks

---

## Settings & Preferences

### Profile Settings

#### Updating Profile
1. Go to **Settings** → **Profile**
2. Edit name and email
3. Upload profile avatar (Cloudinary)
4. Click **"Save"**

#### Changing Password
1. Go to **Settings** → **Security**
2. Enter current password
3. Enter new password (8+ characters, mix of case and numbers)
4. Confirm new password
5. Click **"Update Password"**

### Notification Preferences

1. Go to **Settings** → **Notifications**
2. Toggle notification types:
   - Email on task assignment
   - Email on comments
   - Email on due date reminders
   - Email on status changes
   - Email on mentions
3. Save preferences

### Theme Settings

1. Go to **Settings** → **Appearance**
2. Choose theme:
   - **Light**: White background, dark text
   - **Dark**: Dark background, light text
   - **System**: Follows OS preference
3. Theme applies immediately across app

### Organization Settings

#### Managing Organization
1. Go to **Team** section
2. Select organization
3. Click **"Settings"** ⚙️
4. Customize:
   - Organization name
   - Logo/avatar
   - Description
   - Default settings for new projects

#### Accessing Organization Settings (Admin Only)
- Only organization admins can modify settings
- Changes affect all projects in organization
- Member changes require admin confirmation

---

## FAQ

### General Questions

**Q: How many team members can I invite?**
A: Unlimited! Invite as many team members as you need to your organization.

**Q: Can I use TaskKollecta offline?**
A: The web app requires internet. Consider bookmarking your most-used projects for quick access.

**Q: How often are changes saved?**
A: Changes save automatically in real-time. No manual save needed.

**Q: Can I export my data?**
A: Yes, use the export feature in project settings to download tasks as CSV. Analytics can be exported as PDF.

### Task & Project Management

**Q: How do I archive a project or task?**
A: Click **More** (⋯) on project/task and select **"Archive"**. Archived items move out of main view but can be recovered.

**Q: Can I duplicate a task or project?**
A: Yes! Click **More** (⋯) and select **"Duplicate"** to create a copy with all properties.

**Q: What happens if I delete a task?**
A: Tasks are permanently deleted. Dependencies and comments are also removed. The action is logged in activity.

**Q: How do I move a task to a different project?**
A: Open task details, click **More** (⋯), select **"Move to Project"**, and choose destination.

### Team & Permissions

**Q: What's the difference between member roles?**
A: 
- **Admin**: Full permissions, manage members and settings
- **Member**: Can create/edit tasks, limited admin features  
- **Guest**: View-only access

**Q: Can I have different permissions for different projects?**
A: Yes! Admins can set project-level permissions in project settings.

**Q: How do I remove a team member?**
A: Go to **Team**, click the member's **More** (⋯), select **"Remove Member"**. They lose access.

### Notifications & Reminders

**Q: Why am I not getting notifications?**
A: Check notification preferences in Settings. Ensure you've enabled the notification type and provided a valid email.

**Q: Can I snooze notifications?**
A: Yes, within notification preferences set quiet hours (e.g., no notifications after 6 PM).

**Q: How do I stop getting reminded about a specific task?**
A: Open task, go to **Due Date**, select **"No Reminder"** or clear the due date.

### Automations & Forms

**Q: Can I undo an automation action?**
A: Automation actions (like status changes) are logged in activity and can be manually reversed, but not auto-undone.

**Q: Who can see form responses?**
A: Project members can see all form responses. Admins control visibility in project settings.

**Q: Can I pre-fill form fields?**
A: Yes, when creating a form, set default values for fields.

### Billing & Account

**Q: Is there a free tier?**
A: TaskKollecta offers a free tier with limited features. Upgrade to Pro for unlimited projects, members, and automations.

**Q: How do I cancel my subscription?**
A: Go to **Settings** → **Billing** → **Cancel Subscription**. You keep access until billing cycle ends.

**Q: Can I change my email address?**
A: Yes, go to **Settings** → **Profile** → edit email. Verify the new email address via confirmation link.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save current changes |
| `Ctrl/Cmd + K` | Open command menu |
| `Escape` | Close open modal or menu |
| `Tab` | Navigate between form fields |
| `Enter` | Submit form or create item |
| `@` | Start mentioning team member |

---

## Tips & Best Practices

### 🎯 Organization
- Use tags to categorize tasks (Bug, Feature, Docs)
- Create filter presets for common views (My Urgent Tasks, This Week's Work)
- Set due dates for all tasks to enable timeline and calendar views

### 👥 Collaboration
- Mention team members to alert them of important information
- Use task dependencies to establish clear work sequences
- Regular check-ins on overdue tasks keep projects on track

### 📊 Project Success
- Keep task descriptions detailed but concise
- Update task status regularly so team knows progress
- Use automations to standardize repetitive processes
- Review analytics weekly to identify bottlenecks

### ⚡ Efficiency
- Use recurring tasks for regular work (dailies, weeklies)
- Batch similar tasks and use bulk operations
- Leverage forms for external submissions (bugs, feature requests)
- Create saved filter presets for quick access to common views

---

## Getting Help

- **In-App Help**: Click the **?** icon for contextual help
- **Documentation**: Visit the TaskKollecta knowledge base
- **Support**: Email support@taskkollecta.com
- **Community**: Join our community forum for tips and discussions

---

## Version History

- **v1.0** (Current) - Full task management, team collaboration, automations, forms
- Future: Mobile app, time tracking, advanced reporting, integrations

---

**Congratulations!** You're now ready to use TaskKollecta. Start by creating your first project and inviting your team.

**Happy tasking! 🚀**
