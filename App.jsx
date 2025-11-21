import React, { useState, useEffect, useRef } from 'react';
import { Send, Hash, Plus, Users, Settings, Search } from 'lucide-react';

// Firebase configuration - Connected to your Slick project
const firebaseConfig = {
  apiKey: "AIzaSyD13Z-9NTyfqau3bA63MMRfSI5CXhyX-8o",
  authDomain: "slick-6a560.firebaseapp.com",
  databaseURL: "https://slick-6a560-default-rtdb.firebaseio.com",
  projectId: "slick-6a560",
  storageBucket: "slick-6a560.firebasestorage.app",
  messagingSenderId: "646980552196",
  appId: "1:646980552196:web:75c499c6921afdeb7dd751"
};

// Simple Firebase wrapper
class SimpleFirebase {
  constructor(config) {
    this.db = null;
    this.listeners = {};
    this.init(config);
  }

  async init(config) {
    try {
      const response = await fetch(`${config.databaseURL}/.json`);
      this.db = config.databaseURL;
    } catch (e) {
      console.error('Firebase init error:', e);
    }
  }

  async set(path, data) {
    try {
      await fetch(`${this.db}/${path}.json`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.error('Set error:', e);
    }
  }

  async push(path, data) {
    try {
      const response = await fetch(`${this.db}/${path}.json`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (e) {
      console.error('Push error:', e);
    }
  }

  async get(path) {
    try {
      const response = await fetch(`${this.db}/${path}.json`);
      return await response.json();
    } catch (e) {
      console.error('Get error:', e);
      return null;
    }
  }

  listen(path, callback) {
    const poll = async () => {
      const data = await this.get(path);
      callback(data);
    };
    poll();
    const interval = setInterval(poll, 1000);
    this.listeners[path] = interval;
    return () => clearInterval(interval);
  }

  unlisten(path) {
    if (this.listeners[path]) {
      clearInterval(this.listeners[path]);
      delete this.listeners[path];
    }
  }
}

export default function SlackClone() {
  const [firebase, setFirebase] = useState(null);
  const [connected, setConnected] = useState(false);
  const [channels, setChannels] = useState([
    { id: 1, name: 'general', unread: 0 },
    { id: 2, name: 'random', unread: 0 }
  ]);
  const [activeChannel, setActiveChannel] = useState(1);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(true);
  const [newChannelName, setNewChannelName] = useState('');
  const [showNewChannel, setShowNewChannel] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fb = new SimpleFirebase(firebaseConfig);
    setFirebase(fb);
    
    // Check if Firebase is configured
    if (firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
      setConnected(true);
    }
  }, []);

  useEffect(() => {
    if (!firebase || !connected) return;

    // Listen to channels
    const unsubChannels = firebase.listen('channels', (data) => {
      if (data) {
        const channelList = Object.entries(data).map(([id, channel]) => ({
          id,
          name: channel.name,
          unread: 0
        }));
        setChannels(channelList);
      }
    });

    return () => {
      firebase.unlisten('channels');
    };
  }, [firebase, connected]);

  useEffect(() => {
    if (!firebase || !connected || !activeChannel) return;

    // Listen to messages for active channel
    const unsubMessages = firebase.listen(`messages/${activeChannel}`, (data) => {
      if (data) {
        const msgList = Object.entries(data).map(([id, msg]) => ({
          id,
          ...msg
        }));
        setMessages(prev => ({
          ...prev,
          [activeChannel]: msgList
        }));
      } else {
        setMessages(prev => ({
          ...prev,
          [activeChannel]: []
        }));
      }
    });

    return () => {
      firebase.unlisten(`messages/${activeChannel}`);
    };
  }, [firebase, connected, activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannel]);

  const handleSetUsername = () => {
    if (username.trim()) {
      setShowUsernamePrompt(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() && firebase && connected) {
      const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
      });
      const newMsg = {
        user: username || 'Anonymous',
        text: newMessage,
        timestamp,
        avatar: (username || 'A')[0].toUpperCase()
      };
      
      await firebase.push(`messages/${activeChannel}`, newMsg);
      setNewMessage('');
    }
  };

  const handleCreateChannel = async () => {
    if (newChannelName.trim() && firebase && connected) {
      const channelId = Date.now().toString();
      const newChannel = {
        name: newChannelName.toLowerCase().replace(/\s+/g, '-')
      };
      
      await firebase.set(`channels/${channelId}`, newChannel);
      setNewChannelName('');
      setShowNewChannel(false);
      setActiveChannel(channelId);
    }
  };

  const activeChannelData = channels.find(c => c.id == activeChannel);

  // Username prompt
  if (showUsernamePrompt) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
          <h2 className="text-2xl font-bold text-white mb-4">Welcome to Slack Clone</h2>
          {!connected && (
            <div className="mb-4 p-4 bg-yellow-900 border border-yellow-700 rounded">
              <p className="text-yellow-200 text-sm">
                ⚠️ Firebase not configured. Please follow the setup instructions in the code.
              </p>
            </div>
          )}
          <p className="text-gray-300 mb-4">Enter your name to start chatting:</p>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSetUsername()}
            placeholder="Your name"
            className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white mb-4"
            autoFocus
          />
          <button
            onClick={handleSetUsername}
            className="w-full py-3 bg-blue-600 rounded-lg hover:bg-blue-700 text-white font-semibold"
          >
            Start Chatting
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 flex flex-col">
        {/* Workspace Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Workspace</h1>
              <p className="text-xs text-gray-400">{username}</p>
            </div>
            {connected && <div className="w-2 h-2 bg-green-500 rounded-full" title="Connected" />}
          </div>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 bg-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Channels
              </h2>
              <Plus 
                className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white"
                onClick={() => setShowNewChannel(!showNewChannel)}
              />
            </div>
            {showNewChannel && (
              <div className="mb-2 flex gap-1">
                <input
                  type="text"
                  placeholder="channel-name"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateChannel()}
                  className="flex-1 px-2 py-1 bg-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleCreateChannel}
                  className="px-2 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            )}
            <div className="space-y-1">
              {channels.map(channel => (
                <div
                  key={channel.id}
                  onClick={() => setActiveChannel(channel.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer ${
                    activeChannel == channel.id 
                      ? 'bg-blue-600 text-white' 
                      : 'hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  <span className="text-sm">{channel.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        <div className="h-14 border-b border-gray-700 flex items-center px-6">
          <Hash className="w-5 h-5 mr-2" />
          <h2 className="text-lg font-semibold">{activeChannelData?.name}</h2>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!connected && (
            <div className="text-center text-gray-400 py-8">
              <p>Firebase not connected. Follow setup instructions in the code.</p>
            </div>
          )}
          {(messages[activeChannel] || []).map(msg => (
            <div key={msg.id} className="flex gap-3">
              <div className="w-9 h-9 rounded bg-blue-600 flex items-center justify-center font-semibold flex-shrink-0">
                {msg.avatar}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold">{msg.user}</span>
                  <span className="text-xs text-gray-400">{msg.timestamp}</span>
                </div>
                <p className="text-gray-200 mt-1">{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="px-6 pb-6">
          <div className="relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(e)}
              placeholder={`Message #${activeChannelData?.name}`}
              className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!connected}
            />
            <button
              onClick={handleSendMessage}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!newMessage.trim() || !connected}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
