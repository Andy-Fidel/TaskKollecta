import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8 sm:p-12">
        <div className="mb-8">
          <Link to="/" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors">
            &larr; Back to Home
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-6 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing or using TaskKollecta, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Use License</h2>
            <p className="mb-3">
              Permission is granted to temporarily use the TaskKollecta service for personal or internal business purposes. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Modify or copy the materials;</li>
              <li>Use the materials for any commercial purpose without appropriate subscription;</li>
              <li>Attempt to decompile or reverse engineer any software contained on the platform;</li>
              <li>Remove any copyright or other proprietary notations from the materials.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. User Accounts</h2>
            <p>
              To access certain features of the platform, you must register for an account. You are responsible for safeguarding your password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Data and Content</h2>
            <p>
              You retain all your ownership rights in your content. However, by submitting content to TaskKollecta, you grant us a worldwide, royalty-free license to use, reproduce, modify, and display the content as necessary to provide the service. We are not responsible for the accuracy or legality of any content posted by users.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Disclaimer</h2>
            <p>
              The materials on TaskKollecta are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Limitations</h2>
            <p>
              In no event shall TaskKollecta or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Modifications</h2>
            <p>
              We may revise these terms of service at any time without notice. By using this platform you are agreeing to be bound by the then-current version of these terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact support.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
