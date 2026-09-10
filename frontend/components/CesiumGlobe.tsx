"use client";

import { useEffect, useRef, useState } from "react";
import type { ConjunctionAlert } from "@/lib/types";
import type { DebrisObject } from "@/lib/types";
import type { Satellite } from "@/lib/types";
import type { Threat } from "@/lib/types";

type CesiumNamespace = Record<string, any>;
type CesiumViewer = any;
type CesiumEntity = any;
type CesiumScreenSpaceEventHandler = any;

type CityLight = {
  id: string;
  latitude: number;
  longitude: number;
  intensity: number;
  color?: string;
  clusterCount?: number;
};

type CesiumGlobeProps = {
  satellites: Satellite[];
  selectedSatelliteId: string | null;
  threats: Threat[];
  debris: DebrisObject[];
  conjunctions: ConjunctionAlert[];
  onSelectSatellite: (satellite: Satellite) => void;
  onSelectDebris?: (debris: DebrisObject) => void;
};

const EARTH_RADIUS_KM = 6371;
const GLOBE_SPIN_RATE_RADIANS = 0.000055;
const CITY_LIGHT_ALTITUDE_METERS = 6000;
const SATELLITE_FOCUS_ALTITUDE_METERS = 2_600_000;
const MAJOR_CITY_LIGHTS: CityLight[] = [
  { id: "new-york", latitude: 40.7128, longitude: -74.006, intensity: 1, clusterCount: 11 },
  { id: "boston", latitude: 42.3601, longitude: -71.0589, intensity: 0.65, clusterCount: 5 },
  { id: "philadelphia", latitude: 39.9526, longitude: -75.1652, intensity: 0.7, clusterCount: 5 },
  { id: "washington-dc", latitude: 38.9072, longitude: -77.0369, intensity: 0.72, clusterCount: 6 },
  { id: "atlanta", latitude: 33.749, longitude: -84.388, intensity: 0.74, clusterCount: 7 },
  { id: "miami", latitude: 25.7617, longitude: -80.1918, intensity: 0.68, clusterCount: 6 },
  { id: "chicago", latitude: 41.8781, longitude: -87.6298, intensity: 0.86, clusterCount: 9 },
  { id: "minneapolis", latitude: 44.9778, longitude: -93.265, intensity: 0.56, clusterCount: 4 },
  { id: "denver", latitude: 39.7392, longitude: -104.9903, intensity: 0.58, clusterCount: 4 },
  { id: "phoenix", latitude: 33.4484, longitude: -112.074, intensity: 0.58, clusterCount: 4 },
  { id: "las-vegas", latitude: 36.1716, longitude: -115.1391, intensity: 0.64, clusterCount: 4 },
  { id: "dallas", latitude: 32.7767, longitude: -96.797, intensity: 0.76, clusterCount: 7 },
  { id: "houston", latitude: 29.7604, longitude: -95.3698, intensity: 0.72, clusterCount: 7 },
  { id: "los-angeles", latitude: 34.0522, longitude: -118.2437, intensity: 1, clusterCount: 11 },
  { id: "san-francisco", latitude: 37.7749, longitude: -122.4194, intensity: 0.76, clusterCount: 6 },
  { id: "seattle", latitude: 47.6062, longitude: -122.3321, intensity: 0.62, clusterCount: 5 },
  { id: "vancouver", latitude: 49.2827, longitude: -123.1207, intensity: 0.55, clusterCount: 4 },
  { id: "toronto", latitude: 43.6532, longitude: -79.3832, intensity: 0.72, clusterCount: 6 },
  { id: "montreal", latitude: 45.5019, longitude: -73.5674, intensity: 0.6, clusterCount: 4 },
  { id: "mexico-city", latitude: 19.4326, longitude: -99.1332, intensity: 0.9, clusterCount: 9 },
  { id: "monterrey", latitude: 25.6866, longitude: -100.3161, intensity: 0.58, clusterCount: 4 },
  { id: "sao-paulo", latitude: -23.5558, longitude: -46.6396, intensity: 1, clusterCount: 10 },
  { id: "rio-de-janeiro", latitude: -22.9068, longitude: -43.1729, intensity: 0.72, clusterCount: 6 },
  { id: "buenos-aires", latitude: -34.6037, longitude: -58.3816, intensity: 0.8, clusterCount: 7 },
  { id: "london", latitude: 51.5072, longitude: -0.1276, intensity: 0.96, clusterCount: 9 },
  { id: "paris", latitude: 48.8566, longitude: 2.3522, intensity: 0.92, clusterCount: 9 },
  { id: "madrid", latitude: 40.4168, longitude: -3.7038, intensity: 0.72, clusterCount: 6 },
  { id: "lisbon", latitude: 38.7223, longitude: -9.1393, intensity: 0.52, clusterCount: 4 },
  { id: "berlin", latitude: 52.52, longitude: 13.405, intensity: 0.76, clusterCount: 7 },
  { id: "amsterdam", latitude: 52.3676, longitude: 4.9041, intensity: 0.7, clusterCount: 6 },
  { id: "brussels", latitude: 50.8503, longitude: 4.3517, intensity: 0.64, clusterCount: 5 },
  { id: "milan", latitude: 45.4642, longitude: 9.19, intensity: 0.72, clusterCount: 6 },
  { id: "rome", latitude: 41.9028, longitude: 12.4964, intensity: 0.72, clusterCount: 6 },
  { id: "moscow", latitude: 55.7558, longitude: 37.6173, intensity: 0.86, clusterCount: 8 },
  { id: "istanbul", latitude: 41.0082, longitude: 28.9784, intensity: 0.84, clusterCount: 8 },
  { id: "cairo", latitude: 30.0444, longitude: 31.2357, intensity: 0.76, clusterCount: 7 },
  { id: "lagos", latitude: 6.5244, longitude: 3.3792, intensity: 0.72, clusterCount: 6 },
  { id: "johannesburg", latitude: -26.2041, longitude: 28.0473, intensity: 0.72, clusterCount: 6 },
  { id: "dubai", latitude: 25.2048, longitude: 55.2708, intensity: 0.7, clusterCount: 5 },
  { id: "riyadh", latitude: 24.7136, longitude: 46.6753, intensity: 0.62, clusterCount: 5 },
  { id: "tehran", latitude: 35.6892, longitude: 51.389, intensity: 0.74, clusterCount: 6 },
  { id: "karachi", latitude: 24.8607, longitude: 67.0011, intensity: 0.82, clusterCount: 7 },
  { id: "delhi", latitude: 28.6139, longitude: 77.209, intensity: 1, clusterCount: 11 },
  { id: "mumbai", latitude: 19.076, longitude: 72.8777, intensity: 0.92, clusterCount: 9 },
  { id: "kolkata", latitude: 22.5726, longitude: 88.3639, intensity: 0.78, clusterCount: 7 },
  { id: "dhaka", latitude: 23.8103, longitude: 90.4125, intensity: 0.86, clusterCount: 8 },
  { id: "bangkok", latitude: 13.7563, longitude: 100.5018, intensity: 0.84, clusterCount: 7 },
  { id: "singapore", latitude: 1.3521, longitude: 103.8198, intensity: 0.7, clusterCount: 5 },
  { id: "jakarta", latitude: -6.2088, longitude: 106.8456, intensity: 0.92, clusterCount: 9 },
  { id: "manila", latitude: 14.5995, longitude: 120.9842, intensity: 0.84, clusterCount: 7 },
  { id: "hong-kong", latitude: 22.3193, longitude: 114.1694, intensity: 0.82, clusterCount: 7 },
  { id: "shenzhen", latitude: 22.5431, longitude: 114.0579, intensity: 0.88, clusterCount: 8 },
  { id: "shanghai", latitude: 31.2304, longitude: 121.4737, intensity: 1, clusterCount: 11 },
  { id: "beijing", latitude: 39.9042, longitude: 116.4074, intensity: 0.96, clusterCount: 10 },
  { id: "seoul", latitude: 37.5665, longitude: 126.978, intensity: 0.9, clusterCount: 9 },
  { id: "tokyo", latitude: 35.6762, longitude: 139.6503, intensity: 1, clusterCount: 12 },
  { id: "osaka", latitude: 34.6937, longitude: 135.5023, intensity: 0.82, clusterCount: 8 },
  { id: "taipei", latitude: 25.033, longitude: 121.5654, intensity: 0.72, clusterCount: 6 },
  { id: "sydney", latitude: -33.8688, longitude: 151.2093, intensity: 0.78, clusterCount: 7 },
  { id: "melbourne", latitude: -37.8136, longitude: 144.9631, intensity: 0.68, clusterCount: 6 },
];

const CITY_LIGHTS: CityLight[] = buildCityLightClusters(MAJOR_CITY_LIGHTS);

function orbitalPosition(Cesium: CesiumNamespace, satellite: Satellite) {
  const distanceMeters = (EARTH_RADIUS_KM + satellite.altitude_km) * 1000;
  return Cesium.Cartesian3.fromDegrees(satellite.longitude, satellite.latitude, distanceMeters);
}

function threatPosition(Cesium: CesiumNamespace, threat: Threat) {
  const distanceMeters = (EARTH_RADIUS_KM + threat.altitude_km + 35) * 1000;
  return Cesium.Cartesian3.fromDegrees(threat.longitude, threat.latitude, distanceMeters);
}

function debrisPosition(Cesium: CesiumNamespace, debris: DebrisObject) {
  const distanceMeters = (EARTH_RADIUS_KM + debris.altitude_km) * 1000;
  return Cesium.Cartesian3.fromDegrees(debris.longitude, debris.latitude, distanceMeters);
}

function buildCityLightClusters(cities: CityLight[]): CityLight[] {
  return cities.flatMap((city) => {
    const clusterCount = city.clusterCount ?? 5;
    const coreLight = { ...city, id: `${city.id}-core` };
    const clusterLights = Array.from({ length: clusterCount }, (_, index) => {
      const angle = seededRandom(`${city.id}-angle-${index}`) * Math.PI * 2;
      const distance = Math.sqrt(seededRandom(`${city.id}-distance-${index}`)) * 0.38;
      const latitude = clampLatitude(city.latitude + Math.sin(angle) * distance * 0.58);
      const longitudeScale = Math.max(0.45, Math.cos((city.latitude * Math.PI) / 180));
      const longitude = normalizeLongitude(city.longitude + (Math.cos(angle) * distance) / longitudeScale);
      const flicker = 0.64 + seededRandom(`${city.id}-intensity-${index}`) * 0.3;
      const color = city.color ?? (seededRandom(`${city.id}-color-${index}`) > 0.93 ? "#c084fc" : "#ffd166");

      return {
        id: `${city.id}-cluster-${index}`,
        latitude,
        longitude,
        intensity: Math.min(0.95, city.intensity * flicker),
        color,
      };
    });

    return [coreLight, ...clusterLights];
  });
}

function seededRandom(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % 10000) / 10000;
}

function clampLatitude(latitude: number): number {
  return Math.max(-85, Math.min(85, latitude));
}

function normalizeLongitude(longitude: number): number {
  return ((longitude + 180) % 360) - 180;
}

function cityLightColorProperty(Cesium: CesiumNamespace, city: CityLight) {
  const color = Cesium.Color.fromCssColorString(city.color ?? "#ffd166");

  return new Cesium.CallbackProperty((time: unknown) => {
    const nightFactor = computeNightFactor(Cesium, time, city.latitude, city.longitude);
    const alpha = nightFactor * 0.88 * city.intensity;
    return color.withAlpha(Math.max(0, Math.min(0.92, alpha)));
  }, false);
}

function cityLightOutlineProperty(Cesium: CesiumNamespace, city: CityLight) {
  const color = Cesium.Color.fromCssColorString("#fff7cc");

  return new Cesium.CallbackProperty((time: unknown) => {
    const nightFactor = computeNightFactor(Cesium, time, city.latitude, city.longitude);
    return color.withAlpha(0.18 * nightFactor * city.intensity);
  }, false);
}

function computeNightFactor(Cesium: CesiumNamespace, time: unknown, latitude: number, longitude: number): number {
  try {
    const date = Cesium.JulianDate.toDate(time);
    const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0);
    const dayOfYear = Math.floor((date.getTime() - startOfYear) / 86_400_000);
    const utcHours =
      date.getUTCHours() +
      date.getUTCMinutes() / 60 +
      date.getUTCSeconds() / 3600;
    const subsolarLongitude = normalizeLongitude((12 - utcHours) * 15);
    const subsolarLatitude =
      23.44 * Math.sin(((360 / 365) * (dayOfYear - 81) * Math.PI) / 180);
    const daylight =
      Math.sin((latitude * Math.PI) / 180) * Math.sin((subsolarLatitude * Math.PI) / 180) +
      Math.cos((latitude * Math.PI) / 180) *
        Math.cos((subsolarLatitude * Math.PI) / 180) *
        Math.cos(((longitude - subsolarLongitude) * Math.PI) / 180);

    if (daylight >= 0.12) {
      return 0;
    }
    if (daylight <= -0.12) {
      return 1;
    }

    return (0.12 - daylight) / 0.24;
  } catch {
    return 1;
  }
}

export function CesiumGlobe({
  satellites,
  selectedSatelliteId,
  threats,
  debris,
  conjunctions,
  onSelectSatellite,
  onSelectDebris,
}: CesiumGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<CesiumViewer | null>(null);
  const cesiumRef = useRef<CesiumNamespace | null>(null);
  const handlerRef = useRef<CesiumScreenSpaceEventHandler | null>(null);
  const spinListenerRef = useRef<(() => void) | null>(null);
  const spinPausedRef = useRef(false);
  const resumeSpinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entityMapRef = useRef<Map<string, CesiumEntity>>(new Map());
  const threatEntityMapRef = useRef<Map<string, CesiumEntity>>(new Map());
  const debrisEntityMapRef = useRef<Map<string, CesiumEntity>>(new Map());
  const conjunctionEntityMapRef = useRef<Map<string, CesiumEntity>>(new Map());
  const cityLightEntityMapRef = useRef<Map<string, CesiumEntity>>(new Map());
  const satellitesRef = useRef<Satellite[]>(satellites);
  const debrisRef = useRef<DebrisObject[]>(debris);
  const onSelectSatelliteRef = useRef(onSelectSatellite);
  const onSelectDebrisRef = useRef(onSelectDebris);
  const lastFocusedSatelliteIdRef = useRef<string | null>(null);
  const pointerActiveRef = useRef(false);
  const [ready, setReady] = useState(false);

  function pauseSpin() {
    spinPausedRef.current = true;
    if (resumeSpinTimeoutRef.current) {
      clearTimeout(resumeSpinTimeoutRef.current);
      resumeSpinTimeoutRef.current = null;
    }
  }

  function resumeSpinAfterInteraction() {
    pauseSpin();
    resumeSpinTimeoutRef.current = setTimeout(() => {
      if (pointerActiveRef.current) {
        return;
      }
      spinPausedRef.current = false;
      resumeSpinTimeoutRef.current = null;
    }, 1600);
  }

  function handlePointerDown() {
    pointerActiveRef.current = true;
    pauseSpin();
  }

  function handlePointerMove() {
    if (pointerActiveRef.current) {
      resumeSpinAfterInteraction();
    }
  }

  function handlePointerUp() {
    pointerActiveRef.current = false;
    resumeSpinAfterInteraction();
  }

  useEffect(() => {
    satellitesRef.current = satellites;
  }, [satellites]);

  useEffect(() => {
    debrisRef.current = debris;
  }, [debris]);

  useEffect(() => {
    onSelectSatelliteRef.current = onSelectSatellite;
  }, [onSelectSatellite]);

  useEffect(() => {
    onSelectDebrisRef.current = onSelectDebris;
  }, [onSelectDebris]);

  useEffect(() => {
    let cancelled = false;

    function createViewer(Cesium: CesiumNamespace) {
      if (cancelled || !containerRef.current) {
        return;
      }

      Cesium.Ion.defaultAccessToken = "";

      const baseLayer = Cesium.ImageryLayer.fromProviderAsync(
        Cesium.TileMapServiceImageryProvider.fromUrl(
          Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"),
        ),
      );

      const viewer = new Cesium.Viewer(containerRef.current, {
        animation: false,
        baseLayer,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        selectionIndicator: false,
        shouldAnimate: true,
        timeline: false,
      });

      viewer.scene.globe.enableLighting = true;
      viewer.scene.globe.showGroundAtmosphere = true;
      viewer.scene.skyAtmosphere.show = true;
      viewer.scene.highDynamicRange = false;
      viewer.scene.screenSpaceCameraController.enableRotate = true;
      viewer.scene.screenSpaceCameraController.enableTranslate = true;
      viewer.scene.screenSpaceCameraController.enableZoom = true;
      viewer.scene.screenSpaceCameraController.enableTilt = true;
      viewer.scene.screenSpaceCameraController.enableLook = true;
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(-55, 24, 16_000_000),
      });
      const spinListener = () => {
        if (spinPausedRef.current) {
          return;
        }
        viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -GLOBE_SPIN_RATE_RADIANS);
      };
      viewer.clock.onTick.addEventListener(spinListener);

      const canvas = viewer.scene.canvas;
      canvas.addEventListener("pointerdown", handlePointerDown);
      canvas.addEventListener("pointermove", handlePointerMove);
      canvas.addEventListener("wheel", resumeSpinAfterInteraction, { passive: true });
      canvas.addEventListener("touchstart", handlePointerDown, { passive: true });
      canvas.addEventListener("touchmove", resumeSpinAfterInteraction, { passive: true });
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("touchend", handlePointerUp);

      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((movement: { position: unknown }) => {
        const picked = viewer.scene.pick(movement.position);
        const satelliteId = picked?.id?.properties?.satelliteId?.getValue();

        if (typeof satelliteId === "string") {
          const satellite = satellitesRef.current.find((item) => item.id === satelliteId);
          if (satellite) {
            onSelectSatelliteRef.current(satellite);
          }
          return;
        }

        const debrisId = picked?.id?.properties?.debrisId?.getValue();
        if (typeof debrisId === "string") {
          const selectedDebris = debrisRef.current.find((item) => item.id === debrisId);
          if (selectedDebris) {
            onSelectDebrisRef.current?.(selectedDebris);
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      cesiumRef.current = Cesium;
      viewerRef.current = viewer;
      handlerRef.current = handler;
      spinListenerRef.current = spinListener;
      setReady(true);
    }

    window.CESIUM_BASE_URL = "/cesium";

    if (window.Cesium) {
      createViewer(window.Cesium);
    } else {
      const script = document.createElement("script");
      script.src = "/cesium/Cesium.js";
      script.async = true;
      script.onload = () => {
        if (window.Cesium) {
          createViewer(window.Cesium);
        }
      };
      script.onerror = () => setReady(false);
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (spinListenerRef.current && viewerRef.current) {
        viewerRef.current.clock.onTick.removeEventListener(spinListenerRef.current);
      }
      if (resumeSpinTimeoutRef.current) {
        clearTimeout(resumeSpinTimeoutRef.current);
      }
      if (viewerRef.current) {
        const canvas = viewerRef.current.scene.canvas;
        canvas.removeEventListener("pointerdown", handlePointerDown);
        canvas.removeEventListener("pointermove", handlePointerMove);
        canvas.removeEventListener("wheel", resumeSpinAfterInteraction);
        canvas.removeEventListener("touchstart", handlePointerDown);
        canvas.removeEventListener("touchmove", resumeSpinAfterInteraction);
      }
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("touchend", handlePointerUp);
      spinListenerRef.current = null;
      spinPausedRef.current = false;
      pointerActiveRef.current = false;
      resumeSpinTimeoutRef.current = null;
      handlerRef.current?.destroy();
      handlerRef.current = null;
      viewerRef.current?.destroy();
      viewerRef.current = null;
      cesiumRef.current = null;
      entityMapRef.current.clear();
      threatEntityMapRef.current.clear();
      debrisEntityMapRef.current.clear();
      conjunctionEntityMapRef.current.clear();
      cityLightEntityMapRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;

    if (!Cesium || !viewer || cityLightEntityMapRef.current.size > 0) {
      return;
    }

    CITY_LIGHTS.forEach((city) => {
      const intensity = Math.max(0.45, Math.min(city.intensity, 1));
      const entity = viewer.entities.add({
        point: {
          color: cityLightColorProperty(Cesium, city),
          outlineColor: cityLightOutlineProperty(Cesium, city),
          outlineWidth: city.color === "#c084fc" ? 1 : 0,
          pixelSize: 1.3 + intensity * 3.2,
          scaleByDistance: new Cesium.NearFarScalar(1.0e6, 1.3, 1.9e7, 0.38),
          translucencyByDistance: new Cesium.NearFarScalar(1.0e6, 0.95, 2.1e7, 0.38),
        },
        position: Cesium.Cartesian3.fromDegrees(
          city.longitude,
          city.latitude,
          CITY_LIGHT_ALTITUDE_METERS,
        ),
        properties: {
          cityLightId: city.id,
        },
      });

      cityLightEntityMapRef.current.set(city.id, entity);
    });
  }, [ready]);

  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;

    if (!Cesium || !viewer) {
      return;
    }

    const activeIds = new Set(satellites.map((satellite) => satellite.id));

    entityMapRef.current.forEach((entity, id) => {
      if (!activeIds.has(id)) {
        viewer.entities.remove(entity);
        entityMapRef.current.delete(id);
      }
    });

    satellites.forEach((satellite) => {
      const selected = satellite.id === selectedSatelliteId;
      const position = orbitalPosition(Cesium, satellite);
      const existing = entityMapRef.current.get(satellite.id);

      if (existing) {
        existing.position = new Cesium.ConstantPositionProperty(position);
        existing.point = new Cesium.PointGraphics({
          color: selected ? Cesium.Color.fromCssColorString("#fbbf24") : Cesium.Color.CYAN,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: selected ? 3 : 2,
          pixelSize: selected ? 14 : 11,
        });
        existing.label = new Cesium.LabelGraphics({
          fillColor: Cesium.Color.WHITE,
          font: "600 13px Inter, sans-serif",
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          pixelOffset: new Cesium.Cartesian2(16, -8),
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          text: satellite.name,
        });
        return;
      }

      const entity = viewer.entities.add({
        label: {
          fillColor: Cesium.Color.WHITE,
          font: "600 13px Inter, sans-serif",
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          pixelOffset: new Cesium.Cartesian2(16, -8),
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          text: satellite.name,
        },
        point: {
          color: selected ? Cesium.Color.fromCssColorString("#fbbf24") : Cesium.Color.CYAN,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: selected ? 3 : 2,
          pixelSize: selected ? 14 : 11,
        },
        position,
        properties: {
          satelliteId: satellite.id,
        },
      });

      entityMapRef.current.set(satellite.id, entity);
    });
  }, [ready, satellites, selectedSatelliteId]);

  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;

    if (!Cesium || !viewer || !selectedSatelliteId || lastFocusedSatelliteIdRef.current === selectedSatelliteId) {
      return;
    }

    const selectedSatellite = satellitesRef.current.find(
      (satellite) => satellite.id === selectedSatelliteId,
    );

    if (!selectedSatellite) {
      return;
    }

    lastFocusedSatelliteIdRef.current = selectedSatelliteId;
    pauseSpin();
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        selectedSatellite.longitude,
        selectedSatellite.latitude,
        (EARTH_RADIUS_KM + selectedSatellite.altitude_km) * 1000 + SATELLITE_FOCUS_ALTITUDE_METERS,
      ),
      duration: 0.9,
      complete: resumeSpinAfterInteraction,
      cancel: resumeSpinAfterInteraction,
    });
  }, [ready, selectedSatelliteId]);

  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;

    if (!Cesium || !viewer) {
      return;
    }

    const activeIds = new Set(threats.map((threat) => threat.id));

    threatEntityMapRef.current.forEach((entity, id) => {
      if (!activeIds.has(id)) {
        viewer.entities.remove(entity);
        threatEntityMapRef.current.delete(id);
      }
    });

    threats.forEach((threat) => {
      const position = threatPosition(Cesium, threat);
      const existing = threatEntityMapRef.current.get(threat.id);

      if (existing) {
        existing.position = new Cesium.ConstantPositionProperty(position);
        return;
      }

      const entity = viewer.entities.add({
        label: {
          fillColor: Cesium.Color.fromCssColorString("#fb7185"),
          font: "700 12px Inter, sans-serif",
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          pixelOffset: new Cesium.Cartesian2(18, 18),
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          text: threat.type.replaceAll("_", " ").toUpperCase(),
        },
        point: {
          color: Cesium.Color.fromCssColorString("#fb7185"),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          pixelSize: 16,
        },
        position,
        properties: {
          threatId: threat.id,
        },
      });

      threatEntityMapRef.current.set(threat.id, entity);
    });
  }, [ready, threats]);

  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;

    if (!Cesium || !viewer) {
      return;
    }

    const activeIds = new Set(debris.map((item) => item.id));

    debrisEntityMapRef.current.forEach((entity, id) => {
      if (!activeIds.has(id)) {
        viewer.entities.remove(entity);
        debrisEntityMapRef.current.delete(id);
      }
    });

    debris.forEach((item) => {
      const position = debrisPosition(Cesium, item);
      const existing = debrisEntityMapRef.current.get(item.id);

      if (existing) {
        existing.position = new Cesium.ConstantPositionProperty(position);
        return;
      }

      const entity = viewer.entities.add({
        label: {
          fillColor: Cesium.Color.fromCssColorString("#fbbf24"),
          font: "600 11px Inter, sans-serif",
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 3,
          pixelOffset: new Cesium.Cartesian2(12, 12),
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          text: item.name,
        },
        point: {
          color: Cesium.Color.fromCssColorString("#fbbf24"),
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          pixelSize: 8,
        },
        position,
        properties: {
          debrisId: item.id,
        },
      });

      debrisEntityMapRef.current.set(item.id, entity);
    });
  }, [ready, debris]);

  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;

    if (!Cesium || !viewer) {
      return;
    }

    const activeIds = new Set(conjunctions.map((alert) => alert.id));

    conjunctionEntityMapRef.current.forEach((entity, id) => {
      if (!activeIds.has(id)) {
        viewer.entities.remove(entity);
        conjunctionEntityMapRef.current.delete(id);
      }
    });

    conjunctions.forEach((alert) => {
      const satellite = satellites.find((item) => item.id === alert.satellite_id);
      const debrisObject = debris.find((item) => item.id === alert.debris_id);

      if (!satellite || !debrisObject) {
        return;
      }

      const positions = [
        orbitalPosition(Cesium, satellite),
        debrisPosition(Cesium, debrisObject),
      ];
      const existing = conjunctionEntityMapRef.current.get(alert.id);

      if (existing) {
        existing.polyline.positions = new Cesium.ConstantProperty(positions);
        return;
      }

      const entity = viewer.entities.add({
        polyline: {
          material: Cesium.Color.fromCssColorString("#fbbf24"),
          positions,
          width: 2,
        },
        properties: {
          conjunctionId: alert.id,
        },
      });

      conjunctionEntityMapRef.current.set(alert.id, entity);
    });
  }, [ready, conjunctions, debris, satellites]);

  return (
    <section className="relative h-full min-h-[480px] w-full overflow-hidden bg-[#030712]">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-2xl">
        <p className="text-xs uppercase tracking-[0.24em] text-console-cyan">Orbital Defense Grid</p>
        <h1 className="mt-1 text-2xl font-semibold text-white">
          AI-powered satellite monitoring, collision prediction, and space-cyber incident simulation
          platform.
        </h1>
      </div>
      {!ready ? (
        <div className="absolute inset-0 grid place-items-center bg-[#030712] text-sm uppercase tracking-[0.22em] text-console-cyan">
          Initializing Cesium globe
        </div>
      ) : null}
    </section>
  );
}

declare global {
  interface Window {
    CESIUM_BASE_URL: string;
    Cesium?: CesiumNamespace;
  }
}
