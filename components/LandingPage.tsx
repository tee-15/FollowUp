'use client'

import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-blue-500/30 overflow-x-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* 1. Global Header                                                   */}
      {/* ------------------------------------------------------------------ */}
      <header className="fixed top-0 w-full z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              F
            </div>
            <span className="text-xl font-bold tracking-tight text-white">FollowUp</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link 
              href="/login" 
              className="text-sm font-semibold text-gray-300 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link 
              href="/register" 
              className="text-sm font-bold bg-white text-black px-5 py-2.5 rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Hero Section                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative pt-48 pb-32 px-6 overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-sm font-medium text-gray-300">✨ AI-powered follow-up reminders — now live</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 mb-8 leading-tight">
            Never Forget a<br/>Customer Again.
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            Paste a WhatsApp chat, upload a screenshot, or record a voice note — AI instantly creates your follow-up reminder. Built for busy business owners.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/register" 
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all"
            >
              Start for Free
            </Link>
            <a 
              href="#features" 
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/5 text-white font-bold text-lg border border-white/10 hover:bg-white/10 transition-all"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* Fake App Mockup */}
        <div className="mt-24 max-w-6xl mx-auto relative z-10 perspective-[2000px]">
          <div className="rounded-2xl border border-white/10 bg-[#111111]/80 backdrop-blur-xl overflow-hidden shadow-2xl shadow-blue-900/20 transform rotate-x-[2deg] translate-y-4 hover:rotate-x-0 hover:translate-y-0 transition-all duration-700">
            {/* Mockup Header */}
            <div className="h-12 border-b border-white/10 flex items-center px-4 gap-2 bg-white/5">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>
            {/* Mockup Content */}
            <div className="p-8 grid grid-cols-3 gap-6 opacity-80">
              {[
                { title: 'New', color: 'bg-blue-500', items: ['Jane Doe - WhatsApp', 'Acme Corp - Website'] },
                { title: 'Contacted', color: 'bg-yellow-500', items: ['John Smith - Referral'] },
                { title: 'Negotiation', color: 'bg-orange-500', items: ['Tech Inc - Demo booked', 'Startup LLC - Pending review'] }
              ].map((col, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 h-96">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                    <span className="font-bold">{col.title}</span>
                  </div>
                  <div className="space-y-3">
                    {col.items.map((item, j) => (
                      <div key={j} className="bg-white/10 p-4 rounded-lg border border-white/5">
                        <div className="h-4 w-3/4 bg-white/20 rounded mb-3"></div>
                        <div className="h-3 w-1/2 bg-white/10 rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2b. Social Proof Trust Bar                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="py-10 border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-8 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              {['bg-blue-400','bg-purple-400','bg-pink-400','bg-indigo-400','bg-green-400'].map((c, i) => (
                <div key={i} className={`w-9 h-9 rounded-full ${c} border-2 border-[#0A0A0A] flex items-center justify-center text-xs font-bold text-white`}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-400"><span className="text-white font-bold">500+</span> sales teams use FollowUp</p>
          </div>
          <div className="hidden sm:block w-px h-8 bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-lg">★</span>)}</div>
            <p className="text-sm text-gray-400"><span className="text-white font-bold">4.9/5</span> from 200+ reviews</p>
          </div>
          <div className="hidden sm:block w-px h-8 bg-white/10" />
          <p className="text-sm text-gray-400">🔒 <span className="text-white font-bold">Bank-level security</span> with Supabase Auth</p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 3. How It Works (3 Steps)                                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-blue-400 font-bold uppercase tracking-widest text-sm mb-4">Simple workflow</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Up and running in 3 steps.</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {[{
              step: '01',
              title: 'Add Your Leads',
              desc: 'Import contacts manually or from WhatsApp, Instagram, Facebook, or referrals in seconds.',
              icon: '➕',
              color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
            }, {
              step: '02',
              title: 'Manage Your Pipeline',
              desc: 'Drag leads across stages — New, Contacted, Negotiation, Won. Always know what is next.',
              icon: '📋',
              color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
            }, {
              step: '03',
              title: 'Follow Up & Close',
              desc: 'Set follow-up dates. Message on WhatsApp instantly. Turn leads into paying customers.',
              icon: '🚀',
              color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
            }].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center group">
                <div className={`w-16 h-16 rounded-2xl ${item.color} border flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <div className={`text-xs font-black ${item.color.split(' ')[0]} tracking-widest mb-3`}>{item.step}</div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Features Section (Bento Box)                                    */}
      {/* ------------------------------------------------------------------ */}
      <section id="features" className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">Everything you need.<br/>Nothing you don't.</h2>
            <p className="text-xl text-gray-400">Ditch the clunky, overly complex CRMs. FollowUp is designed for speed.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1 */}
            <div className="md:col-span-2 bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-3xl p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] group-hover:bg-blue-500/20 transition-colors" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6 border border-blue-500/30">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-2xl font-bold mb-3">Visualize Your Pipeline</h3>
                <p className="text-gray-400 text-lg max-w-md">Drag and drop leads across custom stages. Instantly see where every deal stands and what needs your attention.</p>
              </div>
            </div>

            {/* Bento Card 2 */}
            <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-3xl p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px] group-hover:bg-green-500/20 transition-colors" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center mb-6 border border-green-500/30">
                  <span className="text-2xl">💬</span>
                </div>
                <h3 className="text-2xl font-bold mb-3">WhatsApp Ready</h3>
                <p className="text-gray-400 text-lg">One-click messaging straight to your lead's WhatsApp. No more saving contacts manually.</p>
              </div>
            </div>

            {/* Bento Card 3 */}
            <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-3xl p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] group-hover:bg-purple-500/20 transition-colors" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-6 border border-purple-500/30">
                  <span className="text-2xl">📅</span>
                </div>
                <h3 className="text-2xl font-bold mb-3">Smart Scheduling</h3>
                <p className="text-gray-400 text-lg">Set dates for your next touchpoint. We'll automatically sort your pipeline so you know exactly who to call today.</p>
              </div>
            </div>

            {/* Bento Card 4 */}
            <div className="md:col-span-2 bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-3xl p-10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] group-hover:bg-orange-500/20 transition-colors" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/20 flex items-center justify-center mb-6 border border-orange-500/30">
                  <span className="text-2xl">⚡️</span>
                </div>
                <h3 className="text-2xl font-bold mb-3">Insanely Fast</h3>
                <p className="text-gray-400 text-lg max-w-md">Built on modern tech for instant page loads, seamless transitions, and a workflow that never slows you down.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Footer CTA                                                      */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-white/10 bg-[#050505] relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center px-6 py-32 relative z-10">
          <h2 className="text-4xl md:text-5xl font-black mb-8">Ready to organize your sales?</h2>
          <Link 
            href="/register" 
            className="inline-flex px-10 py-5 rounded-full bg-white text-black font-black text-xl hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all"
          >
            Create Your Free Account
          </Link>
          <p className="mt-6 text-gray-500 font-medium">No credit card required. Setup takes 30 seconds.</p>
        </div>

        <div className="border-t border-white/5 py-8 text-center text-gray-600 text-sm">
          <p>&copy; {new Date().getFullYear()} FollowUp CRM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
