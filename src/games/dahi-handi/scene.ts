import * as THREE from 'three';
import {
    GRAVITY,
    Pendulum,
    predictPath,
    segmentSphereHit,
    stepPendulum,
    stepProjectile,
    Vec3,
} from './physics';

/* ------------------------------------------------------------------ *
 *  Dahi Handi — 3D scene / simulation engine (framework free).
 *  React owns score & flow; this owns rendering, physics and input.
 * ------------------------------------------------------------------ */

export interface SceneCallbacks {
    /** Stone connected with the pot. accuracy 0..1 (1 = dead centre). */
    onHit: (accuracy: number) => void;
    /** Shards + butter released (fires ~0.25s after onHit). */
    onBreak: () => void;
    /** Stone hit the ground / flew past. */
    onMiss: () => void;
    /** Slingshot draw strength while aiming, 0..1. */
    onAim: (power: number) => void;
    /** Stone left the slingshot. */
    onShoot: () => void;
}

export interface DahiHandiEngine {
    setLevel(level: number): void;
    setInputEnabled(on: boolean): void;
    /** Title-screen showreel: the scene aims, throws and bursts the handi by itself. */
    setAttract(on: boolean): void;
    dispose(): void;
}

const POT_R = 0.62;             // pot collision radius at scale 1
const POT_HALF_H = 0.6;
const BEAM_Y = 7.5;
const DRAG = 0.02;              // stone air drag
const MAX_PULL_PX = 340;   // longer pull: the handi now hangs 18-22m away
const CRACK_FRAME_MS = 80;      // per crack "image"
const CRACK_FRAMES = 3;

interface Debris {
    mesh: THREE.Mesh;
    v: THREE.Vector3;
    spin: THREE.Vector3;
    restY: number;
    bounce: number;
    settled: boolean;
    isButter: boolean;
    flutter: number;    // >0 for petals
    life: number;       // seconds, <=0 means immortal
    age: number;
    fade: boolean;
    grow: number;       // >0 → scale up to this over 0.25s (splats)
}

interface LevelConfig {
    ropeLength: number;
    amplitude: number;
    potScale: number;
    potZ: number;
    wind: number;
}

function levelConfig(level: number): LevelConfig {
    const n = level - 1;
    return {
        // longer cord = the pot hangs lower and sweeps a wider, faster arc, so the
        // window where it sits inside the stone's line shrinks. Level 1 already
        // swings a full arc — no gentle warm-up round.
        ropeLength: Math.min(4.7, 3.6 + n * 0.18),
        amplitude: Math.min(1.2, 0.72 + n * 0.08),
        potScale: Math.max(0.58, 0.92 - n * 0.065),
        potZ: -14 - Math.min(7, n * 0.9),
        wind: (level % 2 === 0 ? -1 : 1) * (0.5 + 0.3 * n),
    };
}

/* ----------------------------- textures ---------------------------- */

function canvas2d(size: number, h = size) {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = h;
    return { c, ctx: c.getContext('2d')! };
}

/**
 * Terracotta matki painted like a Braj butter pot: white zigzag round the belly,
 * dot rows on the shoulder, and makhan dripping over the rim.
 * Canvas y is flipped against the lathe's v, so y=0 is the rim and y=512 the base.
 */
function makeClayCanvas(): HTMLCanvasElement {
    const { c, ctx } = canvas2d(1024, 512);
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#d1793b');
    g.addColorStop(0.35, '#c1622b');
    g.addColorStop(0.7, '#a94f1e');
    g.addColorStop(1, '#8a3d14');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 512);

    // clay speckle
    for (let i = 0; i < 9000; i++) {
        const a = Math.random() * 0.13;
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,225,190,${a})` : `rgba(60,25,10,${a})`;
        ctx.fillRect(Math.random() * 1024, Math.random() * 512, 2 + Math.random() * 3, 1 + Math.random() * 2);
    }
    // faint wheel rings
    ctx.globalAlpha = 0.1;
    for (let y = 0; y < 512; y += 9) {
        ctx.fillStyle = y % 18 === 0 ? '#4d1f07' : '#e79a5c';
        ctx.fillRect(0, y, 1024, 2);
    }
    ctx.globalAlpha = 1;

    const line = (y: number, h: number, fill: string) => {
        ctx.fillStyle = fill;
        ctx.fillRect(0, y, 1024, h);
    };
    const CREAM = '#fdf1dc';

    // shoulder: two rings with a dot row between them
    line(150, 5, CREAM);
    line(196, 5, CREAM);
    ctx.fillStyle = CREAM;
    for (let x = 20; x < 1024; x += 42) {
        ctx.beginPath();
        ctx.arc(x, 173, 7, 0, Math.PI * 2);
        ctx.fill();
    }

    // belly: the big painted zigzag, drawn as a stroked chevron so it tiles cleanly
    const zig = (yMid: number, amp: number, w: number, step = 64) => {
        ctx.strokeStyle = CREAM;
        ctx.lineWidth = w;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let x = 0, up = true; x <= 1024 + step; x += step, up = !up) {
            const y = yMid + (up ? -amp : amp);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    };
    line(228, 6, CREAM);
    zig(268, 22, 11);
    zig(316, 22, 7);
    line(356, 6, CREAM);

    // lower body: small dots and a base ring
    ctx.fillStyle = 'rgba(253,241,220,0.9)';
    for (let x = 32; x < 1024; x += 64) {
        ctx.beginPath();
        ctx.arc(x, 396, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    line(440, 4, 'rgba(253,241,220,0.75)');

    // makhan slopping over the rim: soft tongues hanging down from the top edge
    ctx.fillStyle = '#fff4c9';
    ctx.fillRect(0, 0, 1024, 34);
    for (let x = 0; x < 1024; x += 34) {
        const len = 34 + Math.random() * 96;
        const w = 16 + Math.random() * 16;
        ctx.beginPath();
        ctx.moveTo(x, 20);
        ctx.lineTo(x + w, 20);
        ctx.quadraticCurveTo(x + w, len, x + w / 2, len + 12);
        ctx.quadraticCurveTo(x, len, x, 20);
        ctx.fill();
        // rounded drip tip
        ctx.beginPath();
        ctx.arc(x + w / 2, len + 8, w * 0.42, 0, Math.PI * 2);
        ctx.fill();
    }
    // warm shading under the drips so the butter reads as thick
    const dg = ctx.createLinearGradient(0, 30, 0, 150);
    dg.addColorStop(0, 'rgba(226,178,74,0)');
    dg.addColorStop(1, 'rgba(184,124,38,0.28)');
    ctx.fillStyle = dg;
    ctx.fillRect(0, 30, 1024, 120);
    return c;
}

/** Draws a growing crack web — one call per animation "frame". */
function drawCracks(ctx: CanvasRenderingContext2D, cx: number, cy: number, frame: number, seed: number) {
    const rnd = (() => {
        let s = seed;
        return () => (s = (s * 16807) % 2147483647) / 2147483647;
    })();
    const arms = 5 + frame * 3;
    const reach = 60 + frame * 110;
    ctx.lineCap = 'round';
    for (let a = 0; a < arms; a++) {
        let x = cx;
        let y = cy;
        let ang = (a / arms) * Math.PI * 2 + rnd() * 0.7;
        const segs = 3 + frame * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < segs; s++) {
            ang += (rnd() - 0.5) * 0.9;
            const len = (reach / segs) * (0.6 + rnd() * 0.8);
            x += Math.cos(ang) * len;
            y += Math.sin(ang) * len;
            ctx.lineTo(x, y);
        }
        ctx.strokeStyle = 'rgba(35,14,4,0.85)';
        ctx.lineWidth = 4 - frame * 0.6;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,225,190,0.35)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
    }
    // impact bruise
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 30 + frame * 22);
    g.addColorStop(0, 'rgba(40,16,4,0.75)');
    g.addColorStop(1, 'rgba(40,16,4,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 30 + frame * 22, 0, Math.PI * 2);
    ctx.fill();
}

function makeSkyTexture(): THREE.Texture {
    const { c, ctx } = canvas2d(8, 512);
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#10163a');
    g.addColorStop(0.35, '#3c2a63');
    g.addColorStop(0.62, '#9c4f4a');
    g.addColorStop(0.82, '#e3893f');
    g.addColorStop(1, '#f7c874');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 512);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

function makeGroundTexture(): THREE.Texture {
    const { c, ctx } = canvas2d(512);
    ctx.fillStyle = '#a98b62';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 14000; i++) {
        const a = Math.random() * 0.18;
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,240,210,${a})` : `rgba(70,50,30,${a})`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(14, 14);
    return t;
}

function makeRangoliTexture(): THREE.Texture {
    const { c, ctx } = canvas2d(512);
    ctx.clearRect(0, 0, 512, 512);
    const colors = ['#ff8c1a', '#ffd12e', '#ff4f6d', '#fff4de', '#7bd0ff'];
    for (let ring = 0; ring < 3; ring++) {
        const r = 110 + ring * 62;
        const petals = 16 + ring * 8;
        for (let i = 0; i < petals; i++) {
            const a = (i / petals) * Math.PI * 2;
            ctx.fillStyle = colors[(i + ring) % colors.length];
            ctx.beginPath();
            ctx.ellipse(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 22, 11, a, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

/** Mud-plastered Braj wall: ochre wash, lime skirting, painted arches and dots. */
function makeMudWallTexture(): THREE.Texture {
    const { c, ctx } = canvas2d(512);
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#e2c294');
    g.addColorStop(0.55, '#d3ab7c');
    g.addColorStop(1, '#c0916a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    // trowel blotches
    for (let i = 0; i < 700; i++) {
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,235,200' : '120,85,55'},${Math.random() * 0.1})`;
        ctx.beginPath();
        ctx.ellipse(Math.random() * 512, Math.random() * 512, 8 + Math.random() * 26, 5 + Math.random() * 14, Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
    }
    // lime-washed skirting along the bottom with a warm border
    ctx.fillStyle = '#f5e9d2';
    ctx.fillRect(0, 400, 512, 112);
    ctx.fillStyle = '#b8632c';
    ctx.fillRect(0, 392, 512, 9);
    // painted arch + dot motif band
    ctx.strokeStyle = 'rgba(250,240,220,0.85)';
    ctx.lineWidth = 5;
    for (let x = 24; x < 512; x += 64) {
        ctx.beginPath();
        ctx.arc(x + 20, 300, 20, Math.PI, 0);
        ctx.stroke();
    }
    ctx.fillStyle = 'rgba(250,240,220,0.8)';
    for (let x = 16; x < 512; x += 48) {
        ctx.beginPath();
        ctx.arc(x, 250, 6, 0, Math.PI * 2);
        ctx.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
}

/** Straw thatch: streaky dry-grass strands. */
function makeThatchTexture(): THREE.Texture {
    const { c, ctx } = canvas2d(256);
    ctx.fillStyle = '#a9803c';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        ctx.strokeStyle = `rgba(${Math.random() > 0.5 ? '226,190,120' : '110,76,32'},${0.25 + Math.random() * 0.5})`;
        ctx.lineWidth = 1 + Math.random();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random() - 0.5) * 6, y + 10 + Math.random() * 22);
        ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 2);
    return t;
}

/** Lime-plastered inner wall: scalloped frieze up top, carved dado at the floor. */
function makeWallTexture(): THREE.Texture {
    const { c, ctx } = canvas2d(512);
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#efe0c4');
    g.addColorStop(0.6, '#e6d3b3');
    g.addColorStop(1, '#d9c49f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 500; i++) {   // plaster mottling
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,250,235' : '150,120,90'},${Math.random() * 0.07})`;
        ctx.beginPath();
        ctx.ellipse(Math.random() * 512, Math.random() * 512, 10 + Math.random() * 30, 6 + Math.random() * 16, Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
    }
    // canvas y=0 is the TOP of the wall: scalloped frieze under the ceiling
    ctx.fillStyle = '#c9a06a';
    ctx.fillRect(0, 40, 512, 10);
    ctx.fillStyle = '#e9d8b8';
    for (let x = 0; x < 512; x += 32) {
        ctx.beginPath();
        ctx.arc(x + 16, 50, 16, 0, Math.PI);
        ctx.fill();
    }
    ctx.strokeStyle = 'rgba(180,140,90,0.55)';   // faint sunk panels
    ctx.lineWidth = 3;
    for (let x = 24; x < 512; x += 128) ctx.strokeRect(x, 150, 80, 230);
    // carved dado band along the floor
    ctx.fillStyle = '#cdae82';
    ctx.fillRect(0, 430, 512, 82);
    ctx.fillStyle = '#a8834f';
    ctx.fillRect(0, 424, 512, 8);
    ctx.fillStyle = 'rgba(240,225,196,0.8)';
    for (let x = 8; x < 512; x += 40) ctx.fillRect(x, 448, 22, 46);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 1);
    return t;
}

/** Ceiling / door planks: bands run along u, so they follow the room's length. */
function makeWoodTexture(): THREE.Texture {
    const { c, ctx } = canvas2d(256);
    ctx.fillStyle = '#8a5a2c';
    ctx.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 32) {
        ctx.fillStyle = `rgb(${118 + Math.random() * 34},${74 + Math.random() * 22},${34 + Math.random() * 16})`;
        ctx.fillRect(x + 1, 0, 30, 256);
        ctx.fillStyle = 'rgba(40,22,8,0.55)';
        ctx.fillRect(x, 0, 1.5, 256);       // seam between planks
        for (let i = 0; i < 26; i++) {      // grain
            ctx.strokeStyle = `rgba(${Math.random() > 0.5 ? '210,168,110' : '58,34,14'},0.3)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            const gx = x + 3 + Math.random() * 26;
            ctx.moveTo(gx, Math.random() * 256);
            ctx.bezierCurveTo(gx + 2, 90, gx - 2, 170, gx, 256);
            ctx.stroke();
        }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 1);
    return t;
}

/** Worn stone-slab floor for the hall. */
function makeFloorTexture(): THREE.Texture {
    const { c, ctx } = canvas2d(512);
    ctx.fillStyle = '#c9b391';
    ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 128) {
        for (let x = 0; x < 512; x += 128) {
            const o = (y / 128) % 2 ? 64 : 0;
            // one luminance offset per slab: worn stone, not coloured tiles
            const l = Math.random() * 26;
            ctx.fillStyle = `rgb(${190 + l},${172 + l},${142 + l})`;
            ctx.fillRect(x + o + 3, y + 3, 122, 122);
        }
    }
    for (let i = 0; i < 6000; i++) {
        ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,248,232' : '90,70,48'},${Math.random() * 0.14})`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 14);
    return t;
}

/* --------------------------- small helpers -------------------------- */

const UP = new THREE.Vector3(0, 1, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

/** Stretches a unit-height, origin-centred cylinder of radius r between two points. */
function alignTube(mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3, r: number) {
    _a.copy(to).sub(from);
    const len = _a.length() || 0.0001;
    mesh.position.copy(from).addScaledVector(_a, 0.5);
    mesh.quaternion.setFromUnitVectors(UP, _b.copy(_a).divideScalar(len));
    mesh.scale.set(r, len, r);
}

function jitterGeometry(geo: THREE.BufferGeometry, amt: number) {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
        pos.setXYZ(
            i,
            pos.getX(i) + (Math.random() - 0.5) * amt,
            pos.getY(i) + (Math.random() - 0.5) * amt,
            pos.getZ(i) + (Math.random() - 0.5) * amt
        );
    }
    geo.computeVertexNormals();
    return geo;
}

/* ------------------------------- engine ----------------------------- */

export function createDahiHandiScene(
    container: HTMLElement,
    cb: SceneCallbacks
): DahiHandiEngine {
    /* --- renderer / scene / camera --- */
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xb07a52, 40, 95);

    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 200);
    const camBase = new THREE.Vector3(0, 2.35, 4.6);
    camera.position.copy(camBase);
    const camTarget = new THREE.Vector3(0, 4.6, -9);

    /* --- lights --- */
    scene.add(new THREE.HemisphereLight(0xbcd7ff, 0x9c6a3e, 0.95));
    const sun = new THREE.DirectionalLight(0xffe6bd, 2.6);
    sun.position.set(7, 13, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 45;
    sun.shadow.camera.left = -16;
    sun.shadow.camera.right = 16;
    sun.shadow.camera.top = 16;
    sun.shadow.camera.bottom = -6;
    sun.shadow.bias = -0.0006;
    scene.add(sun);
    const potGlow = new THREE.PointLight(0xffa64d, 7, 16, 2);
    potGlow.position.set(0, 5.5, -8);
    scene.add(potGlow);
    // fill light on the camera so the held slingshot isn't a silhouette
    const fill = new THREE.PointLight(0xffe0b0, 2.4, 5, 2);
    fill.position.set(0.35, 0.25, 0.4);
    camera.add(fill);

    /* --- sky / ground --- */
    const skyTex = makeSkyTexture();
    const sky = new THREE.Mesh(
        new THREE.SphereGeometry(85, 32, 16),
        new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false, fog: false })
    );
    scene.add(sky);

    const groundTex = makeGroundTexture();
    const ground = new THREE.Mesh(
        new THREE.CircleGeometry(60, 64),
        new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.96, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const rangoliTex = makeRangoliTexture();
    const rangoli = new THREE.Mesh(
        new THREE.PlaneGeometry(5.4, 5.4),
        new THREE.MeshBasicMaterial({ map: rangoliTex, transparent: true, depthWrite: false })
    );
    rangoli.rotation.x = -Math.PI / 2;
    rangoli.position.set(0, 0.012, -9);
    scene.add(rangoli);

    /* --- Braj village backdrop: mud huts down the lane, kadamba trees --- */
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a4b22, roughness: 0.85 });
    const mudMat = new THREE.MeshStandardMaterial({ map: makeMudWallTexture(), roughness: 0.95 });
    const thatchMat = new THREE.MeshStandardMaterial({
        map: makeThatchTexture(),
        roughness: 0.95,
        flatShading: true,
    });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6b34, roughness: 0.9, flatShading: true });
    const backdrop = new THREE.Group();
    for (let i = 0; i < 11; i++) {
        const w = 3 + Math.random() * 4;
        const h = 2.5 + Math.random() * 3;
        // the handi now hangs up to 21m out, so the village sits well behind it
        const hut = new THREE.Mesh(new THREE.BoxGeometry(w, h, 3.4), mudMat);
        hut.position.set(-32 + i * 6.2 + Math.random() * 2, h / 2, -34 - Math.random() * 9);
        hut.receiveShadow = true;
        backdrop.add(hut);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.82, 1.7, 4), thatchMat);
        roof.rotation.y = Math.PI / 4;
        roof.position.set(hut.position.x, h + 0.85, hut.position.z);
        backdrop.add(roof);
    }
    for (let i = 0; i < 8; i++) {
        const x = i < 4 ? -13 - i * 5 : 13 + (i - 4) * 5;
        const z = -12 - Math.random() * 16;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 4.4, 8), woodMat);
        trunk.position.set(x, 2.2, z);
        trunk.castShadow = true;
        backdrop.add(trunk);
        for (let k = 0; k < 3; k++) {
            const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25 + Math.random() * 0.5, 1), leafMat);
            leaves.position.set(x + (Math.random() - 0.5) * 1.6, 4.5 + k * 0.85, z + (Math.random() - 0.5) * 1.6);
            leaves.castShadow = true;
            backdrop.add(leaves);
        }
    }
    scene.add(backdrop);

    /* --- veranda: pillars + the eave beam the handi hangs from --- */
    const rig = new THREE.Group();
    scene.add(rig);
    const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 12);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 15, 12), woodMat);
    beam.rotation.z = Math.PI / 2;
    beam.castShadow = true;
    rig.add(beam);
    const poleL = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, BEAM_Y, 12), woodMat);
    const poleR = poleL.clone();
    poleL.castShadow = poleR.castShadow = true;
    rig.add(poleL, poleR);

    // marigold garlands slung along the beam
    const garland = new THREE.Group();
    const marigoldGeos = [
        new THREE.IcosahedronGeometry(0.11, 0),
        new THREE.IcosahedronGeometry(0.09, 0),
    ];
    const marigoldMats = [
        new THREE.MeshStandardMaterial({ color: 0xff8a1f, roughness: 0.6, flatShading: true }),
        new THREE.MeshStandardMaterial({ color: 0xffd12e, roughness: 0.6, flatShading: true }),
        new THREE.MeshStandardMaterial({ color: 0xff4f6d, roughness: 0.6, flatShading: true }),
    ];
    rig.add(garland);

    // triangular bunting flags
    const flagGeo = new THREE.BufferGeometry();
    flagGeo.setAttribute(
        'position',
        new THREE.Float32BufferAttribute([-0.22, 0, 0, 0.22, 0, 0, 0, -0.42, 0], 3)
    );
    flagGeo.computeVertexNormals();
    const flags: THREE.Mesh[] = [];
    const flagCols = [0xffd12e, 0xff5722, 0x2fa4ff, 0x66d36e, 0xff4f6d];
    for (let i = 0; i < 22; i++) {
        const f = new THREE.Mesh(
            flagGeo,
            new THREE.MeshStandardMaterial({
                color: flagCols[i % flagCols.length],
                roughness: 0.7,
                side: THREE.DoubleSide,
            })
        );
        flags.push(f);
        rig.add(f);
    }

    /* --- pot (matki) --- */
    const clayCanvas = makeClayCanvas();
    const clayTex = new THREE.CanvasTexture(clayCanvas);
    clayTex.colorSpace = THREE.SRGBColorSpace;
    clayTex.wrapS = THREE.RepeatWrapping;

    // matki silhouette: wide belly, pinched neck, flared lip
    const potProfile: THREE.Vector2[] = [
        [0.0, 0.0], [0.2, 0.01], [0.34, 0.06], [0.48, 0.19], [0.585, 0.4],
        [0.62, 0.62], [0.585, 0.82], [0.47, 0.97], [0.34, 1.06], [0.245, 1.11],
        [0.235, 1.16], [0.33, 1.2], [0.315, 1.245], [0.225, 1.2],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const potGeo = new THREE.LatheGeometry(potProfile, 48);
    potGeo.translate(0, -POT_HALF_H, 0);
    const potMat = new THREE.MeshStandardMaterial({
        map: clayTex,
        roughness: 0.78,
        metalness: 0.02,
        side: THREE.DoubleSide,
    });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.castShadow = true;
    pot.receiveShadow = true;
    scene.add(pot);

    const butterMat = new THREE.MeshPhysicalMaterial({
        color: 0xffe6a0,
        roughness: 0.2,
        clearcoat: 0.85,
        clearcoatRoughness: 0.25,
        sheen: 0.5,
        sheenColor: new THREE.Color(0xfff4d0),
    });
    // rounded and only lightly dented, so a gob reads as soft makhan, not gravel
    const BLOB_R = 0.15;
    const blobGeo = jitterGeometry(new THREE.IcosahedronGeometry(BLOB_R, 2), 0.022);
    // makhan mounded over the pot mouth, so it reads as full of butter
    const butterTop = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 12), butterMat);
    butterTop.scale.y = 0.55;
    butterTop.castShadow = false;
    scene.add(butterTop);
    // a hand-patted block of makhan sitting on the mound (like the matki in Braj homes)
    const butterBlock = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), butterMat);
    butterBlock.position.y = 0.42;
    butterBlock.scale.y = 1 / 0.55;   // undo the mound's squash so the block stays square
    butterTop.add(butterBlock);

    // three cords from a ring under the beam to the pot rim
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd8c49a, roughness: 0.95 });
    const cords = [0, 1, 2].map(() => {
        const m = new THREE.Mesh(unitCyl, ropeMat);
        m.castShadow = true;
        scene.add(m);
        return m;
    });
    const mainCord = new THREE.Mesh(unitCyl, ropeMat);
    mainCord.castShadow = true;
    scene.add(mainCord);
    const cordRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.03, 8, 20),
        new THREE.MeshStandardMaterial({ color: 0x9a9aa2, roughness: 0.5, metalness: 0.6 })
    );
    cordRing.rotation.x = Math.PI / 2;
    scene.add(cordRing);

    /* --- the Brajwasi's inner hall the handi hangs in --- */
    // Fixed in world space: the pot moves deeper into the room each level.
    const HALL_X = 7.6;              // side walls
    const HALL_BACK = -30;           // wall with the open double door
    const HALL_H = 8.9;
    const HALL_D = 37;               // z from +7 (behind the player) to HALL_BACK
    const HALL_MID = HALL_BACK + HALL_D / 2;
    const DOOR_W = 3.4;
    const DOOR_H = 4.6;

    const room = new THREE.Group();
    scene.add(room);
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x33210f, roughness: 1 });
    const wallMat = new THREE.MeshStandardMaterial({ map: makeWallTexture(), roughness: 0.95 });
    const plankMat = new THREE.MeshStandardMaterial({ map: makeWoodTexture(), roughness: 0.9 });
    const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z);
        m.receiveShadow = true;
        room.add(m);
        return m;
    };

    // stone floor, kept under the rangoli (y 0.012) and the butter splats (y 0.014)
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(HALL_X * 2, HALL_D),
        new THREE.MeshStandardMaterial({ map: makeFloorTexture(), roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.006, HALL_MID);
    floor.receiveShadow = true;
    room.add(floor);

    [-1, 1].forEach((s) => box(0.4, HALL_H, HALL_D, wallMat, s * HALL_X, HALL_H / 2, HALL_MID));

    // back wall, built around the open doorway
    const jamb = (HALL_X * 2 - DOOR_W) / 2;
    [-1, 1].forEach((s) => box(jamb, HALL_H, 0.4, wallMat, s * (DOOR_W + jamb) / 2, HALL_H / 2, HALL_BACK));
    box(DOOR_W, HALL_H - DOOR_H, 0.4, wallMat, 0, DOOR_H + (HALL_H - DOOR_H) / 2, HALL_BACK);
    box(DOOR_W + 0.8, 0.42, 0.6, woodMat, 0, DOOR_H + 0.21, HALL_BACK + 0.15);   // door head
    [-1, 1].forEach((s) => {
        box(0.36, DOOR_H, 0.6, woodMat, s * (DOOR_W / 2 + 0.18), DOOR_H / 2, HALL_BACK + 0.15);
        // leaf hinged on the jamb, swung inward into the hall
        const hinge = new THREE.Group();
        hinge.position.set(s * DOOR_W / 2, DOOR_H / 2, HALL_BACK + 0.32);
        hinge.rotation.y = s * 0.95;
        room.add(hinge);
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W / 2, DOOR_H - 0.14, 0.12), plankMat);
        leaf.position.x = -s * DOOR_W / 4;
        leaf.castShadow = true;
        hinge.add(leaf);
    });

    // traditional wooden ceiling: plank slab on transverse beams and side purlins
    box(HALL_X * 2, 0.3, HALL_D, plankMat, 0, HALL_H - 0.15, HALL_MID);
    for (let z = HALL_BACK + 1.4; z < HALL_BACK + HALL_D; z += 3.4) {
        box(HALL_X * 2, 0.38, 0.44, woodMat, 0, HALL_H - 0.49, z);
    }
    [-1, 1].forEach((s) => box(0.34, 0.34, HALL_D, woodMat, s * 4.5, HALL_H - 0.92, HALL_MID));

    // spare matkis — same clay, but their own material so the crack texture swap
    // only ever hits the pot being thrown at
    const matkiMat = new THREE.MeshStandardMaterial({ map: clayTex, roughness: 0.8 });

    // niches on the side walls, a pot standing in each. The walls are solid boxes,
    // so the recess is a shadowed back panel inside a proud wooden frame.
    ([-6, -13, -20, -27] as const).forEach((z) => [-1, 1].forEach((s) => {
        box(0.06, 1.5, 1.15, darkMat, s * (HALL_X - 0.24), 2.4, z);
        const xf = s * (HALL_X - 0.3);
        box(0.16, 0.14, 1.35, woodMat, xf, 1.7, z);     // sill
        box(0.16, 0.14, 1.35, woodMat, xf, 3.15, z);    // lintel
        [-1, 1].forEach((e) => box(0.16, 1.6, 0.16, woodMat, xf, 2.42, z + e * 0.6));
        const m = new THREE.Mesh(potGeo, matkiMat);
        m.scale.setScalar(0.34);
        m.position.set(s * (HALL_X - 0.42), 1.98, z);
        room.add(m);
    }));

    // more matkis strung from the ceiling along the walls, like the painting
    ([[-5.7, -4], [5.7, -8], [-6.1, -13], [6.0, -17.5], [-5.5, -22], [5.8, -26]] as const)
        .forEach(([x, z], i) => {
            const s = 0.34 + (i % 3) * 0.07;
            const y = 5.5 + (i % 2) * 0.9;
            const m = new THREE.Mesh(potGeo, matkiMat);
            m.scale.setScalar(s);
            m.position.set(x, y, z);
            m.castShadow = true;
            room.add(m);
            const cord = new THREE.Mesh(unitCyl, ropeMat);
            alignTube(cord, new THREE.Vector3(x, HALL_H - 0.35, z), new THREE.Vector3(x, y + 0.6 * s, z), 0.028);
            room.add(cord);
        });

    // warm hall lamps: the sun only reaches in through the door
    ([-6, -19] as const).forEach((z, i) => {
        const lamp = new THREE.PointLight(0xffb765, 5.5, 26, 2);
        lamp.position.set(i ? 4.6 : -4.6, 6.3, z);
        scene.add(lamp);
    });

    /* --- slingshot --- */
    // held by the player: parented to the camera so it stays bottom-centre on screen
    const sling = new THREE.Group();
    sling.position.set(0, -0.44, -1.0);
    sling.scale.setScalar(0.32);
    scene.add(camera);
    camera.add(sling);
    const slingWood = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.8 });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.075, 0.8, 12), slingWood);
    handle.position.y = -0.4;
    handle.castShadow = true;
    sling.add(handle);
    const prongTips: THREE.Vector3[] = [];
    [-1, 1].forEach((s) => {
        const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.052, 0.62, 10), slingWood);
        prong.position.set(s * 0.15, 0.25, 0);
        prong.rotation.z = -s * 0.44;
        prong.castShadow = true;
        sling.add(prong);
        prongTips.push(new THREE.Vector3(s * 0.28, 0.52, 0));
    });
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x7d2b2b, roughness: 0.65 });
    const bands = [0, 1].map(() => {
        const m = new THREE.Mesh(unitCyl, bandMat);
        sling.add(m);
        return m;
    });
    const pouch = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.09, 0.045),
        new THREE.MeshStandardMaterial({ color: 0x7a5433, roughness: 0.85 })
    );
    sling.add(pouch);
    const pouchRest = new THREE.Vector3(0, 0.34, 0.02);

    /* --- stone + aim preview --- */
    const stoneGeo = jitterGeometry(new THREE.IcosahedronGeometry(0.135, 1), 0.045);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x74747a, roughness: 0.92, flatShading: true });
    const stone = new THREE.Mesh(stoneGeo, stoneMat);
    stone.castShadow = true;
    stone.visible = false;
    scene.add(stone);

    const PREVIEW_DOTS = 40;
    const previewGeo = new THREE.BufferGeometry();
    previewGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(PREVIEW_DOTS * 3), 3));
    const preview = new THREE.Points(
        previewGeo,
        // fixed pixel size: an even dotted arc instead of huge blobs near the camera
        new THREE.PointsMaterial({
            color: 0xfff2c4,
            size: 5,
            sizeAttenuation: false,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
        })
    );
    preview.visible = false;
    scene.add(preview);

    const TRAIL = 26;
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(TRAIL * 3), 3));
    const trail = new THREE.Line(
        trailGeo,
        new THREE.LineBasicMaterial({ color: 0xffe8b0, transparent: true, opacity: 0.5 })
    );
    trail.visible = false;
    scene.add(trail);

    /* --------------------------- state --------------------------- */
    let level = 1;
    let cfg = levelConfig(1);
    const swing: Pendulum = { theta: 0.3, omega: 0, length: cfg.ropeLength, damping: 0.02 };
    const potCenter = new THREE.Vector3(0, 5, cfg.potZ);
    const pivot = new THREE.Vector3(0, BEAM_Y - 0.35, cfg.potZ);

    let phase: 'idle' | 'flying' | 'cracking' | 'falling' | 'broken' = 'idle';
    let inputEnabled = false;
    let attract = false;
    // the showreel drives the same physics, so the HUD must not react to its throws
    const emit: SceneCallbacks = {
        onHit: (a) => !attract && cb.onHit(a),
        onBreak: () => !attract && cb.onBreak(),
        onMiss: () => !attract && cb.onMiss(),
        onAim: (p) => !attract && cb.onAim(p),
        onShoot: () => !attract && cb.onShoot(),
    };
    let drawing = false;
    let dragStart = { x: 0, y: 0 };
    let drag = { x: 0, y: 0 };
    let pull = 0;
    let missReported = false;
    let shake = 0;
    let crackTimer = 0;
    let crackFrame = 0;
    let crackUV = { u: 0.5, v: 0.5 };
    let crackTex: THREE.CanvasTexture | null = null;
    let crackCanvas: HTMLCanvasElement | null = null;
    let impactPoint = new THREE.Vector3();
    let lastAccuracy = 0;
    const fallV = new THREE.Vector3();   // pot velocity once the cords snap
    let fallSpin = 0;
    let fallTimer = 0;
    const camAim = new THREE.Vector3();  // frozen pot spot the payoff camera pushes in on
    let zoom = 0;
    const debris: Debris[] = [];
    const trailPts: THREE.Vector3[] = [];
    // the wreck keeps dribbling butter for a moment after the burst
    const dripFrom = new THREE.Vector3();
    let dripsLeft = 0;
    let dripTimer = 0;

    const sp: Vec3 = { x: 0, y: 0, z: 0 };   // stone position
    const sv: Vec3 = { x: 0, y: 0, z: 0 };   // stone velocity
    const stoneSpin = new THREE.Vector3();

    function layoutRig() {
        rig.position.z = cfg.potZ;
        beam.position.set(0, BEAM_Y, 0);
        poleL.position.set(-6.5, BEAM_Y / 2, 0);
        poleR.position.set(6.5, BEAM_Y / 2, 0);
        // garland catenary between the two poles
        garland.clear();
        for (let i = 0; i <= 26; i++) {
            const t = i / 26;
            const x = -6.4 + t * 12.8;
            const y = BEAM_Y - 0.15 - Math.sin(t * Math.PI) * 1.15;
            const m = new THREE.Mesh(marigoldGeos[i % 2], marigoldMats[i % 3]);
            m.position.set(x, y, 0.16);
            garland.add(m);
        }
        flags.forEach((f, i) => {
            const t = i / (flags.length - 1);
            f.position.set(-6.2 + t * 12.4, BEAM_Y - 0.16, -0.18);
        });
        rangoli.position.z = cfg.potZ;
        potGlow.position.set(0, 4.4, cfg.potZ + 2.2);
        camTarget.set(0, 4.9, cfg.potZ * 0.55);
    }

    function clearDebris() {
        debris.forEach((d) => {
            scene.remove(d.mesh);
            if (d.mesh.geometry !== blobGeo) d.mesh.geometry.dispose();   // blobGeo is shared
        });
        debris.length = 0;
    }

    function resetPot() {
        clearDebris();
        dripsLeft = 0;
        pot.visible = true;
        butterTop.visible = true;
        pot.scale.setScalar(cfg.potScale);
        butterTop.scale.set(cfg.potScale, cfg.potScale * 0.55, cfg.potScale);
        potMat.map = clayTex;
        potMat.needsUpdate = true;
        if (crackTex) {
            crackTex.dispose();
            crackTex = null;
            crackCanvas = null;
        }
        swing.length = cfg.ropeLength;
        swing.theta = cfg.amplitude * (Math.random() > 0.5 ? 1 : -1);
        swing.omega = 0;
        pivot.set(0, BEAM_Y - 0.35, cfg.potZ);
        phase = 'idle';
        stone.visible = false;
        trail.visible = false;
        missReported = false;
    }

    function setLevel(n: number) {
        level = n;
        cfg = levelConfig(level);
        layoutRig();
        resetPot();
    }

    /* ------------------------ aim & shooting ------------------------ */

    function aimDir(out: THREE.Vector3) {
        // Pull down-and-back like a real slingshot: the shot goes the other way.
        const yaw = THREE.MathUtils.clamp(-drag.x * 0.0022, -0.5, 0.5);
        const pitch = THREE.MathUtils.clamp(drag.y * 0.0012, -0.25, 0.95);
        out.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)).normalize();
        return out;
    }

    const _dir = new THREE.Vector3();
    const _pouchWorld = new THREE.Vector3();

    function shootSpeed() {
        return 16 + pull * 20;
    }

    function launch() {
        pouch.getWorldPosition(_pouchWorld);
        aimDir(_dir);
        sp.x = _pouchWorld.x;
        sp.y = _pouchWorld.y;
        sp.z = _pouchWorld.z;
        const s = shootSpeed();
        sv.x = _dir.x * s;
        sv.y = _dir.y * s;
        sv.z = _dir.z * s;
        stone.position.set(sp.x, sp.y, sp.z);
        stone.scale.setScalar(1);
        stone.visible = true;
        stoneSpin.set(
            (Math.random() - 0.5) * 14,
            (Math.random() - 0.5) * 14,
            (Math.random() - 0.5) * 14
        );
        trailPts.length = 0;
        trail.visible = true;
        phase = 'flying';
        missReported = false;
        emit.onShoot();
    }

    /* ------------------ attract mode (title showreel) ---------------- */

    const DRAW_HOLD = 0.8;   // the demo shows the stretched sling this long before releasing
    let attractTimer = 0;
    let attractDraw = -1;    // >= 0 while the demo holds the sling stretched
    let demoLevel = 3;

    /**
     * Auto-aim by replaying the same stepProjectile/stepPendulum pair the real update
     * uses, at full pull, and keeping the pitch that passes closest to the swinging
     * pot. null = no shot lands from here, so wait for the swing to come round.
     */
    function solveShot(): number | null {
        pouch.getWorldPosition(_pouchWorld);
        const potR = POT_R * cfg.potScale;
        // the shot goes off DRAW_HOLD later, so aim at where the swing will be by then
        const held: Pendulum = { ...swing };
        for (let i = 0; i < DRAW_HOLD * 120; i++) stepPendulum(held, 1 / 120);
        let bestPitch = 0;
        let bestD = Infinity;
        // 0.005 rad ≈ 9cm at the far handi, fine enough to clear the gate below
        for (let pitch = -0.15; pitch < 0.9; pitch += 0.005) {
            // ...and it leaves the fully drawn pouch, not the resting one (see updateSling)
            const p = {
                x: _pouchWorld.x,
                y: _pouchWorld.y - 0.2 * Math.min(1, pitch / 0.0012 / MAX_PULL_PX),
                z: _pouchWorld.z + 0.6,
            };
            const v = { x: 0, y: Math.sin(pitch) * 36, z: -Math.cos(pitch) * 36 };
            const sw: Pendulum = { ...held };
            for (let i = 0; i < 260 && p.y > 0.14; i++) {
                stepProjectile(p, v, 1 / 120, projOpts());
                stepPendulum(sw, 1 / 120);
                const d = Math.hypot(
                    p.x - (pivot.x + Math.sin(sw.theta) * sw.length),
                    p.y - (pivot.y - Math.cos(sw.theta) * sw.length),
                    p.z - pivot.z
                );
                if (d < bestD) {
                    bestD = d;
                    bestPitch = pitch;
                }
            }
        }
        // hit radius is potR + 0.1, so this still leaves margin for the swing drifting
        return bestD < potR * 0.7 ? bestPitch : null;
    }

    function updateAttract(dt: number) {
        attractTimer -= dt;
        if (attractDraw >= 0) {
            attractDraw -= dt;              // sling held back, dotted arc showing
            if (attractDraw < 0) {
                drawing = false;
                launch();
                pull = 0;
                drag = { x: 0, y: 0 };
            }
            return;
        }
        if (phase === 'broken') {
            if (attractTimer <= 0) {
                demoLevel = (demoLevel % 7) + 1;
                setLevel(demoLevel);        // next handi, a little harder each loop
                attractTimer = 1.1;
            }
            return;
        }
        if (phase !== 'idle' || attractTimer > 0) return;
        const pitch = solveShot();
        if (pitch === null) {
            attractTimer = 0.1;             // swing is out of line, look again shortly
            return;
        }
        drag = { x: 0, y: pitch / 0.0012 };   // inverse of aimDir()'s pitch
        pull = 1;
        drawing = true;
        attractDraw = DRAW_HOLD;
    }

    function onPointerDown(e: PointerEvent) {
        if (!inputEnabled || phase !== 'idle') return;
        drawing = true;
        dragStart = { x: e.clientX, y: e.clientY };
        drag = { x: 0, y: 0 };
        pull = 0;
        renderer.domElement.setPointerCapture?.(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
        if (!drawing) return;
        drag = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y };
        pull = Math.min(1, Math.hypot(drag.x, drag.y) / MAX_PULL_PX);
        emit.onAim(pull);
    }

    function onPointerUp() {
        if (!drawing) return;
        drawing = false;
        preview.visible = false;
        if (pull > 0.12) launch();
        pull = 0;
        emit.onAim(0);
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    /* ------------------------- break sequence ------------------------ */

    function beginCrack(hitPoint: THREE.Vector3) {
        impactPoint.copy(hitPoint);
        const local = hitPoint.clone().sub(potCenter);
        crackUV = {
            // LatheGeometry lays u=0 on +Z (x = r*sin(phi), z = r*cos(phi))
            u: (Math.atan2(local.x, local.z) / (Math.PI * 2) + 1) % 1,
            v: THREE.MathUtils.clamp(0.5 + local.y / (2 * POT_HALF_H * cfg.potScale), 0.05, 0.95),
        };
        const { c, ctx } = canvas2d(1024, 512);
        crackCanvas = c;
        ctx.drawImage(clayCanvas, 0, 0);
        crackTex = new THREE.CanvasTexture(c);
        crackTex.colorSpace = THREE.SRGBColorSpace;
        crackTex.wrapS = THREE.RepeatWrapping;
        potMat.map = crackTex;
        potMat.needsUpdate = true;
        crackFrame = 0;
        crackTimer = 0;
        camAim.copy(potCenter);
        phase = 'cracking';
        shake = 0.5;
        // the impact shoves the hanging pot
        swing.omega += sv.x * 0.16 / swing.length;
        advanceCrack();
    }

    function advanceCrack() {
        if (!crackCanvas || !crackTex) return;
        const ctx = crackCanvas.getContext('2d')!;
        ctx.drawImage(clayCanvas, 0, 0);
        // v is measured bottom→top on the lathe, canvas y is top→down
        const cx = crackUV.u * 1024;
        const cy = (1 - crackUV.v) * 512;
        for (let f = 0; f <= crackFrame; f++) drawCracks(ctx, cx, cy, f, 1234 + f * 977);
        crackTex.needsUpdate = true;
        pot.scale.setScalar(cfg.potScale * (1 + 0.012 * (crackFrame + 1)));
    }

    function addDebris(d: Partial<Debris> & { mesh: THREE.Mesh }): Debris {
        const full: Debris = {
            v: new THREE.Vector3(),
            spin: new THREE.Vector3(),
            restY: 0.05,
            bounce: 0.3,
            settled: false,
            isButter: false,
            flutter: 0,
            life: -1,
            age: 0,
            fade: false,
            grow: 0,
            ...d,
        } as Debris;
        scene.add(full.mesh);
        debris.push(full);
        return full;
    }

    /** One gob of makhan: barely spreads sideways, never bounces, splats where it lands. */
    function spillButter(y: number, r: number, spread: number) {
        const mesh = new THREE.Mesh(blobGeo, butterMat);
        mesh.castShadow = true;
        const a = Math.random() * Math.PI * 2;
        const off = Math.random() * 0.24 * cfg.potScale;
        mesh.position.set(dripFrom.x + Math.cos(a) * off, y, dripFrom.z + Math.sin(a) * off);
        const base = r / BLOB_R;
        mesh.scale.setScalar(base);
        mesh.userData.base = base;
        addDebris({
            mesh,
            v: new THREE.Vector3(
                Math.cos(a) * spread * Math.random() + fallV.x * 0.4,
                -0.2 - Math.random() * 0.6,          // sags out, never fountains up
                Math.sin(a) * spread * Math.random() + fallV.z * 0.4
            ),
            restY: r * 0.7,
            bounce: 0,
            isButter: true,
        });
    }

    // last crack frame: the cords give way and the whole pot drops before it bursts
    function beginFall() {
        phase = 'falling';
        fallTimer = 0;
        const tangential = swing.omega * swing.length;   // d/dt of the pendulum position
        fallV.set(
            Math.cos(swing.theta) * tangential + sv.x * 0.08,
            Math.sin(swing.theta) * tangential - 0.5,
            sv.z * 0.05
        );
        fallSpin = swing.omega + (Math.random() - 0.5) * 2.5;
    }

    function shatter() {
        pot.visible = false;
        butterTop.visible = false;
        phase = 'broken';
        shake = Math.max(shake, 0.35);

        const s = cfg.potScale;
        const tilt = pot.rotation.z;
        const shardMat = new THREE.MeshStandardMaterial({
            map: crackTex ?? clayTex,
            roughness: 0.8,
            side: THREE.DoubleSide,
        });
        const outward = new THREE.Vector3();
        const cols = 6;
        const rows = 3;
        for (let i = 0; i < cols; i++) {
            for (let j = 0; j < rows; j++) {
                const phiStart = (i / cols) * Math.PI * 2 + Math.random() * 0.12;
                const phiLen = (Math.PI * 2 / cols) * (0.82 + Math.random() * 0.16);
                const thetaStart = (j / rows) * Math.PI + Math.random() * 0.08;
                const thetaLen = (Math.PI / rows) * (0.85 + Math.random() * 0.15);
                const geo = new THREE.SphereGeometry(1, 6, 4, phiStart, phiLen, thetaStart, thetaLen);
                geo.scale(POT_R * s, (POT_HALF_H + 0.05) * s, POT_R * s);
                geo.computeBoundingSphere();
                const c = geo.boundingSphere!.center.clone();
                geo.translate(-c.x, -c.y, -c.z);
                const mesh = new THREE.Mesh(geo, shardMat);
                mesh.castShadow = true;
                c.applyAxisAngle(new THREE.Vector3(0, 0, 1), tilt);
                mesh.position.copy(potCenter).add(c);
                mesh.rotation.z = tilt;

                outward.copy(mesh.position).sub(impactPoint).normalize();
                const push = 1.3 + Math.random() * 1.5;
                addDebris({
                    mesh,
                    // the clay splits and drops away — it isn't a bomb, so barely any kick
                    v: outward
                        .multiplyScalar(push)
                        .add(new THREE.Vector3(0, 0.1 + Math.random() * 0.4, 0))
                        .add(fallV),
                    spin: new THREE.Vector3(
                        (Math.random() - 0.5) * 12,
                        (Math.random() - 0.5) * 12,
                        (Math.random() - 0.5) * 12
                    ),
                    restY: 0.12 * s,
                    bounce: 0.34,
                });
            }
        }

        // butter: heavy and cohesive, so it slumps straight out of the broken belly —
        // the hand-patted block first, then gobs, then a dribble that keeps oozing.
        dripFrom.copy(potCenter);
        dripsLeft = 16;
        dripTimer = 0.1;
        spillButter(potCenter.y + 0.3 * s, 0.42 * s, 0.25);   // the block of makhan
        for (let i = 0; i < 10; i++) {
            spillButter(potCenter.y + (Math.random() - 0.4) * 0.45 * s, (0.16 + Math.random() * 0.14) * s, 0.9);
        }

        // marigold petals raining down in celebration
        const petalGeo = new THREE.CircleGeometry(0.055, 6);
        for (let i = 0; i < 34; i++) {
            // own material: petals fade out and must not dim the garlands
            const mesh = new THREE.Mesh(petalGeo, marigoldMats[i % 3].clone());
            mesh.position.set(
                potCenter.x + (Math.random() - 0.5) * 7,
                BEAM_Y - 0.2 + Math.random() * 2,
                potCenter.z + (Math.random() - 0.5) * 4
            );
            mesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
            addDebris({
                mesh,
                v: new THREE.Vector3((Math.random() - 0.5) * 0.6, -0.6 - Math.random(), (Math.random() - 0.5) * 0.6),
                spin: new THREE.Vector3(Math.random() * 3, Math.random() * 3, Math.random() * 3),
                restY: 0.02,
                bounce: 0,
                flutter: 0.6 + Math.random(),
                life: 7,
                fade: false,
            });
        }
        emit.onBreak();
        if (attract) attractTimer = 4.2;   // let the spill play out before the next handi
    }

    // puddle spreads in proportion to the gob that landed
    function butterSplat(at: THREE.Vector3, base = 1) {
        const mesh = new THREE.Mesh(
            new THREE.CircleGeometry(0.24, 14),
            new THREE.MeshStandardMaterial({ color: 0xffe7a2, roughness: 0.4, transparent: true, opacity: 0.92 })
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(at.x, 0.014 + Math.random() * 0.004, at.z);
        mesh.scale.setScalar(0.05);
        addDebris({ mesh, settled: true, grow: base * (0.9 + Math.random() * 0.5), restY: 0 });
    }

    function dustPuff(at: Vec3) {
        const geo = new THREE.SphereGeometry(0.16, 8, 6);
        for (let i = 0; i < 9; i++) {
            const mesh = new THREE.Mesh(
                geo,
                new THREE.MeshBasicMaterial({ color: 0xd7bd93, transparent: true, opacity: 0.5, depthWrite: false })
            );
            mesh.position.set(at.x, Math.max(0.1, at.y), at.z);
            addDebris({
                mesh,
                v: new THREE.Vector3((Math.random() - 0.5) * 1.6, 0.4 + Math.random() * 1.1, (Math.random() - 0.5) * 1.6),
                restY: 0.05,
                bounce: 0,
                life: 0.9,
                fade: true,
            });
        }
    }

    /* --------------------------- simulation -------------------------- */

    const _segA = { x: 0, y: 0, z: 0 };
    const projOpts = () => ({ gravity: GRAVITY, drag: DRAG, wind: cfg.wind });

    function updateStone(dt: number) {
        const sub = 4;
        const h = dt / sub;
        for (let i = 0; i < sub; i++) {
            _segA.x = sp.x;
            _segA.y = sp.y;
            _segA.z = sp.z;
            stepProjectile(sp, sv, h, projOpts());

            if (phase === 'flying') {
                const t = segmentSphereHit(_segA, sp, potCenter, POT_R * cfg.potScale + 0.1);
                if (t !== null) {
                    const hit = new THREE.Vector3(
                        _segA.x + (sp.x - _segA.x) * t,
                        _segA.y + (sp.y - _segA.y) * t,
                        _segA.z + (sp.z - _segA.z) * t
                    );
                    const d = hit.distanceTo(potCenter);
                    lastAccuracy = THREE.MathUtils.clamp(1 - d / (POT_R * cfg.potScale + 0.1), 0, 1);
                    stone.visible = false;
                    trail.visible = false;
                    emit.onHit(lastAccuracy);
                    beginCrack(hit);
                    return;
                }
            }

            if (sp.y <= 0.135) {
                sp.y = 0.135;
                if (Math.abs(sv.y) > 1.2) {
                    sv.y = -sv.y * 0.32;
                    sv.x *= 0.7;
                    sv.z *= 0.7;
                    dustPuff(sp);
                } else {
                    sv.x *= 0.86;
                    sv.z *= 0.86;
                    sv.y = 0;
                }
                if (!missReported && phase === 'flying') {
                    missReported = true;
                    emit.onMiss();
                }
            }
        }

        stone.position.set(sp.x, sp.y, sp.z);
        stone.rotation.x += stoneSpin.x * dt;
        stone.rotation.y += stoneSpin.y * dt;
        stone.rotation.z += stoneSpin.z * dt;

        // trail
        trailPts.push(stone.position.clone());
        if (trailPts.length > TRAIL) trailPts.shift();
        const arr = trailGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < TRAIL; i++) {
            const p = trailPts[Math.min(i, trailPts.length - 1)] ?? stone.position;
            arr.setXYZ(i, p.x, p.y, p.z);
        }
        arr.needsUpdate = true;

        // out of play
        const gone =
            sp.z < cfg.potZ - 8 || Math.abs(sp.x) > 24 ||
            (sp.y <= 0.14 && Math.hypot(sv.x, sv.z) < 0.4);
        if (gone) {
            if (!missReported && phase === 'flying') {
                missReported = true;
                emit.onMiss();
            }
            if (phase === 'flying') {
                phase = 'idle';
                stone.visible = false;
                trail.visible = false;
            }
        }
    }

    function updateDebris(dt: number) {
        for (let i = debris.length - 1; i >= 0; i--) {
            const d = debris[i];
            d.age += dt;
            if (d.grow > 0) {
                const k = Math.min(1, d.age / 0.3);
                d.mesh.scale.setScalar(d.grow * (0.3 + 0.7 * k));
            }
            if (d.life > 0 && d.age > d.life) {
                const m = d.mesh.material as THREE.Material & { opacity: number; transparent: boolean };
                m.transparent = true;
                m.opacity = Math.max(0, (m.opacity ?? 1) - dt * 2);
                if (m.opacity <= 0.01) {
                    scene.remove(d.mesh);
                    debris.splice(i, 1);
                    continue;
                }
            }
            if (d.fade && d.life > 0) {
                const m = d.mesh.material as THREE.Material & { opacity: number };
                m.opacity = Math.max(0, 0.5 * (1 - d.age / d.life));
            }
            if (d.settled) continue;

            d.v.y += GRAVITY * dt;
            if (d.flutter > 0) {
                d.v.x += Math.sin(d.age * 6 + d.mesh.id) * d.flutter * dt * 3;
                d.v.z += Math.cos(d.age * 5 + d.mesh.id) * d.flutter * dt * 3;
                d.v.y *= 0.985;   // air resistance on light petals
            }
            if (d.isButter) {
                // viscous: the gob stretches along the fall instead of tumbling
                const base = d.mesh.userData.base ?? 1;
                const k = Math.min(1, Math.abs(d.v.y) / 7);
                d.mesh.scale.set(base * (1 - k * 0.3), base * (1 + k * 0.8), base * (1 - k * 0.3));
            }
            d.mesh.position.addScaledVector(d.v, dt);
            d.mesh.rotation.x += d.spin.x * dt;
            d.mesh.rotation.y += d.spin.y * dt;
            d.mesh.rotation.z += d.spin.z * dt;

            if (d.mesh.position.y <= d.restY) {
                d.mesh.position.y = d.restY;
                if (d.bounce > 0.05 && Math.abs(d.v.y) > 0.7) {
                    d.v.y = -d.v.y * d.bounce;
                    d.v.x *= 0.68;
                    d.v.z *= 0.68;
                    d.spin.multiplyScalar(0.55);
                } else {
                    if (d.isButter) {
                        const base = d.mesh.userData.base ?? 1;
                        butterSplat(d.mesh.position, base);
                        // it flattens into the puddle instead of sitting there as a ball
                        d.mesh.scale.set(base * 1.45, base * 0.3, base * 1.45);
                        d.mesh.position.y = BLOB_R * base * 0.3;
                    }
                    d.v.set(0, 0, 0);
                    d.spin.set(0, 0, 0);
                    d.settled = true;
                }
            }
        }
    }

    function updateAimPreview() {
        if (!drawing || pull <= 0.05 || phase !== 'idle') {
            preview.visible = false;
            return;
        }
        pouch.getWorldPosition(_pouchWorld);
        aimDir(_dir);
        const s = shootSpeed();
        const pts = predictPath(
            { x: _pouchWorld.x, y: _pouchWorld.y, z: _pouchWorld.z },
            { x: _dir.x * s, y: _dir.y * s, z: _dir.z * s },
            projOpts(),
            PREVIEW_DOTS * 3,
            1 / 60,
            0.14
        );
        const arr = previewGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < PREVIEW_DOTS; i++) {
            const p = pts[Math.min(i * 3, pts.length - 1)] ?? pts[pts.length - 1];
            if (p) arr.setXYZ(i, p.x, p.y, p.z);
        }
        arr.needsUpdate = true;
        preview.visible = true;
    }

    function updateSling(dt: number) {
        const target = pouchRest.clone();
        if (drawing) {
            const nx = THREE.MathUtils.clamp(drag.x / MAX_PULL_PX, -1, 1);
            const ny = THREE.MathUtils.clamp(drag.y / MAX_PULL_PX, -1, 1);
            target.x += nx * 0.22;
            target.y -= ny * 0.2;
            target.z += pull * 0.6;
        }
        pouch.position.lerp(target, 1 - Math.pow(0.001, dt));
        bands.forEach((b, i) => alignTube(b, prongTips[i], pouch.position, 0.016));
        sling.rotation.z = -pouch.position.x * 0.35;
        // stone sits loaded in the pouch until it's launched
        if (phase === 'idle') {
            pouch.getWorldPosition(_pouchWorld);
            stone.position.copy(_pouchWorld);
            stone.scale.setScalar(0.17);   // matches the sling's held-in-hand scale
            stone.visible = true;
        }
    }

    function updatePot(dt: number) {
        if (phase === 'falling') {
            fallTimer += dt;
            fallV.y += GRAVITY * dt;
            potCenter.addScaledVector(fallV, dt);
            pot.position.copy(potCenter);
            pot.rotation.z += fallSpin * dt;
            const lift = 0.68 * cfg.potScale;
            butterTop.position.set(
                potCenter.x - Math.sin(pot.rotation.z) * lift,
                potCenter.y + Math.cos(pot.rotation.z) * lift,
                potCenter.z
            );
            butterTop.rotation.z = pot.rotation.z;
            // long enough to read as a drop, short enough that it bursts in mid-air
            if (fallTimer > 0.42) shatter();
        } else if (phase !== 'broken') {
            stepPendulum(swing, dt);
            potCenter.set(
                pivot.x + Math.sin(swing.theta) * swing.length,
                pivot.y - Math.cos(swing.theta) * swing.length,
                pivot.z
            );
            // the pot's axis stays along the cord, so it tilts with the swing
            pot.position.copy(potCenter);
            pot.rotation.z = swing.theta;
            const lift = 0.68 * cfg.potScale;
            butterTop.position.set(
                potCenter.x - Math.sin(swing.theta) * lift,
                potCenter.y + Math.cos(swing.theta) * lift,
                potCenter.z
            );
            butterTop.rotation.z = swing.theta;
        }

        // cords follow the pot
        const beamPoint = new THREE.Vector3(pivot.x, BEAM_Y, pivot.z);
        cordRing.position.copy(pivot);
        cordRing.visible = phase !== 'broken';
        mainCord.visible = phase !== 'broken';
        alignTube(mainCord, beamPoint, pivot, 0.045);   // thick jute rope, like the reference
        cords.forEach((c, i) => {
            // the rim cords are what snap, so they go the moment the pot drops
            c.visible = phase !== 'broken' && phase !== 'falling';
            const a = (i / 3) * Math.PI * 2;
            const r = 0.27 * cfg.potScale;
            // rim point in pot space, rotated by the swing angle
            const lx = Math.cos(a) * r;
            const ly = 0.55 * cfg.potScale;
            const cs = Math.cos(swing.theta);
            const sn = Math.sin(swing.theta);
            const rim = new THREE.Vector3(
                potCenter.x + lx * cs - ly * sn,
                potCenter.y + lx * sn + ly * cs,
                potCenter.z + Math.sin(a) * r
            );
            alignTube(c, pivot, rim, 0.03);
        });
    }

    /* ---------------------------- main loop -------------------------- */

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    const _look = new THREE.Vector3();
    const _camWant = new THREE.Vector3();
    const _camLook = new THREE.Vector3();

    function frame(now: number) {
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;
        elapsed += dt;

        if (attract) updateAttract(dt);
        updatePot(dt);
        updateSling(dt);
        updateAimPreview();
        if (phase === 'flying') updateStone(dt);
        if (dripsLeft > 0) {
            dripTimer -= dt;
            if (dripTimer <= 0) {
                dripTimer = 0.08 + Math.random() * 0.09;
                dripsLeft--;
                spillButter(dripFrom.y + (Math.random() - 0.5) * 0.2, (0.07 + Math.random() * 0.09) * cfg.potScale, 0.2);
            }
        }
        updateDebris(dt);

        if (phase === 'cracking') {
            crackTimer += dt * 1000;
            if (crackTimer >= CRACK_FRAME_MS) {
                crackTimer = 0;
                crackFrame++;
                if (crackFrame >= CRACK_FRAMES) beginFall();
                else advanceCrack();
            }
        }

        // festive sway + glow flicker
        flags.forEach((f, i) => {
            f.rotation.z = Math.sin(elapsed * 2 + i * 0.5) * 0.22;
        });
        potGlow.intensity = 7 + Math.sin(elapsed * 7) * 1.2;

        // camera: gentle drift + impact shake
        shake = Math.max(0, shake - dt * 1.6);
        camera.position.set(
            camBase.x + Math.sin(elapsed * 0.25) * 0.25 + (Math.random() - 0.5) * shake * 0.5,
            camBase.y + Math.sin(elapsed * 0.4) * 0.08 + (Math.random() - 0.5) * shake * 0.5,
            camBase.z
        );
        if (attract) {
            // wide slow orbit: the title screen reads as a showreel, not a paused game
            const a = elapsed * 0.11;
            camera.position.x += Math.sin(a) * 3.6;
            camera.position.y += Math.sin(elapsed * 0.27) * 0.35;
            camera.position.z += 0.9 + Math.cos(a) * 0.9;
        }

        // payoff shot: push in on the pot while it cracks, falls and spills, then pull back
        const breaking = phase === 'cracking' || phase === 'falling' || phase === 'broken';
        zoom = THREE.MathUtils.clamp(zoom + dt * (breaking ? 1.9 : -2.6), 0, 1);
        _look.copy(camTarget);
        if (zoom > 0.001) {
            const e = zoom * zoom * (3 - 2 * zoom);
            _camWant.set(camAim.x * 0.6, camAim.y - 0.7, camAim.z + 6.5);
            camera.position.lerp(_camWant, e);
            // aim below the pot so the falling shards and butter splats stay in frame
            _look.lerp(_camLook.set(camAim.x, camAim.y - 1.7, camAim.z), e);
        }
        // the title bar eats the bottom of the frame, so tilt down and let the action ride high
        if (attract) _look.y -= 1.1;
        camera.lookAt(_look);
        sling.visible = zoom < 0.15;

        renderer.render(scene, camera);
    }

    function onResize() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', onResize);

    setLevel(1);
    raf = requestAnimationFrame(frame);

    return {
        setLevel,
        setInputEnabled(on: boolean) {
            inputEnabled = on;
            if (!on) {
                drawing = false;
                pull = 0;
                preview.visible = false;
            }
        },
        setAttract(on: boolean) {
            attract = on;
            attractTimer = on ? 0.9 : 0;
            attractDraw = -1;
            drawing = false;
            pull = 0;
            drag = { x: 0, y: 0 };
            preview.visible = false;
            if (on) setLevel(demoLevel);
        },
        dispose() {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', onResize);
            renderer.domElement.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
            clearDebris();
            scene.traverse((o) => {
                const m = o as THREE.Mesh;
                if (m.geometry) m.geometry.dispose();
                const mat = m.material as THREE.Material | THREE.Material[] | undefined;
                if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
                else mat?.dispose();
            });
            clayTex.dispose();
            crackTex?.dispose();
            skyTex.dispose();
            groundTex.dispose();
            rangoliTex.dispose();
            renderer.dispose();
            if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
        },
    };
}
