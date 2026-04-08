const handlers = new Map();
let defaultHandlersRegistered = false;

const registerDomainEventHandler = (eventName, handler) => {
  const eventHandlers = handlers.get(eventName) || [];
  eventHandlers.push(handler);
  handlers.set(eventName, eventHandlers);
};

const ensureDefaultHandlersRegistered = () => {
  if (defaultHandlersRegistered) {
    return;
  }

  require('../tasks/domainEventHandlers')(registerDomainEventHandler);
  require('../comments/domainEventHandlers')(registerDomainEventHandler);
  require('../invites/domainEventHandlers')(registerDomainEventHandler);

  defaultHandlersRegistered = true;
};

const emitDomainEvent = async (eventName, payload) => {
  ensureDefaultHandlersRegistered();

  const eventHandlers = handlers.get(eventName) || [];
  for (const handler of eventHandlers) {
    await handler(payload);
  }
};

module.exports = {
  emitDomainEvent,
  registerDomainEventHandler,
};
