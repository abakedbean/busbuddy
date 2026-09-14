// Maps Penn building codes (as they appear in Wharton class schedule locations,
// e.g. "JMHH F50") to real street addresses Google's Directions API can route to.
// v1 fallback for when Google can't resolve the raw code on its own (see DECISIONS.md).

const BUILDING_ADDRESSES = {
  JMHH: 'Jon M. Huntsman Hall, 3730 Walnut St, Philadelphia, PA 19104',
  SHDH: 'Steinberg Hall-Dietrich Hall, 3620 Locust Walk, Philadelphia, PA 19104',
};

// Takes a raw calendar location like "JMHH F50" and returns a routable address,
// or the original string unchanged if the building code isn't in the table.
function resolveLocation(rawLocation) {
  if (!rawLocation) {
    return rawLocation;
  }
  const buildingCode = rawLocation.trim().split(/\s+/)[0].toUpperCase();
  return BUILDING_ADDRESSES[buildingCode] || rawLocation;
}

module.exports = { BUILDING_ADDRESSES, resolveLocation };
