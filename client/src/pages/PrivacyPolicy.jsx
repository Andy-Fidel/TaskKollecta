import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8 sm:p-12">
        <div className="mb-8">
          <Link to="/" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors">
            &larr; Back to Home
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-6 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Introduction</h2>
            <p>
              At TaskKollecta, we respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect several different types of information to provide and improve our service to you:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Personal Data:</strong> Name, email address, and profile picture (especially when registering via OAuth like Google or Microsoft).</li>
              <li><strong>Usage Data:</strong> Information on how the platform is accessed and used, including IP addresses, browser types, and diagnostic data.</li>
              <li><strong>Content Data:</strong> Projects, tasks, comments, files, and other materials you input into the system.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide, maintain, and secure our service.</li>
              <li>To notify you about changes to our service or project updates (via email or in-app notifications).</li>
              <li>To provide customer support.</li>
              <li>To monitor the usage of our platform to improve user experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Cookies and Tracking</h2>
            <p>
              We use cookies and similar tracking technologies to track the activity on our service and hold certain information, primarily for authenticating your session securely (e.g., JWT cookies). You can instruct your browser to refuse all cookies, but this may prevent you from using some portions of our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. Data Security</h2>
            <p>
              The security of your data is important to us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal data (including encryption and secure protocols), we cannot guarantee its absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">6. Service Providers</h2>
            <p>
              We may employ third party companies and individuals to facilitate our service (e.g., Cloudinary for file storage, Resend for emails), to provide the service on our behalf, or to assist us in analyzing how our service is used. These third parties have access to your personal data only to perform these tasks on our behalf.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">7. Your Data Rights</h2>
            <p>
              Depending on your location, you may have rights under data protection laws (such as GDPR or CCPA) to access, update, or delete the information we hold about you. You can manage your profile settings within the app or contact us directly to exercise these rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">8. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy, please contact our support team.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
