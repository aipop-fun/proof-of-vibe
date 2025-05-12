import React, { useState, useEffect } from 'react';
import { sdk } from '@farcaster/frame-sdk';

// Mock data structure for listening activity
type ListeningActivity = {
  fid: number;
  username: string;
  profilePic: string;
  track: {
    name: string;
    artist: string;
    album: string;
    coverArt: string;
  };
  timestamp: number;
};

const mockListeningData: ListeningActivity[] = [
  {
    fid: 6841,
    username: 'deodad',
    profilePic: 'https://i.imgur.com/dMoIan7.jpg',
    track: {
      name: 'Modern Drift',
      artist: 'Efterklang',
      album: 'Piramida',
      coverArt: 'https://example.com/album-cover.jpg'
    },
    timestamp: Date.now() - 5 * 60 * 1000 // 5 minutes ago
  },
  {
    fid: 3621,
    username: 'horsefacts',
    profilePic: 'https://i.imgur.com/xyz123.jpg',
    track: {
      name: 'Midnight City',
      artist: 'M83',
      album: 'Hurry Up, We\'re Dreaming',
      coverArt: 'https://example.com/midnight-city-cover.jpg'
    },
    timestamp: Date.now() - 15 * 60 * 1000 // 15 minutes ago
  }
];

const ProofOfVibesApp: React.FC = () => {
  const [listeningActivities, setListeningActivities] = useState<ListeningActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        // Simulate fetching listening data
        setListeningActivities(mockListeningData);
        
        // Hide splash screen
        await sdk.actions.ready();
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  const handleViewProfile = async (fid: number) => {
    await sdk.actions.viewProfile({ fid });
  };

  const handleShareActivity = async (activity: ListeningActivity) => {
    await sdk.actions.composeCast({
      text: `🎵 Vibing to ${activity.track.name} by ${activity.track.artist} #ProofOfVibes`,
      embeds: [`https://proofofvibes.aipop.fun/listen/${activity.fid}`]
    });
  };

  if (isLoading) {
    return <div>Loading Vibes...</div>;
  }

  return (
    <div className="p-4 bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Timbra 🎧</h1>
      
      <div className="space-y-4">
        {listeningActivities.map((activity, index) => (
          <div 
            key={index} 
            className="flex items-center bg-gray-100 p-3 rounded-lg shadow-sm"
          >
            <img 
              src={activity.profilePic} 
              alt={activity.username} 
              className="w-12 h-12 rounded-full mr-4"
            />
            <div className="flex-grow">
              <div className="flex items-center">
                <span 
                  className="font-semibold cursor-pointer hover:underline" 
                  onClick={() => handleViewProfile(activity.fid)}
                >
                  {activity.username}
                </span>
                <span className="ml-2 text-gray-500 text-sm">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center mt-2">
                <img 
                  src={activity.track.coverArt} 
                  alt={activity.track.album} 
                  className="w-16 h-16 mr-4 rounded"
                />
                <div>
                  <p className="font-medium">{activity.track.name}</p>
                  <p className="text-gray-600">{activity.track.artist}</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => handleShareActivity(activity)}
              className="ml-4 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            >
              Share Vibe
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProofOfVibesApp;