import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Blocks,
  CheckCircle2,
  ChevronRight,
  CircleCheck,
  Clock3,
  Gauge,
  GitBranch,
  Inbox,
  Lock,
  MessageSquareText,
  ShieldCheck,
  Target,
  Users,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import workflowMotionImg from '../assets/taskkollecta-workflow-motion.webp';
import gtvetsLogo from '../assets/gtvets_logo.png';
import tkLogo from '../assets/taskkollecta-logo-flat.svg';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
};

const capabilities = [
  {
    icon: Inbox,
    eyebrow: 'Capture',
    title: 'Turn every request into clear work.',
    copy: 'Collect requests with forms, standardize the details, and route work to the right project without manual handoffs.',
  },
  {
    icon: Target,
    eyebrow: 'Align',
    title: 'Connect daily work to the bigger goal.',
    copy: 'Link tasks, projects, portfolios, and goals so every contributor knows what matters and leaders see progress in context.',
  },
  {
    icon: Workflow,
    eyebrow: 'Deliver',
    title: 'Keep momentum without more meetings.',
    copy: 'Automations, dependencies, workload views, and live updates reveal the next move before work gets stuck.',
  },
];

const proofStats = [
  { value: '01', label: 'Capture every request' },
  { value: '02', label: 'Coordinate the work' },
  { value: '03', label: 'Prove the outcome' },
];

const operatingSystem = [
  { icon: Blocks, title: 'One source of truth', copy: 'Projects, tasks, forms, goals, and reporting stay connected.' },
  { icon: GitBranch, title: 'Built-in accountability', copy: 'Owners, due dates, dependencies, and updates make the next step obvious.' },
  { icon: Gauge, title: 'Earlier visibility', copy: 'Spot workload pressure and delivery risk while there is still time to act.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fbfaf7] text-[#172033] selection:bg-[#dcd5ff] selection:text-[#172033]">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-[#e7e3dc] bg-[#fbfaf7]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={tkLogo} alt="TaskKollecta" className="h-9 w-9 rounded-lg object-contain transition-transform duration-300 group-hover:-rotate-3" />
            <span className="text-lg font-bold tracking-[-0.02em] text-[#172033]">TaskKollecta</span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium text-[#667085] md:flex">
            <a href="#platform" className="transition hover:text-[#172033]">How it works</a>
            <a href="#outcomes" className="transition hover:text-[#172033]">Why TaskKollecta</a>
            <a href="#security" className="transition hover:text-[#172033]">Security</a>
            <Link to="/docs" className="transition hover:text-[#172033]">Docs</Link>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" className="hidden h-9 rounded-lg px-4 text-sm font-medium text-[#344054] hover:bg-[#f1efe9] hover:text-[#172033] sm:inline-flex">
                Sign in
              </Button>
            </Link>
            <Link to="/login">
              <Button className="h-10 rounded-lg bg-[#5b43d6] px-5 text-sm font-semibold text-white hover:bg-[#4935b4]">
                Start free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden border-b border-[#e7e3dc] bg-[#fbfaf7] pt-16">
          <div className="mx-auto grid min-h-[760px] max-w-7xl items-center gap-12 px-5 py-20 md:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:py-24">
            <motion.div initial="hidden" animate="visible" className="max-w-2xl">
              <motion.div variants={fadeUp} className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d9d4ca] bg-white px-3 py-1.5 text-sm font-medium text-[#4b5565]">
                <span className="h-2 w-2 rounded-full bg-[#5b43d6]" />
                Work management, made coherent
              </motion.div>
              <motion.h1 variants={fadeUp} className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-[#172033] md:text-7xl">
                Turn scattered work into shared momentum.
              </motion.h1>
              <motion.p variants={fadeUp} className="mt-7 max-w-xl text-lg leading-8 text-[#5f6877] md:text-xl">
                TaskKollecta brings requests, projects, goals, and team capacity into one calm workspace—so everyone knows what matters, what is moving, and what needs attention.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link to="/login">
                  <Button className="h-12 rounded-lg bg-[#5b43d6] px-6 text-base font-semibold text-white hover:bg-[#4935b4]">
                    Start your workspace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#platform">
                  <Button variant="outline" className="h-12 rounded-lg border-[#d9d4ca] bg-white px-6 text-base font-semibold text-[#344054] hover:bg-[#f1efe9] hover:text-[#172033]">
                    See how it works
                  </Button>
                </a>
              </motion.div>
              <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#667085]">
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#158463]" /> No credit card</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#2563eb]" /> Secure by design</span>
                <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#c15c32]" /> Set up in minutes</span>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="relative overflow-hidden rounded-[2rem] border border-[#ded9cf] bg-[#f3eee5] shadow-[0_28px_80px_rgba(30,35,50,0.12)]">
                <motion.img
                  src={workflowMotionImg}
                  alt="Work moving from intake through collaboration to a completed goal"
                  className="aspect-[16/10] w-full object-cover"
                  animate={{ scale: [1, 1.018, 1], y: [0, -5, 0] }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div animate={{ y: [0, -8, 0], rotate: [0, -1, 0] }} transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }} className="absolute left-[8%] top-[12%] rounded-xl border border-[#ded9cf] bg-white px-3 py-2 shadow-lg">
                  <span className="flex items-center gap-2 text-xs font-semibold text-[#344054]"><Inbox className="h-4 w-4 text-[#e65d3f]" /> Request captured</span>
                </motion.div>
                <motion.div animate={{ y: [0, 7, 0], rotate: [0, 1, 0] }} transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} className="absolute bottom-[9%] right-[8%] rounded-xl border border-[#ded9cf] bg-white px-3 py-2 shadow-lg">
                  <span className="flex items-center gap-2 text-xs font-semibold text-[#344054]"><CircleCheck className="h-4 w-4 text-[#158463]" /> Goal on track</span>
                </motion.div>
              </div>
              <p className="mt-4 text-center text-xs font-medium uppercase tracking-[0.16em] text-[#8a8174]">From intake to impact — one connected flow</p>
            </motion.div>
          </div>
        </section>

        <section className="bg-[#172033] px-5 py-8 text-white md:px-8">
          <div className="mx-auto grid max-w-7xl gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-3">
            {proofStats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-4 bg-[#172033] p-5 md:justify-center">
                <p className="text-sm font-semibold text-[#a99cf2]">{stat.value}</p>
                <p className="text-sm font-medium text-[#e9e7e2]">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="platform" className="bg-[#fbfaf7] px-5 py-24 md:px-8 md:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5b43d6]">A better operating rhythm</p>
                <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[#172033] md:text-6xl">
                  Less chasing. More forward motion.
                </h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-[#667085]">
                Give every piece of work a clear path—from the moment it arrives to the outcome it supports. Your team gets focus; leadership gets the full picture.
              </p>
            </div>

            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {capabilities.map((item) => (
                <section key={item.title} className="rounded-2xl border border-[#e2ded6] bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-[#c8c0b3] hover:shadow-[0_18px_50px_rgba(30,35,50,0.08)]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eeeafe] text-[#5b43d6]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a8174]">{item.eyebrow}</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-[#172033]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#667085]">{item.copy}</p>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#ebe7df] px-5 py-24 md:px-8 md:py-32">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#13795b]">Clarity at every level</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#172033] md:text-5xl">
                The system stays useful as the work gets complex.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#5f6877]">Start simply with a project and a team. Add the structure you need—without creating a maze for the people doing the work.</p>
            </div>
            <div className="grid gap-4">
              {operatingSystem.map((item) => (
                <div key={item.title} className="flex gap-5 rounded-2xl border border-[#d8d2c7] bg-[#fbfaf7] p-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ddefe7] text-[#13795b]"><item.icon className="h-5 w-5" /></span>
                  <div><h3 className="font-semibold text-[#172033]">{item.title}</h3><p className="mt-1 text-sm leading-6 text-[#667085]">{item.copy}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="outcomes" className="bg-[#fbfaf7] px-5 py-24 md:px-8 md:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c15c32]">Built for both sides of work</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[#172033] md:text-6xl">
                  Practical for teams. Clear for leaders.
                </h2>
              </div>
              <div className="grid gap-3">
                <Outcome icon={Blocks} title="Portfolio health" text="Understand progress across projects and departments without another status spreadsheet." />
                <Outcome icon={GitBranch} title="Dependency awareness" text="See what is blocked, what is moving, and where risk is building." />
                <Outcome icon={BarChart3} title="Delivery intelligence" text="Sprint reports, workload, and trend data turn conversations into decisions." />
              </div>
            </div>
          </div>
        </section>

        <section id="security" className="bg-[#172033] px-5 py-24 text-white md:px-8 md:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#a99cf2]">Built for trust</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.03em] md:text-5xl">
                Move quickly without giving up control.
              </h2>
              <p className="mt-6 text-lg leading-8 text-[#c5cbd4]">
                Clear roles, organization boundaries, private projects, secure authentication, and activity history give every workspace a dependable foundation.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <TrustItem icon={Lock} text="Role-based access" />
                <TrustItem icon={Users} text="Multi-organization workspaces" />
                <TrustItem icon={MessageSquareText} text="Comments, mentions, notifications" />
                <TrustItem icon={BarChart3} text="Admin and analytics controls" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 rounded-3xl border border-white/10 bg-[#202b40] p-5 sm:p-7">
              <SecurityMetric value="Private" label="Project visibility" />
              <SecurityMetric value="Role-based" label="Workspace access" />
              <SecurityMetric value="Tracked" label="Activity history" />
              <SecurityMetric value="Protected" label="Organization data" />
            </div>
          </div>
        </section>

        <section className="bg-[#fbfaf7] px-5 py-20 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 rounded-3xl border border-[#e2ded6] bg-white p-8 md:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <img src={gtvetsLogo} alt="GTVETS" className="h-9 object-contain" />
                <span className="text-sm font-medium text-[#667085]">Trusted by teams building better systems</span>
              </div>
              <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-[#172033] md:text-5xl">
                Make the next step clear for everyone.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#667085]">
                Bring one project into TaskKollecta today. Your team can be organized and moving in minutes.
              </p>
            </div>
            <Link to="/login">
              <Button className="h-12 rounded-lg bg-[#5b43d6] px-6 text-base font-semibold text-white hover:bg-[#4935b4]">
                Start free
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e7e3dc] bg-[#fbfaf7] px-5 py-12 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src={tkLogo} alt="TaskKollecta" className="h-10 w-10 rounded-lg object-contain shadow-sm" />
            <span className="font-bold tracking-tight text-[#172033]">TaskKollecta</span>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-[#667085]">
            <Link to="/docs" className="hover:text-[#172033]">Docs</Link>
            <Link to="/api-reference" className="hover:text-[#172033]">API</Link>
            <Link to="/community" className="hover:text-[#172033]">Community</Link>
            <Link to="/privacy" className="hover:text-[#172033]">Privacy</Link>
            <Link to="/terms" className="hover:text-[#172033]">Terms</Link>
          </div>
          <p className="text-sm text-[#667085]">© 2026 TaskKollecta.</p>
        </div>
      </footer>
    </div>
  );
}

function Outcome({ icon, title, text }) {
  const OutcomeIcon = icon;
  return (
    <div className="rounded-2xl border border-[#e2ded6] bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0e9] text-[#c15c32]">
          <OutcomeIcon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold tracking-tight text-[#172033]">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-[#667085]">{text}</p>
        </div>
      </div>
    </div>
  );
}

function TrustItem({ icon, text }) {
  const TrustIcon = icon;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#202b40] p-4">
      <TrustIcon className="h-5 w-5 text-[#a99cf2]" />
      <span className="text-sm font-medium text-[#e4e7ec]">{text}</span>
    </div>
  );
}

function SecurityMetric({ value, label }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#172033] p-5">
      <p className="text-xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-[#aab2bf]">{label}</p>
    </div>
  );
}
