import { NotFoundException } from "../../common/utils/catch-errors";
import SessionModel from "../../database/models/session.model";

class SessionService {
  public getAllSession = async (userId: string) => {
    const sessions = await SessionModel.find(
      {
        userId,
        expiresAt: { $gt: Date.now() },
      },
      {
        _id: 1,
        userId: 1,
        userAgent: 1,
        createdAt: 1,
        expiresAt: 1,
      },
      {
        sort: {
          createdAt: -1,
        },
      }
    );

    return {
      sessions,
    };
  };

  public async getSessionById(sessionId: string) {
    const session = await SessionModel.findById(sessionId)
      .populate("userId")
      .select("-expiresAt");

    if (!session) {
      throw new NotFoundException("Session not found");
    }

    const { userId: user } = session;

    return {
      user,
    };
  }

  public deleteSession = async (sessionId: string, userId: string) => {
    const deletedSession = await SessionModel.findByIdAndDelete({
      _id: sessionId,
      userId: userId,
    });
    if (!deletedSession) {
      throw new NotFoundException("Session not found");
    }
    return true;
  };
}

export default SessionService;