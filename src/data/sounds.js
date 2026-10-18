import { CloudRain, Flame, Wind, Waves, Bird, Moon } from 'lucide-react';

// Background ambient sound definitions with real loopable audio URLs
const sounds = [
  {
    id: 'None',
    name: 'No sounds',
    iconName: 'MinusCircle',
    type: 'basic',
    url: null,
  },
  {
    id: 'Rain',
    name: 'Gentle Rain',
    iconName: 'CloudRain',
    type: 'basic',
    url: 'https://assets.mixkit.co/active_storage/sfx/1247/1247.wav',
  },
  {
    id: 'Birds',
    name: 'Morning Birds',
    iconName: 'Bird',
    type: 'basic',
    url: 'https://assets.mixkit.co/active_storage/sfx/2432/2432-preview.mp3',
  },
  {
    id: 'Wave',
    name: 'Ocean Waves',
    iconName: 'Waves',
    type: 'basic',
    url: 'https://assets.mixkit.co/active_storage/sfx/2515/2515.wav',
  },
  {
    id: 'Wind',
    name: 'Soft Breeze',
    iconName: 'Wind',
    type: 'basic',
    url: 'https://assets.mixkit.co/active_storage/sfx/2517/2517.wav',
  },
  {
    id: 'River',
    name: 'Flowing River',
    iconName: 'Waves',
    type: 'basic',
    url: 'https://assets.mixkit.co/active_storage/sfx/2516/2516.wav',
  },
  {
    id: 'Crickets',
    name: 'Peaceful Night',
    iconName: 'Moon',
    type: 'basic',
    url: 'https://assets.mixkit.co/active_storage/sfx/2513/2513.wav',
  },
  {
    id: 'Fire',
    name: 'Warm Fireplace',
    iconName: 'Flame',
    type: 'basic',
    url: 'https://assets.mixkit.co/active_storage/sfx/1246/1246.wav',
  },
  {
    id: 'Thunder Storm',
    name: 'Rain & Thunder',
    iconName: 'CloudRain',
    type: 'basic',
    url: 'https://assets.mixkit.co/active_storage/sfx/1248/1248.wav',
  },
];

// Map iconName string → actual component
const iconMap = {
  CloudRain, Flame, Wind, Waves, Bird, Moon,
  MinusCircle: null,
};

export function getSoundIcon(iconName) {
  return iconMap[iconName] || null;
}

export function getSoundUrl(soundId) {
  return sounds.find(s => s.id === soundId)?.url ?? null;
}

export default sounds;
