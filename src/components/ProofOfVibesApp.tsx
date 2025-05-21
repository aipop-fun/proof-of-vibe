import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { sdk } from '@farcaster/frame-sdk';

// Types
type Track = {
  name: string;
  artist: string;
  album: string;
  coverArt: string;
};

type ListeningActivity = {
  fid: number;
  username: string;
  profilePic: string;
  track: Track;
  timestamp: number;
};

// Mock data
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
    timestamp: Date.now() - 5 * 60 * 1000
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
    timestamp: Date.now() - 15 * 60 * 1000
  }
];

// Component for user profile image
const ProfileImage = ({ src, alt }: { src: string; alt: string }) => (
  <div className="relative w-12 h-12 mr-4">
    <Image
      src={src}
      alt={alt}
      fill
      className="rounded-full object-cover"
      sizes="48px"
    />
  </div>
);

// Component for album cover image
const AlbumCover = ({ src, alt }: { src: string; alt: string }) => (
  <div className="relative w-16 h-16 mr-4">
    <Image
      src={src}
      alt={alt}
      fill
      className="rounded object-cover"
      sizes="64px"
    />
  </div>
);

// Component for a single activity item
const ActivityItem = ({
  activity,
  onViewProfile,
  onShare
}: {
  activity: ListeningActivity;
  onViewProfile: (fid: number) => void;
  onShare: (activity: ListeningActivity) => void;
}) => (
  <div className="flex items-center bg-gray-100 p-3 rounded-lg shadow-sm">
    <ProfileImage src={activity.profilePic} alt={activity.username} />

    <div className="flex-grow">
      <div className="flex items-center">
        <span
          className="font-semibold cursor-pointer hover:underline"
          onClick={() => onViewProfile(activity.fid)}
        >
          {activity.username}
        </span>
        <span className="ml-2 text-gray-500 text-sm">
          {new Date(activity.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="flex items-center mt-2">
        <AlbumCover src={activity.track.coverArt} alt={activity.track.album} />
        <div>
          <p className="font-medium">{activity.track.name}</p>
          <p className="text-gray-600">{activity.track.artist}</p>
        </div>
      </div>
    </div>

    <button
      onClick={() => onShare(activity)}
      className="ml-4 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
    >
      Share Vibe
    </button>
  </div>
);

const ProofOfVibesApp: React.FC = () => {
  const [activities, setActivities] = useState<ListeningActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Simulate fetching data
        setActivities(mockListeningData);
        await sdk.actions.ready();
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    })();
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

  if (isLoading) return <div>Loading Vibes...</div>;

  return (
    <div className="p-4 bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Timbra 🎧</h1>

      <div className="space-y-4">
        {activities.map((activity, index) => (
          <ActivityItem
            key={index}
            activity={activity}
            onViewProfile={handleViewProfile}
            onShare={handleShareActivity}
          />
        ))}
      </div>
    </div>
  );
};

export default ProofOfVibesApp;