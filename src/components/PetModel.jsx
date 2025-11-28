// src/components/PetModel.jsx
import React, {
  Suspense,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useMemo,
} from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  Html,
  useGLTF,
  OrbitControls,
  Preload,
  Environment,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import usePreferences from "../hooks/usePreferences"; // ensure path is correct

/* =========================
   COLOR ANIMATOR — Smooth mesh color transitions
   ========================= */
function ColorAnimator({ meshesRef }) {
  useFrame(() => {
    const map = meshesRef.current;
    if (!map) return;

    const lerpSpeed = 0.18;
    for (const key of Object.keys(map)) {
      const entry = map[key];
      if (!entry || !entry.mesh || !entry.mesh.material) continue;

      const mat = entry.mesh.material;
      const target = entry.targetColor;
      if (mat.color && target) {
        mat.color.lerp(target, lerpSpeed);
        mat.needsUpdate = true;
      }
    }
  });
  return null;
}

/* =========================
   SAFE GLTF LOADER WRAPPER (Model)
   - normalizes incoming `url` to a string before calling useGLTF
   - keeps mouth + idle animations + imperative API
   ========================= */
const Model = forwardRef(({ url: incomingUrl }, ref) => {
  // Normalize incoming url (accept string or object { file | url | model.file })
  const url = useMemo(() => {
    if (!incomingUrl) return null;
    if (typeof incomingUrl === "string") return incomingUrl;
    if (typeof incomingUrl === "object") {
      // common shapes
      if (typeof incomingUrl.file === "string") return incomingUrl.file;
      if (typeof incomingUrl.url === "string") return incomingUrl.url;
      if (incomingUrl.model && typeof incomingUrl.model.file === "string")
        return incomingUrl.model.file;
    }
    return null;
  }, [incomingUrl]);

  // If no valid url, bail out and render nothing (parent's Suspense fallback will show)
  // But useGLTF requires a string; so only call when url is valid
  const gltf = useGLTF(url || "/models/mouth.glb");

  const group = useRef();
  const meshesRef = useRef({});
  const mouthNodesRef = useRef({ closed: null, open: null });
  const speakingRef = useRef(false);

  const headRef = useRef();
  const bodyRef = useRef();

  // Setup materials, meshes & mouth nodes
  useEffect(() => {
    if (!gltf?.scene) return;

    const map = {};
    gltf.scene.traverse((child) => {
      if (child.isMesh && child.material) {
        // ensure material clone per-instance (so color changes don't affect shared mats)
        if (!child.material._petMaterialClone) {
          const cloned = child.material.clone();
          cloned._petMaterialClone = true;
          child.material = cloned;
        }

        // ensure correct color space for three r132+; keep robust for different versions
        try {
          if (child.material.color) child.material.colorSpace = THREE.SRGBColorSpace;
        } catch {
          // ignore if property not available in older versions
        }

        child.material.needsUpdate = true;
        const orig = child.material.color
          ? child.material.color.clone()
          : new THREE.Color(0xffffff);
        const name = child.name || child.uuid;

        map[name] = {
          mesh: child,
          originalColor: orig.clone(),
          targetColor: orig.clone(),
        };

        const lname = name.toLowerCase();
        if (lname.includes("head")) headRef.current = child;
        if (lname.includes("body")) bodyRef.current = child;
      }
    });
    meshesRef.current = map;

    // try common mouth node names
    const closed = gltf.scene.getObjectByName("Mouth_001") || gltf.scene.getObjectByName("MouthClosed") || gltf.scene.getObjectByName("mouth_closed");
    const open = gltf.scene.getObjectByName("Mouth_002") || gltf.scene.getObjectByName("MouthOpen") || gltf.scene.getObjectByName("mouth_open");
    if (closed && open) {
      closed.visible = true;
      open.visible = false;
      mouthNodesRef.current = { closed, open };
    }
  }, [gltf]);

  const colorToHex = (c) => (c ? `#${c.getHexString()}` : "#ffffff");
  const hexToColor = (hex) => {
    try {
      return new THREE.Color(hex);
    } catch {
      return new THREE.Color(0xffffff);
    }
  };

  // IMPERATIVE API
  useImperativeHandle(ref, () => ({
    setMouthOpen: (open) => {
      const { closed, open: openNode } = mouthNodesRef.current;
      if (!closed || !openNode) return;
      closed.visible = !open;
      openNode.visible = open;
    },
    toggleMouth: () => {
      const { closed, open: openNode } = mouthNodesRef.current;
      if (!closed || !openNode) return;
      const open = !closed.visible;
      closed.visible = !open;
      openNode.visible = open;
    },
    startSpeaking: () => {
      speakingRef.current = true;
    },
    stopSpeaking: () => {
      speakingRef.current = false;
      const { closed, open: openNode } = mouthNodesRef.current;
      if (closed && openNode) {
        closed.visible = true;
        openNode.visible = false;
      }
    },
    getMeshNames: () => Object.keys(meshesRef.current),
    getMeshes: () =>
      Object.entries(meshesRef.current).map(([name, { mesh, targetColor }]) => ({
        name,
        color: colorToHex(
          targetColor || mesh.material?.color || new THREE.Color(0xffffff)
        ),
      })),
    getMeshColor: (name) => {
      const entry = meshesRef.current[name];
      if (!entry) return null;
      return colorToHex(
        entry.targetColor || entry.mesh.material?.color || new THREE.Color(0xffffff)
      );
    },
    setMeshColor: (name, hexColor) => {
      const entry = meshesRef.current[name];
      if (!entry) return false;
      entry.targetColor = hexToColor(hexColor);
      return true;
    },
    resetMeshColor: (name) => {
      const entry = meshesRef.current[name];
      if (!entry) return null;
      entry.targetColor = entry.originalColor.clone();
      return colorToHex(entry.originalColor);
    },
    // small helper to allow external code to access raw gltf if needed
    getRawGLTF: () => gltf,
  }));

  // Idle + Mouth animation loop
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const { closed, open: openNode } = mouthNodesRef.current;

    if (closed && openNode && speakingRef.current) {
      const open = Math.sin(t * 10) > 0;
      closed.visible = !open;
      openNode.visible = open;
    }

    const groupObj = group.current;
    if (groupObj) {
      groupObj.rotation.y = Math.sin(t * 0.4) * 0.15;
      groupObj.position.y = Math.sin(t * 1.5) * 0.05;
    }

    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.8) * 0.25;
      headRef.current.rotation.x = Math.sin(t * 0.5) * 0.1;
    }

    if (bodyRef.current) {
      bodyRef.current.position.y = Math.sin(t * 1.2) * 0.03;
    }
  });

  // Render the loaded scene as a primitive
  return (
    <>
      {gltf?.scene ? (
        <>
          <primitive ref={group} object={gltf.scene} dispose={null} />
          <ColorAnimator meshesRef={meshesRef} />
        </>
      ) : null}
    </>
  );
});
Model.displayName = "Model";

/* =========================
   RESPONSIVE WRAPPER
   ========================= */
function ResponsiveWrapper({ children }) {
  const { viewport } = useThree();
  // Ensure scale never becomes zero
  const scale = Math.max(0.4, Math.min(viewport.width, viewport.height) / 4);
  return <group scale={scale}>{children}</group>;
}

/* =========================
   MAIN PET MODEL COMPONENT (Canvas wrapper)
   - accepts `modelPath` prop (string or object)
   - falls back to preferences.currentModel (object or string)
   - always resolves a safe string path to pass down to Model
   ========================= */
const PetModel = forwardRef(({ modelPath, className = "w-50 h-50" }, ref) => {
  const [preferences] = usePreferences(); // realtime user prefs

  // helper to resolve a string url from different shapes
  const resolveToUrl = (input) => {
    if (!input) return null;
    if (typeof input === "string") return input;
    if (typeof input === "object") {
      if (typeof input.file === "string") return input.file;
      if (typeof input.url === "string") return input.url;
      if (input.model && typeof input.model.file === "string") return input.model.file;
      // sometimes Firestore may store nested { id, file } or { id, path }
      if (typeof input.path === "string") return input.path;
    }
    return null;
  };

  // Determine the final path to load:
  const resolvedPath = useMemo(() => {
    // Priority:
    // 1) explicit prop modelPath (string or object)
    // 2) preferences.currentModel (string or object)
    // 3) preferences.currentModel.file (object case handled by resolveToUrl)
    // 4) fallback default
    const p1 = resolveToUrl(modelPath);
    if (p1) return p1;

    const p2 = resolveToUrl(preferences?.currentModel);
    if (p2) return p2;

    // allow preferences.selectedPet to map to a known local model if you maintain a map elsewhere
    // but for safety default to the mouth model
    return "/models/mouth.glb";
  }, [modelPath, preferences]);

  // Canvas + Drei components
  return (
    <div className={className}>
      <Canvas
        shadows
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ width: "100%", height: "100%" }}
        gl={{
          antialias: true,
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
        onCreated={({ gl }) => {
          try {
            gl.toneMappingExposure = 1.0;
            gl.physicallyCorrectLights = true;
          } catch {
            // some gl builds may not support these properties; ignore failures
          }
        }}
      >
        {/* LIGHTS */}
        <ambientLight intensity={0.5} />
        <directionalLight
          intensity={1.1}
          position={[5, 10, 6]}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-6}
          shadow-camera-right={6}
          shadow-camera-top={6}
          shadow-camera-bottom={-6}
        />
        <pointLight intensity={0.2} position={[-4, 2, 3]} />
        <rectAreaLight
          intensity={0.6}
          position={[-3, 4, -3]}
          rotation={[0.6, -0.8, 0]}
          width={6}
          height={6}
        />

        <Suspense fallback={<Html center>Loading pet...</Html>}>
          <ResponsiveWrapper>
            {/* pass url string down to Model */}
            <Model ref={ref} url={resolvedPath} />
          </ResponsiveWrapper>

          <Environment preset="sunset" background={false} />
          <ContactShadows
            position={[0, -1.8, 0]}
            scale={3}
            blur={1.4}
            far={1.8}
            opacity={0.6}
          />
          <Preload all />
          <OrbitControls enablePan={false} enableZoom enableRotate />
        </Suspense>
      </Canvas>
    </div>
  );
});

useGLTF.preload("/models/mouth.glb"); // preload a safe default
export default PetModel;