import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users, MessageCircle, Github, BookOpen, Heart,
  ExternalLink, ArrowRight, Lightbulb, HelpCircle,
  Star, Trophy, Zap, Code2, Megaphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const COMMUNITY_LINKS = [
  {
    title: 'GitHub Discussions',
    desc: 'Report bugs, request features, and browse the source code.',
    icon: Github,
    color: 'bg-slate-900 text-white',
    cta: 'Visit GitHub',
    href: '#',
  },
  {
    title: 'Discord Server',
    desc: 'Chat with the team and community in real time. Get help fast.',
    icon: MessageCircle,
    color: 'bg-indigo-600 text-white',
    cta: 'Join Discord',
    href: '#',
  },
  {
    title: 'Twitter / X',
    desc: 'Follow us for product updates, tips, and release announcements.',
    icon: Megaphone,
    color: 'bg-sky-500 text-white',
    cta: 'Follow @TaskKollecta',
    href: '#',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Is TaskKollecta free to use?',
    a: 'Yes! TaskKollecta offers a generous free tier for small teams. Paid plans unlock advanced features like AI task breakdown, custom automations, and priority support.',
  },
  {
    q: 'How do I report a bug?',
    a: 'Open an issue on our GitHub repository with steps to reproduce. Our team triages issues weekly and aims to respond within 48 hours.',
  },
  {
    q: 'Can I use the API for free?',
    a: 'The REST API is available on all plans. Rate limits apply: 100 requests per 15 minutes on the free tier, with higher limits on paid plans.',
  },
  {
    q: 'How do I request a feature?',
    a: 'Post your idea in GitHub Discussions or the #feature-requests channel on our Discord. Upvote existing requests to help us prioritize.',
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. We use JWT-based authentication, bcrypt password hashing, rate limiting, CORS protection, and helmet.js security headers. Your data is encrypted in transit via HTTPS.',
  },
  {
    q: 'What AI model powers the features?',
    a: 'TaskKollecta uses Google Gemini (gemini-2.0-flash) for AI Task Breakdown and Smart Descriptions. AI endpoints are rate-limited to 10 requests per minute.',
  },
];

const CONTRIBUTORS = [
  { name: 'Andy', role: 'Creator & Lead Dev', avatar: 'A' },
  { name: 'Sam', role: 'Backend & DevOps', avatar: 'S' },
  { name: 'Community', role: 'Open Source Contributors', avatar: '❤️' },
];

export default function Community() {
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
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-mono text-xs">Community</Badge>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/docs">
              <Button variant="ghost" size="sm" className="text-sm text-slate-600 hover:text-indigo-600">Docs</Button>
            </Link>
            <Link to="/api-reference">
              <Button variant="ghost" size="sm" className="text-sm text-slate-600 hover:text-indigo-600">API</Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-5 shadow-md">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 sm:px-8 pt-28 pb-16">

        {/* --- HERO --- */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 font-medium mb-4">
            <Users className="w-4 h-4" />
            Community
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight mb-4">
            Build Together
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Join a growing community of teams and developers using TaskKollecta to ship better work. Get help, share ideas, and contribute.
          </p>
        </div>

        {/* --- COMMUNITY CHANNELS --- */}
        <div className="grid sm:grid-cols-3 gap-5 mb-16">
          {COMMUNITY_LINKS.map((ch) => {
            const Icon = ch.icon;
            return (
              <a key={ch.title} href={ch.href} target="_blank" rel="noopener noreferrer" className="group block">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 h-full flex flex-col">
                  <div className={`w-12 h-12 rounded-2xl ${ch.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">{ch.title}</h3>
                  <p className="text-sm text-slate-500 flex-1 leading-relaxed">{ch.desc}</p>
                  <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium mt-4 group-hover:gap-3 transition-all">
                    {ch.cta} <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </div>
              </a>
            );
          })}
        </div>

        {/* --- GET INVOLVED --- */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Get Involved</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: HelpCircle, title: 'Ask & Answer', desc: 'Help others in discussions and earn community recognition', color: 'text-blue-600 bg-blue-50' },
              { icon: Lightbulb, title: 'Share Ideas', desc: 'Propose features and vote on the roadmap priorities', color: 'text-amber-600 bg-amber-50' },
              { icon: Code2, title: 'Contribute Code', desc: 'Submit pull requests, fix bugs, or improve documentation', color: 'text-emerald-600 bg-emerald-50' },
              { icon: Star, title: 'Star on GitHub', desc: 'Show your support and help us reach more teams', color: 'text-violet-600 bg-violet-50' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* --- CONTRIBUTORS --- */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">Core Team</h2>
          <div className="flex justify-center gap-6 flex-wrap">
            {CONTRIBUTORS.map((c) => (
              <div key={c.name} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center min-w-[160px] hover:shadow-md transition-shadow">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 shadow-lg shadow-indigo-200">
                  {c.avatar}
                </div>
                <h3 className="font-semibold text-slate-900">{c.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{c.role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* --- FAQ --- */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center flex items-center justify-center gap-2">
            <HelpCircle className="w-6 h-6 text-indigo-600" /> FAQ
          </h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-start gap-2">
                  <span className="text-indigo-600 font-bold shrink-0">Q.</span>
                  {item.q}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed ml-6">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* --- NEWSLETTER --- */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-3xl p-8 sm:p-12 text-center text-white shadow-xl">
            <Zap className="w-8 h-8 mx-auto mb-4 text-indigo-200" />
            <h2 className="text-2xl font-bold mb-3">Stay in the Loop</h2>
            <p className="text-indigo-100 mb-6 max-w-md mx-auto">Get product updates, community highlights, and tips delivered to your inbox. No spam, unsubscribe anytime.</p>
            <div className="flex gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="you@company.com"
                className="flex-1 px-4 py-3 rounded-full bg-white/20 backdrop-blur text-white placeholder:text-indigo-200 border border-white/20 outline-none focus:ring-2 ring-white/30 text-sm"
              />
              <Button className="bg-white text-indigo-700 hover:bg-indigo-50 rounded-full px-6 font-semibold shadow-md">Subscribe</Button>
            </div>
          </div>
        </section>

        {/* --- FOOTER CTA --- */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-8 sm:p-12 text-center shadow-xl">
          <Trophy className="w-8 h-8 mx-auto mb-4 text-amber-400" />
          <h2 className="text-2xl font-bold mb-3">Ready to get started?</h2>
          <p className="text-slate-300 mb-6 max-w-md mx-auto">Join thousands of teams already using TaskKollecta to organize and ship their best work.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/login">
              <Button className="bg-white text-slate-900 hover:bg-slate-100 rounded-full px-6 shadow-md">
                Create Free Account <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link to="/docs">
              <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 rounded-full px-6">
                <BookOpen className="w-4 h-4 mr-1.5" /> Read the Docs
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
