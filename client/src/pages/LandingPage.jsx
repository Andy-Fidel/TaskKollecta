import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Gauge,
  GitBranch,
  LayoutDashboard,
  Lock,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import dashboardUiImg from '../assets/landing-dashboard-ui.png';
import heroTeamImg from '../assets/landing-hero-team.png';
import conferenceImg from '../assets/landing-conference.png';
import gtvetsLogo from '../assets/gtvets_logo.png';
import tkLogo from '../assets/taskkollecta-logo.png';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};

const capabilities = [
  {
    icon: Workflow,
    title: 'Run the work',
    copy: 'Projects, boards, custom workflows, recurring work, dependencies, and intake forms stay in one operating system.',
  },
  {
    icon: Target,
    title: 'Align the work',
    copy: 'Goals and portfolios connect daily execution to team-level outcomes, so leaders see progress without another status meeting.',
  },
  {
    icon: Sparkles,
    title: 'Accelerate the work',
    copy: 'AI suggestions, automations, reminders, and real-time updates remove the small delays that slow teams down.',
  },
];

const proofStats = [
  { value: '1', label: 'workspace for goals, projects, tasks, forms, and reporting' },
  { value: '4+', label: 'ways to inspect work: board, list, calendar, timeline' },
  { value: '0', label: 'context lost between intake, planning, and delivery' },
];

const operatingSystem = [
  'Custom fields that travel from form intake to task execution.',
  'Portfolios that summarize cross-project health and completion.',
  'Goals that sync progress from linked work.',
  'Workload and sprint reporting for delivery confidence.',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f7f8fb] text-[#111827] selection:bg-[#4f46e5] selection:text-white">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={tkLogo} alt="TaskKollecta" className="h-9 w-9 rounded-lg object-contain shadow-sm" />
            <span className="text-base font-semibold tracking-tight">TaskKollecta</span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#platform" className="transition hover:text-slate-950">Platform</a>
            <a href="#outcomes" className="transition hover:text-slate-950">Outcomes</a>
            <a href="#security" className="transition hover:text-slate-950">Security</a>
            <Link to="/docs" className="transition hover:text-slate-950">Docs</Link>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" className="hidden h-9 rounded-md px-4 text-sm font-medium sm:inline-flex">
                Sign in
              </Button>
            </Link>
            <Link to="/login">
              <Button className="h-9 rounded-md bg-[#111827] px-4 text-sm font-semibold text-white hover:bg-black">
                Start free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative min-h-[92vh] overflow-hidden bg-[#0b1020] pt-16 text-white">
          <div className="absolute inset-0">
            <img src={dashboardUiImg} alt="TaskKollecta dashboard" className="h-full w-full object-cover opacity-35" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,16,32,0.98)_0%,rgba(11,16,32,0.88)_38%,rgba(11,16,32,0.58)_68%,rgba(11,16,32,0.36)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0b1020] to-transparent" />
          </div>

          <div className="relative mx-auto grid min-h-[calc(92vh-4rem)] max-w-7xl items-center gap-12 px-5 py-16 md:px-8 lg:grid-cols-[0.95fr_1.05fr]">
            <motion.div initial="hidden" animate="visible" className="max-w-3xl">
              <motion.div variants={fadeUp} className="mb-6 inline-flex items-center gap-2 rounded-md border border-white/14 bg-white/8 px-3 py-1.5 text-sm text-slate-200 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#53d18a]" />
                New work OS for ambitious teams
              </motion.div>
              <motion.h1 variants={fadeUp} className="max-w-4xl text-5xl font-semibold tracking-[-0.04em] text-white md:text-7xl lg:text-8xl">
                TaskKollecta
              </motion.h1>
              <motion.p variants={fadeUp} className="mt-6 max-w-2xl text-xl leading-8 text-slate-200 md:text-2xl md:leading-9">
                The command center where intake becomes action, projects ladder into goals, and leaders see the truth without chasing updates.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/login">
                  <Button className="h-12 rounded-md bg-white px-6 text-base font-semibold text-[#111827] hover:bg-slate-100">
                    Build your workspace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#platform">
                  <Button variant="outline" className="h-12 rounded-md border-white/20 bg-white/5 px-6 text-base font-semibold text-white hover:bg-white/10 hover:text-white">
                    See the platform
                  </Button>
                </a>
              </motion.div>
              <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-4 text-sm text-slate-300">
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#53d18a]" /> No credit card required</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#7dd3fc]" /> Secure by design</span>
                <span className="inline-flex items-center gap-2"><Gauge className="h-4 w-4 text-[#fbbf24]" /> Built for velocity</span>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="hidden lg:block"
            >
              <div className="rounded-lg border border-white/12 bg-white/10 p-2 shadow-2xl shadow-black/40 backdrop-blur-md">
                <img src={dashboardUiImg} alt="TaskKollecta product preview" className="w-full rounded-md border border-white/10 object-cover" />
              </div>
            </motion.div>
          </div>
        </section>

        <section className="-mt-1 bg-[#0b1020] px-5 pb-10 text-white md:px-8">
          <div className="mx-auto grid max-w-7xl gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 md:grid-cols-3">
            {proofStats.map((stat) => (
              <div key={stat.label} className="bg-[#11182b] p-6">
                <p className="text-4xl font-semibold tracking-tight">{stat.value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="platform" className="bg-white px-5 py-24 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#4f46e5]">Platform</p>
                <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.03em] text-slate-950 md:text-6xl">
                  One operating rhythm from request to result.
                </h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                TaskKollecta is not another place to park tasks. It is the system that captures demand, coordinates delivery, and explains progress to every stakeholder.
              </p>
            </div>

            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {capabilities.map((item) => (
                <section key={item.title} className="rounded-lg border border-slate-200 bg-[#fbfcff] p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#111827] text-white">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.copy}</p>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f7f8fb] px-5 py-24 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
            <div className="order-2 lg:order-1">
              <img src={heroTeamImg} alt="Team planning with TaskKollecta" className="w-full rounded-lg border border-slate-200 object-cover shadow-xl shadow-slate-200" />
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#0f766e]">The story</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-slate-950 md:text-5xl">
                Work stops slipping when every team can see the same system.
              </h2>
              <div className="mt-8 space-y-4">
                {operatingSystem.map((item, index) => (
                  <div key={item} className="flex gap-4 rounded-lg border border-slate-200 bg-white p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-950 text-sm font-semibold text-white">{index + 1}</span>
                    <p className="text-sm leading-6 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="outcomes" className="bg-white px-5 py-24 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#b45309]">Executive clarity</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-slate-950 md:text-6xl">
                  A premium view for leaders. A practical workspace for teams.
                </h2>
              </div>
              <div className="grid gap-3">
                <Outcome icon={Briefcase} title="Portfolio health" text="Understand project progress across departments without building another spreadsheet." />
                <Outcome icon={GitBranch} title="Dependency awareness" text="See what is blocked, what is moving, and where risk is building." />
                <Outcome icon={BarChart3} title="Delivery intelligence" text="Sprint reports, workload, and trend data turn conversations into decisions." />
              </div>
            </div>
          </div>
        </section>

        <section id="security" className="bg-[#111827] px-5 py-24 text-white md:px-8">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#93c5fd]">Trust</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
                Designed for teams who need speed and control.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-300">
                Roles, organization boundaries, private projects, secure authentication, and clear activity history give operators confidence as work scales.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <TrustItem icon={Lock} text="Role-based access" />
                <TrustItem icon={Users} text="Multi-organization workspaces" />
                <TrustItem icon={MessageSquareText} text="Comments, mentions, notifications" />
                <TrustItem icon={LayoutDashboard} text="Admin and analytics surfaces" />
              </div>
            </div>
            <div>
              <img src={conferenceImg} alt="Leadership team reviewing portfolio progress" className="w-full rounded-lg border border-white/10 object-cover shadow-2xl shadow-black/30" />
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-20 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 rounded-lg border border-slate-200 bg-[#f7f8fb] p-8 md:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <img src={gtvetsLogo} alt="GTVETS" className="h-9 object-contain" />
                <span className="text-sm font-medium text-slate-500">Teams already organize work with TaskKollecta</span>
              </div>
              <h2 className="mt-6 text-3xl font-semibold tracking-[-0.03em] text-slate-950 md:text-5xl">
                Give your team a calmer way to ship.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                Start with one project. Add forms, fields, goals, portfolios, and automations as the work matures.
              </p>
            </div>
            <Link to="/login">
              <Button className="h-12 rounded-md bg-[#111827] px-6 text-base font-semibold text-white hover:bg-black">
                Start free
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-5 py-12 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <img src={tkLogo} alt="TaskKollecta" className="h-8 w-8 rounded-md object-contain" />
            <span className="font-semibold tracking-tight">TaskKollecta</span>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-slate-500">
            <Link to="/docs" className="hover:text-slate-950">Docs</Link>
            <Link to="/api-reference" className="hover:text-slate-950">API</Link>
            <Link to="/community" className="hover:text-slate-950">Community</Link>
            <Link to="/privacy" className="hover:text-slate-950">Privacy</Link>
            <Link to="/terms" className="hover:text-slate-950">Terms</Link>
          </div>
          <p className="text-sm text-slate-400">© 2026 TaskKollecta.</p>
        </div>
      </footer>
    </div>
  );
}

function Outcome({ icon, title, text }) {
  const OutcomeIcon = icon;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#eef2ff] text-[#4f46e5]">
          <OutcomeIcon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold tracking-tight text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
        </div>
      </div>
    </div>
  );
}

function TrustItem({ icon, text }) {
  const TrustIcon = icon;
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
      <TrustIcon className="h-5 w-5 text-[#93c5fd]" />
      <span className="text-sm font-medium text-slate-200">{text}</span>
    </div>
  );
}
