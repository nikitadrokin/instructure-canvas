// Canvas LMS community mark as an 8-fold SDF, lit with a vgpu-style
// energy field. UV is top-origin; we flip Y so +Y is up.

struct Params {
  time: f32,
  motion: f32,
  texel: vec2f,
}

@group(0) @binding(0) var<uniform> params: Params;

const TAU: f32 = 6.28318530718;
const FIGURES: f32 = 8.0;

// Geometry is in the unit disk. Outer body extent is BODY_X + BODY_R.
const HEAD_X: f32 = 0.352;
const HEAD_R: f32 = 0.086;
const BODY_X: f32 = 0.588;
const BODY_R: f32 = 0.196;

fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn hash31(p: vec3f) -> f32 {
  var p3 = fract(p * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn noise3(p: vec3f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let n000 = hash31(i);
  let n100 = hash31(i + vec3f(1.0, 0.0, 0.0));
  let n010 = hash31(i + vec3f(0.0, 1.0, 0.0));
  let n110 = hash31(i + vec3f(1.0, 1.0, 0.0));
  let n001 = hash31(i + vec3f(0.0, 0.0, 1.0));
  let n101 = hash31(i + vec3f(1.0, 0.0, 1.0));
  let n011 = hash31(i + vec3f(0.0, 1.0, 1.0));
  let n111 = hash31(i + vec3f(1.0, 1.0, 1.0));
  let nx00 = mix(n000, n100, u.x);
  let nx10 = mix(n010, n110, u.x);
  let nx01 = mix(n001, n101, u.x);
  let nx11 = mix(n011, n111, u.x);
  return mix(mix(nx00, nx10, u.y), mix(nx01, nx11, u.y), u.z);
}

fn fbm3(p: vec3f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var sample = p;
  for (var octave = 0; octave < 4; octave++) {
    value += amplitude * noise3(sample);
    sample *= 2.07;
    amplitude *= 0.5;
  }
  return value;
}

fn rotate(p: vec2f, angle: f32) -> vec2f {
  let c = cos(angle);
  let s = sin(angle);
  return vec2f(c * p.x - s * p.y, s * p.x + c * p.y);
}

fn polarAlign(p: vec2f, count: f32) -> vec2f {
  let slice = TAU / count;
  let angle = atan2(p.y, p.x);
  let sector = round(angle / slice) * slice;
  return rotate(p, -sector);
}

fn sdCircle(p: vec2f, radius: f32) -> f32 {
  return length(p) - radius;
}

fn sdOutwardHalfDisk(p: vec2f, radius: f32) -> f32 {
  return max(length(p) - radius, -p.x);
}

fn sdCanvasMark(p: vec2f) -> f32 {
  let q = polarAlign(p, FIGURES);
  let head = sdCircle(q - vec2f(HEAD_X, 0.0), HEAD_R);
  let body = sdOutwardHalfDisk(q - vec2f(BODY_X, 0.0), BODY_R);
  return min(head, body);
}

fn srgbToLinear(channel: f32) -> f32 {
  if (channel <= 0.04045) {
    return channel / 12.92;
  }
  return pow((channel + 0.055) / 1.055, 2.4);
}

fn srgbToLinear3(value: vec3f) -> vec3f {
  return vec3f(srgbToLinear(value.x), srgbToLinear(value.y), srgbToLinear(value.z));
}

fn linearToSrgb(channel: f32) -> f32 {
  if (channel <= 0.0031308) {
    return channel * 12.92;
  }
  return 1.055 * pow(channel, 1.0 / 2.4) - 0.055;
}

fn linearToSrgb3(value: vec3f) -> vec3f {
  return vec3f(linearToSrgb(value.x), linearToSrgb(value.y), linearToSrgb(value.z));
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let aspect = params.texel.y / max(params.texel.x, 1.0e-6);
  var p = vec2f((uv.x * 2.0 - 1.0) * aspect, -(uv.y * 2.0 - 1.0));
  p *= 1.18;

  let clock = mix(1.7, params.time, params.motion);
  let spin = clock * 0.08 * params.motion;
  p = rotate(p, spin);

  let d = sdCanvasMark(p);
  let pixel = max(max(fwidth(d), length(params.texel) * 1.6), 0.0015);
  let fill = 1.0 - smoothstep(-pixel, pixel, d);
  let rim = exp(-abs(d) * 42.0) * (1.0 - fill * 0.35);
  let glow = exp(-max(d, 0.0) * 7.4) * (0.42 + 0.18 * sin(clock * 1.15));
  let halo = exp(-max(d, 0.0) * 2.8) * 0.16;

  let warp = vec2f(
    fbm3(vec3f(p * 2.4, clock * 0.22)) - 0.5,
    fbm3(vec3f(p * 2.4 + 17.0, clock * 0.18)) - 0.5,
  );
  let field = fbm3(vec3f(p * 3.2 + warp * 0.85, clock * 0.35));
  let veins = smoothstep(0.32, 0.78, field);
  let spark = pow(hash21(floor(p * 48.0 + clock * 2.0)), 14.0);

  let canvasRed = srgbToLinear3(vec3f(0.882, 0.247, 0.169));
  let ember = srgbToLinear3(vec3f(1.0, 0.55, 0.28));
  let core = srgbToLinear3(vec3f(0.55, 0.05, 0.08));

  var albedo = mix(core, canvasRed, 0.72 + 0.28 * veins);
  albedo = mix(albedo, ember, veins * 0.45);
  albedo += ember * spark * fill * 0.35;

  let lightDir = normalize(vec2f(0.35, 0.82));
  let shade = 0.78 + 0.22 * clamp(dot(normalize(p + vec2f(0.001)), lightDir), 0.0, 1.0);
  albedo *= shade;

  var color = albedo * fill;
  color += canvasRed * rim * 1.15;
  color += mix(canvasRed, ember, 0.4) * glow;
  color += canvasRed * halo;

  var alpha = max(max(fill, rim * 0.85), glow * 0.9);
  alpha = max(alpha, halo * 0.7);
  alpha = clamp(alpha, 0.0, 1.0);

  let display = clamp(linearToSrgb3(color), vec3f(0.0), vec3f(1.2));
  return vec4f(display * alpha, alpha);
}
