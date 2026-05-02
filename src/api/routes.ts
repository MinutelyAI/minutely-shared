const query = (params: Record<string, string | number | boolean | undefined>) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      search.set(key, String(value));
    }
  });

  const value = search.toString();
  return value ? `?${value}` : "";
};

export const minutelyApiRoutes = {
  health: "/api/health",
  auth: {
    signup: "/api/auth/signup",
    login: "/api/auth/login",
    logout: "/api/auth/logout"
  },
  user: {
    profile: "/api/user/profile"
  },
  preferences: {
    theme: "/api/preferences/theme"
  },
  meetings: {
    next: "/api/meetings/next",
    recent: "/api/meetings/recent",
    schedule: "/api/meetings/schedule",
    scheduleUpdate: "/api/meetings/schedule/update",
    scheduleCancel: "/api/meetings/schedule/cancel",
    instant: "/api/meetings/instant",
    end: "/api/meetings/end",
    validate: "/api/meetings/validate",
    participantState: "/api/meetings/participant/state",
    participants: "/api/meetings/participants"
  },
  webrtc: {
    signal: "/api/webrtc/signal",
    signals: "/api/webrtc/signals"
  }
} as const;

export const minutelyApiUrls = {
  validateMeeting: (id: string) =>
    `${minutelyApiRoutes.meetings.validate}${query({ id })}`,
  meetingParticipants: (id: string) =>
    `${minutelyApiRoutes.meetings.participants}${query({ id })}`,
  webrtcSignals: ({
    meetingId,
    email,
    since
  }: {
    meetingId: string;
    email: string;
    since?: number;
  }) =>
    `${minutelyApiRoutes.webrtc.signals}${query({
      meeting_id: meetingId,
      email,
      since
    })}`
} as const;
