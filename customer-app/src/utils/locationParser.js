// src/utils/locationParser.js
/**
 * Parses the address components from Google Geocoding API response.
 * Returns an object with areaName and fullAddress.
 *
 * @param {Array} addressComponents - array of address component objects
 * @param {string} formattedAddress - full formatted address string
 * @returns {{areaName:string, fullAddress:string}}
 */
export default function parseLocationAddress(addressComponents, formattedAddress) {
  if (!Array.isArray(addressComponents) || !formattedAddress) {
    return { areaName: '', fullAddress: formattedAddress || '' };
  }

  const priorityTypes = [
    'sublocality_level_1',
    'sublocality',
    'neighborhood',
    'locality',
  ];

  let areaName = '';
  for (const type of priorityTypes) {
    const comp = addressComponents.find(ac => ac.types && ac.types.includes(type));
    if (comp && comp.long_name) {
      areaName = comp.long_name;
      break;
    }
  }

  // Fallback: first segment before a comma
  if (!areaName) {
    areaName = formattedAddress.split(',')[0];
  }

  return { areaName, fullAddress: formattedAddress };
}
