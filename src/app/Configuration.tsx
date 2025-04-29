import { ChevronDown, Info, Languages, Mic } from 'lucide-react';
import { useState } from 'react';

export type VoiceOption = 'ash' | 'ballad' | 'coral' | 'sage' | 'verse';
export type LanguageOption =
  | 'english'
  | 'spanish'
  | 'french'
  | 'german'
  | 'indonesian';

interface ConfigurationProps {
  voice?: VoiceOption;
  language?: LanguageOption;
  onVoiceChange?: (voice: VoiceOption) => void;
  onLanguageChange?: (language: LanguageOption) => void;
  toggleMic: () => void;
  toggleCamera: () => void;
}

export default function Configuration({
  voice = 'sage',
  language = 'english',
  onVoiceChange,
  onLanguageChange,
  toggleMic,
  toggleCamera,
}: ConfigurationProps) {
  const [micMuted] = useState(false);
  const [showVoiceOptions, setShowVoiceOptions] = useState(false);
  const [showLanguageOptions, setShowLanguageOptions] = useState(false);

  const voices: VoiceOption[] = ['ash', 'ballad', 'coral', 'sage', 'verse'];
  const languages: LanguageOption[] = [
    'english',
    'spanish',
    'french',
    'german',
    'indonesian',
  ];

  const handleVoiceSelect = (selectedVoice: VoiceOption) => {
    if (onVoiceChange) {
      onVoiceChange(selectedVoice);
    }
    setShowVoiceOptions(false);
  };

  const handleLanguageSelect = (selectedLanguage: LanguageOption) => {
    if (onLanguageChange) {
      onLanguageChange(selectedLanguage);
    }
    setShowLanguageOptions(false);
  };

  return (
    <div className='bg-white rounded-3xl text-black max-w-md mx-auto'>
      <h1 className='text-2xl font-bold text-center mb-6'>Configuration</h1>

      <div className='bg-gray-50 rounded-lg p-3 mb-6 flex items-center gap-2'>
        <div className='text-gray-400'>💡</div>
        <p className='text-gray-600 text-sm'>
          Works best in a quiet environment with a good internet.
        </p>
      </div>

      <div className='mb-4'>
        <label className='block text-gray-700 mb-2'>Microphone</label>
        <div className='flex items-center justify-between bg-gray-100 rounded-lg p-3 px-4 mb-4'>
          <div className='flex items-center gap-2'>
            <Mic size={18} className='text-gray-500' />
            <span className='text-gray-700'>Default</span>
          </div>
          <ChevronDown size={18} className='text-gray-500' />
        </div>
      </div>

      <div className='mb-4 relative'>
        <label className='block text-gray-700 mb-2'>Language</label>
        <div
          className='flex items-center justify-between bg-gray-100 rounded-lg p-3 px-4 cursor-pointer'
          onClick={() => setShowLanguageOptions(!showLanguageOptions)}
        >
          <div className='flex items-center gap-2'>
            <Languages size={18} className='text-gray-500' />
            <span className='text-gray-700 capitalize'>{language}</span>
          </div>
          <ChevronDown size={18} className='text-gray-500' />
        </div>

        {showLanguageOptions && (
          <div className='absolute w-full bg-white rounded-lg shadow-lg mt-1 z-10 border border-gray-200'>
            {languages.map((languageOption) => (
              <div
                key={languageOption}
                className={`p-3 hover:bg-gray-100 cursor-pointer capitalize ${
                  languageOption === language ? 'bg-gray-50 font-medium' : ''
                }`}
                onClick={() => handleLanguageSelect(languageOption)}
              >
                {languageOption}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='mb-4 relative'>
        <label className='block text-gray-700 mb-2'>Character</label>
        <div
          className='flex items-center justify-between bg-gray-100 rounded-lg p-3 px-4 cursor-pointer'
          onClick={() => setShowVoiceOptions(!showVoiceOptions)}
        >
          <span className='text-gray-700'>Character</span>
          <div className='flex items-center gap-2'>
            <span className='text-gray-700 capitalize'>{voice}</span>
            <ChevronDown size={18} className='text-gray-500' />
          </div>
        </div>

        {showVoiceOptions && (
          <div className='absolute w-full bg-white rounded-lg shadow-lg mt-1 z-10 border border-gray-200'>
            {voices.map((voiceOption) => (
              <div
                key={voiceOption}
                className={`p-3 hover:bg-gray-100 cursor-pointer capitalize ${
                  voiceOption === voice ? 'bg-gray-50 font-medium' : ''
                }`}
                onClick={() => handleVoiceSelect(voiceOption)}
              >
                {voiceOption}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='mb-4'>
        <div className='flex items-center justify-between bg-gray-100 rounded-lg p-3 px-4'>
          <span className='text-gray-700'>LLM options</span>
          <ChevronDown size={18} className='text-gray-500' />
        </div>
      </div>

      <div className='mb-6'>
        <div className='flex items-center justify-between bg-gray-100 rounded-lg p-3 px-4'>
          <span className='text-gray-700'>Voice config</span>
          <ChevronDown size={18} className='text-gray-500' />
        </div>
      </div>

      <div className='flex items-center justify-between mb-4'>
        <div className='flex items-center gap-1'>
          <span className='text-gray-700'>Mute mic</span>
          <Info size={16} className='text-gray-400' />
        </div>
        <div
          className={`w-12 h-6 rounded-full flex items-center p-1 cursor-pointer ${
            micMuted ? 'bg-green-300 justify-end' : 'bg-gray-300 justify-start'
          }`}
          onClick={toggleMic}
        >
          <div className='w-4 h-4 bg-white rounded-full'></div>
        </div>
      </div>

      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-1'>
          <span className='text-gray-700'>Pause camera</span>
          <Info size={16} className='text-gray-400' />
        </div>
        <div
          className={`w-12 h-6 rounded-full flex items-center p-1 cursor-pointer ${
            micMuted ? 'bg-green-300 justify-end' : 'bg-gray-300 justify-start'
          }`}
          onClick={toggleCamera}
        >
          <div className='w-4 h-4 bg-white rounded-full'></div>
        </div>
      </div>
    </div>
  );
}
