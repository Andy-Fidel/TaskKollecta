const { sendInviteEmail } = require('./inviteSideEffects');

module.exports = (registerDomainEventHandler) => {
  registerDomainEventHandler('invite.created', async (payload) => {
    await sendInviteEmail(payload);
  });
};
