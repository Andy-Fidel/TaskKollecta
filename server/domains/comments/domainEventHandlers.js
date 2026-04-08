const { notifyCommentCreated } = require('./commentSideEffects');

module.exports = (registerDomainEventHandler) => {
  registerDomainEventHandler('comment.created', async (payload) => {
    await notifyCommentCreated(payload);
  });
};
