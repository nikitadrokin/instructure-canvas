// Canvas LMS community mark as an 8-fold SDF, lit with a vgpu-style
// energy field. UV is top-origin; we flip Y so +Y is up.

struct Params {
  time: f32,
  motion: f32,
  texel: vec2f,
  pointer: vec2f,
  hover: f32,
  press: f32,
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

fn sdCircle(p: vec2f, radius: f32) -> f32 {
  return length(p) - radius;
}

fn sdOutwardHalfDisk(p: vec2f, radius: f32) -> f32 {
  return max(length(p) - radius, -p.x);
}

// Evaluate each figure separately so displaced neighbors cross sector boundaries.
fn sdCanvasMark(p: vec2f, pointer: vec2f) -> f32 {
  var distance = 10.0;
  for (var index = 0; index < 8; index++) {
    let angle = f32(index) * TAU / FIGURES;
    let axis = vec2f(cos(angle), sin(angle));
    let anchor = axis * 0.52;
    let delta = anchor - pointer;
    let proximity = 1.0 - smoothstep(0.0, 0.95, length(delta));
    let energy = proximity * params.hover;
    let direction = delta / max(length(delta), 0.16);
    let tangent = vec2f(-direction.y, direction.x);
    let offset = (direction * 0.20 + tangent * 0.07) * energy
      + axis * params.press * params.hover * 0.12;
    let twist = energy * 0.30 * sin(angle - atan2(pointer.y, pointer.x));
    let q = rotate(p - anchor - offset, -angle - twist) + vec2f(0.52, 0.0);
    let head = sdCircle(q - vec2f(HEAD_X, 0.0), HEAD_R);
    let body = sdOutwardHalfDisk(q - vec2f(BODY_X, 0.0), BODY_R);
    distance = min(distance, min(head, body));
  }
  return distance;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let aspect = params.texel.y / max(params.texel.x, 1.0e-6);
  var p = vec2f((uv.x * 2.0 - 1.0) * aspect, -(uv.y * 2.0 - 1.0));
  p *= 1.18;

  let clock = mix(1.7, params.time, params.motion);
  let spin = clock * 0.08 * params.motion;
  p = rotate(p, spin);

  let pointer = rotate(params.pointer, spin);
  let d = sdCanvasMark(p, pointer);
  let pixel = max(max(fwidth(d), length(params.texel) * 1.6), 0.0015);
  let fill = 1.0 - smoothstep(-pixel, pixel, d);
  let glow = exp(-max(d, 0.0) * 26.0) * (0.22 + 0.06 * sin(clock * 1.15));
  let coverage = clamp(max(fill, glow), 0.0, 1.0);

  let warp = vec2f(
    fbm3(vec3f(p * 2.4, clock * 0.22)) - 0.5,
    fbm3(vec3f(p * 2.4 + 17.0, clock * 0.18)) - 0.5,
  );
  let field = fbm3(vec3f(p * 3.2 + warp * 0.85, clock * 0.35));
  let veins = smoothstep(0.32, 0.78, field) * fill;
  let spark = pow(hash21(floor(p * 48.0 + clock * 2.0)), 14.0) * fill;

  let canvasRed = vec3f(0.882, 0.247, 0.169);
  let ember = vec3f(1.0, 0.55, 0.28);
  var rgb = mix(canvasRed, ember, veins * 0.45 + spark * 0.3);

  let proximity = exp(-length(p - pointer) * 2.8) * params.hover;
  rgb = mix(rgb, vec3f(1.0, 0.78, 0.44), proximity * (0.65 + params.press * 0.25));

  // Premultiply with the same coverage so faint edges stay red, not gray.
  return vec4f(rgb * coverage, coverage);
}
