export type GeoPlace = {
  address: string;
  city: string;
};

function formatPlace(data: {
  locality?: string;
  city?: string;
  principalSubdivisionCode?: string;
  countryName?: string;
  localityInfo?: { informative?: Array<{ name: string; description?: string }> };
}, latitude: number, longitude: number): GeoPlace {
  const street =
    data.localityInfo?.informative?.find((i) =>
      /route|road|street|rua/i.test(i.description ?? i.name),
    )?.name ?? data.locality;
  const city = [data.city, data.principalSubdivisionCode?.replace(/^BR-/, "")]
    .filter(Boolean)
    .join(" — ");
  return {
    address: street || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    city: city || data.countryName || "Brasil",
  };
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<GeoPlace> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("geocode");
  const data = (await res.json()) as Parameters<typeof formatPlace>[0];
  return formatPlace(data, latitude, longitude);
}

export function coordsAsPlace(latitude: number, longitude: number): GeoPlace {
  return {
    address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    city: "",
  };
}

export async function locateAddress(): Promise<GeoPlace> {
  const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("sem GPS"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
    });
  });
  const { latitude, longitude } = pos.coords;
  try {
    return await reverseGeocode(latitude, longitude);
  } catch {
    return coordsAsPlace(latitude, longitude);
  }
}
