// Framework-free physics for the Dahi Handi game so it can be unit-tested
// without a WebGL context.

export const GRAVITY = -9.81;

export interface Vec3 {
    x: number;
    y: number;
    z: number;
}

export interface ProjectileOpts {
    gravity?: number;   // m/s^2 (negative = down)
    drag?: number;      // quadratic drag coefficient (1/m)
    wind?: number;      // constant horizontal acceleration on x (m/s^2)
}

/**
 * One semi-implicit step of projectile motion with quadratic air drag.
 * Mutates p and v in place. Position uses the midpoint term so the arc is
 * accurate at large dt (the aim preview and the real shot then agree).
 */
export function stepProjectile(p: Vec3, v: Vec3, dt: number, o: ProjectileOpts = {}): void {
    const g = o.gravity ?? GRAVITY;
    const k = o.drag ?? 0.02;
    const w = o.wind ?? 0;
    const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    const ax = w - k * speed * v.x;
    const ay = g - k * speed * v.y;
    const az = -k * speed * v.z;

    p.x += v.x * dt + 0.5 * ax * dt * dt;
    p.y += v.y * dt + 0.5 * ay * dt * dt;
    p.z += v.z * dt + 0.5 * az * dt * dt;

    v.x += ax * dt;
    v.y += ay * dt;
    v.z += az * dt;
}

/** Samples the flight path (used for the dotted aim preview). Stops at groundY. */
export function predictPath(
    p0: Vec3,
    v0: Vec3,
    opts: ProjectileOpts = {},
    steps = 90,
    dt = 1 / 90,
    groundY = 0
): Vec3[] {
    const p = { ...p0 };
    const v = { ...v0 };
    const out: Vec3[] = [];
    for (let i = 0; i < steps; i++) {
        stepProjectile(p, v, dt, opts);
        out.push({ x: p.x, y: p.y, z: p.z });
        if (p.y <= groundY) break;
    }
    return out;
}

export interface Pendulum {
    theta: number;     // rad from vertical
    omega: number;     // rad/s
    length: number;    // m
    damping: number;   // 1/s
}

/** Exact (non-linearised) pendulum: θ'' = -(g/L)·sinθ - c·θ' */
export function stepPendulum(s: Pendulum, dt: number, g = 9.81): void {
    const alpha = -(g / s.length) * Math.sin(s.theta) - s.damping * s.omega;
    s.omega += alpha * dt;
    s.theta += s.omega * dt;
}

/**
 * Continuous collision: first intersection of segment a→b with sphere (c, r).
 * Returns the fraction along the segment, or null. Prevents a fast stone from
 * tunnelling through the pot between frames.
 */
export function segmentSphereHit(a: Vec3, b: Vec3, c: Vec3, r: number): number | null {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const fx = a.x - c.x, fy = a.y - c.y, fz = a.z - c.z;
    const A = dx * dx + dy * dy + dz * dz;
    if (A === 0) return fx * fx + fy * fy + fz * fz <= r * r ? 0 : null;
    const B = 2 * (fx * dx + fy * dy + fz * dz);
    const C = fx * fx + fy * fy + fz * fz - r * r;
    const disc = B * B - 4 * A * C;
    if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    const t1 = (-B - sq) / (2 * A);
    const t2 = (-B + sq) / (2 * A);
    if (t1 >= 0 && t1 <= 1) return t1;
    if (t2 >= 0 && t2 <= 1) return t2;
    return C <= 0 ? 0 : null;   // started inside
}
