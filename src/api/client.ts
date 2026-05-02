import { minutelyApiRoutes, minutelyApiUrls } from "./routes";

type TokenGetter = () => string | null;

export type MinutelyApiClientOptions = {
  baseUrl?: string;
  getToken?: TokenGetter;
  onUnauthorized?: () => void;
};

export type AuthPayload = {
  email: string;
  password: string;
};

export type ScheduleMeetingPayload = {
  title: string;
  description?: string;
  scheduled_for: string;
  participants?: string[];
};

export type UpdateMeetingPayload = {
  id: string;
  title: string;
  description?: string;
  scheduled_for: string;
};

export type ParticipantStatePayload = {
  meeting_id: string;
  email: string;
  has_joined: boolean;
  audio_enabled: boolean;
  video_enabled: boolean;
};

export type WebRTCSignalPayload = {
  meeting_id: string;
  from_email: string;
  to_email: string;
  type: "offer" | "answer" | "ice-candidate";
  sdp?: string;
  candidate?: string;
  sdp_mid?: string;
  sdp_mline_index?: number;
};

const joinUrl = (baseUrl: string, endpoint: string) => `${baseUrl}${endpoint}`;

const jsonRequest = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body)
});

export function createMinutelyApiClient({
  baseUrl = "",
  getToken,
  onUnauthorized
}: MinutelyApiClientOptions = {}) {
  const url = (endpoint: string) => joinUrl(baseUrl, endpoint);

  const request = async (endpoint: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers);
    const body = options.body;

    if (!(body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const token = getToken?.();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url(endpoint), {
      ...options,
      headers
    });

    if (response.status === 401) {
      onUnauthorized?.();
    }

    return response;
  };

  return {
    url,
    request,
    signup: (payload: AuthPayload) =>
      request(minutelyApiRoutes.auth.signup, jsonRequest("POST", payload)),
    login: (payload: AuthPayload) =>
      request(minutelyApiRoutes.auth.login, jsonRequest("POST", payload)),
    logout: () => request(minutelyApiRoutes.auth.logout, jsonRequest("POST")),
    getProfile: () => request(minutelyApiRoutes.user.profile),
    getTheme: () => request(minutelyApiRoutes.preferences.theme),
    saveTheme: (theme: "light" | "dark" | "system") =>
      request(minutelyApiRoutes.preferences.theme, jsonRequest("POST", { theme })),
    getNextMeeting: () => request(minutelyApiRoutes.meetings.next),
    getRecentMeetings: () => request(minutelyApiRoutes.meetings.recent),
    scheduleMeeting: (payload: ScheduleMeetingPayload) =>
      request(minutelyApiRoutes.meetings.schedule, jsonRequest("POST", payload)),
    updateScheduledMeeting: (payload: UpdateMeetingPayload) =>
      request(minutelyApiRoutes.meetings.scheduleUpdate, jsonRequest("PUT", payload)),
    cancelScheduledMeeting: (id: string) =>
      request(minutelyApiRoutes.meetings.scheduleCancel, jsonRequest("POST", { id })),
    createInstantMeeting: () =>
      request(minutelyApiRoutes.meetings.instant, jsonRequest("POST")),
    endMeeting: (id: string) =>
      request(minutelyApiRoutes.meetings.end, jsonRequest("POST", { id })),
    validateMeeting: (id: string) =>
      request(minutelyApiUrls.validateMeeting(id)),
    updateParticipantState: (payload: ParticipantStatePayload) =>
      request(minutelyApiRoutes.meetings.participantState, jsonRequest("POST", payload)),
    getMeetingParticipants: (id: string) =>
      request(minutelyApiUrls.meetingParticipants(id)),
    sendWebRTCSignal: (payload: WebRTCSignalPayload) =>
      request(minutelyApiRoutes.webrtc.signal, jsonRequest("POST", payload)),
    pollWebRTCSignals: (params: { meetingId: string; email: string; since?: number }) =>
      request(minutelyApiUrls.webrtcSignals(params))
  };
}
