import { IUser } from './index';
import { IMembership } from './index';
import { Server } from 'socket.io';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      membership?: IMembership;
      io?: Server;
      // Add other custom middleware properties here as needed
    }
  }
}
