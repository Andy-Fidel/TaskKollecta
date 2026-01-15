import { Link } from 'react-router-dom';
import { 
  ArrowRight, CheckCircle2, Zap, Layout, 
  Users, BarChart3, ShieldCheck, Play 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-[Poppins]">
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">TK</div>
            <span className="font-bold text-xl tracking-tight">TaskKollecta</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#testimonials" className="hover:text-slate-900 transition-colors">Customers</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login">
                <Button variant="ghost" className="font-medium text-slate-600 hover:text-slate-900">Sign in</Button>
            </Link>
            <Link to="/login">
                <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-6 shadow-lg shadow-slate-900/20">
                    Get Started
                </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200">
            <span className="mr-2 text-indigo-600 font-bold">New</span> Automations are live v2.0
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1] text-balance">
            Project management for <br className="hidden md:block"/> 
            <span className="text-slate-900 relative">
               teams that ship.
               <svg className="absolute w-full h-3 -bottom-1 left-0 text-indigo-500 opacity-20" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" /></svg>
            </span>
          </h1>
          
          <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Stop juggling spreadsheets and chaotic chats. TaskKollecta brings your tasks, automations, and team together in one lightning-fast workspace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/login">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1">
                    Start building for free <ArrowRight className="ml-2 h-5 w-5"/>
                </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300">
                <Play className="mr-2 h-4 w-4 fill-slate-700" /> Watch Demo
            </Button>
          </div>

          <div className="pt-10 text-sm text-slate-400">
            Trusted by forward-thinking teams at
            <div className="flex flex-wrap justify-center gap-8 mt-6 opacity-60 grayscale">
               {/* Placeholder Logos */}
               {['Acme Corp', 'GlobalBank', 'Stripe', 'Vercel', 'Linear'].map(logo => (
                   <span key={logo} className="font-bold text-xl">{logo}</span>
               ))}
            </div>
          </div>
        </div>

        {/* Dashboard Preview Image */}
        <div className="mt-20 max-w-6xl mx-auto relative group">
            <div className="absolute -inset-1 bg-slate-200 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-2xl bg-slate-50">
                <div className="h-8 bg-white border-b border-slate-100 flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                {/* Replace with a real screenshot of your app later */}
                <img 
                    src="https://cdn.dribbble.com/userupload/12534570/file/original-070490705053707730e7df969796e949.png?resize=2400x1800" 
                    alt="App Dashboard" 
                    className="w-full h-auto object-cover"
                />
            </div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-24 bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Everything you need to execute.</h2>
                <p className="text-lg text-slate-500">We stripped away the bloat and kept the power. TaskKollecta is designed for speed and clarity.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <FeatureCard 
                    icon={Layout} 
                    title="Kanban Boards" 
                    desc="Visualize work in progress with drag-and-drop boards that feel fluid and fast."
                />
                <FeatureCard 
                    icon={Zap} 
                    title="Powerful Automations" 
                    desc="Stop doing busy work. Set up 'If This Then That' rules to auto-assign, archive, and update."
                />
                <FeatureCard 
                    icon={Users} 
                    title="Real-time Collaboration" 
                    desc="See who's viewing a task, comment in real-time, and never step on each other's toes."
                />
                <FeatureCard 
                    icon={BarChart3} 
                    title="Instant Analytics" 
                    desc="Zero-config dashboards showing team velocity, completion rates, and project health."
                />
                <FeatureCard 
                    icon={ShieldCheck} 
                    title="Enterprise Ready" 
                    desc="Role-based access control, secure authentication, and data encryption out of the box."
                />
                <FeatureCard 
                    icon={CheckCircle2} 
                    title="Subtasks & Dependencies" 
                    desc="Break complex tasks down. Link tasks together to see what's blocking what."
                />
            </div>
        </div>
      </section>

      {/* --- BIG FEATURE HIGHLIGHT --- */}
      <section className="py-24 px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row items-center gap-16">
                  <div className="flex-1 space-y-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                        <Zap className="w-4 h-4" /> Automations
                      </div>
                      <h2 className="text-4xl font-bold text-slate-900">Let the robots do the busy work.</h2>
                      <p className="text-lg text-slate-500 leading-relaxed">
                          Don't waste time moving cards or assigning tasks manually. With our new Automation Engine, you define the rules, and we handle the rest.
                      </p>
                      <ul className="space-y-4 pt-4">
                          {['Auto-archive completed tasks', 'Assign to lead when priority is urgent', 'Notify Slack on status changes'].map(item => (
                              <li key={item} className="flex items-center gap-3 text-slate-700 font-medium">
                                  <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle2 className="w-4 h-4" /></div>
                                  {item}
                              </li>
                          ))}
                      </ul>
                  </div>
                  <div className="flex-1 relative">
                      <div className="absolute top-10 -right-20 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob"></div>
                      <div className="absolute -bottom-8 -left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-2000"></div>
                      <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xl p-6">
                          {/* Fake Automation UI */}
                          <div className="space-y-4">
                              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                                  <span className="font-mono text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-600">WHEN</span>
                                  <span className="text-sm font-medium">Status is <strong>Done</strong></span>
                              </div>
                              <div className="flex justify-center"><ArrowRight className="w-5 h-5 text-slate-300 rotate-90" /></div>
                              <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                  <span className="font-mono text-xs bg-white border border-indigo-200 px-2 py-1 rounded text-indigo-600">THEN</span>
                                  <span className="text-sm font-medium text-indigo-900">Archive Task</span>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto bg-slate-900 rounded-[2.5rem] p-12 md:p-24 text-center relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                  <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                  <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
              </div>

              <div className="relative z-10 space-y-8">
                  <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Ready to ship faster?</h2>
                  <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                      Join thousands of teams who have switched to TaskKollecta for a clearer, faster, and more focused workflow.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                      <Link to="/login">
                        <Button size="lg" className="h-14 px-8 text-lg bg-white text-slate-900 hover:bg-slate-100 rounded-full">
                            Get Started for Free
                        </Button>
                      </Link>
                  </div>
                  <p className="text-sm text-slate-500">No credit card required · Free plan available</p>
              </div>
          </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-slate-100 py-12 px-6">
          <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8">
              <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 bg-slate-900 rounded-md flex items-center justify-center text-white font-bold text-xs">TK</div>
                    <span className="font-bold text-lg">TaskKollecta</span>
                  </div>
                  <p className="text-sm text-slate-500">
                      The project management tool for high-performance teams.
                  </p>
              </div>
              <div>
                  <h4 className="font-semibold text-slate-900 mb-4">Product</h4>
                  <ul className="space-y-2 text-sm text-slate-500">
                      <li><a href="#" className="hover:text-indigo-600">Features</a></li>
                      <li><a href="#" className="hover:text-indigo-600">Automations</a></li>
                      <li><a href="#" className="hover:text-indigo-600">Integrations</a></li>
                      <li><a href="#" className="hover:text-indigo-600">Pricing</a></li>
                  </ul>
              </div>
              <div>
                  <h4 className="font-semibold text-slate-900 mb-4">Resources</h4>
                  <ul className="space-y-2 text-sm text-slate-500">
                      <li><a href="#" className="hover:text-indigo-600">Documentation</a></li>
                      <li><a href="#" className="hover:text-indigo-600">API Reference</a></li>
                      <li><a href="#" className="hover:text-indigo-600">Community</a></li>
                  </ul>
              </div>
              <div>
                  <h4 className="font-semibold text-slate-900 mb-4">Company</h4>
                  <ul className="space-y-2 text-sm text-slate-500">
                      <li><a href="#" className="hover:text-indigo-600">About</a></li>
                      <li><a href="#" className="hover:text-indigo-600">Blog</a></li>
                      <li><a href="#" className="hover:text-indigo-600">Careers</a></li>
                      <li><a href="#" className="hover:text-indigo-600">Legal</a></li>
                  </ul>
              </div>
          </div>
          <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-100 text-center text-sm text-slate-400">
              © 2026 TaskKollecta Inc. All rights reserved.
          </div>
      </footer>

    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }) {
    return (
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                <Icon className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
            <p className="text-slate-500 leading-relaxed">{desc}</p>
        </div>
    )
}