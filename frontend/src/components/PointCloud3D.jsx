import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const SIZE = 10; // the plot is a 10 x 10 x 10 cube

function Cloud({ points, onHover, onPick }) {
  const ref = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new THREE.Color();
    points.forEach((pt, i) => {
      dummy.position.set(pt.pos[0], pt.pos[1], pt.pos[2]);
      dummy.scale.setScalar(pt.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.set(pt.color));
    });
    mesh.count = points.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [points, dummy]);

  return (
    <instancedMesh
      key={points.length}
      ref={ref}
      args={[undefined, undefined, Math.max(points.length, 1)]}
      onPointerMove={(e) => { e.stopPropagation(); onHover(e.instanceId ?? null); }}
      onPointerOut={() => onHover(null)}
      onClick={(e) => { e.stopPropagation(); if (e.instanceId != null) onPick(points[e.instanceId]); }}
    >
      <sphereGeometry args={[1, 18, 18]} />
      <meshStandardMaterial roughness={0.3} metalness={0.15} />
    </instancedMesh>
  );
}

function AxisLabel({ position, children, tone }) {
  return (
    <Html position={position} center style={{ pointerEvents: "none" }}>
      <span className="axis-3d" style={{ "--tone": tone }}>{children}</span>
    </Html>
  );
}

function Scene({ points, axes, highlight, onPick, onHoverChange }) {
  const [hover, setHover] = useState(null);
  const hovered = hover != null ? points[hover] : null;

  function handleHover(i) {
    setHover(i);
    onHoverChange?.(i);
  }

  return (
    <group position={[-SIZE / 2, 0, -SIZE / 2]}>
      <gridHelper args={[SIZE, 10, "#4a5d4d", "#1f2a22"]} position={[SIZE / 2, 0, SIZE / 2]} />
      <gridHelper args={[SIZE, 10, "#323a5c", "#1a1f33"]} rotation={[Math.PI / 2, 0, 0]} position={[SIZE / 2, SIZE / 2, 0]} />
      <gridHelper args={[SIZE, 10, "#323a5c", "#1a1f33"]} rotation={[0, 0, Math.PI / 2]} position={[0, SIZE / 2, SIZE / 2]} />
      <Line points={[[0, 0, 0], [SIZE + 0.6, 0, 0]]} color="#5ef2c9" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, SIZE + 0.6, 0]]} color="#4dd4ff" lineWidth={2} />
      <Line points={[[0, 0, 0], [0, 0, SIZE + 0.6]]} color="#ff6b9d" lineWidth={2} />
      <AxisLabel position={[SIZE + 1.6, 0, 0]} tone="#5ef2c9">{axes[0]}</AxisLabel>
      <AxisLabel position={[0, SIZE + 1.1, 0]} tone="#4dd4ff">{axes[1]}</AxisLabel>
      <AxisLabel position={[0, 0, SIZE + 1.6]} tone="#ff6b9d">{axes[2]}</AxisLabel>

      <Cloud points={points} onHover={handleHover} onPick={onPick} />

      {highlight.map((pt) => (
        <group key={pt.p.key} position={pt.pos}>
          <mesh>
            <sphereGeometry args={[pt.size * 1.9, 24, 24]} />
            <meshStandardMaterial color="#5ef2c9" emissive="#5ef2c9" emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
          <Html center distanceFactor={14} position={[0, pt.size * 3.2, 0]} style={{ pointerEvents: "none" }}>
            <span className="pt-label">{pt.p.name}</span>
          </Html>
        </group>
      ))}

      {hovered && (
        <Html position={hovered.pos} style={{ pointerEvents: "none" }}>
          <div className="pt-tip">
            <strong>{hovered.p.name}</strong>
            <span>{hovered.p.club}, {hovered.p.seasonLabel}</span>
            {hovered.readout.map((r) => (<span key={r.label}>{r.label}: {r.value}</span>))}
          </div>
        </Html>
      )}
    </group>
  );
}

export default function PointCloud3D({ points, axes, highlight, onPick, autoRotate }) {
  return (
    <Canvas camera={{ position: [17, 11, 17], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true }}>
      <ambientLight intensity={1.1} />
      <directionalLight position={[8, 14, 6]} intensity={2.2} />
      <pointLight position={[-8, 6, -8]} intensity={40} color="#4dd4ff" />
      <Scene points={points} axes={axes} highlight={highlight} onPick={onPick} />
      <OrbitControls target={[0, 4.4, 0]} enableDamping autoRotate={autoRotate} autoRotateSpeed={0.9} minDistance={8} maxDistance={38} maxPolarAngle={Math.PI * 0.52} />
    </Canvas>
  );
}
