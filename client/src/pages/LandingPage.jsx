import { Link } from 'react-router-dom';
import { 
  ArrowRight, CheckCircle2, Zap, Layout, 
  Users, BarChart3, ShieldCheck, Play, Globe, Lock, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Asset Imports
import heroTeamImg from '../assets/landing-hero-team.png';
import dashboardUiImg from '../assets/landing-dashboard-ui.png';
import conferenceImg from '../assets/landing-conference.png';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-[Poppins] selection:bg-indigo-500 selection:text-white">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-sm supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-slate-900/20">TK</div>
            <span className="font-bold text-xl tracking-tight text-slate-900">TaskKollecta</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#solutions" className="hover:text-indigo-600 transition-colors">Solutions</a>
            <a href="#customers" className="hover:text-indigo-600 transition-colors">Customers</a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login">
                <Button variant="ghost" className="hidden sm:inline-flex font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50">Sign in</Button>
            </Link>
            <Link to="/login">
                <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-6 shadow-xl shadow-slate-900/20 transition-all hover:scale-105 active:scale-95">
                    Get Started
                </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="pt-32 pb-20 px-6 lg:pt-48 lg:pb-32 overflow-hidden relative">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-indigo-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[800px] h-[800px] bg-purple-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-sm font-medium text-slate-600 hover:border-indigo-200 transition-colors cursor-pointer">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
              New: AI-Powered Automations v2.0
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1]">
              Manage projects <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                 without the chaos.
              </span>
            </h1>
            
            <p className="text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              TaskKollecta connects your team, tasks, and tools in one fluid workspace. Stop managing busywork and start shipping software.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-4">
              <Link to="/login" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full h-14 px-8 text-lg rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-1">
                      Start building free <ArrowRight className="ml-2 h-5 w-5"/>
                  </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg rounded-full border-slate-200 bg-white/50 backdrop-blur-sm text-slate-700 hover:bg-white hover:border-slate-300 transition-all">
                  <Play className="mr-2 h-4 w-4 fill-slate-700" /> Watch Demo
              </Button>
            </div>

            <div className="pt-8 flex flex-col items-center lg:items-start gap-4">
              <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Trusted by 10,000+ teams</p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                 {['Acme Corp', 'Linear', 'Stripe', 'Vercel', 'Airbnb'].map(logo => (
                     <span key={logo} className="font-bold text-xl text-slate-800">{logo}</span>
                 ))}
              </div>
            </div>
          </div>

          <div className="relative">
             <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-[2.5rem] blur-2xl opacity-20"></div>
             <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white">
                <img 
                    src={heroTeamImg} 
                    alt="Team collaboration" 
                    className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700"
                />
             </div>
             {/* Floating Badge */}
             <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-4 animate-bounce-slow max-w-xs">
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-xs text-slate-500 font-medium">Sprint Goal Reached</p>
                    <p className="text-sm font-bold text-slate-900">Q3 Product Launch 🚀</p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* --- DASHBOARD PREVIEW SECTION --- */}
      <section className="py-24 bg-white relative">
         <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                <h2 className="text-3xl md:text-5xl font-bold text-slate-900">One dashboard to rule them all.</h2>
                <p className="text-xl text-slate-500">
                   Get a bird's eye view of your entire organization. Track progress, velocity, and health in real-time.
                </p>
            </div>
            
            <div className="relative group perspective-1000">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl opacity-20 blur-xl group-hover:opacity-30 transition duration-1000"></div>
                <div className="relative rounded-2xl overflow-hidden border border-slate-200/60 shadow-2xl bg-slate-900/5 backdrop-blur-sm transform group-hover:rotate-x-2 transition-transform duration-700 ease-out">
                    <img 
                        src={dashboardUiImg} 
                        alt="TaskKollecta Dashboard" 
                        className="w-full h-auto shadow-inner"
                    />
                </div>
            </div>
         </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-8">
                <FeatureCard 
                    icon={Layout} 
                    title="Kanban Boards" 
                    desc="Visualize work in progress with fluid, drag-and-drop boards designed for flow."
                />
                <FeatureCard 
                    icon={Zap} 
                    title="Smart Automations" 
                    desc="Save hours every week. Let our AI handle task assignments, status updates, and notifications."
                />
                <FeatureCard 
                    icon={Users} 
                    title="Real-time Context" 
                    desc="Collaborate live. See who's typing, who's viewing, and solve problems together instantly."
                />
                <FeatureCard 
                    icon={BarChart3} 
                    title="Deep Analytics" 
                    desc="Uncover bottlenecks with instant sprint reports, burndown charts, and velocity tracking."
                />
                <FeatureCard 
                    icon={ShieldCheck} 
                    title="Enterprise Security" 
                    desc="SOC2 compliant, SSO ready, and encrypted at rest. Your data is safe with us."
                />
                <FeatureCard 
                    icon={Globe} 
                    title="Global Infrastructure" 
                    desc="Lightning fast performance from anywhere in the world, backed by minimal latency."
                />
            </div>
        </div>
      </section>

      {/* --- ENTERPRISE SECTION --- */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden">
             <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-3xl"></div>
             <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10">
              <div className="flex flex-col lg:flex-row items-center gap-16">
                  <div className="flex-1 space-y-8">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                        <Lock className="w-4 h-4" /> Enterprise Grade
                      </div>
                      <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
                          Scale your team <br/> without breaking your process.
                      </h2>
                      <p className="text-xl text-slate-300 leading-relaxed">
                          Whether you're a startup of 10 or an enterprise of 10,000, TaskKollecta adapts to your workflow. 
                          Manage multiple organizations, enforce granular permissions, and get insights that matter.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-6 pt-4">
                          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                              <h4 className="text-2xl font-bold text-white mb-1">99.99%</h4>
                              <p className="text-sm text-slate-400">Uptime SLA</p>
                          </div>
                          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                              <h4 className="text-2xl font-bold text-white mb-1">24/7</h4>
                              <p className="text-sm text-slate-400">Priority Support</p>
                          </div>
                      </div>

                      <Button className="h-14 px-8 bg-white text-slate-900 hover:bg-slate-100 rounded-full text-lg">
                          Contact Sales
                      </Button>
                  </div>
                  
                  <div className="flex-1 relative">
                       <div className="absolute -inset-4 bg-indigo-500/30 rounded-2xl blur-xl"></div>
                       <img 
                          src={conferenceImg} 
                          alt="Enterprise Conference" 
                          className="relative rounded-2xl border border-white/10 shadow-2xl w-full h-auto"
                       />
                       {/* Glass Cards */}
                       <div className="absolute -bottom-8 -left-8 bg-slate-800/90 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-xl max-w-xs hidden md:block">
                           <div className="flex items-center gap-4 mb-4">
                               <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                   JD
                               </div>
                               <div>
                                   <p className="text-white font-medium">John Doe</p>
                                   <p className="text-xs text-slate-400">Head of Product</p>
                               </div>
                           </div>
                           <p className="text-sm text-slate-300 italic">"This platform revolutionized how we ship features. It's simply the best."</p>
                       </div>
                  </div>
              </div>
          </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-24 px-6 bg-white">
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-slate-200">
              <div className="relative z-10 space-y-8">
                  <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Ready to transform your workflow?</h2>
                  <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                      Join the new standard in project management. 
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                      <Link to="/login">
                        <Button size="lg" className="h-14 px-8 text-lg bg-white text-slate-900 hover:bg-indigo-50 rounded-full shadow-lg transition-all hover:-translate-y-1">
                            Get Started for Free
                        </Button>
                      </Link>
                  </div>
                  <p className="text-sm text-slate-500">No credit card required · Cancel anytime</p>
              </div>
          </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-50 border-t border-slate-200 py-16 px-6">
          <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
              <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">TK</div>
                    <span className="font-bold text-xl text-slate-900">TaskKollecta</span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">
                      Built for modern teams who demand excellence. 
                      Ship faster, collaborate better, and measure everything.
                  </p>
              </div>
              <div>
                  <h4 className="font-bold text-slate-900 mb-6">Product</h4>
                  <ul className="space-y-3 text-sm text-slate-500">
                      <li><a href="#" className="hover:text-indigo-600 transition-colors">Features</a></li>
                      <li><a href="#" className="hover:text-indigo-600 transition-colors">Automations</a></li>
                      <li><a href="#" className="hover:text-indigo-600 transition-colors">Integrations</a></li>
                      <li><a href="#" className="hover:text-indigo-600 transition-colors">Changelog</a></li>
                  </ul>
              </div>
              <div>
                  <h4 className="font-bold text-slate-900 mb-6">Resources</h4>
                  <ul className="space-y-3 text-sm text-slate-500">
                      <li><a href="#" className="hover:text-indigo-600 transition-colors">Documentation</a></li>
                      <li><a href="#" className="hover:text-indigo-600 transition-colors">API Reference</a></li>
                      <li><a href="#" className="hover:text-indigo-600 transition-colors">Community</a></li>
                      <li><a href="#" className="hover:text-indigo-600 transition-colors">Blog</a></li>
                  </ul>
              </div>
              <div>
                  <h4 className="font-bold text-slate-900 mb-6">Legal</h4>
                  <ul className="space-y-3 text-sm text-slate-500">
                      <li><a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a></li>
                      <li><a href="#" className="hover:text-indigo-600 transition-colors">Terms</a></li>
                      <li><a href="#" className="hover:text-indigo-600 transition-colors">Security</a></li>
                  </ul>
              </div>
          </div>
          <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center text-sm text-slate-400">
              <p>© 2026 TaskKollecta Inc. All rights reserved.</p>
              <div className="flex gap-6 mt-4 md:mt-0">
                  <a href="#" className="hover:text-slate-600">Twitter</a>
                  <a href="#" className="hover:text-slate-600">GitHub</a>
                  <a href="#" className="hover:text-slate-600">Discord</a>
              </div>
          </div>
      </footer>

    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }) {
    return (
        <div className="group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-500"></div>
            <div className="h-14 w-14 bg-white border border-slate-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm relative z-10 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                <Icon className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3 relative z-10">{title}</h3>
            <p className="text-slate-500 leading-relaxed relative z-10">{desc}</p>
        </div>
    )
}