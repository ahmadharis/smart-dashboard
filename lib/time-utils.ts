export function formatRelativeTime(dateString: string): string {
  if (!dateString) return "Unknown"

  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "Unknown"

  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  // If more than 7 days ago, show full date
  if (diffInSeconds > 7 * 24 * 60 * 60) {
    return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`
  }

  // Less than a minute
  if (diffInSeconds < 60) {
    return "just now"
  }

  // Less than an hour
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`
  }

  // Less than a day
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`
  }

  // Less than a week
  const days = Math.floor(diffInSeconds / 86400)
  return `${days} day${days !== 1 ? "s" : ""} ago`
}
