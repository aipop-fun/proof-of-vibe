/* eslint-disable @typescript-eslint/no-empty-object-type,  @typescript-eslint/no-unused-vars, react-hooks/rules-of-hooks,  @typescript-eslint/ban-ts-comment, @typescript-eslint/no-explicit-any */
// @ts-nocheck
"use client";

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { PersonalMusic } from './PersonalMusic';
import { UnifiedSearch } from './unified/UnifiedSearch';
import { FriendsListening } from './FriendsListening';
import { AccountStatus } from './AccountStatus';
import { useAuth } from '~/lib/hooks/useAuth';
import { useFrame } from '~/components/providers/FrameProvider';
import { useValidation } from '~/lib/hooks/useCommon';
import { LoadingState } from './ui/LoadingStates';
import sdk from '@farcaster/frame-sdk';

const DashboardConfigSchema = z.object({
  layout: z.enum(['single', 'sidebar', 'tabs']).default('single'),
  enableSearch: z.boolean().default(true),
  enableFriends: z.boolean().default(true),
  enablePersonalMusic: z.boolean().default(true),
  autoRefresh: z.boolean().default(true),
  className: z.string().optional(),
});

type DashboardConfig = z.infer<typeof DashboardConfigSchema>;

interface DashboardProps extends Partial<DashboardConfig> { }

export const Dashboard: React.FC<DashboardProps> = (props) => {
  const { validateAndParse } = useValidation();
  const { isAuthenticated, isLinked, isLoading, user } = useAuth();
  const { isMiniApp } = useFrame();
  const router = useRouter();

  const config = validateAndParse(DashboardConfigSchema, props) ?? {};
  const {
    layout = 'single',
    enableSearch = true,
    enableFriends = true,
    enablePersonalMusic = true,
    autoRefresh = true,
    className = ''
  } = config;

  // Handle profile navigation to Timbra profiles
  const handleProfileClick = useCallback(async (fid: number) => {
    try {
      const profileUrl = `/profile/${fid}`;

      if (isMiniApp && typeof sdk?.actions?.openUrl === 'function') {
        const baseUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
        await sdk.actions.openUrl(`${baseUrl}${profileUrl}`);
      } else {
        router.push(profileUrl);
      }
    } catch (error) {
      console.error('Failed to navigate to profile:', error);
      // Fallback: try direct navigation
      router.push(`/profile/${fid}`);
    }
  }, [isMiniApp, router]);

  // Handle track clicks to open in Spotify
  const handleTrackClick = useCallback(async (track: any) => {
    try {
      let spotifyUrl = '';
      if (track.uri) {
        spotifyUrl = track.uri.replace('spotify:', 'https://open.spotify.com/');
      } else if (track.spotifyUrl) {
        spotifyUrl = track.spotifyUrl;
      } else {
        spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(`${track.title || track.name} ${track.artist || track.artists}`)}`;
      }

      if (isMiniApp && typeof sdk?.actions?.openUrl === 'function') {
        await sdk.actions.openUrl(spotifyUrl);
      } else {
        window.open(spotifyUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Failed to open track in Spotify:', error);
    }
  }, [isMiniApp]);

  if (isLoading) {
    return <LoadingState variant="page" message="Loading dashboard..." />;
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 mb-4">Please sign in to view your dashboard</p>
      </div>
    );
  }

  const renderHeader = () => (
    <header className="mb-6">
      <h1 className="text-2xl font-bold mb-2">
        Welcome back{user.farcaster?.displayName ? `, ${user.farcaster.displayName}` : ''}!
      </h1>
      <AccountStatus />
    </header>
  );

  const renderPersonalMusic = () => enablePersonalMusic && (
    <PersonalMusic
      variant={layout === 'sidebar' ? 'compact' : 'full'}
      autoRefresh={autoRefresh}
      className="mb-6"
      onTrackClick={handleTrackClick}
    />
  );

  const renderSearch = () => enableSearch && (
    <UnifiedSearch
      searchTypes={['both']}
      enableFilters={true}
      className="mb-6"
      onProfileClick={handleProfileClick}
      onTrackClick={handleTrackClick}
    />
  );

  const renderFriendsActivity = () => enableFriends && (
    <div className="bg-purple-800/20 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Friends Activity</h3>
        {autoRefresh && (
          <div className="flex items-center text-xs text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
            Live
          </div>
        )}
      </div>

      <FriendsListening
        isLoading={false}
        onProfileClick={handleProfileClick}
        onTrackClick={handleTrackClick}
      />
    </div>
  );

  if (layout === 'sidebar') {
    return (
      <div className={`flex gap-6 min-h-screen ${className}`}>
        <aside className="w-80 flex-shrink-0">
          {renderHeader()}
          {renderPersonalMusic()}
          <div className="sticky top-6">
            <AccountStatus />
          </div>
        </aside>
        <main className="flex-1 min-w-0">
          {renderSearch()}
          {renderFriendsActivity()}
        </main>
      </div>
    );
  }

  if (layout === 'tabs') {
    const [activeTab, setActiveTab] = React.useState<'music' | 'search' | 'friends'>('music');

    return (
      <div className={className}>
        {renderHeader()}

        {/* Tab Navigation */}
        <div className="flex border-b border-purple-800 mb-6 overflow-x-auto">
          {enablePersonalMusic && (
            <button
              onClick={() => setActiveTab('music')}
              className={`px-4 py-2 whitespace-nowrap transition-colors ${activeTab === 'music'
                  ? 'border-b-2 border-purple-500 text-purple-300'
                  : 'text-gray-400 hover:text-gray-300'
                }`}
              aria-pressed={activeTab === 'music'}
            >
              Your Music
            </button>
          )}
          {enableSearch && (
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-2 whitespace-nowrap transition-colors ${activeTab === 'search'
                  ? 'border-b-2 border-purple-500 text-purple-300'
                  : 'text-gray-400 hover:text-gray-300'
                }`}
              aria-pressed={activeTab === 'search'}
            >
              Search
            </button>
          )}
          {enableFriends && (
            <button
              onClick={() => setActiveTab('friends')}
              className={`px-4 py-2 whitespace-nowrap transition-colors ${activeTab === 'friends'
                  ? 'border-b-2 border-purple-500 text-purple-300'
                  : 'text-gray-400 hover:text-gray-300'
                }`}
              aria-pressed={activeTab === 'friends'}
            >
              Friends
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="min-h-96">
          {activeTab === 'music' && enablePersonalMusic && renderPersonalMusic()}
          {activeTab === 'search' && enableSearch && renderSearch()}
          {activeTab === 'friends' && enableFriends && renderFriendsActivity()}
        </div>
      </div>
    );
  }

  // Single layout (default)
  return (
    <div className={`space-y-6 ${className}`}>
      {renderHeader()}
      {renderPersonalMusic()}
      {renderSearch()}
      {renderFriendsActivity()}
    </div>
  );
};