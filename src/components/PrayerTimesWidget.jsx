import { useState, useEffect, useCallback, useRef } from 'react';
import { Compass, Clock, MapPin, Calendar, Navigation, RotateCw, Volume2, Sun, Moon, Sparkles, Bell } from 'lucide-react';
import { calculateQiblaBearing, ADHAN_AUDIO_CHOICES, checkFastingStatus } from '../services/qiblaService';
import GlassCard from './GlassCard';
import './PrayerTimesWidget.css';

const DEFAULT_TIMINGS = {};

const PRESET_CITIES = [
  { label: 'Choose your city', value: 'SELECT' },
  { label: 'Auto (Current Location)', value: 'AUTO' },
  { label: 'Makkah, KSA', value: 'Mecca' },
  { label: 'Madinah, KSA', value: 'Medina' },
  { label: 'Cairo, Egypt', value: 'Cairo' },
  { label: 'Istanbul, Turkey', value: 'Istanbul' },
  { label: 'London, UK', value: 'London' },
  { label: 'New York, USA', value: 'New York' },
  { label: 'Lagos, Nigeria', value: 'Lagos' },
  { label: 'Kuala Lumpur, MY', value: 'Kuala Lumpur' },
];

const PrayerTimesWidget = () => {
  const [selectedCity, setSelectedCity] = useState(() => localStorage.getItem('quranly_prayer_city') || 'SELECT');
  const [locationName, setLocationName] = useState('Choose your city');
  const [timings, setTimings] = useState(DEFAULT_TIMINGS);
  const [hijriDate, setHijriDate] = useState('');
  const [hijriDayNum, setHijriDayNum] = useState(null);
  const [nextPrayer, setNextPrayer] = useState({ name: 'Choose your city', timeLeft: '' });
  const [isLocating, setIsLocating] = useState(false);
  const [qiblaDegree, setQiblaDegree] = useState(null);

  const requestIdRef = useRef(0);
  const [prayerTimezone, setPrayerTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [timingsError, setTimingsError] = useState('');

  // Adhan Audio State & Notification Permission State
  const [selectedAdhan, setSelectedAdhan] = useState(ADHAN_AUDIO_CHOICES[0]);
  const [isPlayingAdhan, setIsPlayingAdhan] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(() => {
    return 'Notification' in window && Notification.permission === 'granted';
  });
  const adhanAudioRef = useRef(null);
  const notifiedPrayersRef = useRef({});

  // Request Notification Permissions for iOS/Android/PWA
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert("Push notifications are not supported on this browser/device.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotifEnabled(true);
      new Notification("🕌 Quranly Prayer Alerts Enabled", {
        body: "Prayer alerts are enabled while Quranly is open.",
        icon: `${import.meta.env.BASE_URL}logo.png`
      });
    } else {
      setNotifEnabled(false);
      alert("Notification permission denied. Please allow notifications in your browser/device settings.");
    }
  };

  // Check prayer time match and fire Notification & Adhan
  useEffect(() => {
    const checkPrayerNotifications = () => {
      if (!notifEnabled || !Object.keys(timings).length) return;
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-GB', {timeZone: prayerTimezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(now);
      const hours = parts.find(p => p.type === 'hour').value;
      const minutes = parts.find(p => p.type === 'minute').value;
      const currentTimeStr = `${hours}:${minutes}`;

      const safeT = timings || DEFAULT_TIMINGS;
      const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

      prayers.forEach(pName => {
        const pTime = safeT[pName];
        if (pTime && pTime.startsWith(currentTimeStr)) {
          const notifKey = `${now.toDateString()}_${pName}`;
          if (!notifiedPrayersRef.current[notifKey]) {
            notifiedPrayersRef.current[notifKey] = true;

            // Trigger Push Notification if enabled
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`🕌 Time for ${pName} Prayer!`, {
                body: `It is now time for ${pName} (${pTime}) in ${locationName}. Click to open Quranly.`,
                icon: `${import.meta.env.BASE_URL}logo.png`,
                requireInteraction: true
              });
            }

            // Auto Play Adhan
            togglePlayAdhan(selectedAdhan);
          }
        }
      });
    };

    const notifInterval = setInterval(checkPrayerNotifications, 15000);
    return () => clearInterval(notifInterval);
  }, [timings, locationName, selectedAdhan, notifEnabled, prayerTimezone]);

  // Fetch timings by coordinates (lat, lng)
  const fetchTimingsByCoords = useCallback(async (lat, lng, locLabel) => {
    const requestId = ++requestIdRef.current;
    setTimingsError(''); setTimings({});
    try {
      // Calculate exact Great-Circle bearing to Kaaba (Makkah)
      const bearing = calculateQiblaBearing(lat, lng);
      setQiblaDegree(Math.round(bearing));

      const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=2`, {signal: AbortSignal.timeout(12000)});
      const data = await res.json();
      if (requestId !== requestIdRef.current) return;
      if (!res.ok || !data?.data?.timings) throw new Error('Prayer times unavailable');
      setPrayerTimezone(data.data.meta?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      if (data?.data?.timings) {
        const t = data.data.timings;
        setTimings({
          Fajr: String(t.Fajr || '').split(' ')[0],
          Sunrise: String(t.Sunrise || '').split(' ')[0],
          Dhuhr: String(t.Dhuhr || '').split(' ')[0],
          Asr: String(t.Asr || '').split(' ')[0],
          Maghrib: String(t.Maghrib || '').split(' ')[0],
          Isha: String(t.Isha || '').split(' ')[0],
        });

        const h = data.data.date?.hijri;
        if (h) {
          setHijriDate(`${h.day} ${h.month?.en || ''} ${h.year} AH`);
          setHijriDayNum(Number(h.day) || null);
          setHijriDayNum(Number(h.day) || null);
        }
        if (locLabel) setLocationName(locLabel);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) { setTimingsError('Prayer times unavailable. Check your connection and choose a city.'); setLocationName(locLabel || 'Current location'); }
    }
  }, []);

  // Fetch timings by city name
  const fetchTimingsByCity = useCallback(async (cityName) => {
    const requestId = ++requestIdRef.current;
    setTimingsError(''); setTimings({}); setLocationName(cityName); setQiblaDegree(null);
    const countries = { Mecca: 'Saudi Arabia', Medina: 'Saudi Arabia', Cairo: 'Egypt', Istanbul: 'Turkey', London: 'United Kingdom', 'New York': 'United States', Lagos: 'Nigeria', 'Kuala Lumpur': 'Malaysia' };
    try {
      const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(cityName)}&country=${encodeURIComponent(countries[cityName] || '')}&method=2`, {signal: AbortSignal.timeout(12000)});
      const data = await res.json();
      if (requestId !== requestIdRef.current) return;
      if (!res.ok || !data?.data?.timings) throw new Error('Prayer times unavailable');
      setPrayerTimezone(data.data.meta?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
      if (data?.data?.timings) {
        const t = data.data.timings;
        setTimings({
          Fajr: String(t.Fajr || '').split(' ')[0],
          Sunrise: String(t.Sunrise || '').split(' ')[0],
          Dhuhr: String(t.Dhuhr || '').split(' ')[0],
          Asr: String(t.Asr || '').split(' ')[0],
          Maghrib: String(t.Maghrib || '').split(' ')[0],
          Isha: String(t.Isha || '').split(' ')[0],
        });

        const h = data.data.date?.hijri;
        if (h) {
          setHijriDate(`${h.day} ${h.month?.en || ''} ${h.year} AH`);
          setHijriDayNum(Number(h.day) || null);
        }
        setLocationName(cityName);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) setTimingsError('Prayer times unavailable. Check your connection and choose a city.');
    }
  }, []);

  // Automatic Location Detector
  const detectLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationName('Detecting location…');

    // 1. Try Browser GPS Geolocation
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocode to get city name
          try {
            const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            const geoData = await geoRes.json();
            const city = geoData.city || geoData.locality || geoData.principalSubdivision || 'Current Location';
            const country = geoData.countryCode || '';
            const label = country ? `${city}, ${country}` : city;
            
            await fetchTimingsByCoords(latitude, longitude, label);
          } catch (_) {
            await fetchTimingsByCoords(latitude, longitude, 'Current Location');
          }
          setIsLocating(false);
        },
        async (err) => {
          console.warn('GPS denied or unavailable, falling back to IP location:', err.message);
          // 2. Fallback to IP Geolocation
          try {
            const ipRes = await fetch('https://ipapi.co/json/');
            const ipData = await ipRes.json();
            if (ipData?.latitude && ipData?.longitude) {
              const label = `${ipData.city || 'Local'}, ${ipData.country_code || ''}`;
              await fetchTimingsByCoords(ipData.latitude, ipData.longitude, label);
            } else {
              setLocationName('Choose your city'); setTimingsError('Location unavailable. Please choose a city.');
            }
          } catch (_) {
            setLocationName('Choose your city'); setTimingsError('Location unavailable. Please choose a city.');
          }
          setIsLocating(false);
        },
        { timeout: 8000, maximumAge: 60000 }
      );
    } else {
      // Fallback if browser doesn't support geolocation
      setLocationName('Choose your city'); setTimingsError('Location unavailable. Please choose a city.');
      setIsLocating(false);
    }
  }, [fetchTimingsByCoords, fetchTimingsByCity]);

  useEffect(() => {
    localStorage.setItem('quranly_prayer_city', selectedCity);
    if (selectedCity === 'AUTO') {
      detectLocation();
    } else if (selectedCity !== 'SELECT') {
      fetchTimingsByCity(selectedCity);
    }
  }, [selectedCity, detectLocation, fetchTimingsByCity]);

  // Next prayer & countdown logic
  useEffect(() => {
    const updateCountdown = () => {
      try {
        const now = new Date();
        if (!Object.keys(timings).length) { setNextPrayer({name: selectedCity === 'SELECT' ? 'Choose your city' : 'Loading prayer times', timeLeft: ''}); return; }
        const parts = new Intl.DateTimeFormat('en-GB', {timeZone: prayerTimezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(now);
        const currentMinutes = Number(parts.find(p => p.type === 'hour').value) * 60 + Number(parts.find(p => p.type === 'minute').value);

        const safeTimings = timings || DEFAULT_TIMINGS;
        const prayerList = [
          { name: 'Fajr', time: safeTimings.Fajr },
          { name: 'Dhuhr', time: safeTimings.Dhuhr },
          { name: 'Asr', time: safeTimings.Asr },
          { name: 'Maghrib', time: safeTimings.Maghrib },
          { name: 'Isha', time: safeTimings.Isha },
        ];

        let upcoming = null;
        for (const p of prayerList) {
          if (p.time) {
            const cleanTime = String(p.time).split(' ')[0];
            const [hStr, mStr] = cleanTime.split(':');
            const h = parseInt(hStr, 10);
            const m = parseInt(mStr, 10);

            if (!isNaN(h) && !isNaN(m)) {
              const pMin = h * 60 + m;
              if (pMin > currentMinutes) {
                const diff = pMin - currentMinutes;
                const hrs = Math.floor(diff / 60);
                const mins = diff % 60;
                upcoming = { name: p.name, timeLeft: hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m` };
                break;
              }
            }
          }
        }

        if (!upcoming) {
          upcoming = { name: 'Fajr', timeLeft: 'Tomorrow' };
        }
        setNextPrayer(upcoming);
      } catch (err) {
        console.error('Error calculating countdown:', err);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 30000);
    return () => clearInterval(interval);
  }, [timings, prayerTimezone, selectedCity]);

  const safeTimings = timings || DEFAULT_TIMINGS;
  const safeNextPrayer = nextPrayer || { name: 'Choose your city', timeLeft: '' };
  const fastingInfo = checkFastingStatus(hijriDayNum);

  const togglePlayAdhan = (choice) => {
    const targetAdhan = choice || selectedAdhan;
    if (isPlayingAdhan) {
      if (adhanAudioRef.current) {
        adhanAudioRef.current.pause();
        adhanAudioRef.current.currentTime = 0;
      }
      setIsPlayingAdhan(false);
    } else {
      if (adhanAudioRef.current) {
        adhanAudioRef.current.pause();
      }
      const audio = new Audio(targetAdhan.audioUrl);
      adhanAudioRef.current = audio;
      setIsPlayingAdhan(true);
      audio.play().then(() => {
        console.log("Playing authentic Adhan:", targetAdhan.name);
      }).catch(e => {
        console.error("Adhan audio playback failed:", e);
        setIsPlayingAdhan(false);
      });
      audio.onended = () => setIsPlayingAdhan(false);
      audio.onerror = (err) => {
        console.error("Adhan audio load error:", err);
        setIsPlayingAdhan(false);
      };
    }
  };

  return (
    <GlassCard className="prayer-widget-card">
      <div className="prayer-header">
        <div className="prayer-city">
          <MapPin size={16} className="location-icon" />
          <span className="location-name">{locationName || 'Detecting location...'}</span>
          {selectedCity === 'AUTO' && (
            <button
              className={`loc-refresh-btn ${isLocating ? 'spinning' : ''}`}
              onClick={detectLocation}
              title="Re-detect Location"
            >
              <RotateCw size={13} />
            </button>
          )}
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="city-select"
            title="Change Location"
          >
            {PRESET_CITIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="hijri-badge">
          <Calendar size={13} />
          <span>{hijriDate || 'Prayer times by Aladhan'}</span>
        </div>
      </div>

      {/* Countdown Hero Banner */}
      <div className="next-prayer-banner">
        <div className="banner-info">
          <span className="next-label"><span className="live-pulse-dot" style={{ marginRight: 6 }}></span>NEXT PRAYER</span>
          <h3 className="next-name">{safeNextPrayer.name}</h3>
        </div>

        <div className="countdown-display">
          <Clock size={16} color="var(--text-primary)" />
          <span>{safeNextPrayer.timeLeft ? `in ${safeNextPrayer.timeLeft}` : (timingsError || 'Select a location above')}</span>
        </div>

        {/* Qibla Direction Indicator (Great Circle Math) */}
        {qiblaDegree !== null && <div className="qibla-indicator" title={`Qibla Bearing: ${qiblaDegree}° from North to Kaaba`}>
          <Compass size={22} className="compass-icon" style={{ color: 'var(--text-primary)', transform: `rotate(${qiblaDegree || 247}deg)` }} />
          <span className="qibla-text">{qiblaDegree}° Qibla</span>
        </div>}
      </div>

      {/* Fasting Tracker & Suhoor/Iftar Bar */}
      <div className="fasting-tracker-bar">
        <div className="fasting-time-chip">
          <Sun size={14} color="var(--text-primary)" />
          <span>Suhoor Ends: <strong>{safeTimings.Fajr || '—'}</strong></span>
        </div>
        <div className="fasting-time-chip">
          <Moon size={14} color="var(--text-primary)" />
          <span>Iftar: <strong>{safeTimings.Maghrib || '—'}</strong></span>
        </div>
        {hijriDayNum && fastingInfo.isRecommendedFast && (
          <div className="sunnah-fast-badge">
            <Sparkles size={12} color="var(--text-primary)" />
            <span>{fastingInfo.reason}</span>
          </div>
        )}
      </div>

      {/* Adhan Audio Muezzin Selector */}
      <div className="adhan-audio-bar">
        <div className="adhan-title">
          <Volume2 size={14} color="var(--text-primary)" />
          <span>Adhan:</span>
        </div>
        <select 
          className="adhan-select"
          value={selectedAdhan.id}
          onChange={(e) => {
            const found = ADHAN_AUDIO_CHOICES.find(a => a.id === e.target.value);
            if (found) setSelectedAdhan(found);
          }}
        >
          {ADHAN_AUDIO_CHOICES.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <button 
          className="play-adhan-btn"
          onClick={() => togglePlayAdhan()}
          title="Test Adhan Call"
        >
          <span>{isPlayingAdhan ? 'Stop Adhan' : 'Play Adhan'}</span>
        </button>
        <button 
          className={`notif-toggle-btn ${notifEnabled ? 'active-notif' : ''}`}
          onClick={requestNotificationPermission}
          title={notifEnabled ? "Prayer Alerts Active" : "Enable Prayer Alerts"}
        >
          <Bell size={13} color="var(--bg-color)" />
          <span>{notifEnabled ? 'Alerts ON' : 'Alerts'}</span>
        </button>
      </div>

      {/* Prayer Times Grid */}
      <div className="prayer-times-grid">
        {Object.entries(safeTimings).map(([name, time]) => {
          const isNext = name === safeNextPrayer.name;
          const displayTime = String(time || '').split(' ')[0];
          return (
            <div key={name} className={`prayer-chip ${isNext ? 'active-prayer' : ''}`}>
              <span className="p-name">{name}</span>
              <span className="p-time">{displayTime}</span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};

export default PrayerTimesWidget;


