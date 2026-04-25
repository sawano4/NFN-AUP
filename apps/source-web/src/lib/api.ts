const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export type SourceRegistrationPayload = {
  email: string;
  source_type: string;
  name: string;
  wilaya: string;
  commune: string;
  gps_lat: number;
  gps_lng: number;
  phone?: string;
  races: string[];
  herd_size: number;
  availability_months: string[];
};

export type SourceRegistration = SourceRegistrationPayload & {
  public_id: string;
  status: 'pending' | 'active' | 'rejected' | 'suspended';
  reason: string | null;
  created_at: string;
};

export type SourceStatus = {
  public_id: string;
  status: 'pending' | 'active' | 'rejected' | 'suspended';
  reason: string | null;
};

export type OutboxMessage = {
  message_id: string;
  recipient: string;
  subject: string;
  body: string;
  created_at: string;
};

async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const detail = typeof payload.detail === 'string' ? payload.detail : response.statusText;
    throw new Error(detail || 'Request failed');
  }

  return response.json() as Promise<T>;
}

export const sourceApi = {
  requestOtp(email: string) {
    return apiRequest<{ message: string }>('/source/otp/request', {
      method: 'POST',
      body: { email },
    });
  },

  verifyOtp(email: string, otpCode: string) {
    return apiRequest<{ message: string }>('/source/otp/verify', {
      method: 'POST',
      body: { email, otp_code: otpCode },
    });
  },

  createRegistration(payload: SourceRegistrationPayload) {
    return apiRequest<SourceRegistration>('/source/registrations', {
      method: 'POST',
      body: payload,
    });
  },

  getStatus(publicId: string) {
    return apiRequest<SourceStatus>(`/source/registrations/${encodeURIComponent(publicId)}/status`);
  },

  getOutbox() {
    return apiRequest<OutboxMessage[]>('/notifications/outbox');
  },
};
