const allowLocalIP = process.env.NEXT_IMAGE_ALLOW_LOCAL_IP === "true";

const mediaProtocol = process.env.NEXT_IMAGE_MEDIA_PROTOCOL || "http";
const mediaHostname = process.env.NEXT_IMAGE_MEDIA_HOSTNAME || "minio";
const mediaPort = process.env.NEXT_IMAGE_MEDIA_PORT || "9000";

const backendProtocol = process.env.NEXT_IMAGE_BACKEND_PROTOCOL || "http";
const backendHostname = process.env.NEXT_IMAGE_BACKEND_HOSTNAME || "backend";
const backendPort = process.env.NEXT_IMAGE_BACKEND_PORT || "8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: mediaProtocol,
        hostname: mediaHostname,
        port: mediaPort,
        pathname: "/**",
      },
      {
        protocol: backendProtocol,
        hostname: backendHostname,
        port: backendPort,
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "9000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/**",
      },
    ],
    dangerouslyAllowLocalIP: allowLocalIP,
  },
};

export default nextConfig;
