require('dotenv').config();
const { Resend } = require('resend');
const { recordEmailDelivery } = require('./opsMetrics');


const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: options.email,
      subject: options.subject,
      html: options.message,
    });

    if (error) {
      console.error("Resend Error:", error);
      throw new Error(error.message);
    }

    console.log("Email sent successfully:", data);
    recordEmailDelivery({
      status: 'sent',
      subject: options.subject,
      to: options.email,
    });
    return data;
  } catch (error) {
    console.error("Email Sending Failed:", error);
    recordEmailDelivery({
      status: 'failed',
      subject: options.subject,
      to: options.email,
      error: error.message,
    });
    // We don't throw here to prevent crashing the main app flow
    // if an email fails (e.g. invalid address)
  }
};

module.exports = sendEmail;
