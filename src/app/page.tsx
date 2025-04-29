'use client';

import dynamic from 'next/dynamic';

const Recorder = dynamic(() => import('./Recorder'), {
  ssr: false,
  loading: () => (
    <div className='min-h-screen flex items-center justify-center p-8 bg-gray-100'>
      <div className='text-lg font-medium'>Loading recorder...</div>
    </div>
  ),
});

export default function Home() {
  return (
    <div className='max-h-screen flex items-center justify-center p-8 bg-gray-100'>
      <Recorder />
    </div>
  );
}
