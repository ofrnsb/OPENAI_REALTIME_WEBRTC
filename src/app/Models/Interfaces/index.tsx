import { ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';

export interface MediaData {
  audioTrack: IMicrophoneAudioTrack | null;
  videoTrack: ICameraVideoTrack | null;
  screenRecorder: MediaRecorder | null;
  webcamRecorder: MediaRecorder | null;
  screenChunks: Blob[];
  webcamChunks: Blob[];
}

export interface OpenAISession {
  peerConnection: RTCPeerConnection | null;
  stop: () => void;
}
