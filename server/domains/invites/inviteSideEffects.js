const sendEmail = require('../../utils/sendEmail');

const buildInviteEmailTemplate = ({ inviterName, orgName, inviteUrl }) => `
  <h2>You've Been Invited!</h2>
  <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on TaskKollecta.</p>
  <p>Click the link below to accept the invitation:</p>
  <a href="${inviteUrl}" style="display:inline-block;margin-top:15px;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:500;">
    Accept Invitation
  </a>
  <p style="margin-top:20px;color:#666;font-size:14px;">This invite expires in 7 days.</p>
`;

const buildInviteUrl = (token) => `${process.env.CLIENT_URL}/login?invite=${token}`;

const sendInviteEmail = async ({ email, orgName, inviterName, token }) => {
  await sendEmail({
    email,
    subject: `You're invited to join ${orgName} on TaskKollecta`,
    message: buildInviteEmailTemplate({
      inviterName,
      orgName,
      inviteUrl: buildInviteUrl(token),
    }),
  });
};

module.exports = {
  buildInviteEmailTemplate,
  buildInviteUrl,
  sendInviteEmail,
};
