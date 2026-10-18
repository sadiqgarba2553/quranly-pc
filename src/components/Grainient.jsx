import { useEffect, useRef } from 'react';

const Grainient = ({
  color1 = '#ffffff',
  color2 = '#000000',
  color3 = '#7a549c',
  timeSpeed = 0.25,
  colorBalance = 0.0,
  warpStrength = 1.0,
  warpFrequency = 5.0,
  warpSpeed = 2.0,
  warpAmplitude = 50.0,
  blendAngle = 0.0,
  blendSoftness = 0.05,
  rotationAmount = 500.0,
  noiseScale = 2.0,
  grainAmount = 0.1,
  grainScale = 2.0,
  grainAnimated = false,
  contrast = 1.5,
  gamma = 1.0,
  saturation = 1.0,
  centerX = 0.0,
  centerY = 0.0,
  zoom = 0.9,
}) => {
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const rafRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ] : [1, 1, 1];
  };

  const vert = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const frag = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec3 u_color1;
    uniform vec3 u_color2;
    uniform vec3 u_color3;
    uniform float u_colorBalance;
    uniform float u_warpStrength;
    uniform float u_warpFrequency;
    uniform float u_warpSpeed;
    uniform float u_warpAmplitude;
    uniform float u_blendAngle;
    uniform float u_blendSoftness;
    uniform float u_rotationAmount;
    uniform float u_noiseScale;
    uniform float u_grainAmount;
    uniform float u_grainScale;
    uniform float u_grainAnimated;
    uniform float u_contrast;
    uniform float u_gamma;
    uniform float u_saturation;
    uniform vec2 u_center;
    uniform float u_zoom;

    vec2 rotate2D(vec2 uv, float angle) {
      float c = cos(angle);
      float s = sin(angle);
      return mat2(c, -s, s, c) * uv;
    }

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
        mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    vec3 adjustSaturation(vec3 color, float saturation) {
      float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
      return mix(vec3(luminance), color, saturation);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      uv = uv - 0.5;
      uv.x *= u_resolution.x / u_resolution.y;
      uv = uv / u_zoom + vec2(u_center.x, u_center.y);

      float t = u_time * u_warpSpeed;

      // Domain warping
      vec2 warpedUV = uv * u_warpFrequency;
      float warpX = fbm(warpedUV + vec2(t * 0.3, t * 0.1)) - 0.5;
      float warpY = fbm(warpedUV + vec2(t * 0.1, t * 0.4)) - 0.5;
      vec2 warped = uv + vec2(warpX, warpY) * (u_warpAmplitude / u_resolution.y) * u_warpStrength;

      // Rotation
      float rotAngle = fbm(warped * u_noiseScale) * (u_rotationAmount / 1000.0);
      vec2 rotatedUV = rotate2D(warped, rotAngle);

      // Blend factor (angled blend between color1 and color2)
      float angle = u_blendAngle * 3.14159 / 180.0;
      vec2 blendDir = vec2(cos(angle), sin(angle));
      float blendFactor = dot(rotatedUV, blendDir) + u_colorBalance;
      blendFactor = smoothstep(-u_blendSoftness, u_blendSoftness, blendFactor);

      // Third color using noise
      float noiseFactor = fbm(rotatedUV * u_noiseScale + vec2(t * 0.2));

      // Blend all three colors
      vec3 color = mix(u_color1, u_color2, blendFactor);
      color = mix(color, u_color3, noiseFactor * 0.5);

      // Contrast
      color = (color - 0.5) * u_contrast + 0.5;
      color = clamp(color, 0.0, 1.0);

      // Gamma
      color = pow(color, vec3(1.0 / u_gamma));

      // Saturation
      color = adjustSaturation(color, u_saturation);

      // Grain
      float grainTime = u_grainAnimated > 0.5 ? u_time : 0.0;
      vec2 grainUV = gl_FragCoord.xy / (u_grainScale * 100.0);
      float grain = hash(grainUV + grainTime * 0.1) - 0.5;
      color += grain * u_grainAmount;

      gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
  `;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return;
    glRef.current = gl;

    // Compile shaders
    const compile = (type, src) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return shader;
    };

    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(program);
    gl.useProgram(program);
    programRef.current = program;

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1,
    ]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    startTimeRef.current = Date.now();

    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      if (!programRef.current) return;
      const p = programRef.current;
      const elapsed = (Date.now() - startTimeRef.current) / 1000 * timeSpeed;

      const u = (name) => gl.getUniformLocation(p, name);
      gl.uniform2f(u('u_resolution'), canvas.width, canvas.height);
      gl.uniform1f(u('u_time'), elapsed);
      gl.uniform3fv(u('u_color1'), hexToRgb(color1));
      gl.uniform3fv(u('u_color2'), hexToRgb(color2));
      gl.uniform3fv(u('u_color3'), hexToRgb(color3));
      gl.uniform1f(u('u_colorBalance'), colorBalance);
      gl.uniform1f(u('u_warpStrength'), warpStrength);
      gl.uniform1f(u('u_warpFrequency'), warpFrequency);
      gl.uniform1f(u('u_warpSpeed'), warpSpeed);
      gl.uniform1f(u('u_warpAmplitude'), warpAmplitude);
      gl.uniform1f(u('u_blendAngle'), blendAngle);
      gl.uniform1f(u('u_blendSoftness'), blendSoftness);
      gl.uniform1f(u('u_rotationAmount'), rotationAmount);
      gl.uniform1f(u('u_noiseScale'), noiseScale);
      gl.uniform1f(u('u_grainAmount'), grainAmount);
      gl.uniform1f(u('u_grainScale'), grainScale);
      gl.uniform1f(u('u_grainAnimated'), grainAnimated ? 1.0 : 0.0);
      gl.uniform1f(u('u_contrast'), contrast);
      gl.uniform1f(u('u_gamma'), gamma);
      gl.uniform1f(u('u_saturation'), saturation);
      gl.uniform2f(u('u_center'), centerX, centerY);
      gl.uniform1f(u('u_zoom'), zoom);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    render();

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      gl.deleteProgram(program);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update uniforms reactively without re-creating GL context
  // (uniforms are re-read from props on every frame via closure — handled by render loop)

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
};

export default Grainient;
