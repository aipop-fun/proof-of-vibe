/* eslint-disable @typescript-eslint/no-empty-object-type,  @typescript-eslint/no-unused-vars, react-hooks/rules-of-hooks,  @typescript-eslint/ban-ts-comment */
// @ts-nocheck
"use client";

import React from 'react';
import { z } from 'zod';
import { PersonalMusic } from './PersonalMusic';
import { UnifiedSearch } from './unified/UnifiedSearch';
import { AccountStatus } from './AccountStatus';
import { useAuth } from '~/lib/hooks/useAuth';
import { useValidation } from '~/lib/hooks/useCommon';
import { LoadingState } from './ui/LoadingStates';

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

  const config = validateAndParse(DashboardConfigSchema, props) ?? {};
  const {
    layout = 'single',
    enableSearch = true,
    enableFriends = true,
    enablePersonalMusic = true,
    autoRefresh = true,
    className = ''
  } = config;

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
    />
  );

  const renderSearch = () => enableSearch && (
    <UnifiedSearch
      searchTypes={['both']}
      enableFilters={true}
      className="mb-6"
    />
  );

  const renderFriendsActivity = () => enableFriends && (
    <div className="bg-purple-800/20 rounded-lg p-4">
      <h3 className="font-medium mb-4">Friends Activity</h3>
      <p className="text-gray-400 text-sm">Coming soon...</p>
    </div>
  );

  if (layout === 'sidebar') {
    return (
      <div className={`flex gap-6 ${className}`}>
        <aside className="w-80">
          {renderHeader()}
          {renderPersonalMusic()}
          <AccountStatus />
        </aside>
        <main className="flex-1">
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

        <div className="flex border-b border-purple-800 mb-6">
          <button
            onClick={() => setActiveTab('music')}
            className={`px-4 py-2 ${activeTab === 'music' ? 'border-b-2 border-purple-500' : ''}`}
          >
            Your Music
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 ${activeTab === 'search' ? 'border-b-2 border-purple-500' : ''}`}
          >
            Search
          </button>
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-2 ${activeTab === 'friends' ? 'border-b-2 border-purple-500' : ''}`}
          >
            Friends
          </button>
        </div>

        {activeTab === 'music' && renderPersonalMusic()}
        {activeTab === 'search' && renderSearch()}
        {activeTab === 'friends' && renderFriendsActivity()}
      </div>
    );
  }

  // Single layout (default)
  return (
    <div className={className}>
      {renderHeader()}
      {renderPersonalMusic()}
      {renderSearch()}
      {renderFriendsActivity()}
    </div>
  );
};