// WebSocket Service cho Đồng bộ Hai chiều Thời gian Thực (Bidirectional Real-Time Synchronization)
// Giữa Trạm làm việc Bác sĩ (Doctor Workstation) và Cổng Bệnh nhân (Patient Portal)

export type WebSocketSyncEvent =
  | 'SYNC_SOAP'
  | 'SYNC_DICOM_ANNOTATION'
  | 'CLEAR_DICOM_ANNOTATIONS'
  | 'SYNC_DICOM_VIEWPORT'
  | 'SYNC_VITALS'
  | 'SYNC_PRE_TRIAGE'
  | 'TRIGGER_REMOTE_BP'
  | 'TRIGGER_AUSCULTATION'
  | 'PAYMENT_RECONCILED'
  | 'SYNC_PRESCRIPTIONS'
  | 'PATIENT_SWITCH'
  | 'INCOMING_CALL'
  | 'CALL_ACCEPTED'
  | 'CALL_DECLINED'
  | 'CALL_ENDED'
  | 'NEW_APPOINTMENT'
  | 'CANCEL_APPOINTMENT';

export interface WebSocketMessage {
  event: WebSocketSyncEvent;
  patientId: string;
  senderRole: 'doctor' | 'patient' | 'system';
  timestamp: string;
  payload: any;
}

type MessageListener = (msg: WebSocketMessage) => void;

class WebSocketSyncService {
  private ws: WebSocket | null = null;
  private listeners: Set<MessageListener> = new Set();
  private isConnected = false;
  private reconnectTimer: any = null;
  private patientId = 'BN-2026-0892';

  public connect(patientId: string = 'BN-2026-0892') {
    this.patientId = patientId;
    if (typeof window === 'undefined') return;

    // Xác định URL WebSocket dựa trên môi trường hiện tại
    const isHttps = window.location.protocol === 'https:';
    const wsProto = isHttps ? 'wss:' : 'ws:';
    
    // Nếu chạy qua vite dev port 5174, kết nối tới backend port 3001
    let host = window.location.host;
    if (window.location.port === '5173' || window.location.port === '5174') {
      host = `${window.location.hostname}:3001`;
    }

    const wsUrl = `${wsProto}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`[Telemedicine WS] Kết nối thành công tới ${wsUrl}`);
        this.isConnected = true;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          this.listeners.forEach((listener) => {
            try {
              listener(data);
            } catch (err) {
              console.error('[Telemedicine WS Listener Error]', err);
            }
          });
        } catch (e) {
          // Bỏ qua tin nhắn không phải JSON
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        console.warn('[Telemedicine WS] Mất kết nối, sẽ tự động kết nối lại sau 3s...');
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect(this.patientId);
          }, 3000);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[Telemedicine WS Error]', err);
      };
    } catch (e) {
      console.warn('[Telemedicine WS Init Exception]', e);
    }
  }

  public send(event: WebSocketSyncEvent, payload: any, senderRole: 'doctor' | 'patient' | 'system' = 'doctor') {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg: WebSocketMessage = {
        event,
        patientId: this.patientId,
        senderRole,
        timestamp: new Date().toISOString(),
        payload
      };
      this.ws.send(JSON.stringify(msg));
    }
  }

  public subscribe(listener: MessageListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public isSocketConnected(): boolean {
    return this.isConnected;
  }
}

export const webSocketSync = new WebSocketSyncService();
