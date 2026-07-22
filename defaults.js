export const FALLBACK_COORDS = { lat: 41.0814, lon: -81.519 };

export const DEFAULT_SETTINGS = {
  openWeatherApiKey: "<OPENWEATHER_API_KEY>",
ohgoApiKey: "<OHGO_API_KEY>",
  useGeolocation: true,
  coords: FALLBACK_COORDS,
  cameraRefreshSeconds: 5,
  weatherRefreshMinutes: 10,
  cameras: [
    {
      src: "https://itscameras.dot.state.oh.us/images/CLE/CLE082.jpg",
      alt: "https://itscameras.dot.state.oh.us/images/CLE/CLE202.jpg",
      label: "I-224 [State St.] (Barberton)",
      altLabel: "I-224 ALT - Facing East"
    },
    {
      src: "https://itscameras.dot.state.oh.us/images/CLE/CLE104a-L.jpg",
      alt: "https://itscameras.dot.state.oh.us/images/CLE/CCTV6083.jpg",
      label: "I-76 [Tallmadge Rd.] (Brimfield)",
      altLabel: "I-76 ALT - WB View"
    },
    {
      src: "https://itscameras.dot.state.oh.us/images/CLE/CLE094a-L.jpg",
      alt: "https://itscameras.dot.state.oh.us/images/CLE/CLE097-L.jpg",
      label: "I-76 [E. Market St.] (Ellet)",
      altLabel: "I-76 ALT - Ramp View"
    },
    {
      src: "https://itscameras.dot.state.oh.us/images/CLE/CLE026-L.jpg",
      alt: "https://itscameras.dot.state.oh.us/images/CLE/CLE024-L.jpg",
      label: "SR 8 [Howe Ave.] (Cuyahoga Falls)",
      altLabel: "SR 8 ALT - Southbound"
    },
    {
      src: "https://itscameras.dot.state.oh.us/images/CLE/CLE166a-L.jpg",
      alt: "https://itscameras.dot.state.oh.us/images/CLE/I-77_at_Hillside_Rd.jpg",
      label: "I-77 [Copley Rd.] (W. Akron)",
      altLabel: "I-77 ALT - Hillside Rd"
    },
    {
      src: "https://itscameras.dot.state.oh.us/images/CLE/CLE096.jpg",
      alt: "https://itscameras.dot.state.oh.us/images/CLE/CCTV3102.jpg",
      label: "I-480 [I-80] (Streetsboro)",
      altLabel: "I-480 ALT - WB"
    }
  ]
};