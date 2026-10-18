import { useState, useRef } from 'react';
import { X, Download, Image as ImageIcon, Layout, Palette, Check, BookOpen } from 'lucide-react';
import './VerseCardGenerator.css';

const BACKGROUND_PRESETS = [
  { id: 'emerald', name: 'Emerald Night', gradient: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #0f172a 100%)', text: '#ecfdf5', gold: '#d4af37' },
  { id: 'midnight', name: 'Midnight Blue', gradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311b92 100%)', text: '#f8fafc', gold: '#fbbf24' },
  { id: 'obsidian', name: 'Obsidian Gold', gradient: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #27272a 100%)', text: '#ffffff', gold: '#f59e0b' },
  { id: 'sunset', name: 'Divine Sunset', gradient: 'linear-gradient(135deg, #451a03 0%, #78350f 50%, #1e1b4b 100%)', text: '#fff7ed', gold: '#fbbf24' },
  { id: 'parchment', name: 'Royal Parchment', gradient: 'linear-gradient(135deg, #292524 0%, #44403c 50%, #1c1917 100%)', text: '#f5f5f4', gold: '#eab308' },
];

const ASPECT_RATIOS = [
  { id: 'story', label: 'Story (9:16)', width: 1080, height: 1920, previewWidth: 270, previewHeight: 480 },
  { id: 'square', label: 'Square (1:1)', width: 1080, height: 1080, previewWidth: 320, previewHeight: 320 },
  { id: 'wallpaper', label: 'Wallpaper (16:9)', width: 1920, height: 1080, previewWidth: 380, previewHeight: 213 },
];

const drawGeometricPattern = (ctx, canvasWidth, canvasHeight) => {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
  ctx.lineWidth = 2;
  const step = canvasWidth * 0.08;
  for (let i = -canvasHeight; i < canvasWidth + canvasHeight; i += step) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + canvasHeight, canvasHeight); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - canvasHeight, canvasHeight); ctx.stroke();
  }
};

const drawIslamicArch = (ctx, w, h, m, color) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.round(w * 0.008);
  ctx.beginPath();
  ctx.moveTo(m, h - m);
  const archStart = h * 0.25; // Push the arch up higher
  ctx.lineTo(m, archStart);
  
  ctx.bezierCurveTo(
    m, archStart * 0.6, 
    w * 0.3, archStart * 0.4, 
    w * 0.5, m
  );
  
  ctx.bezierCurveTo(
    w * 0.7, archStart * 0.4, 
    w - m, archStart * 0.6, 
    w - m, archStart
  );
  
  ctx.lineTo(w - m, h - m);
  ctx.lineTo(m, h - m);
  ctx.stroke();

  // Inner border
  const iM = m + Math.round(w * 0.02);
  ctx.lineWidth = Math.round(w * 0.003);
  ctx.beginPath();
  ctx.moveTo(iM, h - iM);
  ctx.lineTo(iM, archStart);
  ctx.bezierCurveTo(
    iM, archStart * 0.65, 
    w * 0.35, archStart * 0.45, 
    w * 0.5, iM
  );
  ctx.bezierCurveTo(
    w * 0.65, archStart * 0.45, 
    w - iM, archStart * 0.65, 
    w - iM, archStart
  );
  ctx.lineTo(w - iM, h - iM);
  ctx.lineTo(iM, h - iM);
  ctx.stroke();
};

const drawLantern = (ctx, x, y, size, color) => {
  ctx.save();
  ctx.translate(x, y);
  
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.06;
  ctx.lineJoin = 'round';
  
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, size * 0.6); ctx.stroke(); // chain
  
  ctx.translate(0, size * 0.6);
  ctx.beginPath(); ctx.arc(0, 0, size * 0.05, 0, Math.PI * 2); ctx.fill(); // top point
  ctx.beginPath(); ctx.moveTo(-size * 0.3, size * 0.2); ctx.quadraticCurveTo(0, 0, size * 0.3, size * 0.2); ctx.closePath(); ctx.fill(); // dome
  ctx.beginPath(); ctx.rect(-size * 0.25, size * 0.2, size * 0.5, size * 0.6); ctx.stroke(); // body
  
  ctx.beginPath(); ctx.moveTo(0, size * 0.2); ctx.lineTo(0, size * 0.8); ctx.moveTo(-size * 0.25, size * 0.5); ctx.lineTo(size * 0.25, size * 0.5); ctx.stroke(); // cross
  
  ctx.beginPath(); ctx.moveTo(-size * 0.25, size * 0.85); ctx.lineTo(size * 0.25, size * 0.85); ctx.lineTo(size * 0.15, size); ctx.lineTo(-size * 0.15, size); ctx.closePath(); ctx.fill(); // base
  
  ctx.beginPath(); ctx.arc(0, size * 0.5, size * 0.15, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255, 235, 100, 0.6)'; ctx.fill(); // glow
  
  ctx.restore();
};

const VerseCardGenerator = ({ verse, onClose }) => {
  const [selectedBg, setSelectedBg] = useState(BACKGROUND_PRESETS[0]);
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[0]);
  const [downloading, setDownloading] = useState(false);
  const canvasRef = useRef(null);

  if (!verse) return null;

  const handleDownloadImage = () => {
    setDownloading(true);
    const canvas = document.createElement('canvas');
    canvas.width = selectedRatio.width;
    canvas.height = selectedRatio.height;
    const ctx = canvas.getContext('2d');

    const renderCanvas = (logoImg) => {
      // 1. Draw Background Gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      if (selectedBg.id === 'emerald') {
        gradient.addColorStop(0, '#022c22');
        gradient.addColorStop(0.5, '#064e3b');
        gradient.addColorStop(1, '#0f172a');
      } else if (selectedBg.id === 'midnight') {
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(0.5, '#1e1b4b');
        gradient.addColorStop(1, '#311b92');
      } else if (selectedBg.id === 'obsidian') {
        gradient.addColorStop(0, '#09090b');
        gradient.addColorStop(0.5, '#18181b');
        gradient.addColorStop(1, '#27272a');
      } else if (selectedBg.id === 'sunset') {
        gradient.addColorStop(0, '#451a03');
        gradient.addColorStop(0.5, '#78350f');
        gradient.addColorStop(1, '#1e1b4b');
      } else {
        gradient.addColorStop(0, '#292524');
        gradient.addColorStop(0.5, '#44403c');
        gradient.addColorStop(1, '#1c1917');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 1.5 Draw Background Pattern
      drawGeometricPattern(ctx, canvas.width, canvas.height);

      // 2. Draw Islamic Arch Frame
      const margin = Math.round(canvas.width * 0.05);
      drawIslamicArch(ctx, canvas.width, canvas.height, margin, selectedBg.gold);

      // 2.5 Draw Hanging Lanterns
      const lanternSize = Math.round(canvas.width * 0.1);
      drawLantern(ctx, margin * 2.5, margin, lanternSize, selectedBg.gold);
      drawLantern(ctx, canvas.width - (margin * 2.5), margin, lanternSize, selectedBg.gold);

      // 3. Draw App Branding Logo + Watermark
      let watermarkY = margin + Math.round(canvas.height * 0.05);
      if (logoImg) {
        const logoSize = Math.round(canvas.width * 0.048);
        const logoX = (canvas.width / 2) - (logoSize / 2);
        const logoY = margin + Math.round(canvas.height * 0.025);
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        watermarkY = logoY + logoSize + Math.round(canvas.height * 0.025);
      }

      ctx.font = `600 ${Math.round(canvas.width * 0.024)}px Inter, sans-serif`;
      ctx.fillStyle = selectedBg.gold;
      ctx.textAlign = 'center';
      ctx.fillText('Q U R A N L Y', canvas.width / 2, watermarkY);

      // 4. Draw Arabic Verse Text
      const arabicFontSize = Math.round(canvas.width * 0.048);
      ctx.font = `${arabicFontSize}px 'Amiri', 'Traditional Arabic', serif`;
      ctx.fillStyle = selectedBg.text;
      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      
      // Wrap Arabic Text
      const arabicText = verse.arabicText || verse.text || '';
      const lines = [];
      const words = arabicText.split(' ');
      let currentLine = '';
      words.forEach(w => {
        const test = currentLine + (currentLine ? ' ' : '') + w;
        if (ctx.measureText(test).width > canvas.width * 0.75) {
          lines.push(currentLine);
          currentLine = w;
        } else {
          currentLine = test;
        }
      });
      if (currentLine) lines.push(currentLine);

      // Adjust text position slightly lower so it stays beautifully inside the arch
      const archStart = canvas.height * 0.25;
      const availableHeight = canvas.height - archStart - margin;
      const startY = archStart + (availableHeight / 2) - (lines.length * arabicFontSize * 0.7);
      
      lines.forEach((line, idx) => {
        ctx.fillText(line, canvas.width / 2, startY + (idx * arabicFontSize * 1.6));
      });

      // 5. Draw English Translation Text
      const engFontSize = Math.round(canvas.width * 0.026);
      ctx.font = `italic ${engFontSize}px Inter, sans-serif`;
      ctx.fillStyle = selectedBg.gold;
      ctx.direction = 'ltr';
      ctx.textAlign = 'center';
      
      const translation = verse.translation ? `"${verse.translation}"` : '';
      if (translation) {
        ctx.fillText(translation, canvas.width / 2, startY + (lines.length * arabicFontSize * 1.5) + Math.round(canvas.height * 0.06));
      }

      // 6. Draw Verse Key Badge
      const keyFontSize = Math.round(canvas.width * 0.022);
      ctx.font = `600 ${keyFontSize}px Inter, sans-serif`;
      ctx.fillStyle = selectedBg.text;
      const verseRefText = `Surah ${verse.surahName || 'Quran'} ${verse.verseKey || verse.numberInSurah || ''}`;
      ctx.fillText(verseRefText, canvas.width / 2, canvas.height - margin - Math.round(canvas.height * 0.04));

      // 7. Trigger PNG Download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `quranly_verse_${verse.verseKey || 'card'}.png`;
      link.href = dataUrl;
      link.click();
      setDownloading(false);
    };

    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    logoImg.src = '/logo.png';
    logoImg.onload = () => renderCanvas(logoImg);
    logoImg.onerror = () => renderCanvas(null);
  };

  return (
    <div className="surah-selector-overlay" onClick={onClose}>
      <div className="verse-card-generator-modal glass-panel" onClick={e => e.stopPropagation()}>
        <div className="generator-header">
          <h2>Verse Card Generator</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Live Visual Card Preview Frame */}
        <div className="generator-preview-area">
          <div 
            className="card-preview-box"
            style={{
              width: `${selectedRatio.previewWidth}px`,
              height: `${selectedRatio.previewHeight}px`,
              background: selectedBg.gradient,
              borderColor: selectedBg.gold
            }}
          >
            <div className="preview-watermark" style={{ color: selectedBg.gold }}>
              <img 
                src={`${import.meta.env.BASE_URL}logo.png`} 
                alt="Quranly Logo" 
                style={{ width: 16, height: 16, objectFit: 'contain', verticalAlign: 'middle', marginRight: 6 }} 
              />
              <span>Q U R A N L Y</span>
            </div>
            <div className="preview-arabic-text" style={{ color: selectedBg.text }}>
              {verse.arabicText || verse.text || ''}
            </div>
            {verse.translation && (
              <div className="preview-trans-text" style={{ color: selectedBg.gold }}>
                "{verse.translation}"
              </div>
            )}
            <div className="preview-ref-badge" style={{ color: selectedBg.text }}>
              Surah {verse.surahName || ''} {verse.verseKey || verse.numberInSurah || ''}
            </div>
          </div>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="generator-options-row">
          <label className="option-label"><Layout size={14} /> Aspect Ratio:</label>
          <div className="ratio-pills">
            {ASPECT_RATIOS.map(r => (
              <button 
                key={r.id}
                className={`option-pill ${selectedRatio.id === r.id ? 'active' : ''}`}
                onClick={() => setSelectedRatio(r)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Palette Selector */}
        <div className="generator-options-row">
          <label className="option-label"><Palette size={14} /> Theme Palette:</label>
          <div className="palette-pills">
            {BACKGROUND_PRESETS.map(bg => (
              <button
                key={bg.id}
                className={`palette-chip ${selectedBg.id === bg.id ? 'active' : ''}`}
                style={{ background: bg.gradient }}
                onClick={() => setSelectedBg(bg)}
                title={bg.name}
              >
                {selectedBg.id === bg.id && <Check size={14} color="#fff" />}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="generator-actions">
          <button 
            className="modal-action-btn primary download-card-btn"
            onClick={handleDownloadImage}
            disabled={downloading}
          >
            <Download size={18} />
            <span>{downloading ? 'Rendering HD Card...' : 'Download Image Card (HD)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerseCardGenerator;
