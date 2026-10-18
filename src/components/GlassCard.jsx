import LiquidGlassView from './LiquidGlassView';
import './GlassCard.css';

const GlassCard = ({ children, className = '', effect = 'clear', style = {}, ...props }) => {
  return (
    <LiquidGlassView effect={effect} className={`glass-card glass-panel ${className}`} style={style} {...props}>
      {children}
    </LiquidGlassView>
  );
};

export { LiquidGlassView };
export default GlassCard;
