const DISTRICT_NAME_MAP = {
  Kanyakumari: 'Kanniyakumari',
  Nilgiris: 'The Nilgiris',
  Thoothukkudi: 'Thoothukudi',
  Sivagangai: 'Sivaganga',
  Kanchipuram: 'Kancheepuram',
  Tirupattur: 'Tirupathur',
};

let districtAssetPromise;
let constituencyAssetPromise;

export function normalizeGeoDistrict(name) {
  return DISTRICT_NAME_MAP[name] || name;
}

export function loadDistrictAsset() {
  if (!districtAssetPromise) {
    districtAssetPromise = fetch('/tamil-nadu-districts.geojson')
      .then((response) => response.json())
      .then((geoJson) => {
        const entries = geoJson.features.map((feature) => [
          normalizeGeoDistrict(feature.properties.district),
          feature.geometry,
        ]);
        return new Map(entries);
      })
      .catch(() => new Map());
  }
  return districtAssetPromise;
}

export function loadConstituencyAsset() {
  if (!constituencyAssetPromise) {
    constituencyAssetPromise = fetch('/tamil-nadu-assembly-constituencies.geojson')
      .then((response) => response.json())
      .then((geoJson) => {
        const entries = geoJson.features.map((feature) => [feature.properties.AC_NO, feature.geometry]);
        return new Map(entries);
      })
      .catch(() => new Map());
  }
  return constituencyAssetPromise;
}
