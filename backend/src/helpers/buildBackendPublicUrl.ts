export const buildBackendPublicUrl = (relativePath: string): string => {
  const { BACKEND_URL, PORT } = process.env;
  let baseUrl = BACKEND_URL || "http://localhost";

  if (baseUrl.includes("://")) {
    const urlParts = baseUrl.split("://");
    const protocol = urlParts[0];
    const hostParts = urlParts[1].split(":");
    const host = hostParts[0];
    const existingPort = hostParts[1];

    if (existingPort) {
      baseUrl = `${protocol}://${host}:${existingPort}`;
    } else if (protocol === "https") {
      baseUrl = `${protocol}://${host}`;
    } else {
      baseUrl = `${protocol}://${host}:${PORT || "3100"}`;
    }
  } else {
    baseUrl = `http://${baseUrl}:${PORT || "3100"}`;
  }

  const normalized = relativePath.replace(/^\/+/, "");
  return `${baseUrl}/public/${normalized}`;
};

export default buildBackendPublicUrl;
