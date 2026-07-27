const locationService = {
  processLocation(latitude, longitude) {
    if (latitude === undefined || longitude === undefined) return null;
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { latitude: lat, longitude: lng };
  }
};

module.exports = locationService;
