import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Code2, Lightbulb, Rocket, Users, LayoutDashboard,
  ChevronRight, Search, ArrowRight, CheckCircle2, Copy, Check,
  Zap, Shield, Workflow, Settings, Bell, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import tkLogo from '../assets/taskkollecta-logo.png';

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started', icon: Rocket },
  { id: 'projects', label: 'Projects', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks & Subtasks', icon: CheckCircle2 },
  { id: 'team', label: 'Team Management', icon: Users },
  { id: 'automations', label: 'Automations', icon: Workflow },
  { id: 'ai-features', label: 'AI Features', icon: Lightbulb },
  { id: 'views', label: 'Views & Reports', icon: FileText },
  { id: 'settings', label: 'Settings & Security', icon: Settings },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: Zap },
];

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = SECTIONS.filter(s =>
    s.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background font-[Poppins]">

      {/* --- STICKY NAV --- */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3 group">
              <img src={tkLogo} alt="TaskKollecta" className="h-11 w-11 rounded-xl shadow-md object-contain group-hover:scale-105 transition-transform duration-300" />
              <span className="font-bold text-xl tracking-tight text-foreground">TaskKollecta</span>
            </Link>
            <Badge className="bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:bg-indigo-950/50 font-mono text-xs">Docs</Badge>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/api-reference">
              <Button variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-indigo-600 dark:text-indigo-400">API Reference</Button>
            </Link>
            <Link to="/community">
              <Button variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-indigo-600 dark:text-indigo-400">Community</Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-5 shadow-md">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">

        {/* --- SIDEBAR --- */}
        <aside className="hidden lg:block w-72 shrink-0 border-r border-border/60 bg-card/40 min-h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto pb-8">
          <div className="p-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl text-sm border-0 outline-none text-foreground placeholder:text-muted-foreground focus:ring-2 ring-ring/40 transition-all"
              />
            </div>
          </div>
          <nav className="px-3 space-y-0.5">
            {filteredSections.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    activeSection === s.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {s.label}
                </a>
              );
            })}
          </nav>
        </aside>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-1 max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-12">

          {/* Hero */}
          <div className="mb-16">
            <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-4">
              <BookOpen className="w-4 h-4" />
              Documentation
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight mb-4">
              Learn TaskKollecta
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Everything you need to organize your team&apos;s work, automate workflows, and ship projects faster. From setup to advanced features.
            </p>
          </div>

          {/* Quick Start Cards */}
          <div className="grid sm:grid-cols-3 gap-4 mb-16">
            {[
              { title: 'Quick Start', desc: 'Get running in 5 minutes', icon: Rocket, color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' },
              { title: 'API Reference', desc: 'Build custom integrations', icon: Code2, color: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400', link: '/api-reference' },
              { title: 'Community', desc: 'Get help & share ideas', icon: Users, color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400', link: '/community' },
            ].map((card) => {
              const Icon = card.icon;
              const Wrapper = card.link ? Link : 'a';
              const wrapperProps = card.link ? { to: card.link } : { href: '#getting-started' };
              return (
                <Wrapper key={card.title} {...wrapperProps} className="group p-5 bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg hover:border-indigo-200 dark:border-indigo-900/60 transition-all duration-300 block">
                  <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.desc}</p>
                  <div className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400 mt-3 group-hover:gap-2 transition-all">
                    Explore <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Wrapper>
              );
            })}
          </div>

          {/* --- GETTING STARTED --- */}
          <section id="getting-started" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
              <div className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 p-2 rounded-xl"><Rocket className="w-5 h-5" /></div>
              Getting Started
            </h2>

            <div className="space-y-6 text-muted-foreground leading-relaxed">
              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4">1. Create Your Organization</h3>
                <p className="mb-4">
                  After signing up, you&apos;ll be guided through creating your first organization. An organization is your team&apos;s workspace — all projects, tasks, and members belong to it.
                </p>
                <div className="bg-background rounded-xl p-4 border border-border/60">
                  <p className="text-sm font-mono text-foreground">Sign up → Create Organization → Invite Team → Create First Project</p>
                </div>
              </div>

              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4">2. Invite Your Team</h3>
                <p className="mb-4">
                  Navigate to <strong>Team Settings</strong> to invite members by email. You can assign roles:
                </p>
                <ul className="space-y-2 ml-1">
                  {[
                    { role: 'Owner', desc: 'Full control over the organization, billing, and security settings.' },
                    { role: 'Admin', desc: 'Can manage projects, members, and organization settings.' },
                    { role: 'Member', desc: 'Can create and manage tasks within assigned projects.' },
                    { role: 'Viewer', desc: 'Read-only access to projects they are invited to.' },
                  ].map(r => (
                    <li key={r.role} className="flex gap-3 text-sm">
                      <Badge variant="outline" className="shrink-0 font-mono text-xs mt-0.5">{r.role}</Badge>
                      <span>{r.desc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-4">3. Create Your First Project</h3>
                <p className="mb-4">
                  Click <strong>&quot;New Project&quot;</strong> from the Workspace. Our 4-step wizard helps you:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['Name & Color', 'View Layout', 'Team & Timeline', 'AI Tasks'].map((step, i) => (
                    <div key={step} className="bg-background p-3 rounded-xl border border-border/60 text-center">
                      <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">Step {i + 1}</div>
                      <div className="text-sm font-medium text-foreground">{step}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* --- PROJECTS --- */}
          <section id="projects" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 p-2 rounded-xl"><LayoutDashboard className="w-5 h-5" /></div>
              Projects
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-3">Project Views</h3>
                <p className="mb-4">TaskKollecta offers multiple ways to visualize your work:</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { name: 'Board (Kanban)', desc: 'Drag-and-drop columns like To Do, In Progress, Done' },
                    { name: 'List', desc: 'Traditional task list with sorting and filtering' },
                    { name: 'Timeline (Gantt)', desc: 'Visualize task durations and dependencies' },
                    { name: 'Calendar', desc: 'See deadlines and tasks on a calendar grid' },
                  ].map(v => (
                    <div key={v.name} className="bg-background p-4 rounded-xl border border-border/60">
                      <h4 className="font-semibold text-foreground text-sm mb-1">{v.name}</h4>
                      <p className="text-xs text-muted-foreground">{v.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-3">Project Settings</h3>
                <p>Each project supports custom colors, privacy settings (public/private), templates, and status management (active, paused, completed, archived). Project leads can pin important projects and set due dates for milestone tracking.</p>
              </div>
            </div>
          </section>

          {/* --- TASKS --- */}
          <section id="tasks" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400 p-2 rounded-xl"><CheckCircle2 className="w-5 h-5" /></div>
              Tasks & Subtasks
            </h2>
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-4 text-muted-foreground leading-relaxed">
              <h3 className="text-lg font-semibold text-foreground">Task Properties</h3>
              <p>Each task includes a rich set of properties:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-semibold text-foreground">Property</th>
                      <th className="text-left py-2 font-semibold text-foreground">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      ['Title', 'The name of the task'],
                      ['Description', 'Rich text details, can be AI-generated'],
                      ['Status', 'todo, in_progress, review, done'],
                      ['Priority', 'urgent, high, medium, low'],
                      ['Assignee', 'Team member responsible for the task'],
                      ['Due Date', 'Optional deadline'],
                      ['Subtasks', 'Checklist items within a task'],
                      ['Dependencies', 'Blocked-by relationships to other tasks'],
                      ['Milestone', 'Flag important deliverables'],
                      ['Attachments', 'Upload files (images, PDFs, docs)'],
                      ['Comments', 'Team discussions with @mentions'],
                    ].map(([prop, desc]) => (
                      <tr key={prop}>
                        <td className="py-2 pr-4"><Badge variant="outline" className="font-mono text-xs">{prop}</Badge></td>
                        <td className="py-2 text-muted-foreground">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* --- TEAM --- */}
          <section id="team" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
              <div className="bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 p-2 rounded-xl"><Users className="w-5 h-5" /></div>
              Team Management
            </h2>
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-3 text-muted-foreground leading-relaxed">
              <p>Invite team members via email with role-based access control. TaskKollecta shows real-time presence (online indicators) and supports typing indicators in task comments.</p>
              <p><strong>Workload View</strong> lets you visualize how tasks are distributed across team members, helping you balance assignments and avoid burnout.</p>
              <p><strong>External Assignees:</strong> You can assign tasks to people outside your organization by entering their email — they&apos;ll receive an invite to join.</p>
            </div>
          </section>

          {/* --- AUTOMATIONS --- */}
          <section id="automations" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
              <div className="bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 p-2 rounded-xl"><Workflow className="w-5 h-5" /></div>
              Automations
            </h2>
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-3 text-muted-foreground leading-relaxed">
              <p>Set up trigger-based automations to reduce manual work:</p>
              <ul className="space-y-2 text-sm">
                {[
                  'When a task moves to "Done" → automatically notify the project lead',
                  'When a task is overdue → change priority to "urgent"',
                  'When a new member joins → automatically assign onboarding tasks',
                  'When all subtasks are complete → mark parent task as "Done"',
                ].map((rule, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <ChevronRight className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* --- AI FEATURES --- */}
          <section id="ai-features" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
              <div className="bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 p-2 rounded-xl"><Lightbulb className="w-5 h-5" /></div>
              AI Features
              <Badge className="bg-indigo-600 text-white text-xs">New</Badge>
            </h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-indigo-50 dark:from-indigo-950/40 to-violet-50 dark:to-violet-950/40 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-2">🧠 AI Task Breakdown</h3>
                <p className="text-muted-foreground mb-3">When creating a project, use the <strong>Step 4: AI Tasks</strong> feature to automatically generate 5–8 suggested tasks based on your project name and description. You can edit, accept, or remove each suggestion before creating.</p>
                <div className="bg-card/60 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/50 text-sm font-mono text-foreground">
                  Project: &quot;Launch Marketing Campaign&quot; → AI generates: Define target audience, Create content calendar, Design social assets, Set up analytics tracking, Draft email sequences...
                </div>
              </div>
              <div className="bg-gradient-to-br from-violet-50 dark:from-violet-950/40 to-purple-50 dark:to-purple-950/40 p-6 rounded-2xl border border-violet-100 dark:border-violet-900/50 shadow-sm">
                <h3 className="text-lg font-semibold text-foreground mb-2">📝 Smart Descriptions</h3>
                <p className="text-muted-foreground">Click the <strong>&quot;🪄 AI Describe&quot;</strong> button next to any task description to auto-generate detailed requirements, context, and acceptance criteria from the task title. The AI fills in the description field for you to review and save.</p>
              </div>
            </div>
          </section>

          {/* --- VIEWS & REPORTS --- */}
          <section id="views" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
              <div className="bg-teal-100 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 p-2 rounded-xl"><FileText className="w-5 h-5" /></div>
              Views & Reports
            </h2>
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-3 text-muted-foreground leading-relaxed">
              <p>TaskKollecta includes powerful reporting views:</p>
              <ul className="space-y-2 text-sm">
                {[
                  'Dashboard — Overview stats, productivity charts, priority breakdowns, and project status visualization',
                  'Gantt Chart — Timeline-based view with task durations, milestones, and dependency chains',
                  'Calendar View — See all tasks and deadlines on a monthly calendar',
                  'Workload View — Gauge team member utilization and rebalance assignments',
                  'Sprint Reports — Track sprint velocity and burndown over time',
                ].map((item, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <ChevronRight className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm mt-2">All views support <strong>CSV and PDF export</strong> for sharing and archival.</p>
            </div>
          </section>

          {/* --- SETTINGS & SECURITY --- */}
          <section id="settings" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
              <div className="bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 p-2 rounded-xl"><Shield className="w-5 h-5" /></div>
              Settings & Security
            </h2>
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-3 text-muted-foreground leading-relaxed">
              <p>Configure your account and organization through the Settings panel:</p>
              <ul className="space-y-2 text-sm">
                {[
                  'Profile — Update name, avatar, and preferences',
                  'Theme — Toggle light/dark mode or follow system preference',
                  'Organization — Manage org name, logo, and default settings',
                  'Security — Rate limiting, CORS configuration, and JWT-based authentication',
                  'Idle Timeout — Automatic session logout after inactivity',
                ].map((item, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <ChevronRight className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* --- NOTIFICATIONS --- */}
          <section id="notifications" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
              <div className="bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 p-2 rounded-xl"><Bell className="w-5 h-5" /></div>
              Notifications
            </h2>
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-3 text-muted-foreground leading-relaxed">
              <p>Stay updated with real-time notifications for task assignments, status changes, comments, and @mentions. Notifications appear in the bell icon in the sidebar and support:</p>
              <ul className="space-y-1 text-sm ml-4 list-disc">
                <li>In-app notification bell with unread count</li>
                <li>Reply-from-inbox on comment notifications</li>
                <li>Email notifications for critical updates</li>
                <li>Mark all as read, archive, or delete individual notifications</li>
              </ul>
            </div>
          </section>

          {/* --- INTEGRATIONS --- */}
          <section id="integrations" className="mb-16 scroll-mt-24">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
              <div className="bg-cyan-100 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 p-2 rounded-xl"><Zap className="w-5 h-5" /></div>
              Integrations
            </h2>
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm space-y-3 text-muted-foreground leading-relaxed">
              <p>TaskKollecta provides a REST API for custom integrations. Build automations, connect to CI/CD pipelines, or sync with third-party tools.</p>
              <p>See the <Link to="/api-reference" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">API Reference</Link> for full endpoint documentation.</p>
            </div>
          </section>

          {/* --- FOOTER CTA --- */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-8 sm:p-12 text-center shadow-xl">
            <h2 className="text-2xl font-bold mb-3">Still have questions?</h2>
            <p className="text-slate-300 mb-6 max-w-md mx-auto">Join our community or reach out. We&apos;re here to help you ship great work.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/community">
                <Button className="bg-card text-foreground hover:bg-muted rounded-full px-6">Community</Button>
              </Link>
              <Link to="/api-reference">
                <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 rounded-full px-6">API Reference</Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
