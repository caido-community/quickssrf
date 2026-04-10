export function getStatusTextColor(status: string): string {
  switch (status) {
    case "active":
    case "polling":
      return "text-green-400";
    case "stopped":
      return "text-red-400";
    case "expired":
      return "text-orange-400";
    case "error":
      return "text-red-500";
    default:
      return "text-surface-400";
  }
}

export function getStatusDotColor(status: string): string {
  switch (status) {
    case "active":
    case "polling":
      return "bg-green-500";
    case "stopped":
      return "bg-red-400";
    case "expired":
      return "bg-orange-500";
    case "error":
      return "bg-red-500";
    default:
      return "bg-surface-400";
  }
}

export function getProtocolClass(protocol: string): string {
  switch (protocol) {
    case "dns":
      return "text-orange-400";
    case "http":
    case "https":
      return "text-green-400";
    case "smtp":
    case "smtps":
      return "text-blue-400";
    case "ftp":
    case "ftps":
      return "text-yellow-400";
    case "ldap":
      return "text-purple-400";
    case "smb":
      return "text-red-400";
    default:
      return "text-surface-400";
  }
}

export function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return ts;
  }
}
