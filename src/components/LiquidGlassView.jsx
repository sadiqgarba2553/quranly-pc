import React from 'react';
import './LiquidGlassView.css';

export const LiquidGlassView = ({
  effect = 'clear',
  style = {},
  className = '',
  children,
  onClick,
  ...props
}) => {
  return (
    <div
      className={`liquid-glass-container liquid-effect-${effect} ${className}`}
      style={style}
      onClick={onClick}
      {...props}
    >
      <div className="liquid-glass-specular-edge" aria-hidden="true" />
      <div className="liquid-glass-content">{children}</div>
    </div>
  );
};

export default LiquidGlassView;
