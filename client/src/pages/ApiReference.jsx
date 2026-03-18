import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Code2, Copy, Check, ChevronRight, Search,
  FolderKanban, ListTodo, Users, MessageSquare, Bell,
  BarChart3, Upload, Shield, Zap, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ENDPOINT_GROUPS = [
  {
    name: 'Authentication',
    icon: Shield,
    color: 'bg-red-100 text-red-600',
    base: '/api/users',
    endpoints: [
      { method: 'POST', path: '/register', desc: 'Create a new user account', auth: false },
      { method: 'POST', path: '/login', desc: 'Authenticate and receive JWT token', auth: false },
      { method: 'POST', path: '/forgot-password', desc: 'Send password reset email', auth: false },
      { method: 'PUT', path: '/reset-password/:token', desc: 'Reset password with token', auth: false },
      { method: 'GET', path: '/me', desc: 'Get current user profile', auth: true },
      { method: 'PUT', path: '/profile', desc: 'Update user profile', auth: true },
    ]
  },
  {
    name: 'Organizations',
    icon: Users,
    color: 'bg-violet-100 text-violet-600',
    base: '/api/organizations',
    endpoints: [
      { method: 'POST', path: '/', desc: 'Create a new organization', auth: true },
      { method: 'GET', path: '/:id', desc: 'Get organization details', auth: true },
      { method: 'PUT', path: '/:id', desc: 'Update organization settings', auth: true },
      { method: 'GET', path: '/:id/members', desc: 'List all members', auth: true },
      { method: 'POST', path: '/:id/invite', desc: 'Invite a member by email', auth: true },
      { method: 'DELETE', path: '/:id/members/:userId', desc: 'Remove a member', auth: true },
    ]
  },
  {
    name: 'Projects',
    icon: FolderKanban,
    color: 'bg-blue-100 text-blue-600',
    base: '/api/projects',
    endpoints: [
      { method: 'GET', path: '/', desc: 'List projects for current organization', auth: true },
      { method: 'POST', path: '/', desc: 'Create a new project', auth: true },
      { method: 'GET', path: '/:id', desc: 'Get project details with stats', auth: true },
      { method: 'PUT', path: '/:id', desc: 'Update project properties', auth: true },
      { method: 'DELETE', path: '/:id', desc: 'Delete a project and its tasks', auth: true },
      { method: 'POST', path: '/:id/duplicate', desc: 'Duplicate a project as template', auth: true },
    ]
  },
  {
    name: 'Tasks',
    icon: ListTodo,
    color: 'bg-green-100 text-green-600',
    base: '/api/tasks',
    endpoints: [
      { method: 'GET', path: '/', desc: 'List tasks (filter by project, status, assignee)', auth: true },
      { method: 'POST', path: '/', desc: 'Create a new task', auth: true },
      { method: 'GET', path: '/:id', desc: 'Get task details with subtasks and dependencies', auth: true },
      { method: 'PUT', path: '/:id', desc: 'Update task properties (status, priority, etc.)', auth: true },
      { method: 'DELETE', path: '/:id', desc: 'Delete a task', auth: true },
      { method: 'POST', path: '/:id/children', desc: 'Create a sub-task under a parent task', auth: true },
      { method: 'GET', path: '/:id/children', desc: 'List sub-tasks of a parent task', auth: true },
      { method: 'POST', path: '/:id/dependencies', desc: 'Add a task dependency', auth: true },
      { method: 'DELETE', path: '/:id/dependencies/:depId', desc: 'Remove a dependency', auth: true },
      { method: 'POST', path: '/:id/attachments', desc: 'Add an attachment to a task', auth: true },
    ]
  },
  {
    name: 'Comments',
    icon: MessageSquare,
    color: 'bg-amber-100 text-amber-600',
    base: '/api/comments',
    endpoints: [
      { method: 'GET', path: '/:taskId', desc: 'Get all comments for a task', auth: true },
      { method: 'POST', path: '/', desc: 'Create a comment (supports @mentions)', auth: true },
      { method: 'DELETE', path: '/:id', desc: 'Delete a comment', auth: true },
    ]
  },
  {
    name: 'Dashboard & Analytics',
    icon: BarChart3,
    color: 'bg-teal-100 text-teal-600',
    base: '/api/dashboard',
    endpoints: [
      { method: 'GET', path: '/stats', desc: 'Get dashboard statistics and chart data', auth: true },
      { method: 'GET', path: '/productivity', desc: 'Get productivity metrics over time', auth: true },
    ]
  },
  {
    name: 'AI',
    icon: Zap,
    color: 'bg-indigo-100 text-indigo-600',
    base: '/api/ai',
    endpoints: [
      { method: 'POST', path: '/breakdown', desc: 'Generate AI task breakdown from project name', auth: true },
      { method: 'POST', path: '/describe', desc: 'Generate AI description for a task title', auth: true },
    ]
  },
  {
    name: 'File Upload',
    icon: Upload,
    color: 'bg-pink-100 text-pink-600',
    base: '/api/upload',
    endpoints: [
      { method: 'POST', path: '/', desc: 'Upload a file (images, PDFs, docs, spreadsheets, zip)', auth: true },
    ]
  },
  {
    name: 'Notifications',
    icon: Bell,
    color: 'bg-orange-100 text-orange-600',
    base: '/api/notifications',
    endpoints: [
      { method: 'GET', path: '/', desc: 'List notifications for current user', auth: true },
      { method: 'PUT', path: '/:id/read', desc: 'Mark a notification as read', auth: true },
      { method: 'PUT', path: '/read-all', desc: 'Mark all notifications as read', auth: true },
    ]
  },
];

const METHOD_COLORS = {
  GET: 'bg-emerald-100 text-emerald-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-600">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function ApiReference() {
  const [expandedGroup, setExpandedGroup] = useState('Authentication');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGroups = ENDPOINT_GROUPS.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.endpoints.some(e => e.path.includes(searchQuery) || e.desc.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-50 font-[Poppins]">

      {/* --- STICKY NAV --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">TK</div>
              <span className="font-bold text-lg text-slate-900">TaskKollecta</span>
            </Link>
            <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 font-mono text-xs">API</Badge>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/docs">
              <Button variant="ghost" size="sm" className="text-sm text-slate-600 hover:text-indigo-600">Documentation</Button>
            </Link>
            <Link to="/community">
              <Button variant="ghost" size="sm" className="text-sm text-slate-600 hover:text-indigo-600">Community</Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-5 shadow-md">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 sm:px-8 pt-28 pb-16">

        {/* Hero */}
        <div className="mb-12">
          <div className="flex items-center gap-2 text-sm text-violet-600 font-medium mb-4">
            <Code2 className="w-4 h-4" />
            API Reference
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight mb-4">
            REST API
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
            Build integrations and automate workflows using the TaskKollecta REST API. All endpoints require JWT authentication unless otherwise noted.
          </p>
        </div>

        {/* Base URL */}
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-1 font-mono">BASE URL</p>
            <code className="text-sm sm:text-base font-mono text-emerald-400">https://api.taskkollecta.com</code>
          </div>
          <CopyButton text="https://api.taskkollecta.com" />
        </div>

        {/* Auth Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" /> Authentication
          </h2>
          <p className="text-slate-600 text-sm mb-4">
            Include the JWT token in the <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">Authorization</code> header:
          </p>
          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-sm overflow-x-auto flex items-center justify-between gap-2">
            <code>Authorization: Bearer {'<'}your_jwt_token{'>'}</code>
            <CopyButton text="Authorization: Bearer <your_jwt_token>" />
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search endpoints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white rounded-xl text-sm border border-slate-200 outline-none text-slate-700 placeholder:text-slate-400 focus:ring-2 ring-indigo-200 transition-all shadow-sm"
          />
        </div>

        {/* Endpoint Groups */}
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const Icon = group.icon;
            const isExpanded = expandedGroup === group.name;
            return (
              <div key={group.name} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedGroup(isExpanded ? '' : group.name)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${group.color} flex items-center justify-center`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{group.name}</h3>
                      <p className="text-xs text-slate-400 font-mono">{group.base}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs font-mono">{group.endpoints.length} endpoints</Badge>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {group.endpoints.map((ep, i) => (
                      <div key={i} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                        <Badge className={`${METHOD_COLORS[ep.method]} font-mono text-[10px] mt-0.5 px-2 shrink-0 font-bold`}>
                          {ep.method}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <code className="text-sm font-mono text-slate-800 break-all">{group.base}{ep.path}</code>
                          <p className="text-xs text-slate-500 mt-0.5">{ep.desc}</p>
                        </div>
                        {ep.auth && (
                          <Badge variant="outline" className="text-[10px] shrink-0 text-slate-400 mt-0.5">Auth</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Example Request */}
        <div className="mt-12 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Example: Create a Task</h2>
          <div className="bg-slate-900 rounded-xl p-5 overflow-x-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600 text-white font-mono text-xs">POST</Badge>
                <code className="text-sm text-slate-300 font-mono">/api/tasks</code>
              </div>
              <CopyButton text={`curl -X POST https://api.taskkollecta.com/api/tasks \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Design landing page",
    "description": "Create wireframes and mockups",
    "status": "todo",
    "priority": "high",
    "projectId": "64abc123...",
    "orgId": "64def456..."
  }'`} />
            </div>
            <pre className="text-sm text-slate-300 font-mono whitespace-pre leading-relaxed">
{`curl -X POST https://api.taskkollecta.com/api/tasks \\
  -H "Authorization: Bearer <token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Design landing page",
    "description": "Create wireframes and mockups",
    "status": "todo",
    "priority": "high",
    "projectId": "64abc123...",
    "orgId": "64def456..."
  }'`}
            </pre>
          </div>

          <div className="mt-4 bg-slate-50 rounded-xl p-5 border border-slate-200/60">
            <p className="text-xs text-slate-400 font-mono mb-2">Response 201</p>
            <pre className="text-sm text-slate-700 font-mono whitespace-pre leading-relaxed">
{`{
  "_id": "64ghi789...",
  "title": "Design landing page",
  "status": "todo",
  "priority": "high",
  "project": "64abc123...",
  "reporter": "64user01...",
  "createdAt": "2026-03-18T22:00:00.000Z"
}`}
            </pre>
          </div>
        </div>

        {/* Rate Limits */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="font-semibold text-amber-900 mb-2">⚡ Rate Limits</h3>
          <ul className="text-sm text-amber-800 space-y-1.5">
            <li>• <strong>General API:</strong> 100 requests per 15 minutes</li>
            <li>• <strong>Auth endpoints:</strong> 10 requests per 15 minutes</li>
            <li>• <strong>Write operations:</strong> 30 requests per minute</li>
            <li>• <strong>AI endpoints:</strong> 10 requests per minute</li>
          </ul>
        </div>

        {/* Footer CTA */}
        <div className="mt-12 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-8 sm:p-12 text-center shadow-xl">
          <h2 className="text-2xl font-bold mb-3">Ready to build?</h2>
          <p className="text-slate-300 mb-6 max-w-md mx-auto">Get your API key and start integrating with TaskKollecta.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/login">
              <Button className="bg-white text-slate-900 hover:bg-slate-100 rounded-full px-6">Get API Key</Button>
            </Link>
            <Link to="/docs">
              <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 rounded-full px-6">
                <BookOpen className="w-4 h-4 mr-1.5" /> Documentation
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
