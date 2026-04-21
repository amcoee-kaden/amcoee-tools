/* ══════════════════════════════════════════════════════════════════════════════
   AMCOEE TOOLS — Liquid Glass (WebGL)
   Real refraction + specular + chromatic aberration + ripples.

   A full-screen WebGL canvas renders a procedural wallpaper plus a glass
   effect at every DOM region tagged with [data-liquid-glass]. The effect is
   not "frosted backdrop-filter" — it's per-pixel refraction computed from a
   height-field normal map, the way iOS 26 / macOS Tahoe do it in Metal.

   Shader pipeline (per pixel):
     1. Render the procedural wallpaper (vivid colored gradients).
     2. Is the pixel inside a registered glass rectangle?
        - Outside: output wallpaper color unchanged.
        - Inside: compute glass "dome" height + normal, perturb the normal
          with any active ripple waves, use the normal to refract the
          wallpaper underneath (per-RGB channel for chromatic aberration),
          add a specular highlight (Blinn-Phong, virtual light tracks
          cursor), add rim lighting, output.

   The HTML layer above just needs a transparent background on the glass
   surfaces — the effect comes from this canvas sitting at z-index: -1.
   ══════════════════════════════════════════════════════════════════════════════ */

const LiquidGlassWebGL = (function () {
  'use strict';

  const MAX_GLASS   = 4;
  const MAX_RIPPLES = 6;

  let gl = null;
  let canvas = null;
  let program = null;
  let uLoc = {};
  let dpr = 1;
  let mouseX = 0, mouseY = 0;
  let startTime = performance.now();
  const ripples = [];
  const glassEls = [];
  let rafId = null;
  let lastMouseTime = 0;

  // ── Shaders ────────────────────────────────────────────────────────────────
  const VERT_SHADER = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const FRAG_SHADER = `
    precision highp float;

    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_time;
    uniform vec4 u_glassRects[${MAX_GLASS}];
    uniform float u_glassRadii[${MAX_GLASS}];
    uniform vec4 u_ripples[${MAX_RIPPLES}];

    /* ── Procedural wallpaper (bold saturated orbs on a warm white base) ── */
    vec3 wallpaper(vec2 p) {
      vec2 uv = p / u_resolution;

      vec3 col = vec3(0.94, 0.95, 0.98);

      /* Orb helper: additive tint with soft falloff */
      vec2 c; float d;

      c = vec2(0.08, 0.12);
      d = distance(uv, c);
      col += vec3(0.15, 0.45, 1.00) * smoothstep(0.58, 0.00, d) * 0.55;

      c = vec2(0.92, 0.88);
      d = distance(uv, c);
      col += vec3(0.68, 0.28, 0.90) * smoothstep(0.56, 0.00, d) * 0.50;

      c = vec2(0.50, 0.55);
      d = distance(uv, c);
      col += vec3(0.95, 0.25, 0.40) * smoothstep(0.44, 0.00, d) * 0.28;

      c = vec2(0.88, 0.10);
      d = distance(uv, c);
      col += vec3(0.15, 0.75, 0.85) * smoothstep(0.44, 0.00, d) * 0.35;

      c = vec2(0.12, 0.92);
      d = distance(uv, c);
      col += vec3(1.00, 0.58, 0.05) * smoothstep(0.44, 0.00, d) * 0.32;

      return clamp(col, 0.0, 1.0);
    }

    /* ── SDF: rounded rectangle ────────────────────────────────────────── */
    float sdRoundRect(vec2 p, vec2 center, vec2 halfSize, float radius) {
      vec2 d = abs(p - center) - halfSize + vec2(radius);
      return length(max(d, 0.0)) - radius + min(max(d.x, d.y), 0.0);
    }

    /* ── Glass height: dome rising from the rounded-rect edge ──────────── */
    float glassHeight(vec2 p, vec4 rect, float radius) {
      vec2 center = rect.xy + rect.zw * 0.5;
      vec2 halfSize = rect.zw * 0.5;
      float sdf = sdRoundRect(p, center, halfSize, radius);
      float depth = -sdf;
      float edgeWidth = min(rect.z, rect.w) * 0.12;
      float h = smoothstep(0.0, edgeWidth, depth);
      return pow(h, 0.55);
    }

    /* ── Numerical normal from height gradient ─────────────────────────── */
    vec3 glassNormal(vec2 p, vec4 rect, float radius) {
      float eps = 1.5;
      float h  = glassHeight(p, rect, radius);
      float hx = glassHeight(p + vec2(eps, 0.0), rect, radius);
      float hy = glassHeight(p + vec2(0.0, eps), rect, radius);
      /* z term controls how "domed" vs "flat" — smaller z = more refraction */
      return normalize(vec3((hx - h) / eps, (hy - h) / eps, 0.055));
    }

    /* ── Ripple height contribution (radially propagating wave) ────────── */
    float rippleAt(vec2 p, vec4 ripple) {
      if (ripple.w <= 0.0) return 0.0;
      float age = u_time - ripple.z;
      if (age < 0.0 || age > 1.5) return 0.0;
      vec2 rp = ripple.xy;
      float d = distance(p, rp);
      float waveFront = age * 480.0;
      float proximity = abs(d - waveFront);
      float wave = sin((d - waveFront) * 0.18)
                 * exp(-proximity * 0.008)
                 * exp(-age * 2.2);
      return wave * ripple.w * 22.0;
    }

    /* ── Find which glass region contains this pixel (or -1) ──────────── */
    int findGlass(vec2 p) {
      for (int i = 0; i < ${MAX_GLASS}; i++) {
        vec4 rect = u_glassRects[i];
        if (rect.z <= 0.0 || rect.w <= 0.0) continue;
        vec2 center = rect.xy + rect.zw * 0.5;
        vec2 halfSize = rect.zw * 0.5;
        if (sdRoundRect(p, center, halfSize, u_glassRadii[i]) < 0.0) {
          return i;
        }
      }
      return -1;
    }

    void main() {
      /* Flip y so (0,0) is top-left (matches DOM coords). */
      vec2 p = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);

      int gi = findGlass(p);
      if (gi < 0) {
        gl_FragColor = vec4(wallpaper(p), 1.0);
        return;
      }

      /* Inside glass: compute normal + height, apply ripples. */
      vec4 rect;
      float radius;
      for (int i = 0; i < ${MAX_GLASS}; i++) {
        if (i == gi) { rect = u_glassRects[i]; radius = u_glassRadii[i]; }
      }

      vec3 normal = glassNormal(p, rect, radius);
      float height = glassHeight(p, rect, radius);

      /* Add all active ripples to the normal (they perturb the height). */
      float eps = 2.0;
      for (int i = 0; i < ${MAX_RIPPLES}; i++) {
        vec4 ripple = u_ripples[i];
        if (ripple.w > 0.0) {
          float h  = rippleAt(p, ripple);
          float hx = rippleAt(p + vec2(eps, 0.0), ripple);
          float hy = rippleAt(p + vec2(0.0, eps), ripple);
          normal.xy += vec2((hx - h) / eps, (hy - h) / eps) * 1.4;
        }
      }
      normal = normalize(normal);

      /* Refraction: strong at edges (where normal tilts), weak at center. */
      float edgeness = 1.0 - height;
      float refractAmount = 28.0 * edgeness + 6.0;
      vec2 offset = normal.xy * refractAmount;

      /* Chromatic aberration — more at edges. */
      float ca = 4.0 * edgeness;
      vec3 refracted;
      refracted.r = wallpaper(p + offset + normal.xy * ca).r;
      refracted.g = wallpaper(p + offset).g;
      refracted.b = wallpaper(p + offset - normal.xy * ca).b;

      /* Brightness + saturation boost inside the glass. */
      float lum = dot(refracted, vec3(0.299, 0.587, 0.114));
      refracted = mix(vec3(lum), refracted, 1.22);
      refracted *= 1.06;

      /* Specular highlight from a virtual light near the cursor. */
      vec3 center3 = vec3(rect.xy + rect.zw * 0.5, 0.0);
      vec3 lightPos = vec3(u_mouse.x, u_mouse.y, min(rect.z, rect.w) * 0.6);
      vec3 L = normalize(lightPos - vec3(p, 0.0));
      float spec = pow(max(0.0, dot(normal, L)), 28.0);

      /* Rim lighting — bright wherever the surface is tilted sharply. */
      float rim = pow(1.0 - normal.z, 3.0);

      /* Compose */
      vec3 finalColor = refracted
                      + vec3(spec) * 0.9
                      + vec3(rim) * 0.28;

      /* Subtle white glass tint */
      finalColor = mix(finalColor, vec3(1.0), 0.06);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  // ── Shader compilation helpers ─────────────────────────────────────────────
  function compileShader(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('[LiquidGlass] Shader compile error:', gl.getShaderInfoLog(sh));
      console.error(src);
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function buildProgram() {
    const vs = compileShader(gl.VERTEX_SHADER, VERT_SHADER);
    const fs = compileShader(gl.FRAGMENT_SHADER, FRAG_SHADER);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[LiquidGlass] Program link error:', gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  // ── Canvas sizing ──────────────────────────────────────────────────────────
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width  = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  }

  // ── Render a single frame ─────────────────────────────────────────────────
  function renderFrame() {
    rafId = null;
    if (!gl || !program) return;

    const now = (performance.now() - startTime) / 1000;

    gl.useProgram(program);
    gl.uniform2f(uLoc.resolution, canvas.width, canvas.height);
    gl.uniform2f(uLoc.mouse, mouseX * dpr, mouseY * dpr);
    gl.uniform1f(uLoc.time, now);

    // Pack glass rects + radii
    const gRects = new Float32Array(MAX_GLASS * 4);
    const gRadii = new Float32Array(MAX_GLASS);
    for (let i = 0; i < Math.min(glassEls.length, MAX_GLASS); i++) {
      const el = glassEls[i];
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      gRects[i * 4 + 0] = r.left * dpr;
      gRects[i * 4 + 1] = r.top  * dpr;
      gRects[i * 4 + 2] = r.width  * dpr;
      gRects[i * 4 + 3] = r.height * dpr;
      const cs = getComputedStyle(el);
      gRadii[i] = (parseFloat(cs.borderTopLeftRadius) || 0) * dpr;
    }
    gl.uniform4fv(uLoc.glassRects, gRects);
    gl.uniform1fv(uLoc.glassRadii, gRadii);

    // Pack ripples
    const rData = new Float32Array(MAX_RIPPLES * 4);
    let hasActive = false;
    for (let i = 0; i < MAX_RIPPLES; i++) {
      const r = ripples[i];
      if (r && (now - r.time) < 1.5) {
        rData[i * 4 + 0] = r.x * dpr;
        rData[i * 4 + 1] = r.y * dpr;
        rData[i * 4 + 2] = r.time;
        rData[i * 4 + 3] = r.strength;
        hasActive = true;
      }
    }
    gl.uniform4fv(uLoc.ripples, rData);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Keep animating while ripples are active OR mouse is moving frequently
    const mouseRecent = (performance.now() - lastMouseTime) < 200;
    if (hasActive || mouseRecent) scheduleRender();
  }

  function scheduleRender() {
    if (!rafId) rafId = requestAnimationFrame(renderFrame);
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  function register(el) {
    if (el && !glassEls.includes(el)) {
      glassEls.push(el);
      scheduleRender();
    }
  }

  function unregister(el) {
    const i = glassEls.indexOf(el);
    if (i >= 0) { glassEls.splice(i, 1); scheduleRender(); }
  }

  function addRipple(clientX, clientY, strength) {
    if (typeof strength === 'undefined') strength = 1.0;
    const now = (performance.now() - startTime) / 1000;
    // Find the first expired slot (or oldest if all active)
    let idx = -1, oldestTime = Infinity;
    for (let i = 0; i < MAX_RIPPLES; i++) {
      const r = ripples[i];
      if (!r || (now - r.time) > 1.5) { idx = i; break; }
      if (r.time < oldestTime) { oldestTime = r.time; idx = i; }
    }
    if (idx < 0) idx = 0;
    ripples[idx] = { x: clientX, y: clientY, time: now, strength: strength };
    scheduleRender();
  }

  function init() {
    if (canvas) return;

    canvas = document.createElement('canvas');
    canvas.id = 'liquid-glass-canvas';
    canvas.style.cssText =
      'position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;' +
      'pointer-events:none;display:block;';
    document.body.insertBefore(canvas, document.body.firstChild);

    gl = canvas.getContext('webgl', {
      antialias: true,
      premultipliedAlpha: false,
      alpha: false,
      powerPreference: 'high-performance'
    });

    if (!gl) {
      console.warn('[LiquidGlass] WebGL unavailable; falling back to plain backdrop.');
      // Fallback: render the wallpaper as a CSS gradient so the page isn't empty
      canvas.style.background =
        'radial-gradient(circle at 12% 18%, #267AFF 0%, transparent 55%),' +
        'radial-gradient(circle at 88% 85%, #AE48E0 0%, transparent 55%),' +
        'radial-gradient(circle at 88% 10%, #26BEDA 0%, transparent 48%),' +
        'radial-gradient(circle at 12% 92%, #FF9500 0%, transparent 48%),' +
        '#EEF0F8';
      return;
    }

    program = buildProgram();
    if (!program) return;

    // Fullscreen triangle strip
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1, 1, 1
    ]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Uniform locations
    uLoc.resolution = gl.getUniformLocation(program, 'u_resolution');
    uLoc.mouse      = gl.getUniformLocation(program, 'u_mouse');
    uLoc.time       = gl.getUniformLocation(program, 'u_time');
    uLoc.glassRects = gl.getUniformLocation(program, 'u_glassRects');
    uLoc.glassRadii = gl.getUniformLocation(program, 'u_glassRadii');
    uLoc.ripples    = gl.getUniformLocation(program, 'u_ripples');

    resize();
    window.addEventListener('resize', () => { resize(); scheduleRender(); });

    // Mouse tracking (specular follows cursor)
    document.addEventListener('pointermove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      lastMouseTime = performance.now();
      scheduleRender();
    }, { passive: true });

    // Click anywhere on a registered glass element → ripple
    document.addEventListener('pointerdown', (e) => {
      const el = e.target && e.target.closest ? e.target.closest('[data-liquid-glass]') : null;
      if (el && glassEls.includes(el)) addRipple(e.clientX, e.clientY, 1.0);
    });

    // Auto-register any elements that already exist
    document.querySelectorAll('[data-liquid-glass]').forEach(register);

    // Re-render when layout shifts (login → app transition, etc.)
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => scheduleRender());
      glassEls.forEach(el => ro.observe(el));
      // Store for later element registrations
      register._observer = ro;
    }

    scheduleRender();
  }

  return { init, register, unregister, addRipple, scheduleRender };
})();
