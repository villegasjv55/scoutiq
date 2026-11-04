import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { PITCH_H, PITCH_W, TEAM_COLORS } from "../utils/matchViz";

const S = 0.2; // one StatsBomb unit in world space, so the pitch is 24 x 16
const wx = (x) => (x - PITCH_W / 2) * S;
const wz = (y) => (y - PITCH_H / 2) * S;
const GOAL_H = 0.75;

function useFloorTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 1440; c.height = 960;
    const g = c.getContext("2d");
    const k = c.width / PITCH_W;
    for (let i = 0; i < 12; i += 1) { g.fillStyle = i % 2 ? "#17381f" : "#143019"; g.fillRect(i * 10 * k, 0, 10 * k, c.height); }
    g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 3;
    const R = (x, y, w, h) => g.strokeRect(x * k, y * k, w * k, h * k);
    R(0, 0, PITCH_W, PITCH_H); R(0, 18, 18, 44); R(PITCH_W - 18, 18, 18, 44); R(0, 30, 6, 20); R(PITCH_W - 6, 30, 6, 20);
    g.beginPath(); g.moveTo(60 * k, 0); g.lineTo(60 * k, PITCH_H * k); g.stroke();
    g.beginPath(); g.arc(60 * k, 40 * k, 10 * k, 0, Math.PI * 2); g.stroke();
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

function Floor() {
  const map = useFloorTexture();
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[PITCH_W * S, PITCH_H * S]} />
        <meshStandardMaterial map={map} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]}>
        <planeGeometry args={[PITCH_W * S + 5, PITCH_H * S + 5]} />
        <meshStandardMaterial color="#0a0f0b" />
      </mesh>
      {[-1, 1].map((side) => (
        <Line key={side} points={[[side * 12, 0, -0.8], [side * 12, GOAL_H, -0.8], [side * 12, GOAL_H, 0.8], [side * 12, 0, 0.8]]} color="#ffffff" lineWidth={2.5} />
      ))}
    </group>
  );
}

const ramp = (v) => {
  const c = new THREE.Color();
  if (v < 0.5) c.set("#2c3a9e").lerp(new THREE.Color("#4dd4ff"), v * 2);
  else c.set("#4dd4ff").lerp(new THREE.Color("#5ef2c9"), (v - 0.5) * 2);
  return c;
};

// Heat towers: taller and brighter where the team was more active. Heights glide to new values.
function Towers({ grid, cols, rows }) {
  const ref = useRef(null);
  const cur = useRef(new Float32Array(cols * rows));
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const cw = (PITCH_W / cols) * S;
  const ch = (PITCH_H / rows) * S;

  useLayoutEffect(() => { if (ref.current) ref.current.count = cols * rows; }, [cols, rows]);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < cols * rows; i += 1) {
      cur.current[i] += (Math.pow(grid[i] ?? 0, 1.6) - cur.current[i]) * 0.1;
      const v = cur.current[i];
      const h = 0.04 + v * 3.4;
      const gx = i % cols, gy = Math.floor(i / cols);
      dummy.position.set(-PITCH_W * S / 2 + (gx + 0.5) * cw, h / 2, -PITCH_H * S / 2 + (gy + 0.5) * ch);
      dummy.scale.set(cw * 0.86, h, ch * 0.86);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, ramp(v));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[null, null, cols * rows]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.45} metalness={0.15} />
    </instancedMesh>
  );
}

function arcPoints(a, b, lift, n = 20) {
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const dist = a.distanceTo(b);
  const ctrl = mid.clone().setY(mid.y + lift * Math.max(0.4, dist * 0.5));
  return new THREE.QuadraticBezierCurve3(a, ctrl, b).getPoints(n);
}

// Every completed pass as a glowing arc. Assists are amber, shot-creating passes are white.
function PassArcs({ passes, color }) {
  const geometry = useMemo(() => {
    const pos = [], col = [];
    const base = new THREE.Color(color);
    const amber = new THREE.Color("#ffcf5c");
    const white = new THREE.Color("#ffffff");
    passes.filter((p) => p[8] === 0).slice(0, 700).forEach((p) => {
      const a = new THREE.Vector3(wx(p[4]), 0.04, wz(p[5]));
      const b = new THREE.Vector3(wx(p[6]), 0.04, wz(p[7]));
      const pts = arcPoints(a, b, 0.55);
      const c = p[10] ? amber : p[9] ? white : base;
      for (let i = 0; i < pts.length - 1; i += 1) {
        pos.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
        col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, [passes, color]);
  return <lineSegments geometry={geometry}><lineBasicMaterial vertexColors transparent opacity={0.6} /></lineSegments>;
}

function shotCurve(s) {
  const a = new THREE.Vector3(wx(s.x), 0.12, wz(s.y));
  const b = new THREE.Vector3(wx(s.ex), Math.max(0.1, s.ez * S * 1.4), wz(s.ey));
  return { a, b, pts: arcPoints(a, b, 0.9, 30) };
}

function Player({ x, y, color, keeper, shooter }) {
  const h = keeper ? 0.8 : 0.62;
  return (
    <group position={[wx(x), 0, wz(y)]}>
      <mesh position={[0, h / 2, 0]}><cylinderGeometry args={[0.13, 0.17, h, 14]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={shooter ? 0.9 : 0.25} /></mesh>
      <mesh position={[0, h + 0.13, 0]}><sphereGeometry args={[0.15, 16, 16]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={shooter ? 0.9 : 0.25} /></mesh>
    </group>
  );
}

function Ball({ curve }) {
  const ref = useRef(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = Math.min(1, (clock.elapsedTime % 2.4) / 1.4);
    ref.current.position.copy(curve.getPoint(t));
  });
  return <mesh ref={ref}><sphereGeometry args={[0.13, 16, 16]} /><meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} /></mesh>;
}

function Shots({ shots, selected, onPick, team }) {
  const curves = useMemo(() => shots.map(shotCurve), [shots]);
  const sel = selected != null ? shots[selected] : null;
  const selCurve = useMemo(() => (sel ? new THREE.CatmullRomCurve3(shotCurve(sel).pts) : null), [sel]);
  const other = TEAM_COLORS[1 - team];
  return (
    <group>
      {shots.map((s, i) => {
        const goal = s.o === "Goal";
        const isSel = selected === i;
        return (
          <group key={i}>
            <Line points={curves[i].pts} color={isSel ? "#ffffff" : goal ? "#5ef2c9" : TEAM_COLORS[team]} lineWidth={isSel ? 3.5 : goal ? 2.6 : 1.1} transparent opacity={isSel || goal ? 1 : 0.4} />
            <mesh position={curves[i].a} onClick={(e) => { e.stopPropagation(); onPick(i); }} scale={0.6 + Math.sqrt(s.xg) * 2.2}>
              <sphereGeometry args={[0.12, 14, 14]} />
              <meshStandardMaterial color={goal ? "#5ef2c9" : TEAM_COLORS[team]} emissive={goal ? "#5ef2c9" : TEAM_COLORS[team]} emissiveIntensity={goal ? 1.1 : 0.35} />
            </mesh>
          </group>
        );
      })}
      {sel && selCurve && <Ball curve={selCurve} />}
      {sel && <Player x={sel.x} y={sel.y} color="#ffffff" shooter />}
      {sel && sel.ff.map((f, i) => <Player key={i} x={f[0]} y={f[1]} keeper={!!f[3]} color={f[3] ? "#ffcf5c" : f[2] ? TEAM_COLORS[team] : other === TEAM_COLORS[0] ? "#9aa" : "#ff6b9d"} />)}
    </group>
  );
}

// Swings the camera in behind the goal when a shot is chosen, and back out to the full pitch otherwise.
function Rig({ focus, controls }) {
  const { camera } = useThree();
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    if (focus !== null) { camera.position.set(5.2, 3.6, 5.8); c.target.set(10, 0.5, 0); }
    else { camera.position.set(0, 12, 15.5); c.target.set(0, 0.4, 0); }
    c.update();
  }, [focus, camera, controls]);
  return null;
}

export default function Pitch3D({ mode, team, grid, cols, rows, passes, shots, selected, onPick, autoRotate }) {
  const controls = useRef(null);
  return (
    <Canvas camera={{ position: [0, 12, 15.5], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={["#070912"]} />
      <fog attach="fog" args={["#070912", 28, 60]} />
      <ambientLight intensity={1.0} />
      <directionalLight position={[6, 14, 8]} intensity={2.4} />
      <pointLight position={[-10, 5, -6]} intensity={50} color="#4dd4ff" />
      <pointLight position={[10, 5, 6]} intensity={40} color="#5ef2c9" />
      <Floor />
      {mode === "towers" && <Towers grid={grid} cols={cols} rows={rows} />}
      {mode === "passes" && <PassArcs passes={passes} color={TEAM_COLORS[team]} />}
      {mode === "shots" && <Shots shots={shots} selected={selected} onPick={onPick} team={team} />}
      <Rig focus={mode === "shots" && selected != null ? selected : null} controls={controls} />
      <OrbitControls ref={controls} target={[0, 0.4, 0]} enableDamping autoRotate={autoRotate} autoRotateSpeed={0.7} minDistance={6} maxDistance={34} maxPolarAngle={Math.PI * 0.49} />
    </Canvas>
  );
}
