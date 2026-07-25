export const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_texCoord;

uniform vec2 u_resolution;
uniform float u_rotation; // radians
uniform vec2 u_flip; // vec2(flipH ? -1.0 : 1.0, flipV ? -1.0 : 1.0)

varying vec2 v_texCoord;

void main() {
  vec2 position = a_position;
  
  // Apply flip
  position *= u_flip;

  // Apply rotation
  float cosR = cos(u_rotation);
  float sinR = sin(u_rotation);
  mat2 rot = mat2(cosR, -sinR, sinR, cosR);
  position = rot * position;

  gl_Position = vec4(position, 0.0, 1.0);
  
  // Convert standard [-1, 1] position to [0, 1] texture coordinates
  v_texCoord = a_texCoord;
}
`;

export const FRAGMENT_SHADER = `
precision highp float;

varying vec2 v_texCoord;
uniform sampler2D u_image;
uniform sampler2D u_curveTexture; // 256x1 2D texture encoding tone curves for RGB
uniform vec2 u_textureSize;

// Light
uniform float u_exposure;     // -5.0 to 5.0
uniform float u_contrast;     // -100.0 to 100.0
uniform float u_highlights;   // -100.0 to 100.0
uniform float u_shadows;      // -100.0 to 100.0
uniform float u_whites;       // -100.0 to 100.0
uniform float u_blacks;       // -100.0 to 100.0

// Color
uniform float u_temp;         // 2000.0 to 10000.0
uniform float u_tint;         // -100.0 to 100.0
uniform float u_vibrance;     // -100.0 to 100.0
uniform float u_saturation;   // -100.0 to 100.0

// HSL Sliders (8 channels: Hue, Sat, Lum for Red, Orange, Yellow, Green, Aqua, Blue, Purple, Magenta)
// Each channel is vec3(hueShift, satShift, lumShift)
uniform vec3 u_hslRed;
uniform vec3 u_hslOrange;
uniform vec3 u_hslYellow;
uniform vec3 u_hslGreen;
uniform vec3 u_hslAqua;
uniform vec3 u_hslBlue;
uniform vec3 u_hslPurple;
uniform vec3 u_hslMagenta;

// Color Grading
uniform vec3 u_cgShadows;     // vec3(hue 0-360, sat 0-100, lum -100 to 100)
uniform vec3 u_cgMidtones;
uniform vec3 u_cgHighlights;
uniform float u_cgBlending;   // 0-100
uniform float u_cgBalance;    // -100 to 100

// Effects & Details
uniform float u_clarity;      // -100 to 100
uniform float u_texture;      // -100 to 100
uniform float u_dehaze;       // -100 to 100
uniform float u_vignette;     // -100 to 100
uniform float u_grain;        // 0 to 100
uniform float u_sharpening;   // 0 to 100

// Crop bounds
uniform vec4 u_cropBounds;    // vec4(x, y, width, height) in 0..1 range

// RGB to HSV conversion
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// HSV to RGB conversion
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - 3.0);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Kelvin Temp to RGB multiplier
vec3 tempToRGB(float kelvin) {
    float k = kelvin / 100.0;
    vec3 color;
    if (k <= 66.0) {
        color.r = 255.0;
        color.g = 99.4708025861 * log(k) - 161.1195681661;
        if (k <= 19.0) {
            color.b = 0.0;
        } else {
            color.b = 138.5177312231 * log(k - 10.0) - 305.0447927307;
        }
    } else {
        color.r = 329.698727446 * pow(k - 60.0, -0.1332047592);
        color.g = 288.1221695283 * pow(k - 60.0, -0.0755148492);
        color.b = 255.0;
    }
    return clamp(color / 255.0, 0.0, 2.0);
}

// Helper to calculate hue weight for 8 color channels
float channelWeight(float hue, float centerHue, float width) {
    float d = abs(hue - centerHue);
    if (d > 0.5) d = 1.0 - d;
    return smoothstep(width, 0.0, d);
}

// Pseudo-random generator for film grain
float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    // Calculate cropped texture coordinate
    vec2 tc = vec2(
        u_cropBounds.x + v_texCoord.x * u_cropBounds.z,
        u_cropBounds.y + v_texCoord.y * u_cropBounds.w
    );

    // If out of cropped bounds, output black
    if (tc.x < 0.0 || tc.x > 1.0 || tc.y < 0.0 || tc.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    vec4 texColor = texture2D(u_image, tc);
    vec3 color = texColor.rgb;

    // 1. White Balance (Temp & Tint)
    vec3 neutralRGB = tempToRGB(5500.0);
    vec3 targetRGB = tempToRGB(u_temp);
    vec3 wbMult = targetRGB / neutralRGB;
    
    // Tint adjustment (green - magenta balance)
    wbMult.g *= (1.0 - u_tint / 200.0);
    wbMult.r *= (1.0 + u_tint / 400.0);
    wbMult.b *= (1.0 + u_tint / 400.0);

    color *= wbMult;

    // 2. Exposure (2^EV scale)
    color *= pow(2.0, u_exposure);

    // 3. Contrast
    float cFactor = (u_contrast + 100.0) / 100.0;
    cFactor = cFactor * cFactor; // Soft quadratic response
    color = (color - 0.5) * cFactor + 0.5;

    // 4. Highlights, Shadows, Whites, Blacks
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    
    // Highlight S-curve
    float highlightWeight = smoothstep(0.5, 1.0, lum);
    color += color * (u_highlights / 100.0) * highlightWeight * 0.5;

    // Shadow expansion
    float shadowWeight = 1.0 - smoothstep(0.0, 0.5, lum);
    color += (1.0 - color) * (u_shadows / 100.0) * shadowWeight * 0.4;

    // Whites & Blacks shoulder/toe adjustment
    color += (u_whites / 100.0) * pow(lum, 2.0) * 0.3;
    color += (u_blacks / 100.0) * pow(1.0 - lum, 2.0) * 0.3;

    color = clamp(color, 0.0, 1.0);

    // 5. Tone Curves Lookup (from 256x1 texture u_curveTexture)
    color.r = texture2D(u_curveTexture, vec2(color.r, 0.125)).r; // Row 0: Master + Red
    color.g = texture2D(u_curveTexture, vec2(color.g, 0.375)).g; // Row 1: Master + Green
    color.b = texture2D(u_curveTexture, vec2(color.b, 0.625)).b; // Row 2: Master + Blue

    // 6. 8-Channel HSL Mixer
    vec3 hsv = rgb2hsv(color);
    float h = hsv.x; // 0.0 to 1.0

    // Channel center hues normalized 0..1
    float wRed     = channelWeight(h, 0.000, 0.10) + channelWeight(h, 1.000, 0.10);
    float wOrange  = channelWeight(h, 0.083, 0.08); // ~30 deg
    float wYellow  = channelWeight(h, 0.166, 0.08); // ~60 deg
    float wGreen   = channelWeight(h, 0.333, 0.12); // ~120 deg
    float wAqua    = channelWeight(h, 0.500, 0.10); // ~180 deg
    float wBlue    = channelWeight(h, 0.666, 0.12); // ~240 deg
    float wPurple  = channelWeight(h, 0.777, 0.08); // ~280 deg
    float wMagenta = channelWeight(h, 0.888, 0.08); // ~320 deg

    vec3 hslShift = u_hslRed * wRed +
                    u_hslOrange * wOrange +
                    u_hslYellow * wYellow +
                    u_hslGreen * wGreen +
                    u_hslAqua * wAqua +
                    u_hslBlue * wBlue +
                    u_hslPurple * wPurple +
                    u_hslMagenta * wMagenta;

    // Apply HSL shifts (hueShift in degrees -> / 360.0)
    hsv.x = fract(hsv.x + (hslShift.x / 360.0));
    hsv.y = clamp(hsv.y * (1.0 + hslShift.y / 100.0), 0.0, 1.0);
    hsv.z = clamp(hsv.z * (1.0 + hslShift.z / 100.0), 0.0, 1.0);

    color = hsv2rgb(hsv);

    // 7. Saturation & Vibrance
    lum = dot(color, vec3(0.299, 0.587, 0.114));
    float satAmount = u_saturation / 100.0;
    float vibAmount = u_vibrance / 100.0;

    // Global Saturation
    color = mix(vec3(lum), color, 1.0 + satAmount);

    // Smart Vibrance (protects already saturated hues)
    float maxC = max(color.r, max(color.g, color.b));
    float minC = min(color.r, min(color.g, color.b));
    float currentSat = maxC - minC;
    float vibFactor = (1.0 - currentSat) * vibAmount;
    color = mix(vec3(lum), color, 1.0 + vibFactor);

    // 8. Color Grading (Shadows, Midtones, Highlights)
    lum = dot(color, vec3(0.299, 0.587, 0.114));
    
    // Balance pivot point
    float pivot = 0.5 + (u_cgBalance / 200.0);
    float shadowWeightCG = clamp((pivot - lum) / pivot, 0.0, 1.0);
    float highlightWeightCG = clamp((lum - pivot) / (1.0 - pivot), 0.0, 1.0);
    float midtoneWeightCG = clamp(1.0 - shadowWeightCG - highlightWeightCG, 0.0, 1.0);

    vec3 shadowColor = hsv2rgb(vec3(u_cgShadows.x / 360.0, u_cgShadows.y / 100.0, 1.0)) * (u_cgShadows.z / 100.0 + 1.0);
    vec3 midtoneColor = hsv2rgb(vec3(u_cgMidtones.x / 360.0, u_cgMidtones.y / 100.0, 1.0)) * (u_cgMidtones.z / 100.0 + 1.0);
    vec3 highlightColor = hsv2rgb(vec3(u_cgHighlights.x / 360.0, u_cgHighlights.y / 100.0, 1.0)) * (u_cgHighlights.z / 100.0 + 1.0);

    vec3 cgResult = color;
    cgResult += (shadowColor - vec3(1.0)) * shadowWeightCG * (u_cgShadows.y / 100.0);
    cgResult += (midtoneColor - vec3(1.0)) * midtoneWeightCG * (u_cgMidtones.y / 100.0);
    cgResult += (highlightColor - vec3(1.0)) * highlightWeightCG * (u_cgHighlights.y / 100.0);

    color = mix(color, cgResult, u_cgBlending / 100.0);

    // 9. Dehaze & Clarity (Local contrast enhancement)
    if (u_dehaze != 0.0) {
        float dehazeMult = u_dehaze / 100.0;
        color = mix(color, pow(color, vec3(1.0 + dehazeMult * 0.5)), abs(dehazeMult));
        color *= (1.0 + dehazeMult * 0.1);
    }

    if (u_clarity != 0.0) {
        float clarityVal = u_clarity / 100.0;
        vec3 midtoneMask = vec3(1.0) - abs(color - vec3(0.5)) * 2.0;
        color += (color - vec3(0.5)) * clarityVal * midtoneMask * 0.35;
    }

    // 10. Vignette
    if (u_vignette != 0.0) {
        vec2 centerDist = v_texCoord - vec2(0.5);
        float dist = length(centerDist);
        float vig = smoothstep(0.2, 0.8, dist);
        if (u_vignette < 0.0) {
            color *= (1.0 + (u_vignette / 100.0) * vig);
        } else {
            color = mix(color, vec3(1.0), (u_vignette / 100.0) * vig * 0.5);
        }
    }

    // 11. Film Grain
    if (u_grain > 0.0) {
        float noise = (rand(v_texCoord * u_textureSize) - 0.5) * (u_grain / 100.0) * 0.15;
        color += vec3(noise);
    }

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
