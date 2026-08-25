import { predictPath, segmentSphereHit, stepPendulum, stepProjectile } from './physics';

// Drag-free flight must match the closed-form parabola.
test('projectile matches analytic parabola without drag', () => {
    const p = { x: 0, y: 2, z: 0 };
    const v = { x: 0, y: 12, z: -20 };
    const dt = 1 / 240;
    const steps = 240;
    for (let i = 0; i < steps; i++) stepProjectile(p, v, dt, { drag: 0 });
    const t = steps * dt;
    expect(p.y).toBeCloseTo(2 + 12 * t - 0.5 * 9.81 * t * t, 2);
    expect(p.z).toBeCloseTo(-20 * t, 6);
});

// Drag must slow it down, never speed it up.
test('drag shortens the flight', () => {
    const far = (drag: number) => {
        const p = { x: 0, y: 2, z: 0 };
        const v = { x: 0, y: 10, z: -25 };
        for (let i = 0; i < 60 && p.y > 0; i++) stepProjectile(p, v, 1 / 60, { drag });
        return -p.z;
    };
    expect(far(0.05)).toBeLessThan(far(0));
});

test('aim preview stops at the ground', () => {
    const path = predictPath({ x: 0, y: 1.5, z: 0 }, { x: 0, y: 4, z: -18 }, {}, 300, 1 / 60, 0.2);
    expect(path.length).toBeLessThan(300);
    expect(path[path.length - 1].y).toBeLessThanOrEqual(0.2);
});

// Small-angle period of a pendulum: T = 2π√(L/g).
test('pendulum period follows 2*pi*sqrt(L/g)', () => {
    const s = { theta: 0.05, omega: 0, length: 2.5, damping: 0 };
    const dt = 1 / 2000;
    let t = 0;
    // released from rest, so reaching vertical takes a quarter period
    while (s.theta > 0 && t < 10) {
        stepPendulum(s, dt);
        t += dt;
    }
    expect(t * 4).toBeCloseTo(2 * Math.PI * Math.sqrt(2.5 / 9.81), 1);
});

test('segment hits a sphere it passes through, misses one beside it', () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 0, y: 0, z: -10 };
    expect(segmentSphereHit(a, b, { x: 0, y: 0, z: -5 }, 0.6)).toBeCloseTo(0.44, 2);
    expect(segmentSphereHit(a, b, { x: 3, y: 0, z: -5 }, 0.6)).toBeNull();
});

// Tuning guard: the farthest handi (level 9+, potZ -21) must be reachable anywhere in
// the band its 4.7m cord swings through, otherwise the ramp is unwinnable. Fails if
// speed/drag/pitch or the rope length drift.
test('the farthest pot is still in range at full pull', () => {
    const pouch = { x: 0, y: 2.12, z: 3.53 };
    for (const potY of [2.45, 5.45]) {   // hanging straight down, and at the swing's end
        let best = Infinity;
        for (let pitch = -0.2; pitch < 0.7; pitch += 0.005) {
            const speed = 36;   // 16 + pull * 20 at pull = 1
            const p = { ...pouch };
            const v = { x: 0, y: Math.sin(pitch) * speed, z: -Math.cos(pitch) * speed };
            for (let i = 0; i < 600 && p.y > 0; i++) {
                stepProjectile(p, v, 1 / 240);
                best = Math.min(best, Math.hypot(p.y - potY, p.z + 21));
            }
        }
        expect(best).toBeLessThan(0.46);   // POT_R * 0.58 + 0.1 hit radius at max level
    }
});

// A fast stone must not tunnel through the pot in one 60fps step.
test('continuous collision catches a tunnelling stone', () => {
    const a = { x: 0, y: 5, z: -8 };
    const b = { x: 0, y: 5, z: -10 };   // 2m of travel past a 0.6m pot
    expect(segmentSphereHit(a, b, { x: 0, y: 5, z: -9 }, 0.6)).not.toBeNull();
});
