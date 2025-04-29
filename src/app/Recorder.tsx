/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import {
  ChartLine,
  CirclePlay,
  CircleStop,
  Settings,
  Timer,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Configuration, { VoiceOption } from './Configuration';
import {
  EST_OPENAI_SESSIONS_ERROR,
  MIME_ERROR,
  OPENAI_API_ERROR,
} from './Models/Constant/ERR';
import {
  AUDIO_BIT_PER_SECOND,
  ENCODER_CONFIG,
  EST_OPENAI_SESSIONS,
  EST_OPENAI_SESSIONS_SUCCESS,
  FFT_SIZE,
  LS_OPENAI__KEY,
  MIME_TYPES,
  MUSIC_STANDARD,
  OPENAI_SESSIONS_STOPPED,
  RECEIVE_OPENAI_AUDIO_RESPONSE,
  SAMPLE_RATE,
  SET_OPENAI_SESSIONS,
  SMOOTH_TIME,
  VIDEO_BIT_PER_SECOND,
} from './Models/Constant/GENERAL';
import { OPENAI_API_INSET_API } from './Models/Constant/INFO';
import { MODEL_GPT_RT_P241217 } from './Models/Constant/MODELS';
import { OPENAI_URL } from './Models/Constant/URL';
import { MediaData, OpenAISession } from './Models/Interfaces/index.jsx';

export default function Recorder() {
  const mediaData = useRef<MediaData>({
    audioTrack: null,
    videoTrack: null,
    screenRecorder: null,
    webcamRecorder: null,
    screenChunks: [],
    webcamChunks: [],
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraPaused, setIsCameraPaused] = useState(false);
  const [isMicPaused, setIsMicPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recordingTime, setRecordingTime] = useState(0);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioLogIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const [, setOpenAIResponses] = useState<string[]>([]);
  const [openAISession, setOpenAISession] = useState<OpenAISession | null>(
    null
  );
  const [apiKey, setApiKey] = useState<string>('');
  const [voice, setVoice] = useState<VoiceOption>('sage');
  const [openAIStatus, setOpenAIStatus] = useState<string>('');
  const [isOpenAIActive, setIsOpenAIActive] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(true);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(true);
  const [isInterwerEnd, setisInterwerEnd] = useState<boolean>(false);

  useEffect(() => {
    clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

    const savedKey = localStorage.getItem(`${LS_OPENAI__KEY}`);
    if (savedKey) {
      setApiKey(savedKey);
    }

    return () => {
      stopTracks();
      if (clientRef.current) {
        clientRef.current.leave();
        clientRef.current = null;
      }
      if (audioLogIntervalRef.current) {
        clearInterval(audioLogIntervalRef.current);
      }
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      stopOpenAISession();
    };
  }, []);

  const stopTracks = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    setRecordingTime(0);

    if (mediaData.current.audioTrack) {
      mediaData.current.audioTrack.stop();
      mediaData.current.audioTrack.close();
      mediaData.current.audioTrack = null;
    }
    if (mediaData.current.videoTrack) {
      mediaData.current.videoTrack.stop();
      mediaData.current.videoTrack.close();
      mediaData.current.videoTrack = null;
    }
    if (
      mediaData.current.screenRecorder &&
      mediaData.current.screenRecorder.state !== 'inactive'
    ) {
      mediaData.current.screenRecorder.stop();
    }
    if (
      mediaData.current.webcamRecorder &&
      mediaData.current.webcamRecorder.state !== 'inactive'
    ) {
      mediaData.current.webcamRecorder.stop();
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (audioLogIntervalRef.current) {
      clearInterval(audioLogIntervalRef.current);
      audioLogIntervalRef.current = null;
    }

    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }

    analyserRef.current = null;
    dataArrayRef.current = null;

    mediaData.current.screenChunks = [];
    mediaData.current.webcamChunks = [];
  };

  const stopOpenAISession = () => {
    if (openAISession) {
      openAISession.stop();
      setOpenAISession(null);
      setIsOpenAIActive(false);
      setOpenAIStatus(`${OPENAI_SESSIONS_STOPPED}`);
    }
  };

  const getSupportedMimeType = () => {
    const types = MIME_TYPES;

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    throw new Error(`${MIME_ERROR}`);
  };

  const updateAudioMeter = () => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    let sum = 0;
    const length = dataArrayRef.current.length;

    for (let i = 0; i < length; i++) {
      sum += dataArrayRef.current[i];
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const createRealtimeSession = async (
    inStream: MediaStream,
    token: string,
    voice: VoiceOption
  ): Promise<OpenAISession> => {
    const pc = new RTCPeerConnection();

    pc.ontrack = (e) => {
      const audio = new Audio();
      audio.srcObject = e.streams[0];

      setOpenAIStatus(`${RECEIVE_OPENAI_AUDIO_RESPONSE}`);

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(e.streams[0]);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);

      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let isSilent = true;
      let silenceCounter = 0;

      const checkAudio = setInterval(() => {
        analyzer.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        if (average > 10) {
          if (isSilent) {
            setOpenAIResponses((prev) => [
              ...prev,
              `[${new Date().toISOString()}] Response started`,
            ]);
            isSilent = false;
          }
          silenceCounter = 0;
        } else {
          if (!isSilent) {
            silenceCounter++;
            if (silenceCounter > 30) {
              setOpenAIResponses((prev) => [
                ...prev,
                `[${new Date().toISOString()}] Response ended`,
              ]);
              isSilent = true;
            }
          }
        }
      }, 50);

      audio.onended = () => {
        clearInterval(checkAudio);
        audioContext.close();
      };

      audio.play();
    };

    pc.addTrack(inStream.getTracks()[0]);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const apiKeyToUse = process.env.OPENAI_API_KEY || token;

    const headers = {
      Authorization: `Bearer ${apiKeyToUse}`,
      'Content-Type': 'application/sdp',
    };

    const opts = {
      method: 'POST',
      body: offer.sdp,
      headers,
    };

    const model = MODEL_GPT_RT_P241217;
    const resp = await fetch(
      `${OPENAI_URL}?model=${model}&voice=${voice}`,
      opts
    );

    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`${OPENAI_API_ERROR} ${resp.status} ${errorText}`);
    }

    await pc.setRemoteDescription({
      type: 'answer',
      sdp: await resp.text(),
    });

    return {
      peerConnection: pc,
      stop: () => {
        pc.close();
      },
    };
  };

  const handleVoiceChange = (newVoice: VoiceOption) => {
    setVoice(newVoice);
  };

  const startOpenAISession = async (audioTrack: IMicrophoneAudioTrack) => {
    try {
      if (!apiKey && !process.env.OPENAI_API_KEY) {
        setOpenAIStatus(`${OPENAI_API_INSET_API}`);
        return;
      }

      if (apiKey) {
        localStorage.setItem(`${LS_OPENAI__KEY}`, apiKey);
      }

      setOpenAIStatus(`${SET_OPENAI_SESSIONS}`);

      const audioStream = new MediaStream([audioTrack.getMediaStreamTrack()]);

      setOpenAIStatus(`${EST_OPENAI_SESSIONS}`);

      const session = await createRealtimeSession(audioStream, apiKey, voice);

      setOpenAISession(session);
      setIsOpenAIActive(true);
      setOpenAIStatus(`${EST_OPENAI_SESSIONS_SUCCESS}`);
    } catch (err: any) {
      setOpenAIStatus(`Error: ${err.message}`);
      console.error(`${EST_OPENAI_SESSIONS_ERROR}`, err);
      setIsOpenAIActive(false);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);

      setRecordingTime(0);

      const [audioTrack, videoTrack, screenStream] = await Promise.all([
        AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: `${MUSIC_STANDARD}`,
        }),
        AgoraRTC.createCameraVideoTrack({ encoderConfig: `${ENCODER_CONFIG}` }),
        navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }),
      ]);

      if (videoPreviewRef.current) {
        videoTrack.play(videoPreviewRef.current);
      }

      const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioContextRef.current = audioContext;
      const destination = audioContext.createMediaStreamDestination();

      const micStream = new MediaStream([audioTrack.getMediaStreamTrack()]);
      const micSource = audioContext.createMediaStreamSource(micStream);

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = SMOOTH_TIME;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;

      micSource.connect(analyser);
      micSource.connect(destination);

      const screenAudioTracks = screenStream.getAudioTracks();
      if (screenAudioTracks.length > 0) {
        const screenAudioSource =
          audioContext.createMediaStreamSource(screenStream);
        screenAudioSource.connect(destination);
      }

      audioLevelIntervalRef.current = setInterval(updateAudioMeter, 50);

      const mimeType = getSupportedMimeType();

      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);

      const screenRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType,
        ...(MediaRecorder.isTypeSupported(`${mimeType};bitrate=128000`)
          ? {
              audioBitsPerSecond: AUDIO_BIT_PER_SECOND,
              videoBitsPerSecond: VIDEO_BIT_PER_SECOND,
            }
          : {}),
      });

      const webcamWithAudioStream = new MediaStream([
        videoTrack.getMediaStreamTrack(),
        ...destination.stream.getAudioTracks(),
      ]);

      const webcamRecorder = new MediaRecorder(webcamWithAudioStream, {
        mimeType: mimeType,
        ...(MediaRecorder.isTypeSupported(`${mimeType};bitrate=128000`)
          ? {
              audioBitsPerSecond: AUDIO_BIT_PER_SECOND,
              videoBitsPerSecond: VIDEO_BIT_PER_SECOND - 100000,
            }
          : {}),
      });

      screenRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaData.current.screenChunks.push(event.data);
        }
      };

      screenRecorder.onstop = () => {
        if (mediaData.current.screenChunks.length > 0) {
          const blob = new Blob(mediaData.current.screenChunks, {
            type: mediaData.current.screenRecorder?.mimeType || 'video/webm',
          });

          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `screen-recording-${new Date().toISOString()}.webm`;
          document.body.appendChild(a);
          a.click();

          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        }
      };

      webcamRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaData.current.webcamChunks.push(event.data);
        }
      };

      webcamRecorder.onstop = () => {
        if (mediaData.current.webcamChunks.length > 0) {
          const blob = new Blob(mediaData.current.webcamChunks, {
            type: mediaData.current.webcamRecorder?.mimeType || 'video/webm',
          });

          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `webcam-recording-${new Date().toISOString()}.webm`;
          document.body.appendChild(a);
          a.click();

          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        }
      };

      screenRecorder.onerror = (event) => {
        setError(
          `Screen recording error: ${
            (event as any).error?.message || 'Unknown error'
          }`
        );
        stopRecording();
      };

      webcamRecorder.onerror = (event) => {
        setError(
          `Webcam recording error: ${
            (event as any).error?.message || 'Unknown error'
          }`
        );
        stopRecording();
      };

      mediaData.current = {
        audioTrack,
        videoTrack,
        screenRecorder,
        webcamRecorder,
        screenChunks: [],
        webcamChunks: [],
      };

      screenRecorder.start(1000);
      webcamRecorder.start(1000);
      setIsRecording(true);
      setIsConfigOpen(!isConfigOpen);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      await startOpenAISession(audioTrack);
    } catch (error) {
      console.error('Recording error:', error);
      setError(`Failed to start recording: ${(error as Error).message}`);
      setIsRecording(false);
      stopTracks();
      stopOpenAISession();
    }
  };

  const stopRecording = () => {
    stopOpenAISession();

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (
      mediaData.current.screenRecorder &&
      mediaData.current.screenRecorder.state !== 'inactive'
    ) {
      mediaData.current.screenRecorder.stop();
    }

    if (
      mediaData.current.webcamRecorder &&
      mediaData.current.webcamRecorder.state !== 'inactive'
    ) {
      mediaData.current.webcamRecorder.stop();
    }

    if (mediaData.current.videoTrack) {
      mediaData.current.videoTrack.stop();
    }

    if (mediaData.current.audioTrack) {
      mediaData.current.audioTrack.stop();
    }

    const screenTracks =
      mediaData.current.screenRecorder?.stream?.getTracks() || [];
    screenTracks.forEach((track) => track.stop());

    setIsRecording(false);
    setIsCameraPaused(false);
    setIsMicPaused(false);
    setisInterwerEnd(true);
  };

  const toggleCamera = () => {
    if (mediaData.current.videoTrack) {
      mediaData.current.videoTrack.setEnabled(isCameraPaused);
      setIsCameraPaused(!isCameraPaused);
    }
  };

  const toggleMic = () => {
    if (mediaData.current.audioTrack) {
      mediaData.current.audioTrack.setEnabled(isMicPaused);
      setIsMicPaused(!isMicPaused);
    }
  };

  const getOpenAIStatusClass = () => {
    if (!openAIStatus) return '';
    if (openAIStatus.toLowerCase().includes('error'))
      return 'text-red-600 bg-red-100';
    if (isOpenAIActive) return 'text-green-600 bg-green-100';
    return 'text-blue-600 bg-blue-100';
  };

  const onSubmitApiKey = () => {
    if (apiKey && apiKey.trim() !== '') {
      setIsModalOpen(false);
    }
  };

  const onShowConfig = () => {
    setIsConfigOpen(!isConfigOpen);
  };

  return (
    <div className='min-h-screen flex flex-col items-center justify-center p-8 gap-8 bg-gray-100'>
      {error && (
        <div className='text-red-600 font-medium bg-red-100 p-4 rounded-lg w-full max-w-3xl'>
          {error}
        </div>
      )}

      {/* Timer display in top right corner when recording */}
      {isRecording && (
        <div className='absolute top-4 right-4 bg-gray-200 bg-opacity-70 text-white px-3 py-1 rounded-md text-lg font-mono flex gap-2 items-center justify-center'>
          <Timer />
          {formatTime(recordingTime)}
        </div>
      )}

      {/* Settings configuration in bottom right corner when recording */}
      {isRecording && (
        <div className='absolute bottom-4 right-4 bg-opacity-70 text-white px-3 py-1 rounded-md text-lg font-mono flex gap-2 items-center justify-center'>
          <button className='bg-white p-2 rounded-lg hover:cursor-pointer hover:bg-gray-200'>
            <ChartLine size={18} color='#000000' />
          </button>

          <button
            onClick={onShowConfig}
            className='bg-white p-2 rounded-lg hover:cursor-pointer hover:bg-gray-200'
          >
            <Settings size={18} color='#000000' />
          </button>
        </div>
      )}

      <div className='flex items-bottom gap-8 rounded-3xl text-black shadow-lg p-6 mx-auto bg-white'>
        {isConfigOpen && (
          <Configuration
            voice={voice}
            onVoiceChange={handleVoiceChange}
            toggleMic={toggleMic}
            toggleCamera={toggleCamera}
          />
        )}

        <div className='flex items-end gap-4'>
          <div className='flex flex-col items-center gap-4'>
            <div className='flex gap-8'>
              <div className='relative w-[590px] h-[490px] bg-black rounded-lg overflow-hidden'>
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  className='w-full h-full object-cover'
                />
                {!isRecording && (
                  <div className='absolute inset-0 flex items-center justify-center text-white text-xl'>
                    Camera preview
                  </div>
                )}
              </div>

              {isRecording && (
                <div className='relative w-[590px] h-[490px] bg-gray-800 rounded-lg overflow-hidden text-gray-400 py-2 flex flex-col'>
                  <p className='text-center pt-2'>
                    gpt-4o-realtime-preview-2024-12-17
                  </p>

                  <div className='flex-1 flex items-center justify-center'>
                    <p className='text-center text-8xl'>••••••</p>
                  </div>
                </div>
              )}
            </div>

            <div className='flex gap-4 '>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`px-6 py-3 rounded-full font-medium hover:cursor-pointer ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                disabled={!!error && !isRecording}
              >
                {isRecording ? <CircleStop /> : <CirclePlay />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`absolute w-full h-full bg-white flex justify-center items-center rounded-3xl text-black shadow-lg p-6 ${
          isModalOpen ? 'block' : 'hidden'
        }`}
      >
        <div className='grid gap-4 mb-4'>
          <div className='w-[400px]'>
            <label
              htmlFor='apiKey'
              className='block text-sm font-medium mb-1 text-gray-400'
            >
              OpenAI API Key
            </label>
            <input
              id='apiKey'
              type='password'
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder='Enter your OpenAI API key'
              className='w-full p-2 border border-gray-300 rounded-md '
              disabled={isOpenAIActive}
            />
          </div>

          <button
            onClick={onSubmitApiKey}
            className='bg-blue-600 text-white px-4 py-2 rounded-md hover:cursor-pointer hover:bg-green-200'
          >
            submit
          </button>
        </div>

        {openAIStatus && (
          <div className={`p-3 rounded-md ${getOpenAIStatusClass()}`}>
            {openAIStatus}
          </div>
        )}
      </div>

      {isInterwerEnd && (
        <div
          className={`absolute w-full h-full bg-white flex justify-center items-center rounded-3xl text-black shadow-lg p-6 text-gray-400 text-center text-light `}
        >
          <p className='bg-gray-200 p-4 rounded-lg shadow-xl font-light'>
            Thank you for your time.
            <br />
            We’ll review internally and follow up within three days with next
            steps.
          </p>
        </div>
      )}
    </div>
  );
}
