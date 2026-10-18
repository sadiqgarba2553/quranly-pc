import React, { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle, RenderTarget } from 'ogl';
import './AcidSquares.css';

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

const DETAIL_STEPS = { low: 20, medium: 32, high: 48 };
const stepsFor = (detail) => DETAIL_STEPS[detail] || DETAIL_STEPS.medium;

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uWaveDepth;
uniform float uZoom;
uniform float uDensity;
uniform float uSpread;
uniform float uStepSize;
uniform float uGlow;
uniform float uExposure;
uniform float uColorShift;
uniform float uContrast;
uniform float uBrightness;
uniform float uOpacity;
uniform float uSteps;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uMouseRadius;
uniform float uEnableMouse;
uniform float uMouseActive;
uniform float uGrain;
uniform float uGrainIntensity;
uniform float uLightMode;
out vec4 fragColor;

void main() {
  vec2 frag = gl_FragCoord.xy;
  float zoom = max(uZoom, 0.05);
  float aspect = iResolution.x / iResolution.y;
  vec2 ndc = (2.0 * frag - iResolution.xy) / iResolution.y;
  vec2 dir = ndc * (0.5 / zoom);

  vec2 mouseNdc = vec2(uMouse.x * aspect, uMouse.y);
  float mr = max(uMouseRadius, 0.01);
  vec2 md = ndc - mouseNdc;
  float dent = exp(-dot(md, md) / (mr * mr)) * (3.0 * uMouseStrength * uEnableMouse * uMouseActive);

  float travel = sin(iTime * uSpeed) * uWaveDepth;
  float density = max(uDensity, 1.0);
  float spread = clamp(uSpread, 0.05, 0.6);
  float stepSize = max(uStepSize, 0.0005);
  float glowGain = max(uGlow, 0.0);

  vec3 tOffset = vec3(0.0, dent, travel);
  vec3 p = vec3(0.0);
  float s = 0.0;
  float glow = 0.0;

  for (int i = 0; i < 64; i++) {
    if (float(i) >= uSteps) break;
    p += vec3(dir * s, s);
    vec3 q = p + tOffset;
    s += density - length(q.xz) + length(ceil(q).xy);
    s = stepSize + abs(s) * spread;
    glow += glowGain / s;
  }

  float e = glow / max(uExposure, 1.0);
  float shimmer = 0.5 + 0.5 * dot(cos(iTime * uColorShift + p), vec3(0.3333));
  float v = tanh(e * uBrightness * mix(0.7, 1.05, shimmer));
  v = clamp((v - 0.5) * uContrast + 0.5, 0.0, 1.0);

  vec3 col = mix(uColor1, uColor2, smoothstep(0.0, 0.55, v));
  col = mix(col, uColor3, smoothstep(0.55, 1.0, v));
  col *= v;

  float a = clamp(v, 0.0, 1.0) * uOpacity;
  vec3 outRgb = col * a;
  if (uGrain > 0.5) {
    float gv = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453) - 0.5) * uGrainIntensity;
    outRgb = clamp(outRgb + gv, 0.0, 1.0);
    a = clamp(a + gv, 0.0, 1.0);
  }
  if (uLightMode > 0.5) {
    float peak = max(col.r, max(col.g, col.b));
    vec3 chroma = pow(clamp(col / max(peak, 0.0001), 0.0, 1.0), vec3(1.16));
    fragColor = vec4(mix(vec3(1.0), chroma, a * 0.94), 1.0);
  } else {
    fragColor = vec4(outRgb, a);
  }
}
`;

const postFragment = `#version 300 es
precision highp float;
uniform sampler2D tMap;
uniform vec2 iResolution;
uniform vec2 uDirection;
uniform float uRadius;
uniform float uGrain;
uniform float uGrainIntensity;
uniform float iTime;
out vec4 fragColor;

vec4 samp(vec2 uv) {
  return texture(tMap, uv);
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution;
  vec2 texel = uDirection / iResolution;
  float st = uRadius * 0.25;
  vec4 sum = samp(uv) * 0.2026;
  sum += (samp(uv + texel * st) + samp(uv - texel * st)) * 0.179;
  sum += (samp(uv + texel * (st * 2.0)) + samp(uv - texel * (st * 2.0))) * 0.124;
  sum += (samp(uv + texel * (st * 3.0)) + samp(uv - texel * (st * 3.0))) * 0.0672;
  sum += (samp(uv + texel * (st * 4.0)) + samp(uv - texel * (st * 4.0))) * 0.0285;
  vec4 col = sum;
  if (uGrain > 0.5) {
    float gv = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453) - 0.5) * uGrainIntensity;
    col.rgb = clamp(col.rgb + gv, 0.0, 1.0);
    col.a = clamp(col.a + gv, 0.0, 1.0);
  }
  fragColor = col;
}
`;

const ctxMap = new WeakMap();

const AcidSquares = ({
  color1 = '#5227FF',
  color2 = '#A855F7',
  color3 = '#FFFFFF',
  detail = 'medium',
  speed = 0.7,
  waveDepth = 1,
  zoom = 1.3,
  density = 10.0,
  glow = 1.0,
  exposure = 2700,
  spread = 0.3,
  stepSize = 0.002,
  colorShift = 0,
  contrast = 1,
  brightness = 1.0,
  opacity = 1.0,
  mouseInteraction = true,
  mouseStrength = 0.1,
  mouseRadius = 0.35,
  blur = 0,
  grain = true,
  grainIntensity = 0.05,
  lightMode = false,
  className = ''
}) => {
  const containerRef = useRef(null);
  const mouseTarget = useRef([0, 0]);
  const mouseCurrent = useRef([0, 0]);
  const enableMouseRef = useRef(mouseInteraction);
  const mouseStrengthRef = useRef(mouseStrength);
  const mouseActive = useRef(0);
  const mouseActiveTarget = useRef(0);
  const blurRef = useRef(blur);
  const grainRef = useRef(grain);
  const grainIntensityRef = useRef(grainIntensity);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer;
    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 2)
      });
    } catch (e) {
      console.warn('WebGL2 not supported for AcidSquares', e);
      return;
    }

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uSpeed: { value: speed },
        uWaveDepth: { value: waveDepth },
        uZoom: { value: zoom },
        uDensity: { value: density },
        uSpread: { value: spread },
        uStepSize: { value: stepSize },
        uGlow: { value: glow },
        uExposure: { value: exposure },
        uColorShift: { value: colorShift },
        uContrast: { value: contrast },
        uBrightness: { value: brightness },
        uOpacity: { value: opacity },
        uSteps: { value: stepsFor(detail) },
        uColor1: { value: new Float32Array(hexToRgb(color1)) },
        uColor2: { value: new Float32Array(hexToRgb(color2)) },
        uColor3: { value: new Float32Array(hexToRgb(color3)) },
        uMouse: { value: new Float32Array([0, 0]) },
        uMouseStrength: { value: mouseStrength },
        uMouseRadius: { value: mouseRadius },
        uEnableMouse: { value: mouseInteraction ? 1.0 : 0.0 },
        uMouseActive: { value: 0.0 },
        uGrain: { value: grain ? 1.0 : 0.0 },
        uGrainIntensity: { value: grainIntensity },
        uLightMode: { value: lightMode ? 1.0 : 0.0 }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });
    ctxMap.set(container, { renderer, program, mesh });

    let animationFrameId;
    let startTime = performance.now();

    const resize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setSize(w, h);
      program.uniforms.iResolution.value[0] = gl.drawingBufferWidth;
      program.uniforms.iResolution.value[1] = gl.drawingBufferHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onPointerMove = (e) => {
      if (!enableMouseRef.current) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseTarget.current = [x, y];
      mouseActiveTarget.current = 1;
    };

    const onPointerLeave = () => {
      mouseActiveTarget.current = 0;
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerleave', onPointerLeave);

    const render = (time) => {
      animationFrameId = requestAnimationFrame(render);
      const elapsed = (time - startTime) * 0.001;
      program.uniforms.iTime.value = elapsed;

      mouseCurrent.current[0] += (mouseTarget.current[0] - mouseCurrent.current[0]) * 0.05;
      mouseCurrent.current[1] += (mouseTarget.current[1] - mouseCurrent.current[1]) * 0.05;
      mouseActive.current += (mouseActiveTarget.current - mouseActive.current) * 0.05;

      program.uniforms.uMouse.value[0] = mouseCurrent.current[0];
      program.uniforms.uMouse.value[1] = mouseCurrent.current[1];
      program.uniforms.uMouseActive.value = mouseActive.current;

      renderer.render({ scene: mesh });
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    };
  }, [
    color1, color2, color3, detail, speed, waveDepth, zoom, density,
    glow, exposure, spread, stepSize, colorShift, contrast, brightness,
    opacity, mouseInteraction, mouseStrength, mouseRadius, blur, grain,
    grainIntensity, lightMode
  ]);

  return (
    <div
      ref={containerRef}
      className={`acid-squares-container ${className}`}
      style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, overflow: 'hidden' }}
    />
  );
};

export default AcidSquares;
